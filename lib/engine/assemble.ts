import type { ComponentSpec, Decisions, TypeStep } from '@/lib/types'
import type { Foundations } from './foundations'
import { BLUEPRINTS, normalizeType, type FontSizeToken } from './blueprints'

const FONT_STEP_NAME: Record<FontSizeToken, string> = {
  bodySmall: 'Body Small',
  bodyLarge: 'Body Large',
  titleSmall: 'Title Small',
}
const FONT_FALLBACK: Record<FontSizeToken, string> = {
  bodySmall: '14px',
  bodyLarge: '16px',
  titleSmall: '20px',
}

const PILL_LIKE = new Set([
  'button',
  'iconbutton',
  'floatingbuttonfab',
  'extendedfab',
  'splitbutton',
  'togglebutton',
  'chip',
  'badge',
])

export const TOKENS_USED: Record<string, string[]> = {
  button: ['color-bg-brand', 'color-text-on-brand', 'color-border-focus'],
  iconbutton: ['color-bg-brand', 'color-text-on-brand', 'color-border-focus'],
  floatingbuttonfab: ['color-bg-brand', 'color-text-on-brand'],
  extendedfab: ['color-bg-brand', 'color-text-on-brand'],
  splitbutton: ['color-bg-brand', 'color-text-on-brand', 'color-border'],
  togglebutton: ['color-bg-brand', 'color-text-brand', 'color-border'],
  textfield: [
    'color-bg-surface',
    'color-text-primary',
    'color-border',
    'color-border-focus',
    'color-error',
  ],
  dropdownselect: [
    'color-bg-surface',
    'color-text-primary',
    'color-border',
    'color-border-focus',
  ],
  combobox: [
    'color-bg-surface',
    'color-text-primary',
    'color-border',
    'color-border-focus',
  ],
  checkbox: [
    'color-bg-brand',
    'color-text-on-brand',
    'color-border',
    'color-border-focus',
  ],
  radiobutton: ['color-bg-brand', 'color-border', 'color-border-focus'],
  slider: ['color-bg-brand', 'color-border'],
  rangeslider: ['color-bg-brand', 'color-border'],
  rating: ['color-warning', 'color-border'],
  tabs: ['color-text-brand', 'color-text-secondary', 'color-border-focus'],
  card: [
    'color-bg-surface',
    'color-text-primary',
    'color-text-secondary',
    'color-border',
  ],
  badge: ['color-bg-brand', 'color-text-on-brand'],
  chip: ['color-bg-brand', 'color-text-on-brand', 'color-border'],
  alert: ['color-info', 'color-bg-surface', 'color-text-primary'],
  toast: ['color-text-primary', 'color-bg-surface'],
  dialog: ['color-bg-surface', 'color-text-primary', 'color-border'],
  modal: ['color-bg-surface', 'color-text-primary', 'color-border'],
  progressbar: ['color-bg-brand', 'color-border'],
  breadcrumb: ['color-text-secondary', 'color-text-brand'],
  list: ['color-bg-surface', 'color-text-primary', 'color-border'],
  listitem: ['color-bg-surface', 'color-text-primary', 'color-text-secondary'],
  datagrid: ['color-bg-surface', 'color-text-primary', 'color-border'],
}
export const TOKENS_FALLBACK = [
  'color-bg-surface',
  'color-text-primary',
  'color-border',
]

export function resolveFontSize(token: FontSizeToken, scale: TypeStep[]): string {
  const step = scale.find((s) => s.name === FONT_STEP_NAME[token])
  return step ? step.size : FONT_FALLBACK[token]
}

export function assembleComponents(
  selected: string[],
  foundations: Foundations,
  decisions: Decisions,
  platform: string | null,
): ComponentSpec[] {
  const isMobile = platform === 'iOS' || platform === 'Android'
  const out: ComponentSpec[] = []

  for (const display of selected) {
    const key = normalizeType(display)
    const bp = BLUEPRINTS[key]
    if (!bp) {
      console.warn(`[assemble] no blueprint for "${display}" (${key}), skipping`)
      continue
    }
    const s = bp.sizing(decisions.density)

    let height = s.height
    if (isMobile && height !== 'auto' && height.endsWith('px')) {
      const px = parseInt(height, 10)
      if (!Number.isNaN(px) && px < 44) height = '44px'
    }

    const idx = Math.min(s.paddingX, foundations.spacing.scale.length - 1)
    const paddingX = `${foundations.spacing.scale[idx] ?? foundations.spacing.scale[0]}px`

    const useFull = PILL_LIKE.has(key) && foundations.radiusCharacter === 'pill'
    const radius = useFull ? foundations.radius.full : foundations.radius.md

    out.push({
      type: display,
      variants: bp.variants,
      states: bp.states,
      specs: {
        height,
        paddingX,
        radius,
        fontSize: resolveFontSize(s.fontSize, foundations.scale),
      },
      guidelines: '',
      tokensUsed: TOKENS_USED[key] ?? TOKENS_FALLBACK,
    })
  }

  return out
}
