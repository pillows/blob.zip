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
    
    // If file is larger than 4MB, redirect to upload-stream endpoint
    if (fileSize > 4 * 1024 * 1024) {
      console.log('Upload direct: Large file detected, redirecting to upload-stream');
      
      // Forward the request to the upload-stream endpoint
      const streamUrl = new URL('/api/upload-stream', request.url);
      streamUrl.searchParams.set('fileId', fileId);
      streamUrl.searchParams.set('filename', filename);
      
      const streamResponse = await fetch(streamUrl.toString(), {
        method: 'PUT',
        body: request.body,
        headers: request.headers,
      });
      
      // Return the response from the upload-stream endpoint
      const responseData = await streamResponse.json();
      return NextResponse.json(responseData, { status: streamResponse.status });
    }

    // For smaller files, process them directly
    console.log('Upload direct: Processing small file directly');

    // Read the file data from the request
    const fileData = await request.arrayBuffer();
    const fileBuffer = Buffer.from(fileData);

    console.log('Upload direct: File size:', fileBuffer.length, 'bytes');

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