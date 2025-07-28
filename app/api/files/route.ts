import { NextResponse } from 'next/server';

// File listing and deletion are now admin-only features
// Regular users can only upload files and access them via direct URLs

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      success: false,
      error: 'File listing is restricted to administrators',
      message: 'Files can be accessed directly via their upload URLs'
    },
    { status: 403 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      success: false,
      error: 'File deletion is restricted to administrators',
      message: 'Files expire automatically after 3 days'
    },
    { status: 403 }
  );
} 