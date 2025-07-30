import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, db } from '../../../lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await initializeDatabase();
    
    // Get all files from database
    const result = await db.query(`
      SELECT id, filename, size, uploaded_at, expires_at, downloaded_at, deleted_at
      FROM files 
      ORDER BY uploaded_at DESC
      LIMIT 10
    `);
    
    return NextResponse.json({
      success: true,
      fileCount: result.rows.length,
      files: result.rows.map(file => ({
        id: file.id,
        filename: file.filename,
        size: file.size,
        uploadedAt: file.uploaded_at,
        expiresAt: file.expires_at,
        downloadedAt: file.downloaded_at,
        deletedAt: file.deleted_at,
        isExpired: new Date(file.expires_at) < new Date(),
        isDownloaded: !!file.downloaded_at,
        isDeleted: !!file.deleted_at
      }))
    });
  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to list files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 