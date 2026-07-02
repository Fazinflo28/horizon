import Anthropic from '@anthropic-ai/sdk'
import type {
  Decisions,
  Density,
  GenerationFilters,
  RadiusCharacter,
  TypeRatio,
} from '@/lib/types'

export class EngineError extends Error {
  code: string
  constructor(code: string, message?: string) {
    super(message ?? code)
    this.name = 'EngineError'
    this.code = code
  }
}

export const INDUSTRY_HINTS: Record<string, string> = {
  'E-commerce':
    'warm energetic accents, bold CTAs, high conversion contrast, friendly rounded shapes',
  SaaS: 'modern trustworthy blues or violets, clean neutrals, comfortable density',
  Enterprise:
    'conservative palette, muted primary, sharp or slightly rounded corners, dense layouts',
  'Banking & FinTech':
    'deep trustworthy blues or greens, minimal saturation, AA+ contrast, restrained radius',
  Healthcare:
    'calm blues teals or greens, soft shapes, maximum legibility, generous spacing',
  'Travel & Hospitality':
    'vibrant inviting colors, imagery-friendly neutrals, soft radius',
  Insurance: 'stable blues, warm secondary, clear hierarchy, conservative shapes',
  Telecommunications: 'bold saturated primary, tech-forward, medium density',
  Automotive: 'dark neutrals, metallic greys, one strong accent, sharp corners',
  Agency: 'expressive distinctive hues, personality-forward, can be playful',
}

const SYSTEM_PROMPT = `You are a senior brand designer making foundational design decisions. Output ONLY one valid JSON object, no markdown fences, no commentary. All colors are 6-digit hex strings starting with #. Shape:
{ personality: [string, string, string]; primarySeed: string; secondarySeed: string; neutralTint: string; fontFamily: string; fontFamilyMono: string; radiusCharacter: 'sharp'|'soft'|'rounded'|'pill'; density: 'compact'|'comfortable'|'spacious'; typeRatio: 1.2|1.25|1.333; reasoning: string }
primarySeed is the brand's main hue at roughly 500-weight strength. secondarySeed must be harmonious but distinct (analogous or complementary). neutralTint is a very desaturated version of the primary hue. fontFamily must be a real Google Font suited to the brief (e.g. Inter, Plus Jakarta Sans, Manrope, DM Sans, Sora, Space Grotesk, IBM Plex Sans). fontFamilyMono a real mono Google Font. reasoning under 40 words.`

const HEX = /^#[0-9A-Fa-f]{6}$/
const RADIUS: RadiusCharacter[] = ['sharp', 'soft', 'rounded', 'pill']
const DENSITY: Density[] = ['compact', 'comfortable', 'spacious']
const RATIOS: TypeRatio[] = [1.2, 1.25, 1.333]

function stripFences(text: string): string {
  let t = text.trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  if (!t.startsWith('{')) {
    const a = t.indexOf('{')
    const b = t.lastIndexOf('}')
    if (a !== -1 && b > a) t = t.slice(a, b + 1)
  }
  return t
}

function validate(obj: unknown): obj is Decisions {
  if (!obj || typeof obj !== 'object') return false
  const d = obj as Record<string, unknown>
  if (!Array.isArray(d.personality) || d.personality.length !== 3) return false
  if (!d.personality.every((p) => typeof p === 'string')) return false
  for (const seed of ['primarySeed', 'secondarySeed', 'neutralTint']) {
    const v = d[seed]
    if (typeof v !== 'string' || !HEX.test(v)) return false
  }
  if (typeof d.fontFamily !== 'string' || !d.fontFamily) return false
  if (typeof d.fontFamilyMono !== 'string' || !d.fontFamilyMono) return false
  if (!RADIUS.includes(d.radiusCharacter as RadiusCharacter)) return false
  if (!DENSITY.includes(d.density as Density)) return false
  if (!RATIOS.includes(d.typeRatio as TypeRatio)) return false
  if (typeof d.reasoning !== 'string') return false
  return true
}

export async function runDecisions(
  prompt: string,
  filters: GenerationFilters,
  anthropic: Anthropic,
): Promise<Decisions> {
  const hint = filters.industry
    ? (INDUSTRY_HINTS[filters.industry] ?? 'no specific bias')
    : 'no specific bias'
  const userMessage = [
    `Brief: ${prompt}`,
    `Industry: ${filters.industry ?? 'General'} (${hint})`,
    `Platform: ${filters.platform ?? 'Web'}`,
    `Accessibility requirement: ${filters.accessibility.join(', ') || 'Standard'}`,
    `Make decisions that fit this brief precisely.`,
  ].join('\n')

  const attempt = async (retry: boolean): Promise<Decisions> => {
    const system = retry
      ? `${SYSTEM_PROMPT}\nPrevious output was invalid. Output only the JSON object.`
      : SYSTEM_PROMPT
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      temperature: 0.8,
      system,
      messages: [{ role: 'user', content: userMessage }],
    })
    const block = resp.content[0]
    if (!block || block.type !== 'text') throw new Error('no-text-block')
    const parsed = JSON.parse(stripFences(block.text)) as unknown
    if (!validate(parsed)) throw new Error('invalid-shape')
    return parsed
  }

  try {
    return await attempt(false)
  } catch {
    try {
      return await attempt(true)
    } catch {
      throw new EngineError('decisions_failed')
    }
  }
}
