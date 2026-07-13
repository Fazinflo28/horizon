import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * OAuth (and magic-link) landing route.
 *
 * Supabase redirects here with `?code=…` after the provider signs the user in.
 * That code is worthless until it is exchanged for a session — this handler
 * does the exchange, which writes the auth cookies, then forwards to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  // Provider-side failure (user hit "cancel", app not configured, …).
  const error = searchParams.get('error_description') ?? searchParams.get('error')
  if (error) {
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent(error)}`,
    )
  }

  // Only allow relative paths, so `?next=` can't be used as an open redirect.
  const nextParam = searchParams.get('next')
  const next =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/home'

  if (!code) {
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent('Missing auth code')}`,
    )
  }

  const supabase = createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent(exchangeError.message)}`,
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
