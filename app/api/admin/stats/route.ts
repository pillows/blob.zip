import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, db } from '../../../../lib/db';

interface AdminStatsData {
  totalFiles: number;
  totalSize: number;
  todayUploads: number;
  expiringSoon: number;
}

interface AdminStatsResponse {
  success: boolean;
  stats?: AdminStatsData;
  error?: string;
}

// Helper function to check admin authentication
function isValidAdminRequest(request: NextRequest): boolean {
  const referer = request.headers.get('referer');
  return !!(referer && referer.includes('/admin'));
}

export async function GET(request: NextRequest): Promise<NextResponse<AdminStatsResponse>> {
  try {
    // Basic admin check
    if (!isValidAdminRequest(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await initializeDatabase();

    // Get total files and size
    const totalResult = await db.query(`
      SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(size), 0) as total_size
      FROM files 
      WHERE deleted_at IS NULL 
      AND expires_at > NOW()
    `);

    // Get today's uploads
    const todayResult = await db.query(`
      SELECT COUNT(*) as today_uploads
      FROM files 
      WHERE DATE(uploaded_at) = CURRENT_DATE
      AND deleted_at IS NULL
    `);

    // Get files expiring in next 24 hours
    const expiringResult = await db.query(`
      SELECT COUNT(*) as expiring_soon
      FROM files 
      WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      AND deleted_at IS NULL
    `);

    const stats: AdminStatsData = {
      totalFiles: parseInt(totalResult.rows[0].total_files),
      totalSize: parseInt(totalResult.rows[0].total_size),
      todayUploads: parseInt(todayResult.rows[0].today_uploads),
      expiringSoon: parseInt(expiringResult.rows[0].expiring_soon),
    };

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
} 