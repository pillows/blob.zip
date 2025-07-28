import { list, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

interface FileData {
  url: string;
  downloadUrl: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

interface FilesGetResponse {
  success: boolean;
  files?: FileData[];
  count?: number;
  error?: string;
  details?: string;
}

interface FilesDeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
}

interface DeleteRequestBody {
  pathname: string;
}

export async function GET(): Promise<NextResponse<FilesGetResponse>> {
  try {
    // List all files
    const { blobs } = await list();
    
    const files: FileData[] = blobs.map(blob => ({
      url: blob.url,
      downloadUrl: blob.url, // Use the same URL for download
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt.toISOString(), // Convert Date to string
    }));

    return NextResponse.json({
      success: true,
      files,
      count: files.length
    });
  } catch (error) {
    console.error('Files GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch files',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<FilesDeleteResponse>> {
  try {
    const body: DeleteRequestBody = await request.json();
    const { pathname } = body;
    
    if (!pathname) {
      return NextResponse.json(
        { success: false, error: 'Pathname is required' }, 
        { status: 400 }
      );
    }

    await del(pathname);
    
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Files DELETE error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete file',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
} 