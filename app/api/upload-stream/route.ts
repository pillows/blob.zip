import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, updateFileRecord } from '../../../lib/db';

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

export async function PUT(request: NextRequest): Promise<NextResponse<UploadStreamResponse>> {
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

    // Use streaming approach to handle large files
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

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
        
        // Check file size limit (50MB)
        if (totalSize > 50 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, error: 'File too large (max 50MB)' },
            { status: 413 }
          );
        }
      }
    } finally {
      reader.releaseLock();
    }

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

    return NextResponse.json({
      success: true,
      id: fileId,
      url: shortenedUrl,
      filename,
      size: fileBuffer.length,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Upload stream error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 