import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

interface UploadResponse {
  success: boolean;
  url?: string;
  downloadUrl?: string;
  pathname?: string;
  size?: number;
  uploadedAt?: string;
  error?: string;
  details?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' }, 
        { status: 400 }
      );
    }

    if (!request.body) {
      return NextResponse.json(
        { success: false, error: 'File body is required' },
        { status: 400 }
      );
    }

    // Upload the file to Vercel Blob
    const blob = await put(filename, request.body, {
      access: 'public',
      addRandomSuffix: true, // Prevents naming conflicts
    });

    // Return the blob information
    return NextResponse.json({
      success: true,
      url: blob.url,
      downloadUrl: blob.url, // Use the same URL for download
      pathname: blob.pathname,
      uploadedAt: new Date().toISOString(),
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