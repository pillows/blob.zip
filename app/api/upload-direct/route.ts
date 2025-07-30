import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, updateFileRecord } from '../../../lib/db';

export const runtime = 'nodejs';

interface ChunkUploadSession {
  fileId: string;
  filename: string;
  totalSize: number;
  chunks: Buffer[];
  uploadedSize: number;
}

// In-memory storage for upload sessions (in production, use Redis or similar)
const uploadSessions = new Map<string, ChunkUploadSession>();

// Initialize chunked upload
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await initializeDatabase();
    
    const body = await request.json();
    const { filename, fileId, totalSize } = body;

    if (!fileId || !filename || !totalSize) {
      return NextResponse.json(
        { error: 'Missing fileId, filename, or totalSize' },
        { status: 400 }
      );
    }

    // Initialize upload session
    uploadSessions.set(fileId, {
      fileId,
      filename,
      totalSize,
      chunks: [],
      uploadedSize: 0,
    });

    return NextResponse.json({
      success: true,
      fileId,
      chunkSize: 4 * 1024 * 1024, // 4MB chunks
      uploadUrl: `/api/upload-direct/chunk`,
    });
  } catch (error) {
    console.error('Chunked upload initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize chunked upload' },
      { status: 500 }
    );
  }
}

// Handle chunk upload
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const chunkIndex = parseInt(searchParams.get('chunkIndex') || '0');
    const isLastChunk = searchParams.get('isLastChunk') === 'true';

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing fileId' },
        { status: 400 }
      );
    }

    const session = uploadSessions.get(fileId);
    if (!session) {
      return NextResponse.json(
        { error: 'Upload session not found' },
        { status: 404 }
      );
    }

    // Read chunk data
    const chunkData = await request.arrayBuffer();
    const chunkBuffer = Buffer.from(chunkData);
    
    // Store chunk
    session.chunks[chunkIndex] = chunkBuffer;
    session.uploadedSize += chunkBuffer.length;

    // If this is the last chunk, combine all chunks and upload to Vercel Blob
    if (isLastChunk) {
      try {
        // Combine all chunks
        const totalBuffer = Buffer.concat(session.chunks);
        
        // Upload to Vercel Blob
        const blob = await put(session.filename, totalBuffer, {
          access: 'public',
          addRandomSuffix: false,
        });

        // Update database record
        await updateFileRecord(fileId, {
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          size: totalBuffer.length,
        });

        // Clean up session
        uploadSessions.delete(fileId);

        // Calculate expiration date (3 days from now)
        const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        // Return the shortened URL format
        const baseUrl = process.env.BLOBZIP_URL || 
                       (request.headers.get('host') ? 
                        `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                        'http://localhost:3000');
        
        const shortenedUrl = `${baseUrl}/${fileId}`;

        return NextResponse.json({
          success: true,
          completed: true,
          id: fileId,
          url: shortenedUrl,
          filename: session.filename,
          size: totalBuffer.length,
          expiresAt: expiresAt.toISOString(),
        });
      } catch (error) {
        console.error('Final upload error:', error);
        uploadSessions.delete(fileId);
        return NextResponse.json(
          { error: 'Failed to complete upload' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      completed: false,
      uploadedSize: session.uploadedSize,
      totalSize: session.totalSize,
      progress: Math.round((session.uploadedSize / session.totalSize) * 100),
    });
  } catch (error) {
    console.error('Chunk upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload chunk' },
      { status: 500 }
    );
  }
}