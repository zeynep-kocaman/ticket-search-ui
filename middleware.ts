import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip auth for health checks and public assets
  if (pathname.startsWith('/api/health') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // Check for basic auth header
  const authHeader = request.headers.get('authorization');
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  if (!expectedPassword) {
    console.error('BASIC_AUTH_PASSWORD not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Verify basic auth
  if (authHeader?.startsWith('Basic ')) {
    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (password === expectedPassword) {
      return NextResponse.next();
    }
  }

  // Return 401 with basic auth challenge
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Enpal Ticket Search"',
      'Content-Type': 'text/plain',
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
