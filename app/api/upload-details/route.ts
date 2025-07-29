import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, db } from '../../../lib/db';

interface UploadDetailsRequest {
  blobUrl: string;
  filename: string;
  size: number;
}

interface UploadDetailsResponse {
  success: boolean;
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  expiresAt?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadDetailsResponse>> {
  try {
    await initializeDatabase();

    const body: UploadDetailsRequest = await request.json();
    const { blobUrl, filename, size } = body;

    if (!blobUrl || !filename) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Query the database to find the file record by blob URL
    const result = await db.query(
      'SELECT id, filename, blob_url, size, expires_at FROM files WHERE blob_url = $1 ORDER BY uploaded_at DESC LIMIT 1',
      [blobUrl]
    );

    if (result.rows.length > 0) {
      const file = result.rows[0];
      const baseUrl = process.env.BLOBZIP_URL || 
                     (request.headers.get('host') ? 
                      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                      'http://localhost:3000');

      return NextResponse.json({
        success: true,
        id: file.id,
        url: `${baseUrl}/${file.id}`,
        filename: file.filename,
        size: file.size,
        expiresAt: file.expires_at,
      });
    } else {
      // If not found in database, return basic info
      // This might happen if the upload completed but database record creation failed
      return NextResponse.json({
        success: true,
        id: 'unknown',
        url: blobUrl,
        filename,
        size,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  } catch (error) {
    console.error('Upload details error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get upload details' },
      { status: 500 }
    );
  }
} 