import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, updateFileRecord, getFileById } from '../../../lib/db';

// Use Node.js runtime for database compatibility
export const runtime = 'nodejs';

interface UploadCompleteRequest {
  blobUrl: string;
  blobPathname: string;
  size: number;
}

interface UploadCompleteResponse {
  success: boolean;
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  expiresAt?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadCompleteResponse>> {
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

    // Get the upload completion data
    const body: UploadCompleteRequest = await request.json();
    const { blobUrl, blobPathname, size } = body;

    if (!blobUrl || !blobPathname || !size) {
      return NextResponse.json(
        { success: false, error: 'Missing required upload information' },
        { status: 400 }
      );
    }

    console.log('Upload complete: Updating database record for fileId:', fileId);
    console.log('Upload complete: Blob URL:', blobUrl);
    console.log('Upload complete: File size:', size);

    // Update database record with actual file info
    try {
      await updateFileRecord(fileId, {
        blobUrl: blobUrl,
        blobPathname: blobPathname,
        size: size,
      });
      console.log('Upload complete: Database record updated successfully');
    } catch (dbError) {
      console.error('Upload complete: Failed to update database record:', dbError);
      throw dbError;
    }

    // Get the updated file record
    const file = await getFileById(fileId);
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File record not found' },
        { status: 404 }
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
      filename: file.filename,
      size: file.size,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Upload complete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete upload' },
      { status: 500 }
    );
  }
} 