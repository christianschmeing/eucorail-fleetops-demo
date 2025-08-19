import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const user = process.env.PREVIEW_BASIC_USER;
  const pass = process.env.PREVIEW_BASIC_PASS;
  const vercelEnv = process.env.VERCEL_ENV; // 'production' | 'preview' | 'development'
  const isPreview = vercelEnv !== 'production';
  const enable = isPreview && process.env.PREVIEW_ENABLE_AUTH === '1' && user && pass;
  if (!enable) return NextResponse.next();
  const { pathname } = req.nextUrl;
  // Exempt static assets and health
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/') ||
    pathname === '/api' ||
    pathname === '/api/health'
  ) {
    return NextResponse.next();
  }
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Basic ')) {
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="preview"' },
    });
  }
  const b64 = auth.slice(6);
  const [u, p] = Buffer.from(b64, 'base64').toString('utf-8').split(':');
  if (u !== user || p !== pass) {
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="preview"' },
    });
  }
  return NextResponse.next();
}

export const config = {
  // Exclude all API routes from middleware; protect only pages/assets when enabled
  matcher: ['/((?!api/).*)'],
};
