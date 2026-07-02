import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { runPipeline, EngineError } from '@/lib/engine'
import type { HorizonSystem, FolderKind, ReviewStage, GenerationFilters } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const FOLDER_DEFS: { name: string; kind: FolderKind }[] = [
  { name: 'Components', kind: 'components' },
  { name: 'Templates', kind: 'templates' },
  { name: 'Assets', kind: 'assets' },
  { name: 'Documentation', kind: 'documentation' },
]

const REVIEW_STAGES: ReviewStage[] = ['copy', 'tech', 'accessibility', 'design']

export async function POST(request: Request) {
  // 1. Auth
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  // 2. Validate body
  let body: { prompt?: unknown; filters?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const prompt = body.prompt
  if (typeof prompt !== 'string' || prompt.trim().length < 10) {
    return NextResponse.json(
      { error: 'Prompt must be at least 10 characters' },
      { status: 400 },
    )
  }
  if (prompt.length > 2000) {
    return NextResponse.json(
      { error: 'Prompt must be under 2000 characters' },
      { status: 400 },
    )
  }
  const rawFilters =
    body.filters && typeof body.filters === 'object'
      ? (body.filters as Partial<GenerationFilters>)
      : {}
  const filters: GenerationFilters = {
    global: Array.isArray(rawFilters.global) ? rawFilters.global : [],
    components: Array.isArray(rawFilters.components) ? rawFilters.components : [],
    industry: typeof rawFilters.industry === 'string' ? rawFilters.industry : null,
    platform: typeof rawFilters.platform === 'string' ? rawFilters.platform : null,
    accessibility: Array.isArray(rawFilters.accessibility)
      ? rawFilters.accessibility
      : [],
    figma: Array.isArray(rawFilters.figma) ? rawFilters.figma : [],
    devices: Array.isArray(rawFilters.devices) ? rawFilters.devices : [],
  }

  // 3. Anthropic client
  let client: Anthropic
  try {
    client = new Anthropic()
  } catch {
    return NextResponse.json(
      { error: 'AI is not configured on the server' },
      { status: 500 },
    )
  }

  // 4. Run the 4-stage engine.
  let system: HorizonSystem
  try {
    console.time('[generate] pipeline total')
    system = await runPipeline(prompt.trim(), filters, client)
    console.timeEnd('[generate] pipeline total')
  } catch (err) {
    if (err instanceof EngineError && err.code === 'decisions_failed') {
      return NextResponse.json(
        { error: 'Could not interpret the brief, try rephrasing' },
        { status: 422 },
      )
    }
    console.error('[generate] pipeline error', err)
    return NextResponse.json(
      { error: 'Generation failed, please try again' },
      { status: 500 },
    )
  }

  // 5. Persist with the user-scoped client (RLS applies).
  try {
    const title =
      system.name?.trim() ||
      prompt.trim().split(/\s+/).slice(0, 6).join(' ') ||
      'Untitled System'

    const { data: project, error: pErr } = await supabase
      .from('projects')
      .insert({
        owner_id: user.id,
        title,
        source: 'ai',
        devices: filters.devices,
        status: 'draft',
      })
      .select()
      .single()
    if (pErr || !project) throw new Error(pErr?.message ?? 'project insert failed')

    const { error: fErr } = await supabase.from('folders').insert(
      FOLDER_DEFS.map((f) => ({
        project_id: project.id,
        name: f.name,
        kind: f.kind,
      })),
    )
    if (fErr) throw new Error(fErr.message)

    const { error: rErr } = await supabase.from('reviews').insert(
      REVIEW_STAGES.map((stage) => ({
        project_id: project.id,
        stage,
        status: 'pending',
      })),
    )
    if (rErr) throw new Error(rErr.message)

    const { error: gErr } = await supabase.from('generations').insert({
      user_id: user.id,
      project_id: project.id,
      prompt: prompt.trim(),
      filters,
      system_json: system,
    })
    if (gErr) throw new Error(gErr.message)

    const { error: vErr } = await supabase.from('project_versions').insert({
      project_id: project.id,
      version_number: 0,
      label: 'Draft',
      system_json: system,
    })
    if (vErr) throw new Error(vErr.message)

    return NextResponse.json({ projectId: project.id }, { status: 200 })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not save the generated system'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
