import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client. createBrowserClient memoizes internally, so
 * calling this repeatedly returns the same underlying client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
