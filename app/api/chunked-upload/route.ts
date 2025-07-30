import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, updateFileRecord } from '../../../lib/db';

// Use Node.js runtime for better streaming support
export const runtime = 'nodejs';

interface ChunkedUploadResponse {
  success: boolean;
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  expiresAt?: string;
  error?: string;
  chunkSize?: number;
  completed?: boolean;
}

// In-memory storage for chunks (in production, you'd want to use Redis or similar)
const chunkStorage = new Map<string, { chunks: Buffer[], totalSize: number }>();

export async function PUT(request: NextRequest): Promise<NextResponse<ChunkedUploadResponse>> {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const filename = searchParams.get('filename');
    const chunkIndex = parseInt(searchParams.get('chunkIndex') || '0');
    const isLastChunk = searchParams.get('isLastChunk') === 'true';
    
    if (!fileId || !filename) {
      return NextResponse.json(
        { success: false, error: 'Missing fileId or filename' },
        { status: 400 }
      );
    }

    // Read the chunk data
    const chunkData = await request.arrayBuffer();
    const chunkBuffer = Buffer.from(chunkData);

    // Initialize chunk storage if this is the first chunk
    if (chunkIndex === 0) {
      chunkStorage.set(fileId, { chunks: [], totalSize: 0 });
    }

    const storage = chunkStorage.get(fileId);
    if (!storage) {
      return NextResponse.json(
        { success: false, error: 'Upload session not found. Please start from the beginning.' },
        { status: 400 }
      );
    }

    // Add chunk to storage
    storage.chunks[chunkIndex] = chunkBuffer;
    storage.totalSize += chunkBuffer.length;

    // Check file size limit (50MB)
    if (storage.totalSize > 50 * 1024 * 1024) {
      chunkStorage.delete(fileId);
      return NextResponse.json(
        { success: false, error: 'File too large (max 50MB)' },
        { status: 413 }
      );
    }

    // If this is the last chunk, combine all chunks and upload
    if (isLastChunk) {
      // Combine all chunks into a single buffer
      const fileBuffer = Buffer.concat(storage.chunks);
      
      // Upload to Vercel Blob
      const blob = await put(filename, fileBuffer, {
        access: 'public',
        addRandomSuffix: false,
      });

      console.log('Chunked upload: Updating database record for fileId:', fileId);
      console.log('Chunked upload: Blob URL:', blob.url);
      console.log('Chunked upload: File size:', fileBuffer.length);
      
      // Update database record with actual file info
      try {
        await updateFileRecord(fileId, {
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          size: fileBuffer.length,
        });
        console.log('Chunked upload: Database record updated successfully');
      } catch (dbError) {
        console.error('Chunked upload: Failed to update database record:', dbError);
        throw dbError;
      }

      // Calculate expiration date (3 days from now)
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      // Return the shortened URL format
      const baseUrl = process.env.BLOBZIP_URL || 
                     (request.headers.get('host') ? 
                      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                      'http://localhost:3000');
      
      const shortenedUrl = `${baseUrl}/${fileId}`;

      // Clean up chunk storage
      chunkStorage.delete(fileId);

      return NextResponse.json({
        success: true,
        id: fileId,
        url: shortenedUrl,
        filename,
        size: fileBuffer.length,
        expiresAt: expiresAt.toISOString(),
        completed: true,
      });
    } else {
      // Return progress information for intermediate chunks
      return NextResponse.json({
        success: true,
        chunkIndex,
        totalChunks: storage.chunks.length,
        completed: false,
      });
    }
  } catch (error) {
    console.error('Chunked upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file chunk' },
      { status: 500 }
    );
  }
}

// Initialize chunked upload session
export async function POST(request: NextRequest): Promise<NextResponse<ChunkedUploadResponse>> {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const filename = searchParams.get('filename');
    
    if (!fileId || !filename) {
      return NextResponse.json(
        { success: false, error: 'Missing fileId or filename' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { totalSize } = body;

    // Initialize chunk storage
    chunkStorage.set(fileId, { chunks: [], totalSize: 0 });

    // Calculate optimal chunk size (1MB chunks)
    const chunkSize = 1024 * 1024; // 1MB
    const totalChunks = Math.ceil(totalSize / chunkSize);

    return NextResponse.json({
      success: true,
      chunkSize,
      totalChunks,
      completed: false,
    });
  } catch (error) {
    console.error('Chunked upload initialization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize chunked upload' },
      { status: 500 }
    );
  }
} 