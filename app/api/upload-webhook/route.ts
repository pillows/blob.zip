import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, updateFileRecord } from '../../../lib/db';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await initializeDatabase();

    const body = await request.json();
    
    // Handle Vercel Blob webhook events
    if (body.type === 'blob.upload.completed') {
      const { blob, tokenPayload } = body;
      
      if (tokenPayload) {
        try {
          const payload = JSON.parse(tokenPayload);
          const fileId = payload.fileId as string;

          if (fileId) {
            // Update database record with actual file info
            await updateFileRecord(fileId, {
              blobUrl: blob.url,
              blobPathname: blob.pathname,
              size: blob.size || 0,
            });

            console.log(`File ${fileId} uploaded successfully via webhook: ${blob.url}`);
          }
        } catch (error) {
          console.error('Error parsing token payload:', error);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 