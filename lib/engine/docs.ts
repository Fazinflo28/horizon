import Anthropic from '@anthropic-ai/sdk'
import type { Decisions, DocSection } from '@/lib/types'
import type { Foundations } from './foundations'

export interface DocsOutput {
  componentGuidelines: Record<string, string>
  documentation: DocSection[]
}

export interface FoundationSummary {
  primary500: string
  primary600: string
  neutralRange: string
  font: string
  ratio: number
  spacingBase: number
  radiusCharacter: string
}

const SYSTEM_PROMPT = `You are a design systems documentation writer. Output ONLY one valid JSON object, no fences. Shape: { componentGuidelines: Record<string,string>; documentation: Array<{section: string; content: string}> }. componentGuidelines has one entry per component type given, each under 55 words, practical do/don't guidance referencing the system's tokens by name. documentation has EXACTLY these sections in order: Overview, Color Usage, Typography Rules, Spacing & Layout, Component Guidelines, Accessibility. Each content 60-120 words, specific to this system, no generic filler.`

const SECTION_ORDER = [
  'Overview',
  'Color Usage',
  'Typography Rules',
  'Spacing & Layout',
  'Component Guidelines',
  'Accessibility',
]

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

export function summarize(
  decisions: Decisions,
  foundations: Foundations,
): FoundationSummary {
  return {
    primary500: foundations.primary['500'],
    primary600: foundations.primary['600'],
    neutralRange: `${foundations.neutral['50']}..${foundations.neutral['900']}`,
    font: decisions.fontFamily,
    ratio: decisions.typeRatio,
    spacingBase: foundations.spacing.base,
    radiusCharacter: foundations.radiusCharacter,
  }
}

function validate(obj: unknown): obj is DocsOutput {
  if (!obj || typeof obj !== 'object') return false
  const d = obj as Record<string, unknown>
  if (!d.componentGuidelines || typeof d.componentGuidelines !== 'object')
    return false
  if (!Array.isArray(d.documentation) || d.documentation.length === 0)
    return false
  return d.documentation.every(
    (s) =>
      s &&
      typeof (s as DocSection).section === 'string' &&
      typeof (s as DocSection).content === 'string',
  )
}

export async function runDocs(
  decisions: Decisions,
  summary: FoundationSummary,
  componentTypes: string[],
  anthropic: Anthropic,
): Promise<DocsOutput> {
  const userMessage = JSON.stringify(
    {
      decisions: {
        personality: decisions.personality,
        reasoning: decisions.reasoning,
      },
      foundations: summary,
      components: componentTypes,
    },
    null,
    2,
  )

  const attempt = async (retry: boolean): Promise<DocsOutput> => {
    const system = retry
      ? `${SYSTEM_PROMPT}\nPrevious output was invalid. Output only the JSON object.`
      : SYSTEM_PROMPT
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      temperature: 0.6,
      system,
      messages: [{ role: 'user', content: userMessage }],
    })
    const block = resp.content[0]
    if (!block || block.type !== 'text') throw new Error('no-text-block')
    const parsed = JSON.parse(stripFences(block.text)) as unknown
    if (!validate(parsed)) throw new Error('invalid-shape')
    // Keep only the required sections, in order.
    const byName = new Map(
      (parsed as DocsOutput).documentation.map((s) => [s.section, s]),
    )
    const documentation = SECTION_ORDER.map(
      (name) =>
        byName.get(name) ?? { section: name, content: '' },
    ).filter((s) => s.content.trim().length > 0)
    if (documentation.length < SECTION_ORDER.length) throw new Error('missing-sections')
    return { componentGuidelines: (parsed as DocsOutput).componentGuidelines, documentation }
  }

  // Docs must never fail — or stall — the pipeline. Race the live call
  // (with its one retry) against a hard timeout that falls back to static docs
  // well before the route's maxDuration.
  const live = (async (): Promise<DocsOutput> => {
    try {
      return await attempt(false)
    } catch {
      return await attempt(true)
    }
  })()
  const timeout = new Promise<DocsOutput>((resolve) => {
    setTimeout(
      () => resolve(staticDocs(decisions, summary, componentTypes)),
      42000,
    )
  })
  try {
    return await Promise.race([live, timeout])
  } catch {
    return staticDocs(decisions, summary, componentTypes)
  }
}

export function staticDocs(
  decisions: Decisions,
  summary: FoundationSummary,
  componentTypes: string[],
): DocsOutput {
  const componentGuidelines: Record<string, string> = {}
  for (const t of componentTypes) {
    componentGuidelines[t] =
      `Use ${t} consistently with the system's semantic tokens (color-bg-brand, color-text-primary, color-border-focus). Keep padding on the ${summary.spacingBase}px grid, respect the defined radius, and always render a visible focus state.`
  }

  const personality = decisions.personality.join(', ')
  const documentation: DocSection[] = [
    {
      section: 'Overview',
      content: `${decisions.reasoning} The system's personality is ${personality}. It is built on a ${summary.font} type family, a ${summary.ratio} modular scale, a ${summary.spacingBase}px spacing grid and ${summary.radiusCharacter} corners. Every value below is generated deterministically for consistency across screens.`,
    },
    {
      section: 'Color Usage',
      content: `Primary ${summary.primary500} anchors interactive elements; brand surfaces use the ${summary.primary600} weight with white text for contrast. Neutrals run ${summary.neutralRange} for backgrounds, text and borders. Reserve success, warning, error and info colors strictly for status. Reference every color through the CSS variables so themes stay swappable.`,
    },
    {
      section: 'Typography Rules',
      content: `The scale uses a ${summary.ratio} ratio in ${summary.font}. Use display and headline steps for hero and section moments only, titles for card and group headers, and body for reading. Never set text below the smallest body step. Keep line length comfortable (45–75 characters) and lean on weight, not color, for emphasis.`,
    },
    {
      section: 'Spacing & Layout',
      content: `All spacing derives from a ${summary.spacingBase}px base. Compose padding, gaps and margins only from the generated scale to keep vertical rhythm consistent. Group related content with tighter spacing and separate sections with larger steps. Do not introduce off-scale values; they break the visual grid across breakpoints.`,
    },
    {
      section: 'Component Guidelines',
      content: `Every component reads from the semantic token layer, so restyling the tokens restyles the whole kit. Compose from the documented parts, variants and states rather than forking. Keep one primary action per view, and ensure interactive controls expose default, hover, focus, pressed and disabled states.`,
    },
    {
      section: 'Accessibility',
      content: `Text and brand colors are contrast-checked against white to the target ratio, so brand buttons and text-brand links stay legible. Focus states are always visible via color-border-focus. Minimum touch targets are respected on mobile. Never rely on color alone to convey meaning; pair it with text or iconography.`,
    },
  ]

  return { componentGuidelines, documentation }
}
