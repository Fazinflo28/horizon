import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptToken, assertEncryptionKey } from '@/lib/figma/crypto'
import {
  figmaGetFile,
  figmaGetVariables,
  extractFileKey,
  FigmaError,
} from '@/lib/figma/client'
import { extractSystem, ExtractError } from '@/lib/figma/extract'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    assertEncryptionKey()
  } catch {
    return NextResponse.json({ error: 'Figma is not configured' }, { status: 500 })
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: { url?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const url = typeof body.url === 'string' ? body.url : ''
  const key = extractFileKey(url)
  if (!key) {
    return NextResponse.json({ error: 'Invalid Figma link' }, { status: 400 })
  }

  const { data: conn } = await supabase
    .from('figma_connections')
    .select('encrypted_token')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!conn) {
    return NextResponse.json({ error: 'not_connected' }, { status: 404 })
  }

  let token: string
  try {
    token = decryptToken(conn.encrypted_token)
  } catch {
    return NextResponse.json({ error: 'Stored token is unreadable' }, { status: 500 })
  }

  // Read + extract ONCE here; the client passes the result to /import so we
  // don't re-read the file (halves Figma calls per import).
  try {
    const file = await figmaGetFile(token, key)
    const variables = await figmaGetVariables(token, key)
    const { system, previewNodeIds } = await extractSystem(file, variables, key)
    return NextResponse.json({
      name: system.name,
      lastModified: system.meta?.figmaLastModified ?? file.lastModified,
      key,
      componentCount: system.components.length,
      system,
      previewNodeIds,
    })
  } catch (e) {
    if (e instanceof ExtractError && e.code === 'no_styles') {
      return NextResponse.json(
        { error: 'This file has no color or text styles to import' },
        { status: 422 },
      )
    }
    if (e instanceof FigmaError) {
      console.error('[figma file-meta] FigmaError', e.code, e.status)
      if (e.code === 'forbidden')
        return NextResponse.json(
          { error: 'This token cannot access that file' },
          { status: 403 },
        )
      if (e.code === 'not_found')
        return NextResponse.json(
          { error: 'File not found, check the link' },
          { status: 404 },
        )
      if (e.code === 'rate_limited')
        return NextResponse.json(
          {
            error: `Figma is rate-limiting your token. Try again in ~${e.retryAfter ?? 60}s.`,
          },
          { status: 429 },
        )
      return NextResponse.json(
        { error: `Figma API error (status ${e.status ?? 'unknown'})` },
        { status: 502 },
      )
    }
    console.error('[figma file-meta] network error', e)
    return NextResponse.json({ error: 'Could not reach Figma' }, { status: 502 })
  }
}
