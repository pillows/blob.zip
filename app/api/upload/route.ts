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
    // Initialize database
    await initializeDatabase();

    // Check IP ban
    const clientIP = getClientIP(request);
    if (await isIpBanned(clientIP)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

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

    // Generate short ID
    const fileId = nanoid();

    // Upload to Vercel Blob
    const blob = await put(filename, bodyBuffer, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Create database record
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    await createFileRecord({
      id: fileId,
      filename,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      size: fileSize,
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const baseUrl = process.env.BLOBZIP_URL || 
                   (request.headers.get('host') ? 
                    `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                    'http://localhost:3000');

    return NextResponse.json({
      success: true,
      id: fileId,
      url: `${baseUrl}/${fileId}`,
      filename,
      size: fileSize,
      expiresAt: expiresAt.toISOString(),
    });
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