import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, updateFileRecord } from '../../../lib/db';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Use Node.js runtime for database compatibility
export const runtime = 'nodejs';

interface UploadStreamResponse {
  success: boolean;
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  expiresAt?: string;
  error?: string;
}

// Temporary directory for storing chunks
const TEMP_DIR = '/tmp/chunks';

export async function PUT(request: NextRequest): Promise<NextResponse<UploadStreamResponse>> {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const filename = searchParams.get('filename');
    const chunkIndex = searchParams.get('chunkIndex');
    const isLastChunk = searchParams.get('isLastChunk') === 'true';
    
    if (!fileId || !filename) {
      return NextResponse.json(
        { success: false, error: 'Missing fileId or filename' },
        { status: 400 }
      );
    }

    console.log('Upload stream: Processing upload for fileId:', fileId, 'filename:', filename);

    // Check if this is a chunked upload
    if (chunkIndex !== null) {
      return handleChunkedUpload(request, fileId, filename, parseInt(chunkIndex), isLastChunk);
    }

    // Handle single file upload (existing logic)
    return handleSingleFileUpload(request, fileId, filename);
  } catch (error) {
    console.error('Upload stream error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

async function handleChunkedUpload(
  request: NextRequest, 
  fileId: string, 
  filename: string, 
  chunkIndex: number, 
  isLastChunk: boolean
): Promise<NextResponse<UploadStreamResponse>> {
  console.log(`Upload stream: Processing chunk ${chunkIndex} for fileId: ${fileId}`);

  // Ensure temp directory exists
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }

  // Read the chunk data
  const chunkData = await request.arrayBuffer();
  const chunk = new Uint8Array(chunkData);

  // Store chunk to file system
  const chunkPath = join(TEMP_DIR, `${fileId}_chunk_${chunkIndex}`);
  await writeFile(chunkPath, chunk);

  console.log(`Upload stream: Stored chunk ${chunkIndex} to ${chunkPath}, size: ${chunk.length} bytes`);

  // If this is the last chunk, combine all chunks and upload
  if (isLastChunk) {
    console.log('Upload stream: Last chunk received, combining and uploading');
    
    // Find all chunks for this file
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    let currentChunkIndex = 0;
    
    while (true) {
      const currentChunkPath = join(TEMP_DIR, `${fileId}_chunk_${currentChunkIndex}`);
      if (!existsSync(currentChunkPath)) {
        break;
      }
      
      const chunkData = await readFile(currentChunkPath);
      chunks.push(chunkData);
      totalSize += chunkData.length;
      currentChunkIndex++;
    }

    console.log(`Upload stream: Found ${chunks.length} chunks, total size: ${totalSize} bytes`);

    // Combine all chunks
    const combinedBuffer = new Uint8Array(totalSize);
    let offset = 0;
    
    for (const chunk of chunks) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Upload to Vercel Blob
    const blob = await put(filename, combinedBuffer, {
      access: 'public',
      addRandomSuffix: false,
    });

    console.log('Upload stream: Blob upload successful:', {
      url: blob.url,
      pathname: blob.pathname
    });

    // Update database record
    try {
      await updateFileRecord(fileId, {
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        size: totalSize,
      });
      console.log('Upload stream: Database record updated successfully');
    } catch (dbError) {
      console.error('Upload stream: Failed to update database record:', dbError);
      throw dbError;
    }

    // Clean up chunk files
    for (let i = 0; i < chunks.length; i++) {
      const chunkPath = join(TEMP_DIR, `${fileId}_chunk_${i}`);
      try {
        await unlink(chunkPath);
      } catch (error) {
        console.warn(`Failed to delete chunk file ${chunkPath}:`, error);
      }
    }

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
      size: totalSize,
      expiresAt: expiresAt.toISOString(),
    };

    console.log('Upload stream: Returning success response:', response);
    return NextResponse.json(response);
  }

  // Return success for intermediate chunks
  return NextResponse.json({
    success: true,
    message: `Chunk ${chunkIndex} uploaded successfully`,
  });
}

async function handleSingleFileUpload(
  request: NextRequest, 
  fileId: string, 
  filename: string
): Promise<NextResponse<UploadStreamResponse>> {
  console.log('Upload stream: Processing single file upload');

  // Use streaming approach to handle large files efficiently
  const chunks: Uint8Array[] = [];
  let totalSize = 0;
  const maxTotalSize = 100 * 1024 * 1024; // 100MB limit

  // Read the request body as a stream
  const reader = request.body?.getReader();
  if (!reader) {
    return NextResponse.json(
      { success: false, error: 'No request body' },
      { status: 400 }
    );
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      totalSize += value.length;
      
      // Check file size limit (100MB)
      if (totalSize > maxTotalSize) {
        return NextResponse.json(
          { success: false, error: 'File too large (max 100MB)' },
          { status: 413 }
        );
      }
    }
  } finally {
    reader.releaseLock();
  }

  console.log('Upload stream: Total file size:', totalSize, 'bytes');

  // Combine chunks into a single buffer
  const fileBuffer = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    fileBuffer.set(chunk, offset);
    offset += chunk.length;
  }

  // Upload to Vercel Blob
  const blob = await put(filename, fileBuffer, {
    access: 'public',
    addRandomSuffix: false,
  });

  console.log('Upload stream: Updating database record for fileId:', fileId);
  console.log('Upload stream: Blob URL:', blob.url);
  console.log('Upload stream: Blob pathname:', blob.pathname);
  console.log('Upload stream: File size:', fileBuffer.length);
  
  // Update database record with actual file info
  try {
    await updateFileRecord(fileId, {
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      size: fileBuffer.length,
    });
    console.log('Upload stream: Database record updated successfully');
  } catch (dbError) {
    console.error('Upload stream: Failed to update database record:', dbError);
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

  const response = {
    success: true,
    id: fileId,
    url: shortenedUrl,
    filename,
    size: fileBuffer.length,
    expiresAt: expiresAt.toISOString(),
  };

  console.log('Upload stream: Returning success response:', response);
  return NextResponse.json(response);
} 