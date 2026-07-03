import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptToken, assertEncryptionKey } from '@/lib/figma/crypto'
import {
  figmaGetFile,
  figmaGetVariables,
  figmaGetImages,
  FigmaError,
} from '@/lib/figma/client'
import { extractSystem, ExtractError } from '@/lib/figma/extract'
import type { FolderKind, ReviewStage } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const FOLDER_DEFS: { name: string; kind: FolderKind }[] = [
  { name: 'Components', kind: 'components' },
  { name: 'Templates', kind: 'templates' },
  { name: 'Assets', kind: 'assets' },
  { name: 'Documentation', kind: 'documentation' },
]
const REVIEW_STAGES: ReviewStage[] = ['copy', 'tech', 'accessibility', 'design']

interface PreviewEntry {
  nodeId: string
  imageUrl: string
  fetchedAt: string
}

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

  let body: { key?: unknown; title?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const key = typeof body.key === 'string' ? body.key : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!key || !title) {
    return NextResponse.json({ error: 'Missing file key or title' }, { status: 400 })
  }

  const { data: conn } = await supabase
    .from('figma_connections')
    .select('encrypted_token')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!conn) return NextResponse.json({ error: 'not_connected' }, { status: 404 })

  let token: string
  try {
    token = decryptToken(conn.encrypted_token)
  } catch {
    return NextResponse.json({ error: 'Stored token is unreadable' }, { status: 500 })
  }

  // Fetch + extract (before any DB writes).
  let system
  let previewNodeIds: Record<string, string>
  try {
    const file = await figmaGetFile(token, key)
    const variables = await figmaGetVariables(token, key)
    const result = await extractSystem(file, variables, key)
    system = result.system
    previewNodeIds = result.previewNodeIds
  } catch (e) {
    if (e instanceof ExtractError && e.code === 'no_styles') {
      return NextResponse.json(
        { error: 'This file has no color or text styles to import' },
        { status: 422 },
      )
    }
    if (e instanceof FigmaError) {
      console.error('[figma import] FigmaError', e.code, e.status)
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
            error:
              'Figma is rate-limiting your token. Wait a minute and try again.',
          },
          { status: 429 },
        )
      return NextResponse.json(
        { error: `Figma API error (status ${e.status ?? 'unknown'})` },
        { status: 502 },
      )
    }
    console.error('[figma import] extraction error', e)
    return NextResponse.json({ error: 'Could not import this file' }, { status: 502 })
  }

  // Insert project first; on any later failure, delete it (cascade cleans children).
  const nowIso = new Date().toISOString()
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .insert({
      owner_id: user.id,
      title,
      source: 'figma',
      devices: ['desktop'],
      status: 'draft',
      figma_file_key: key,
      figma_file_name: system.name,
      figma_last_modified: system.meta?.figmaLastModified ?? nowIso,
      figma_synced_at: nowIso,
    })
    .select()
    .single()
  if (pErr || !project) {
    return NextResponse.json(
      { error: pErr?.message ?? 'Could not create project' },
      { status: 500 },
    )
  }

  try {
    const { error: fErr } = await supabase.from('folders').insert(
      FOLDER_DEFS.map((f) => ({ project_id: project.id, name: f.name, kind: f.kind })),
    )
    if (fErr) throw new Error(fErr.message)

    const { error: rErr } = await supabase.from('reviews').insert(
      REVIEW_STAGES.map((stage) => ({ project_id: project.id, stage, status: 'pending' })),
    )
    if (rErr) throw new Error(rErr.message)

    // Previews (optional — never fail import).
    let preview_map: Record<string, PreviewEntry> | null = null
    const entries = Object.entries(previewNodeIds).slice(0, 24)
    if (entries.length > 0) {
      let images: Record<string, string | null> = {}
      try {
        images = await figmaGetImages(
          token,
          key,
          entries.map(([, id]) => id),
        )
      } catch {
        images = {}
      }
      const pm: Record<string, PreviewEntry> = {}
      for (const [type, nodeId] of entries) {
        const url = images[nodeId]
        if (url) pm[type] = { nodeId, imageUrl: url, fetchedAt: nowIso }
      }
      if (Object.keys(pm).length > 0) preview_map = pm
    }

    const { error: vErr } = await supabase.from('project_versions').insert({
      project_id: project.id,
      version_number: 0,
      label: 'Draft',
      system_json: system,
      preview_map,
    })
    if (vErr) throw new Error(vErr.message)

    return NextResponse.json({
      projectId: project.id,
      componentCount: system.components.length,
    })
  } catch (err) {
    await supabase.from('projects').delete().eq('id', project.id)
    const message = err instanceof Error ? err.message : 'Import failed'
    console.error('[figma import] persist error, rolled back project', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
