import type { Palette } from '@/lib/types'

// ---------------------------------------------------------------------------
// Pure color math. No AI, no side effects, fully unit-testable.
// ---------------------------------------------------------------------------

export interface Hsl {
  h: number
  s: number
  l: number
}

type Shade = keyof Palette

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function toHex(n: number): string {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
}

export function hexToHsl(hex: string): Hsl {
  const [r255, g255, b255] = hexToRgb(hex)
  const r = r255 / 255
  const g = g255 / 255
  const b = b255 / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360 / 360
  const ss = clamp(s, 0, 100) / 100
  const ll = clamp(l, 0, 100) / 100
  if (ss === 0) {
    const v = toHex(ll * 255)
    return `#${v}${v}${v}`.toUpperCase()
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
  const p = 2 * ll - q
  const hue2rgb = (t: number): number => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const r = hue2rgb(hh + 1 / 3) * 255
  const g = hue2rgb(hh) * 255
  const b = hue2rgb(hh - 1 / 3) * 255
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

// ---- Ramps ----------------------------------------------------------------

const SHADES: Shade[] = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
]

const LIGHTNESS: Record<Shade, number> = {
  '50': 97,
  '100': 93,
  '200': 85,
  '300': 74,
  '400': 62,
  '500': 52,
  '600': 44,
  '700': 36,
  '800': 28,
  '900': 20,
}

const SAT_MULT: Record<Shade, number> = {
  '50': 0.45,
  '100': 0.55,
  '200': 0.7,
  '300': 0.85,
  '400': 0.95,
  '500': 1.0,
  '600': 1.0,
  '700': 0.95,
  '800': 0.9,
  '900': 0.85,
}

const NEUTRAL_LIGHTNESS: Record<Shade, number> = {
  '50': 98,
  '100': 96,
  '200': 91,
  '300': 83,
  '400': 64,
  '500': 45,
  '600': 36,
  '700': 27,
  '800': 18,
  '900': 11,
}

export function generateRamp(seedHex: string): Palette {
  const { h, s } = hexToHsl(seedHex)
  const ramp = {} as Palette
  for (const shade of SHADES) {
    ramp[shade] = hslToHex(h, clamp(s * SAT_MULT[shade], 0, 100), LIGHTNESS[shade])
  }
  return ramp
}

export function generateNeutralRamp(neutralTint: string): Palette {
  const { h, s } = hexToHsl(neutralTint)
  const ns = Math.min(s, 8)
  const ramp = {} as Palette
  for (const shade of SHADES) {
    ramp[shade] = hslToHex(h, ns, NEUTRAL_LIGHTNESS[shade])
  }
  return ramp
}

// ---- WCAG 2.1 -------------------------------------------------------------

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const cs = c / 255
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Darken a hex by stepping lightness down 2 points until it passes `target` on white. */
function darkenToContrast(
  hex: string,
  target: number,
  maxIter: number,
): string {
  let current = hex
  let iter = 0
  while (contrastRatio(current, '#FFFFFF') < target && iter < maxIter) {
    const { h, s, l } = hexToHsl(current)
    current = hslToHex(h, s, Math.max(0, l - 2))
    iter++
  }
  return current
}

export function enforceContrast(
  palette: Palette,
  target: 4.5 | 7,
): { palette: Palette; accessibleShade: Shade } {
  // Lowest shade >= 500 that meets the target against white -> used for text.
  let accessibleShade: Shade = '900'
  for (const sh of ['500', '600', '700', '800', '900'] as Shade[]) {
    if (contrastRatio(palette[sh], '#FFFFFF') >= target) {
      accessibleShade = sh
      break
    }
  }
  // Ensure the 600 (brand surface) carries white text at the target ratio.
  const adjusted600 = darkenToContrast(palette['600'], target, 10)
  return { palette: { ...palette, '600': adjusted600 }, accessibleShade }
}

export function semanticColors(target: 4.5 | 7): {
  success: string
  warning: string
  error: string
  info: string
} {
  const base = {
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#DC2626',
    info: '#2563EB',
  }
  if (target !== 7) return base
  return {
    success: darkenToContrast(base.success, 7, 40),
    warning: darkenToContrast(base.warning, 7, 40),
    error: darkenToContrast(base.error, 7, 40),
    info: darkenToContrast(base.info, 7, 40),
  }
}
