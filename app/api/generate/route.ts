import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type {
  HorizonSystem,
  FolderKind,
  ReviewStage,
  GenerationFilters,
} from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are a senior design systems architect. You output ONLY a single valid JSON object. No markdown, no code fences, no commentary before or after. Every color must be a 6-digit hex string starting with #. If an accessibility level of WCAG AA or AAA is requested, ensure primary-on-white and white-on-primary text contrast meets that level. Include ONLY the component types the user selected, nothing else. Keep every guidelines string under 60 words. The JSON must match exactly this TypeScript shape:
{ name: string; description: string; colors: { primary: Record<'50'|'100'|'200'|'300'|'400'|'500'|'600'|'700'|'800'|'900', string>; secondary: same shape; neutral: same shape; semantic: { success: string; warning: string; error: string; info: string } }; typography: { fontFamily: string; scale: Array<{ name: string; size: string; lineHeight: string; weight: number; usage: string }> }; spacing: { base: number; scale: number[] }; radius: { sm: string; md: string; lg: string; full: string }; shadows: Array<{ name: string; value: string }>; components: Array<{ type: string; variants: string[]; states: string[]; specs: { height: string; paddingX: string; radius: string; fontSize: string }; guidelines: string }>; documentation: Array<{ section: string; content: string }> }
Typography scale must include 6 to 9 steps covering display, headline, title, body. Documentation must include sections: Overview, Color Usage, Typography Rules, Spacing & Layout, Component Guidelines, Accessibility. spacing.scale must be 8 to 12 ascending numbers in px.`

const FOLDER_DEFS: { name: string; kind: FolderKind }[] = [
  { name: 'Components', kind: 'components' },
  { name: 'Templates', kind: 'templates' },
  { name: 'Assets', kind: 'assets' },
  { name: 'Documentation', kind: 'documentation' },
]

const REVIEW_STAGES: ReviewStage[] = ['copy', 'tech', 'accessibility', 'design']

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

/** Strip ```json fences / prose and isolate the JSON object. */
function extractJson(text: string): string {
  let t = text.trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  if (!t.startsWith('{')) {
    const first = t.indexOf('{')
    const last = t.lastIndexOf('}')
    if (first !== -1 && last !== -1 && last > first) t = t.slice(first, last + 1)
  }
  return t
}

function isValidSystem(obj: unknown): obj is HorizonSystem {
  if (!obj || typeof obj !== 'object') return false
  const s = obj as Record<string, unknown>
  if (typeof s.name !== 'string') return false
  const colors = s.colors as { primary?: Record<string, string> } | undefined
  const primary500 = colors?.primary?.['500']
  if (typeof primary500 !== 'string' || !HEX_RE.test(primary500)) return false
  const typography = s.typography as { scale?: unknown } | undefined
  if (!Array.isArray(typography?.scale) || typography!.scale.length === 0)
    return false
  if (!Array.isArray(s.components)) return false
  return true
}

async function generateSystem(
  client: Anthropic,
  userMessage: string,
): Promise<HorizonSystem> {
  const attempt = async (retry: boolean): Promise<HorizonSystem> => {
    const system = retry
      ? `${SYSTEM_PROMPT}\nYour previous output was invalid JSON. Output only the JSON object.`
      : SYSTEM_PROMPT
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      temperature: 0.7,
      system,
      messages: [{ role: 'user', content: userMessage }],
    })
    const block = resp.content[0]
    if (!block || block.type !== 'text') throw new Error('no-text-block')
    const parsed = JSON.parse(extractJson(block.text)) as unknown
    if (!isValidSystem(parsed)) throw new Error('invalid-shape')
    return parsed
  }

  try {
    return await attempt(false)
  } catch {
    return await attempt(true)
  }
}

function firstWords(text: string, count: number): string {
  return text.trim().split(/\s+/).slice(0, count).join(' ')
}

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

  const userMessage = [
    `Brief: ${prompt.trim()}`,
    `Industry: ${filters.industry || 'General'}`,
    `Platform: ${filters.platform || 'Web'}`,
    `Accessibility: ${filters.accessibility.join(', ') || 'Standard'}`,
    `Devices: ${filters.devices.join(', ') || 'Desktop'}`,
    `Global token selections: ${filters.global.join(', ')}`,
    `Selected components (generate exactly these): ${filters.components.join(', ')}`,
  ].join('\n')

  // 4. Generate (with one retry inside)
  let system: HorizonSystem
  try {
    system = await generateSystem(client, userMessage)
  } catch {
    return NextResponse.json(
      { error: 'Generation failed, please try again' },
      { status: 422 },
    )
  }

  // 5. Persist with the user-scoped client (RLS applies).
  try {
    const title = system.name?.trim() || firstWords(prompt, 6) || 'Untitled System'

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

    // 6. Done
    return NextResponse.json({ projectId: project.id }, { status: 200 })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not save the generated system'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
