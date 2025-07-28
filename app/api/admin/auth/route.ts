import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, isIpBanned, recordLoginAttempt, getRecentFailedAttempts, shouldBanIP, banIP } from '../../../../lib/db';

interface AuthRequest {
  password: string;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  remaining?: number;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse>> {
  try {
    await initializeDatabase();

    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Check if IP is already banned
    if (await isIpBanned(clientIP)) {
      return NextResponse.json(
        { success: false, error: 'Access denied - IP banned' },
        { status: 403 }
      );
    }

    const body: AuthRequest = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    // Check recent failed attempts
    const recentFailed = await getRecentFailedAttempts(clientIP, 15);
    const maxAttempts = 5;
    
    if (recentFailed >= maxAttempts) {
      // Auto-ban IP after too many failed attempts
      await banIP(clientIP, 'Too many failed admin login attempts', 24);
      await recordLoginAttempt(clientIP, false, userAgent);
      
      return NextResponse.json(
        { success: false, error: 'Too many failed attempts - IP banned for 24 hours' },
        { status: 429 }
      );
    }

    // Check password (in production, this should be properly hashed)
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable not set');
      return NextResponse.json(
        { success: false, error: 'Admin access not configured' },
        { status: 500 }
      );
    }

    const isValidPassword = password === adminPassword;

    // Record the login attempt
    await recordLoginAttempt(clientIP, isValidPassword, userAgent);

    if (!isValidPassword) {
      const remaining = Math.max(0, maxAttempts - recentFailed - 1);
      
      // Check if this failed attempt should trigger a ban
      if (await shouldBanIP(clientIP)) {
        await banIP(clientIP, 'Multiple failed admin login attempts', 24);
        return NextResponse.json(
          { success: false, error: 'Invalid password - IP banned for repeated failures' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid password',
          remaining: remaining
        },
        { status: 401 }
      );
    }

    // Successful authentication
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication service error' },
      { status: 500 }
    );
  }
} 