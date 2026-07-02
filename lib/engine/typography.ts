import type { TypeStep } from '@/lib/types'

// ---------------------------------------------------------------------------
// Pure type-scale math. No AI, no side effects.
// ---------------------------------------------------------------------------

export const TYPE_LADDER = [
  'Display Large',
  'Display Medium',
  'Display Small',
  'Headline Small',
  'Title Large',
  'Title Small',
  'Body Large',
  'Body Small',
] as const

const USAGE: Record<string, string> = {
  'Display Large': 'Hero headlines',
  'Display Medium': 'Large display headings',
  'Display Small': 'Section display headings',
  'Headline Small': 'Prominent headings',
  'Title Large': 'Card and section titles',
  'Title Small': 'Subsection titles',
  'Body Large': 'Primary body text',
  'Body Small': 'Secondary and caption text',
}

const MIN_VIABLE = ['Body Small', 'Body Large', 'Title Large', 'Display Small']

const roundEven = (n: number): number => 2 * Math.round(n / 2)

function sizeFor(name: string, ratio: number): number {
  switch (name) {
    case 'Body Small':
      return 14
    case 'Body Large':
      return 16
    case 'Title Small':
      return roundEven(16 * ratio)
    case 'Title Large':
      return roundEven(16 * ratio ** 2)
    case 'Headline Small':
      return roundEven(16 * ratio ** 3)
    case 'Display Small':
      return roundEven(16 * ratio ** 4)
    case 'Display Medium':
      return roundEven(16 * ratio ** 5)
    case 'Display Large':
      return roundEven(16 * ratio ** 6)
    default:
      return 16
  }
}

function weightFor(name: string): number {
  if (name.startsWith('Display') || name.startsWith('Headline')) return 700
  if (name.startsWith('Title')) return 600
  return 400
}

function lineHeightFor(size: number): string {
  if (size < 20) return '1.5'
  if (size <= 32) return '1.35'
  return '1.15'
}

export function buildScale(ratio: number, selectedSteps: string[]): TypeStep[] {
  const chosen = selectedSteps.filter((s) =>
    (TYPE_LADDER as readonly string[]).includes(s),
  )
  const active = chosen.length > 0 ? chosen : MIN_VIABLE
  return TYPE_LADDER.filter((name) => active.includes(name)).map((name) => {
    const size = sizeFor(name, ratio)
    return {
      name,
      size: `${size}px`,
      lineHeight: lineHeightFor(size),
      weight: weightFor(name),
      usage: USAGE[name] ?? '',
    }
  })
}
