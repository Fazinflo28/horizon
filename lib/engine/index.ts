import Anthropic from '@anthropic-ai/sdk'
import type {
  ComponentSpec,
  Decisions,
  GenerationFilters,
  HorizonSystem,
} from '@/lib/types'
import { runDecisions } from './decisions'
import { buildFoundations } from './foundations'
import { assembleComponents } from './assemble'
import { runDocs, summarize } from './docs'

export { EngineError } from './decisions'

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

const NAME_STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'for',
  'with',
  'of',
  'and',
  'to',
  'design',
  'system',
  'create',
  'build',
  'make',
  'app',
  'ui',
  'ux',
  'minimal',
  'minimalist',
  'modern',
  'clean',
  'simple',
  'beautiful',
  'sleek',
])

function deriveName(decisions: Decisions, prompt: string): string {
  const p = capitalize((decisions.personality[0] || 'Horizon').trim())
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !NAME_STOPWORDS.has(w))
  const noun = words[0] ? capitalize(words[0]) : 'System'
  return `${p} ${noun}`.split(/\s+/).slice(0, 4).join(' ')
}

export async function runPipeline(
  prompt: string,
  filters: GenerationFilters,
  anthropic: Anthropic,
): Promise<HorizonSystem> {
  console.time('[engine] stage1 decisions')
  const decisions = await runDecisions(prompt, filters, anthropic)
  console.timeEnd('[engine] stage1 decisions')

  console.time('[engine] stage2 foundations')
  const foundations = buildFoundations(decisions, filters)
  console.timeEnd('[engine] stage2 foundations')

  console.time('[engine] stage3 assemble')
  const components = assembleComponents(
    filters.components,
    foundations,
    decisions,
    filters.platform,
  )
  console.timeEnd('[engine] stage3 assemble')

  console.time('[engine] stage4 docs')
  const docs = await runDocs(
    decisions,
    summarize(decisions, foundations),
    components.map((c) => c.type),
    anthropic,
  )
  console.timeEnd('[engine] stage4 docs')

  const withGuidelines: ComponentSpec[] = components.map((c) => ({
    ...c,
    guidelines:
      docs.componentGuidelines[c.type] ?? 'Use consistently with system tokens.',
  }))

  return {
    name: deriveName(decisions, prompt),
    description: decisions.reasoning,
    colors: {
      primary: foundations.primary,
      secondary: foundations.secondary,
      neutral: foundations.neutral,
      semantic: foundations.semantic,
    },
    semanticTokens: foundations.semanticTokens,
    typography: {
      fontFamily: decisions.fontFamily,
      fontFamilyMono: decisions.fontFamilyMono,
      scale: foundations.scale,
    },
    spacing: foundations.spacing,
    radius: foundations.radius,
    shadows: foundations.shadows,
    components: withGuidelines,
    documentation: docs.documentation,
    meta: {
      generatedAt: new Date().toISOString(),
      filters,
      decisions,
    },
  }
}
