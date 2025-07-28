import { head } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

interface DownloadErrorResponse {
  error: string;
  details?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<DownloadErrorResponse> | Response> {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const pathname = searchParams.get('pathname');

    if (!url && !pathname) {
      return NextResponse.json(
        { error: 'URL or pathname is required' }, 
        { status: 400 }
      );
    }

    // If URL is provided, redirect to it
    if (url) {
      return NextResponse.redirect(url);
    }

    // If pathname is provided, get the blob info and redirect
    if (pathname) {
      try {
        const blob = await head(pathname);
        return NextResponse.redirect(blob.url);
      } catch (error) {
        return NextResponse.json(
          { error: 'File not found' }, 
          { status: 404 }
        );
      }
    }

    // This should never be reached due to the initial check, but TypeScript requires it
    return NextResponse.json(
      { error: 'Invalid request parameters' }, 
      { status: 400 }
    );
  } catch (error) {
    console.error('Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: 'Failed to download file',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
} 