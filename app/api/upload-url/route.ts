import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, isIpBanned, createFileRecord } from '../../../lib/db';
import { customAlphabet } from 'nanoid';

// Create nanoid with only alphanumeric characters (no underscores or dashes)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

interface UploadUrlRequest {
  filename: string;
  contentType?: string;
}

interface UploadUrlResponse {
  success: boolean;
  fileId?: string;
  uploadUrl?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadUrlResponse>> {
  try {
    await initializeDatabase();

    // Check IP ban
    const clientIP = getClientIP(request);
    if (await isIpBanned(clientIP)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const body: UploadUrlRequest = await request.json();
    const { filename } = body;

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Generate short ID for this upload
    const fileId = nanoid();

    // Create database record with pending status
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    await createFileRecord({
      id: fileId,
      filename,
      blobUrl: '', // Will be updated after upload
      blobPathname: '', // Will be updated after upload
      size: 0, // Will be updated after upload
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent') || '',
    });

    // Generate a presigned upload URL for direct client-to-blob upload
    const baseUrl = process.env.BLOBZIP_URL || 
                   (request.headers.get('host') ? 
                    `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                    'http://localhost:3000');

    const uploadUrl = `${baseUrl}/api/upload-stream?fileId=${fileId}&filename=${encodeURIComponent(filename)}`;

    return NextResponse.json({
      success: true,
      fileId,
      uploadUrl,
    });
  } catch (error) {
    console.error('Upload URL generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
} 