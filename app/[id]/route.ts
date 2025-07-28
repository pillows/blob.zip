import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getFileById, markFileAsDownloaded } from '../../lib/db';

interface DownloadErrorResponse {
  error: string;
  details?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<DownloadErrorResponse> | Response> {
  try {
    await initializeDatabase();

    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'File ID is required' }, 
        { status: 400 }
      );
    }

    // Get file from database
    const file = await getFileById(id);
    if (!file) {
      return NextResponse.json(
        { error: 'File not found or expired' }, 
        { status: 404 }
      );
    }

    // Check if file has already been downloaded
    if (file.downloaded_at) {
      return NextResponse.json(
        { 
          error: 'File no longer available',
          message: 'This file has already been downloaded and is no longer accessible. Files can only be downloaded once.',
          downloadedAt: file.downloaded_at
        }, 
        { status: 410 } // 410 Gone
      );
    }

    // Mark file as downloaded (this prevents future downloads)
    await markFileAsDownloaded(id);

    // Redirect to the actual blob URL
    return NextResponse.redirect(file.blob_url);
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