import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isPublic = pathname === '/' || pathname === '/signin'
  const isApi = pathname.startsWith('/api')
  const isInternal = pathname.startsWith('/_next')
  const isStaticFile = pathname.includes('.')

  // Unauthenticated users may only see public pages.
  if (!user && !isPublic && !isApi && !isInternal && !isStaticFile) {
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return withCookies(NextResponse.redirect(url), supabaseResponse)
  }

  // Authenticated users skip the splash / sign-in.
  if (user && (pathname === '/' || pathname === '/signin')) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return withCookies(NextResponse.redirect(url), supabaseResponse)
  }

  return supabaseResponse
}

// Preserve the refreshed auth cookies when we return a redirect.
function withCookies(target: NextResponse, source: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie))
  return target
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
