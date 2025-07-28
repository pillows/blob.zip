import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getAllFiles, getFileById, deleteFileRecord } from '../../../../lib/db';

interface AdminFileData {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
  downloadCount: number;
  ipAddress: string;
  userAgent: string;
  downloadedAt: string | null;
}

interface AdminFilesResponse {
  success: boolean;
  files?: AdminFileData[];
  count?: number;
  error?: string;
}

interface DeleteFilesRequest {
  ids: string[];
}

interface DeleteFilesResponse {
  success: boolean;
  deletedCount?: number;
  errors?: string[];
  error?: string;
}

// Helper function to check admin authentication
// In a real app, you'd use proper session management or JWT tokens
function isValidAdminRequest(request: NextRequest): boolean {
  // For now, we'll just check if the request comes from the same origin
  // In production, implement proper session/token validation
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Allow requests from the admin panel
  return !!(referer && referer.includes('/admin'));
}

export async function GET(request: NextRequest): Promise<NextResponse<AdminFilesResponse>> {
  try {
    // Basic admin check (implement proper auth in production)
    if (!isValidAdminRequest(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await initializeDatabase();
    
    // Get all files with admin data
    const result = await getAllFiles();
    
    const baseUrl = process.env.BLOBZIP_URL || 
                   (request.headers.get('host') ? 
                    `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                    'http://localhost:3000');

    const files: AdminFileData[] = result.map(file => ({
      id: file.id,
      filename: file.filename,
      url: `${baseUrl}/${file.id}`,
      size: parseInt(file.size),
      uploadedAt: file.uploaded_at,
      downloadCount: file.download_count,
      ipAddress: file.ip_address || 'Unknown',
      userAgent: file.user_agent || 'Unknown',
      downloadedAt: file.downloaded_at,
    }));

    return NextResponse.json({
      success: true,
      files,
      count: files.length
    });
  } catch (error) {
    console.error('Admin files GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<DeleteFilesResponse>> {
  try {
    // Basic admin check
    if (!isValidAdminRequest(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await initializeDatabase();

    const body: DeleteFilesRequest = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File IDs array is required' },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    let deletedCount = 0;

    // Process each file deletion
    for (const id of ids) {
      try {
        // Get file info
        const file = await getFileById(id);
        if (!file) {
          errors.push(`File ${id} not found`);
          continue;
        }

        // Delete from Vercel Blob
        try {
          await del(file.blob_pathname);
        } catch (blobError) {
          console.warn(`Failed to delete blob for ${id}:`, blobError);
          // Continue with database deletion even if blob deletion fails
        }

        // Mark as deleted in database
        await deleteFileRecord(id);
        deletedCount++;

      } catch (error) {
        errors.push(`Failed to delete ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Admin files DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete files' },
      { status: 500 }
    );
  }
} 