import { NextRequest, NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';
import { initializeDatabase, createFileRecord } from '../../../lib/db';

// Create nanoid with only alphanumeric characters (no underscores or dashes)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const { filename } = await request.json();
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Generate short ID
    const fileId = nanoid();
    const clientIP = getClientIP(request);

    // Create database record with pending status
    await createFileRecord({
      id: fileId,
      filename,
      blobUrl: '', // Will be updated after upload
      blobPathname: '', // Will be updated after upload
      size: 0, // Will be updated after upload
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent') || '',
    });

    return NextResponse.json({
      success: true,
      fileId,
      filename,
    });
  } catch (error) {
    console.error('Create upload record error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create upload record' },
      { status: 500 }
    );
  }
}