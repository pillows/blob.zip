import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';
import { initializeDatabase, isIpBanned, createFileRecord } from '../../../lib/db';

// Create nanoid with only alphanumeric characters (no underscores or dashes)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await initializeDatabase();

    // Check IP ban
    const clientIP = getClientIP(request);
    if (await isIpBanned(clientIP)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Generate a short ID for this file
        const fileId = nanoid();
        
        // Extract filename from pathname or use the pathname itself
        const filename = pathname.split('/').pop() || pathname;

        return {
          allowedContentTypes: [
            'application/octet-stream', 
            'image/*', 
            'text/*', 
            'application/*',
            'video/*',
            'audio/*'
          ],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB limit
          pathname: filename, // Use original filename as pathname in Vercel Blob
          tokenPayload: JSON.stringify({
            fileId,
            filename,
            clientIP,
            userAgent: request.headers.get('user-agent') || undefined,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This runs after successful upload - create database record
        try {
          const payload = JSON.parse(tokenPayload || '{}');
          const { fileId, filename, clientIP, userAgent } = payload;

          if (fileId && filename) {
            const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
            await createFileRecord({
              id: fileId,
              filename,
              blobUrl: blob.url,
              blobPathname: blob.pathname,
                             size: 0, // Size will be determined from the client request
              ipAddress: clientIP,
              userAgent,
            });

            console.log('File record created:', { fileId, filename, url: blob.url });
          }
        } catch (error) {
          console.error('Error creating file record:', error);
          // Don't throw here - the upload was successful, just logging failed
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Upload handling error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
} 