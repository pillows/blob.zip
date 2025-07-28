import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, cleanupExpiredFiles } from '../../../lib/db';

interface CleanupResponse {
  success: boolean;
  deletedCount?: number;
  message?: string;
  error?: string;
  details?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<CleanupResponse>> {
  try {
    await initializeDatabase();

    // Get expired files
    const expiredFiles = await cleanupExpiredFiles();

    // Delete from Vercel Blob storage
    const deletionPromises = expiredFiles.map(async (file) => {
      try {
        await del(file.blob_pathname);
      } catch (error) {
        console.warn(`Failed to delete blob ${file.blob_pathname}:`, error);
      }
    });

    await Promise.allSettled(deletionPromises);

    return NextResponse.json({
      success: true,
      deletedCount: expiredFiles.length,
      message: `Cleaned up ${expiredFiles.length} expired files`,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to cleanup expired files',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// Allow GET for health checks or manual triggers
export async function GET(): Promise<NextResponse<CleanupResponse>> {
  return POST({} as NextRequest);
} 