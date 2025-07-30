import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getFileById, markFileAsDownloaded } from '../../lib/db';
import { notifyFileDownload } from '../../lib/discord';

interface DownloadErrorResponse {
  error: string;
  details?: string;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<DownloadErrorResponse> | Response> {
  try {
    await initializeDatabase();

    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'File ID is required' }, 
        { status: 400 }
      );
    }

    // Get file from database
    const file = await getFileById(id);
    if (!file) {
      return NextResponse.json(
        { error: 'File not found or expired' }, 
        { status: 404 }
      );
    }

    // Check if file has already been downloaded
    if (file.downloaded_at) {
      return NextResponse.json(
        { 
          error: 'File no longer available',
          message: 'This file has already been downloaded and is no longer accessible. Files can only be downloaded once.',
          downloadedAt: file.downloaded_at
        }, 
        { status: 410 } // 410 Gone
      );
    }

    // Get client info for Discord notification
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent');

    // Send Discord notification if webhook is configured
    const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhook) {
      // Fire and forget - don't wait for Discord webhook
      notifyFileDownload({
        webhookUrl: discordWebhook,
        fileId: file.id,
        filename: file.filename,
        size: file.size,
        ipAddress: clientIP,
        userAgent: userAgent || undefined,
        uploadedAt: new Date(file.uploaded_at),
      }).catch(error => {
        console.error('Discord webhook error:', error);
      });
    }

    // Mark file as downloaded immediately
    try {
      await markFileAsDownloaded(id);
      console.log('File marked as downloaded:', file.filename);
    } catch (error) {
      console.error('Failed to mark file as downloaded:', error);
      return NextResponse.json(
        { error: 'Failed to process download' },
        { status: 500 }
      );
    }

    // Delete from Vercel Blob storage after a delay
    setTimeout(async () => {
      try {
        console.log('Attempting to delete blob:', {
          filename: file.filename,
          blobUrl: file.blob_url,
          blobPathname: file.blob_pathname
        });
        
        // Temporarily disable deletion for testing
        console.log('Blob deletion temporarily disabled for testing');
        /*
        // Try using the Vercel Blob REST API directly
        try {
          const token = process.env.BLOB_READ_WRITE_TOKEN;
          if (!token) {
            console.error('BLOB_READ_WRITE_TOKEN not found in environment variables');
            return;
          }
          
          // Extract the blob pathname from the URL
          const urlParts = file.blob_url.split('/');
          const blobPathname = urlParts[urlParts.length - 1];
          
          const deleteResponse = await fetch(`https://api.vercel.com/v1/blobs/${blobPathname}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (deleteResponse.ok) {
            console.log('File deleted from Vercel Blob using REST API:', file.filename, 'pathname:', blobPathname);
          } else {
            console.error('Failed to delete using REST API:', deleteResponse.status, deleteResponse.statusText);
            throw new Error(`REST API deletion failed: ${deleteResponse.status}`);
          }
        } catch (restError) {
          console.log('Failed to delete using REST API, trying del() function:', restError);
          
          // Fallback to del() function
          try {
            await del(file.blob_pathname);
            console.log('File deleted from Vercel Blob using del() function:', file.filename, 'pathname:', file.blob_pathname);
          } catch (delError) {
            console.error('Failed to delete using del() function:', delError);
            throw delError;
          }
        }
        */
      } catch (error) {
        console.error('Failed to delete from Vercel Blob:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          filename: file.filename,
          blobUrl: file.blob_url,
          blobPathname: file.blob_pathname
        });
      }
    }, 5000); // 5 second delay

    // Redirect to the actual blob URL
    return NextResponse.redirect(file.blob_url);
  } catch (error) {
    console.error('Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: 'Failed to download file',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
} 