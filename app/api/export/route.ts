import { createClient } from '@/lib/supabase/server'
import { buildZip } from '@/lib/exporters/zip'
import { buildFigmaKit } from '@/lib/exporters/figma-kit'
import type { HorizonSystem, ProjectVersion } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'horizon'
  )
}

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Not signed in' }, 401)

  let body: { projectId?: unknown; versionId?: unknown; kind?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  const projectId = typeof body.projectId === 'string' ? body.projectId : null
  const versionId = typeof body.versionId === 'string' ? body.versionId : null
  const kind = body.kind === 'figma-kit' ? 'figma-kit' : 'code'
  if (!projectId) return json({ error: 'Missing projectId' }, 400)

  // RLS ensures only the owner's versions come back.
  const { data: versions, error } = await supabase
    .from('project_versions')
    .select('*')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
  if (error) return json({ error: error.message }, 500)
  if (!versions || versions.length === 0)
    return json({ error: 'No system to export yet' }, 404)

  const rows = versions as ProjectVersion[]
  const version =
    (versionId ? rows.find((v) => v.id === versionId) : undefined) ?? rows[0]
  const system = version.system_json as HorizonSystem
  if (!system) return json({ error: 'Version has no system' }, 404)

  const bytes =
    kind === 'figma-kit' ? await buildFigmaKit(system) : await buildZip(system)
  // Copy into a plain ArrayBuffer (a clean BodyInit across TS lib versions).
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const filename =
    kind === 'figma-kit'
      ? `${slugify(system.name)}-figma-kit.zip`
      : `${slugify(system.name)}-design-system.zip`

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
