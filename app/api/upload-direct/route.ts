import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, updateFileRecord } from '../../../lib/db';

export const runtime = 'nodejs';

// Handle direct file upload
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await initializeDatabase();
    
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const filename = searchParams.get('filename');

    if (!fileId || !filename) {
      return NextResponse.json(
        { error: 'Missing fileId or filename' },
        { status: 400 }
      );
    }

    console.log('Upload direct: Processing upload for fileId:', fileId, 'filename:', filename);

    // Check content length to determine if this is a large file
    const contentLength = request.headers.get('content-length');
    const fileSize = contentLength ? parseInt(contentLength, 10) : 0;
    
    // If file is larger than 4MB, return a specific error that tells the client to use chunked upload
    if (fileSize > 4 * 1024 * 1024) {
      console.log('Upload direct: Large file detected, instructing client to use chunked upload');
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'FILE_TOO_LARGE_FOR_DIRECT_UPLOAD',
          message: 'File is too large for direct upload. Please use chunked upload.',
          fileSize,
          maxDirectUploadSize: 4 * 1024 * 1024,
          useChunkedUpload: true,
          fileId,
          filename
        },
        { status: 413 }
      );
    }

    // For smaller files, use streaming approach to handle them efficiently
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

    console.log('Upload direct: Total file size:', totalSize, 'bytes');

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

    console.log('Upload direct: Blob upload successful:', {
      url: blob.url,
      pathname: blob.pathname
    });

    // Update database record with actual file info
    try {
      await updateFileRecord(fileId, {
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        size: fileBuffer.length,
      });
      console.log('Upload direct: Database record updated successfully');
    } catch (dbError) {
      console.error('Upload direct: Failed to update database record:', dbError);
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

    console.log('Upload direct: Returning success response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Upload direct error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}