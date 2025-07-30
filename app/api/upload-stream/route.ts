import { put, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, updateFileRecord, createFileRecord } from '../../../lib/db';

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

// In-memory storage for chunk URLs (temporary solution)
const chunkStorage = new Map<string, { urls: string[], pathnames: string[], filename: string }>();

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

  // Read the chunk data
  const chunkData = await request.arrayBuffer();
  const chunk = new Uint8Array(chunkData);

  // Upload this chunk as a separate blob
  const chunkBlobName = `${fileId}_chunk_${chunkIndex}`;
  const chunkBlob = await put(chunkBlobName, chunk, {
    access: 'public',
    addRandomSuffix: false,
  });

  console.log(`Upload stream: Uploaded chunk ${chunkIndex} as blob: ${chunkBlob.url}`);

  // Store chunk URL in memory (temporary solution)
  if (!chunkStorage.has(fileId)) {
    chunkStorage.set(fileId, { urls: [], pathnames: [], filename });
  }
  const fileChunks = chunkStorage.get(fileId)!;
  
  // Ensure we have space for this chunk
  while (fileChunks.urls.length <= chunkIndex) {
    fileChunks.urls.push('');
    fileChunks.pathnames.push('');
  }
  fileChunks.urls[chunkIndex] = chunkBlob.url;
  fileChunks.pathnames[chunkIndex] = chunkBlob.pathname;

  // If this is the last chunk, combine all chunks and create the final file
  if (isLastChunk) {
    console.log('Upload stream: Last chunk received, combining chunks');
    
    try {
      // Download all chunks using their blob URLs
      const chunks: Uint8Array[] = [];
      let totalSize = 0;
      
      for (let i = 0; i < fileChunks.urls.length; i++) {
        const chunkUrl = fileChunks.urls[i];
        if (!chunkUrl) {
          console.log(`Missing chunk ${i}, stopping`);
          break;
        }
        
        console.log(`Downloading chunk ${i} from ${chunkUrl}`);
        const chunkResponse = await fetch(chunkUrl);
        if (!chunkResponse.ok) {
          throw new Error(`Failed to download chunk ${i}`);
        }
        
        const chunkData = await chunkResponse.arrayBuffer();
        const chunk = new Uint8Array(chunkData);
        chunks.push(chunk);
        totalSize += chunk.length;
      }

      if (chunks.length === 0) {
        throw new Error('No chunks found to combine');
      }

      console.log(`Downloaded ${chunks.length} chunks, total size: ${totalSize} bytes`);

      // Combine all chunks
      const combinedBuffer = new Uint8Array(totalSize);
      let offset = 0;
      
      for (const chunk of chunks) {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Upload the combined file
      const finalBlob = await put(filename, combinedBuffer, {
        access: 'public',
        addRandomSuffix: false,
      });

      console.log('Upload stream: Combined file uploaded successfully:', {
        url: finalBlob.url,
        pathname: finalBlob.pathname
      });

      // Update database record with final file info
      await updateFileRecord(fileId, {
        blobUrl: finalBlob.url,
        blobPathname: finalBlob.pathname,
        size: totalSize,
      });

      // Clean up chunk blobs from Vercel Blob storage
      console.log('Cleaning up chunk blobs...');
      for (let i = 0; i < fileChunks.pathnames.length; i++) {
        const chunkPathname = fileChunks.pathnames[i];
        if (chunkPathname) {
          try {
            console.log(`Deleting chunk blob: ${chunkPathname}`);
            await del(chunkPathname);
            console.log(`Successfully deleted chunk blob: ${chunkPathname}`);
          } catch (error) {
            console.error(`Failed to delete chunk blob ${i}:`, error);
            // Continue with other chunks even if one fails
          }
        }
      }

      // Clean up chunk storage
      chunkStorage.delete(fileId);

      // Calculate expiration date (3 days from now)
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const baseUrl = process.env.BLOBZIP_URL || 
                     (request.headers.get('host') ? 
                      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                      'http://localhost:3000');
      
      const shortenedUrl = `${baseUrl}/${fileId}`;

      return NextResponse.json({
        success: true,
        id: fileId,
        url: shortenedUrl,
        filename,
        size: totalSize,
        expiresAt: expiresAt.toISOString(),
      });

    } catch (error) {
      console.error('Upload stream: Failed to combine chunks:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to combine chunks' },
        { status: 500 }
      );
    }
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
  
  // Create or update database record with actual file info
  try {
    // First try to update existing record
    await updateFileRecord(fileId, {
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      size: fileBuffer.length,
    });
    console.log('Upload stream: Database record updated successfully');
  } catch (dbError) {
    console.log('Upload stream: No existing record found, creating new one');
    
    // If update fails, create a new record
    try {
      await createFileRecord({
        id: fileId,
        filename,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        size: fileBuffer.length,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                  request.headers.get('x-real-ip') || 
                  '127.0.0.1',
        userAgent: request.headers.get('user-agent') || '',
      });
      console.log('Upload stream: Database record created successfully');
    } catch (createError) {
      console.error('Upload stream: Failed to create database record:', createError);
      throw createError;
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
    size: fileBuffer.length,
    expiresAt: expiresAt.toISOString(),
  };

  console.log('Upload stream: Returning success response:', response);
  return NextResponse.json(response);
} 