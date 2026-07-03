import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { figmaGetMe, FigmaError } from '@/lib/figma/client'
import { encryptToken, assertEncryptionKey } from '@/lib/figma/crypto'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    assertEncryptionKey()
  } catch {
    return NextResponse.json(
      { error: 'Figma encryption is not configured on the server' },
      { status: 500 },
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: { token?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  let me: { handle: string; img_url: string }
  try {
    me = await figmaGetMe(token)
  } catch (e) {
    if (e instanceof FigmaError && e.code === 'forbidden') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Could not reach Figma' }, { status: 502 })
  }

  const encrypted_token = encryptToken(token)
  const { error } = await supabase.from('figma_connections').upsert(
    {
      user_id: user.id,
      encrypted_token,
      figma_user_handle: me.handle,
      figma_user_img: me.img_url,
    },
    { onConflict: 'user_id' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Never return the token.
  return NextResponse.json({ handle: me.handle, img: me.img_url })
}

export async function DELETE() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { error } = await supabase
    .from('figma_connections')
    .delete()
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
