import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';
import { initializeDatabase, isIpBanned, createFileRecord } from '../../../lib/db';

// Create nanoid with only alphanumeric characters (no underscores or dashes)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

interface UploadResponse {
  success: boolean;
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  expiresAt?: string;
  error?: string;
  details?: string;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    console.log('Upload: Starting upload process');
    
    // Initialize database
    console.log('Upload: Initializing database...');
    await initializeDatabase();
    console.log('Upload: Database initialized successfully');

    // Check IP ban
    const clientIP = getClientIP(request);
    console.log('Upload: Client IP:', clientIP);
    if (await isIpBanned(clientIP)) {
      console.log('Upload: IP is banned');
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    console.log('Upload: IP check passed');

    // Get filename from query params or form data
    const { searchParams } = new URL(request.url);
    let filename = searchParams.get('f') || searchParams.get('filename');

    if (!filename) {
      // Try to get from form data
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (file) {
        filename = file.name;
        // Convert file to body for blob upload
        request = new NextRequest(request.url, {
          method: 'POST',
          body: file.stream(),
          headers: request.headers,
        });
      }
    }

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required. Use ?f=filename.ext or form data' }, 
        { status: 400 }
      );
    }

    if (!request.body) {
      return NextResponse.json(
        { success: false, error: 'File body is required' },
        { status: 400 }
      );
    }

    // Read the body into a buffer to get file size and use for upload
    const bodyBuffer = Buffer.from(await request.arrayBuffer());
    const fileSize = bodyBuffer.length;
    console.log('Upload: File size:', fileSize, 'bytes');

    // Generate short ID
    const fileId = nanoid();
    console.log('Upload: Generated file ID:', fileId);

    // Upload to Vercel Blob
    console.log('Upload: Starting Vercel Blob upload...');
    const blob = await put(filename, bodyBuffer, {
      access: 'public',
      addRandomSuffix: false,
    });
    console.log('Upload: Vercel Blob upload successful:', {
      url: blob.url,
      pathname: blob.pathname
    });

    // Create database record
    console.log('Upload: Creating database record...');
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    try {
      await createFileRecord({
        id: fileId,
        filename,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        size: fileSize,
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
      });
      console.log('Upload: Database record created successfully');
    } catch (dbError) {
      console.error('Upload: Failed to create database record:', dbError);
      throw dbError;
    }

    const baseUrl = process.env.BLOBZIP_URL || 
                   (request.headers.get('host') ? 
                    `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                    'http://localhost:3000');

    const response = {
      success: true,
      id: fileId,
      url: `${baseUrl}/${fileId}`,
      filename,
      size: fileSize,
      expiresAt: expiresAt.toISOString(),
    };
    console.log('Upload: Returning success response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to upload file',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
} 