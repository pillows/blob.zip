import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, updateFileRecordFixed as updateFileRecord, getFileRecord } from '../../../lib/db';

export const runtime = 'nodejs';

// In-memory storage for chunks (in production, you'd want to use a more persistent solution)
const chunkStorage = new Map<string, { chunks: Buffer[], totalSize: number }>();

export async function PUT(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const filename = searchParams.get('filename');
    const chunkIndex = parseInt(searchParams.get('chunkIndex') || '0', 10);
    const isLastChunk = searchParams.get('isLastChunk') === 'true';

    if (!fileId || !filename) {
      return NextResponse.json(
        { error: 'Missing fileId or filename' },
        { status: 400 }
      );
    }

    console.log('Upload stream: Processing chunk', chunkIndex, 'for fileId:', fileId, 'isLastChunk:', isLastChunk);

    // Read the chunk data
    const chunkBuffer = Buffer.from(await request.arrayBuffer());
    
    // Initialize or get existing chunk storage for this file
    if (!chunkStorage.has(fileId)) {
      chunkStorage.set(fileId, { chunks: [], totalSize: 0 });
    }
    
    const fileChunks = chunkStorage.get(fileId)!;
    
    // Store the chunk at the correct index
    fileChunks.chunks[chunkIndex] = chunkBuffer;
    fileChunks.totalSize += chunkBuffer.length;
    
    console.log('Upload stream: Stored chunk', chunkIndex, 'size:', chunkBuffer.length, 'total size so far:', fileChunks.totalSize);

    // If this is the last chunk, combine all chunks and upload to blob
    if (isLastChunk) {
      console.log('Upload stream: Last chunk received, combining and uploading to blob');
      
      // Combine all chunks in order
      const totalSize = fileChunks.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedBuffer = Buffer.alloc(totalSize);
      let offset = 0;
      
      for (const chunk of fileChunks.chunks) {
        if (chunk) {
          chunk.copy(combinedBuffer, offset);
          offset += chunk.length;
        }
      }
      
      console.log('Upload stream: Combined buffer size:', combinedBuffer.length);

      // Upload to Vercel Blob
      const blob = await put(filename, combinedBuffer, {
        access: 'public',
        addRandomSuffix: false,
      });

      console.log('Upload stream: Blob upload successful:', {
        url: blob.url,
        pathname: blob.pathname
      });

      // Update database record with actual file info
      await updateFileRecord(fileId, {
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        size: combinedBuffer.length,
      });

      // Clean up chunk storage
      chunkStorage.delete(fileId);

      // Calculate expiration date (3 days from now)
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      // Return the shortened URL format
      const baseUrl = process.env.BLOBZIP_URL || 
                     (request.headers.get('host') ? 
                      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                      'http://localhost:3000');
      
      const shortenedUrl = `${baseUrl}/${fileId}`;

      const response = {
        success: true,
        id: fileId,
        url: shortenedUrl,
        filename,
        size: combinedBuffer.length,
        expiresAt: expiresAt.toISOString(),
      };

      console.log('Upload stream: Returning success response:', response);
      return NextResponse.json(response);
    } else {
      // Return success for intermediate chunks
      return NextResponse.json({
        success: true,
        chunkIndex,
        received: true,
        totalChunksReceived: fileChunks.chunks.filter(chunk => chunk).length,
      });
    }
  } catch (error) {
    console.error('Upload stream error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process chunk' },
      { status: 500 }
    );
  }
}