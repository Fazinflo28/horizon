import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import FigmaConnectCard from '@/components/FigmaConnectCard'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // Select ONLY the public columns — never encrypted_token.
  const { data: conn } = await supabase
    .from('figma_connections')
    .select('figma_user_handle, figma_user_img')
    .eq('user_id', user.id)
    .maybeSingle()

  const meta = user.user_metadata as { full_name?: string } | undefined

  return (
    <div>
      <Navbar userName={meta?.full_name ?? user.email ?? null} />
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Connect integrations and manage your account.
        </p>
        <div className="mt-6">
          <FigmaConnectCard
            initialHandle={conn?.figma_user_handle ?? null}
            initialImg={conn?.figma_user_img ?? null}
          />
        </div>
      </main>
    </div>
  )
}
