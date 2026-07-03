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
import { diffSystems } from '@/lib/figma/diff'
import type { HorizonSystem, PreviewEntry } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

async function buildPreviewMap(
  token: string,
  key: string,
  previewNodeIds: Record<string, string>,
  fetchedAt: string,
): Promise<Record<string, PreviewEntry> | null> {
  const entries = Object.entries(previewNodeIds).slice(0, 24)
  if (entries.length === 0) return null
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
    if (url) pm[type] = { nodeId, imageUrl: url, fetchedAt }
  }
  return Object.keys(pm).length > 0 ? pm : null
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

  let body: { projectId?: unknown; apply?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const projectId = typeof body.projectId === 'string' ? body.projectId : ''
  const apply = body.apply === true
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  if (!project.figma_file_key) {
    return NextResponse.json({ error: 'This project is not linked to Figma' }, { status: 400 })
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

  const key = project.figma_file_key as string

  // Fetch current file.
  let file
  try {
    file = await figmaGetFile(token, key)
  } catch (e) {
    if (e instanceof FigmaError) {
      if (e.code === 'forbidden')
        return NextResponse.json({ error: 'This token cannot access that file' }, { status: 403 })
      if (e.code === 'not_found')
        return NextResponse.json({ error: 'File not found in Figma' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Could not reach Figma' }, { status: 502 })
  }

  // Current draft (version 0) system for comparison.
  const { data: draft } = await supabase
    .from('project_versions')
    .select('*')
    .eq('project_id', projectId)
    .eq('version_number', 0)
    .maybeSingle()
  const draftSystem = (draft?.system_json ?? null) as HorizonSystem | null

  const sameModified =
    project.figma_last_modified &&
    new Date(file.lastModified).getTime() ===
      new Date(project.figma_last_modified).getTime()

  // ---- Preview mode -------------------------------------------------------
  if (!apply) {
    if (sameModified) {
      return NextResponse.json({ upToDate: true })
    }
    try {
      const variables = await figmaGetVariables(token, key)
      const { system: newSys } = await extractSystem(file, variables, key)
      const diff = draftSystem ? diffSystems(draftSystem, newSys) : null
      return NextResponse.json({
        upToDate: false,
        diff,
        lastModified: file.lastModified,
      })
    } catch (e) {
      if (e instanceof ExtractError)
        return NextResponse.json({ error: 'This file has no styles to import' }, { status: 422 })
      return NextResponse.json({ error: 'Could not read the file' }, { status: 502 })
    }
  }

  // ---- Apply --------------------------------------------------------------
  try {
    const variables = await figmaGetVariables(token, key)
    const { system: newSys, previewNodeIds } = await extractSystem(file, variables, key)
    const diff = draftSystem ? diffSystems(draftSystem, newSys) : null
    const nowIso = new Date().toISOString()
    const preview_map = await buildPreviewMap(token, key, previewNodeIds, nowIso)

    // Mutate ONLY the version 0 draft (published versions are immutable).
    const { error: vErr } = await supabase
      .from('project_versions')
      .update({ system_json: newSys, preview_map })
      .eq('project_id', projectId)
      .eq('version_number', 0)
    if (vErr) throw new Error(vErr.message)

    const { error: prErr } = await supabase
      .from('projects')
      .update({
        figma_last_modified: file.lastModified,
        figma_synced_at: nowIso,
        status: 'draft',
      })
      .eq('id', projectId)
    if (prErr) throw new Error(prErr.message)

    const { error: rvErr } = await supabase
      .from('reviews')
      .update({ status: 'pending', note: null, reviewed_at: null })
      .eq('project_id', projectId)
    if (rvErr) throw new Error(rvErr.message)

    return NextResponse.json({
      applied: true,
      diff,
      system: newSys,
      previews: preview_map,
      lastModified: file.lastModified,
    })
  } catch (e) {
    if (e instanceof ExtractError)
      return NextResponse.json({ error: 'This file has no styles to import' }, { status: 422 })
    const message = e instanceof Error ? e.message : 'Re-sync failed'
    console.error('[figma resync] apply error', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
