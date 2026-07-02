import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FolderKind, ReviewStage, ShopKit } from '@/lib/types'

export const runtime = 'nodejs'

const FOLDER_DEFS: { name: string; kind: FolderKind }[] = [
  { name: 'Components', kind: 'components' },
  { name: 'Templates', kind: 'templates' },
  { name: 'Assets', kind: 'assets' },
  { name: 'Documentation', kind: 'documentation' },
]

const REVIEW_STAGES: ReviewStage[] = ['copy', 'tech', 'accessibility', 'design']

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let body: { kitId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const kitId = body.kitId
  if (typeof kitId !== 'string') {
    return NextResponse.json({ error: 'Missing kitId' }, { status: 400 })
  }

  const { data: kit, error: kErr } = await supabase
    .from('shop_kits')
    .select('*')
    .eq('id', kitId)
    .single()
  if (kErr || !kit) {
    return NextResponse.json({ error: 'Kit not found' }, { status: 404 })
  }
  const typedKit = kit as ShopKit

  try {
    const { data: project, error: pErr } = await supabase
      .from('projects')
      .insert({
        owner_id: user.id,
        title: typedKit.title,
        source: 'kit',
        devices: [],
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

    if (typedKit.starter_json) {
      const { error: vErr } = await supabase.from('project_versions').insert({
        project_id: project.id,
        version_number: 0,
        label: 'Draft',
        system_json: typedKit.starter_json,
      })
      if (vErr) throw new Error(vErr.message)
    }

    return NextResponse.json({ projectId: project.id }, { status: 200 })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not add the kit'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
