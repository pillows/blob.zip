import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, db } from '../../../lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Debug DB: Starting database test');
    console.log('Debug DB: DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('Debug DB: NODE_ENV:', process.env.NODE_ENV);
    
    await initializeDatabase();
    console.log('Debug DB: Database initialized successfully');
    
    // Test database connection
    const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('Debug DB: Database query successful');
    
    // Test if files table exists
    const tableResult = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'files'
      ) as table_exists
    `);
    
    console.log('Debug DB: Files table exists:', tableResult.rows[0].table_exists);
    
    // Count files in table
    const countResult = await db.query('SELECT COUNT(*) as file_count FROM files');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      currentTime: result.rows[0].current_time,
      pgVersion: result.rows[0].pg_version,
      filesTableExists: tableResult.rows[0].table_exists,
      fileCount: countResult.rows[0].file_count,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('Debug DB: Database test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
        nodeEnv: process.env.NODE_ENV,
      },
      { status: 500 }
    );
  }
} 