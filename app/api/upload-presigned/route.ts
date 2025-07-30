import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, createFileRecord } from '../../../lib/db';
import { customAlphabet } from 'nanoid';

// Create nanoid with only alphanumeric characters (no underscores or dashes)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

// Use Node.js runtime for database compatibility
export const runtime = 'nodejs';

interface UploadPresignedResponse {
  success: boolean;
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  expiresAt?: string;
  error?: string;
}

// Handle POST requests for Vercel Blob client uploads
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await initializeDatabase();

    // Parse the request body to get file information
    const body = await request.json();
    
    let filename: string | undefined;
    let fileId: string | undefined;
    let contentType: string | undefined;

    // Handle different payload structures
    if (body.type === 'blob.generate-client-token' && body.payload) {
      // Vercel Blob client token structure
      filename = body.payload.pathname;
      contentType = body.payload.contentType;
      // Generate a fileId since it's not provided in this structure
      fileId = nanoid();
    } else {
      // Standard structure
      filename = body.filename;
      fileId = body.fileId;
      contentType = body.contentType;
    }

    if (!filename) {
      return NextResponse.json(
        { error: 'Missing filename or pathname' },
        { status: 400 }
      );
    }

    // Generate fileId if not provided
    if (!fileId) {
      fileId = nanoid();
    }

    console.log('Upload presigned: Generating direct upload info for fileId:', fileId, 'filename:', filename);

    // Create a database record first to track this upload
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';
    
    try {
      await createFileRecord({
        id: fileId,
        filename,
        blobUrl: '', // Will be updated after direct upload
        blobPathname: '', // Will be updated after direct upload
        size: 0, // Will be updated after direct upload
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
      });
      console.log('Upload presigned: Database record created for fileId:', fileId);
    } catch (dbError) {
      console.error('Upload presigned: Failed to create database record:', dbError);
      // Continue anyway, the upload can still proceed
    }

    // Return information for direct Vercel Blob upload
    // The client should use the @vercel/blob client SDK to upload directly
    return NextResponse.json({
      fileId: fileId,
      filename: filename,
      contentType: contentType || 'application/octet-stream',
      uploadMethod: 'direct',
      instructions: 'Use @vercel/blob client SDK to upload directly to Vercel Blob',
      // The client should call the completion endpoint after successful upload
      completionUrl: `${process.env.BLOBZIP_URL || 'https://blob.zip'}/api/upload-complete?fileId=${fileId}`,
    });
  } catch (error) {
    console.error('Presigned URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload information' },
      { status: 500 }
    );
  }
}

// Handle GET requests to return upload completion status
export async function GET(request: NextRequest): Promise<NextResponse<UploadPresignedResponse>> {
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
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Upload status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get upload status' },
      { status: 500 }
    );
  }
} 