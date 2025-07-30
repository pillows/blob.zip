import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, updateFileRecord } from '../../../lib/db';

// Use Node.js runtime for database compatibility
export const runtime = 'nodejs';

interface UploadPresignedResponse {
  success: boolean;
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  expiresAt?: string;
  error?: string;
}

// Handle POST requests for Vercel Blob client uploads
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await initializeDatabase();

    // Parse the request body to get file information
    const body = await request.json();
    const { filename, contentType, fileId } = body;
    if (!fileId || !filename) {
      return NextResponse.json(
        { error: 'Missing fileId or filename' },
        { status: 400 }
      );
    }

    // For large files, we'll use a direct upload URL that bypasses serverless limits
    const baseUrl = process.env.BLOBZIP_URL || 
                   (request.headers.get('host') ? 
                    `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                    'http://localhost:3000');

    // Use the upload-stream endpoint which has better handling for large files
    const uploadUrl = `${baseUrl}/api/upload-stream?fileId=${fileId}&filename=${encodeURIComponent(filename)}`;

    return NextResponse.json({
      uploadUrl: uploadUrl,
      method: 'PUT',
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
      },
    });
  } catch (error) {
    console.error('Presigned URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}

// Handle GET requests to return upload completion status
export async function GET(request: NextRequest): Promise<NextResponse<UploadPresignedResponse>> {
  try {
    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'Missing fileId' },
        { status: 400 }
      );
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
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Upload status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get upload status' },
      { status: 500 }
    );
  }
} 