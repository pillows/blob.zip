import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

// Use Edge Runtime for better handling of large files
export const runtime = 'edge';

interface UploadEdgeResponse {
  success: boolean;
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  expiresAt?: string;
  error?: string;
}

export async function PUT(request: NextRequest): Promise<NextResponse<UploadEdgeResponse>> {
  // Redirect to the new streaming upload endpoint
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');
  const filename = searchParams.get('filename');
  
  if (!fileId || !filename) {
    return NextResponse.json(
      { success: false, error: 'Missing fileId or filename' },
      { status: 400 }
    );
  }

  // Redirect to the streaming endpoint
  const baseUrl = process.env.BLOBZIP_URL || 
                 (request.headers.get('host') ? 
                  `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                  'http://localhost:3000');
  
  const streamUrl = `${baseUrl}/api/upload-stream?fileId=${fileId}&filename=${encodeURIComponent(filename)}`;
  
  // Forward the request to the streaming endpoint
  const streamResponse = await fetch(streamUrl, {
    method: 'PUT',
    body: request.body,
    headers: request.headers,
  });
  
  // Convert the response to NextResponse
  const responseData = await streamResponse.json();
  return NextResponse.json(responseData, { status: streamResponse.status });
} 