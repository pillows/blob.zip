import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, db } from '../../../lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await initializeDatabase();
    
    // Test database connection
    const result = await db.query('SELECT NOW() as current_time');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      currentTime: result.rows[0].current_time,
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 