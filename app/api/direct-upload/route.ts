import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, isIpBanned, createFileRecord } from '../../../lib/db';
import { notifyFileUpload } from '../../../lib/discord';

interface DirectUploadResponse {
  success: boolean;
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  expiresAt?: string;
  error?: string;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function PUT(request: NextRequest): Promise<NextResponse<DirectUploadResponse>> {
  try {
    await initializeDatabase();

    // Check IP ban
    const clientIP = getClientIP(request);
    if (await isIpBanned(clientIP)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const filename = searchParams.get('filename');

    if (!fileId || !filename) {
      return NextResponse.json(
        { success: false, error: 'Missing fileId or filename' },
        { status: 400 }
      );
    }

    // Get file size from content-length header
    const contentLength = request.headers.get('content-length');
    const fileSize = contentLength ? parseInt(contentLength) : 0;

    // Get the file content as a stream
    const body = request.body;
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'No file content provided' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob using the stream
    const blob = await put(filename, body, {
      access: 'public',
      addRandomSuffix: false,
    });

    // Create database record
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    await createFileRecord({
      id: fileId,
      filename,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      size: fileSize,
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Send Discord notification if webhook is configured
    const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhook) {
      const baseUrl = process.env.BLOBZIP_URL || 
                     (request.headers.get('host') ? 
                      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                      'http://localhost:3000');
      const downloadUrl = `${baseUrl}/${fileId}`;
      
      // Fire and forget - don't wait for Discord webhook
      notifyFileUpload({
        webhookUrl: discordWebhook,
        fileId,
        filename,
        size: fileSize,
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
        downloadUrl,
        expiresAt,
      }).catch(error => {
        console.error('Discord webhook error:', error);
      });
    }

    const baseUrl = process.env.BLOBZIP_URL || 
                   (request.headers.get('host') ? 
                    `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 
                    'http://localhost:3000');

    return NextResponse.json({
      success: true,
      id: fileId,
      url: `${baseUrl}/${fileId}`,
      filename,
      size: fileSize,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Direct upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to upload file',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
} 