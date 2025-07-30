import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';
import { initializeDatabase, isIpBanned, createFileRecord, updateFileRecordFixed } from '../../../lib/db';

// Create nanoid with only alphanumeric characters (no underscores or dashes)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

// In-memory storage for chunks (in production, you'd want to use a more persistent solution)
const chunkStorage = new Map<string, { 
  chunks: Buffer[], 
  totalSize: number, 
  filename: string,
  expectedChunks: number,
  receivedChunks: number 
}>();

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const clientIP = getClientIP(request);
    if (await isIpBanned(clientIP)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'init') {
      // Initialize a chunked upload session
      const filename = searchParams.get('filename');
      const totalSize = parseInt(searchParams.get('totalSize') || '0', 10);
      const chunkSize = parseInt(searchParams.get('chunkSize') || '4194304', 10); // 4MB default
      
      if (!filename || !totalSize) {
        return NextResponse.json(
          { success: false, error: 'filename and totalSize are required' },
          { status: 400 }
        );
      }
      
      const fileId = nanoid();
      const expectedChunks = Math.ceil(totalSize / chunkSize);
      
      // Initialize chunk storage
      chunkStorage.set(fileId, {
        chunks: new Array(expectedChunks),
        totalSize: 0,
        filename,
        expectedChunks,
        receivedChunks: 0
      });
      
      // Create database record
      await createFileRecord({
        id: fileId,
        filename,
        blobUrl: '', // Will be updated after upload
        blobPathname: '', // Will be updated after upload
        size: 0, // Will be updated after upload
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || '',
      });
      
      return NextResponse.json({
        success: true,
        fileId,
        expectedChunks,
        chunkSize,
        message: `Upload session initialized. Send ${expectedChunks} chunks.`
      });
    }
    
    if (action === 'chunk') {
      // Upload a chunk
      const fileId = searchParams.get('fileId');
      const chunkIndex = parseInt(searchParams.get('chunkIndex') || '0', 10);
      
      if (!fileId) {
        return NextResponse.json(
          { success: false, error: 'fileId is required' },
          { status: 400 }
        );
      }
      
      const uploadSession = chunkStorage.get(fileId);
      if (!uploadSession) {
        return NextResponse.json(
          { success: false, error: 'Upload session not found' },
          { status: 404 }
        );
      }
      
      // Read chunk data
      const chunkBuffer = Buffer.from(await request.arrayBuffer());
      
      // Store chunk
      uploadSession.chunks[chunkIndex] = chunkBuffer;
      uploadSession.totalSize += chunkBuffer.length;
      uploadSession.receivedChunks++;
      
      console.log(`Received chunk ${chunkIndex + 1}/${uploadSession.expectedChunks} (${chunkBuffer.length} bytes)`);
      
      // Check if all chunks are received
      if (uploadSession.receivedChunks === uploadSession.expectedChunks) {
        console.log('All chunks received, combining and uploading to blob');
        
        // Combine all chunks
        const totalSize = uploadSession.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combinedBuffer = Buffer.alloc(totalSize);
        let offset = 0;
        
        for (const chunk of uploadSession.chunks) {
          if (chunk) {
            chunk.copy(combinedBuffer, offset);
            offset += chunk.length;
          }
        }
        
        // Upload to Vercel Blob
        const blob = await put(uploadSession.filename, combinedBuffer, {
          access: 'public',
          addRandomSuffix: false,
        });
        
        // Update database record
        await updateFileRecordFixed(fileId, {
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          size: combinedBuffer.length,
        });
        
        // Clean up
        chunkStorage.delete(fileId);
        
        // Return success
        const baseUrl = process.env.BLOBZIP_URL || 
                       (request.headers.get('host') ? 
                        `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                        'http://localhost:3000');
        
        const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        
        return NextResponse.json({
          success: true,
          id: fileId,
          url: `${baseUrl}/${fileId}`,
          filename: uploadSession.filename,
          size: combinedBuffer.length,
          expiresAt: expiresAt.toISOString(),
          message: 'Upload completed successfully'
        });
      } else {
        return NextResponse.json({
          success: true,
          chunkIndex,
          received: true,
          totalChunksReceived: uploadSession.receivedChunks,
          expectedChunks: uploadSession.expectedChunks,
          message: `Chunk ${chunkIndex + 1}/${uploadSession.expectedChunks} received`
        });
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action. Use ?action=init or ?action=chunk' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Chunked upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process chunked upload' },
      { status: 500 }
    );
  }
}