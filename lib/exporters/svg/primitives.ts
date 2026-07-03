import type { HorizonSystem } from '@/lib/types'

// ---------------------------------------------------------------------------
// Pure SVG string builders for the Figma Kit export. No DOM, no deps.
// Every builder follows the Figma-import fidelity rules (integer px, real
// <text>, ids on every group, only the allowed element set, translate only).
// ---------------------------------------------------------------------------

export type IdFactory = (base: string) => string

/** Unique-per-file id factory: collisions get -2, -3, ... suffixes. */
export function makeIdFactory(): IdFactory {
  const seen = new Map<string, number>()
  return (base: string) => {
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  }
}

export function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

type Attrs = Record<string, string | number | undefined>

/** Generic element builder. `children` (raw SVG markup) omitted => self-closing. */
export function tag(name: string, attrs: Attrs, children?: string): string {
  const a = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}="${escapeXml(String(v))}"`)
    .join(' ')
  const open = a ? `<${name} ${a}` : `<${name}`
  return children === undefined ? `${open}/>` : `${open}>${children}</${name}>`
}

const r = Math.round

export function svgDoc(w: number, h: number, inner: string): string {
  const W = r(w)
  const H = r(h)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${inner}</svg>`
}

// ---- element helpers (each takes an id) -----------------------------------

export function rect(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: string; stroke?: string; strokeWidth?: number; rx?: number } = {},
): string {
  return tag('rect', {
    id,
    x: r(x),
    y: r(y),
    width: r(w),
    height: r(h),
    rx: opts.rx !== undefined ? r(opts.rx) : undefined,
    fill: opts.fill ?? 'none',
    stroke: opts.stroke,
    'stroke-width': opts.stroke ? (opts.strokeWidth ?? 1) : undefined,
  })
}

/** Stroke-only rect (Figma maps stroke to center; use width 1 or 2). */
export function strokeRect(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  stroke: string,
  opts: { rx?: number; strokeWidth?: number } = {},
): string {
  return rect(id, x, y, w, h, {
    fill: 'none',
    stroke,
    strokeWidth: opts.strokeWidth ?? 1,
    rx: opts.rx,
  })
}

export function circle(
  id: string,
  cx: number,
  cy: number,
  radius: number,
  opts: { fill?: string; stroke?: string; strokeWidth?: number } = {},
): string {
  return tag('circle', {
    id,
    cx: r(cx),
    cy: r(cy),
    r: r(radius),
    fill: opts.fill ?? 'none',
    stroke: opts.stroke,
    'stroke-width': opts.stroke ? (opts.strokeWidth ?? 1) : undefined,
  })
}

export function line(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: string,
  strokeWidth = 1,
): string {
  return tag('line', {
    id,
    x1: r(x1),
    y1: r(y1),
    x2: r(x2),
    y2: r(y2),
    stroke,
    'stroke-width': strokeWidth,
  })
}

export function path(
  id: string,
  d: string,
  opts: { fill?: string; stroke?: string; strokeWidth?: number } = {},
): string {
  return tag('path', {
    id,
    d,
    fill: opts.fill ?? 'none',
    stroke: opts.stroke,
    'stroke-width': opts.stroke ? (opts.strokeWidth ?? 1) : undefined,
  })
}

export function text(
  id: string,
  x: number,
  y: number,
  content: string,
  opts: {
    size?: number
    weight?: number
    fill?: string
    family?: string
    anchor?: 'start' | 'middle' | 'end'
    baseline?: string
  } = {},
): string {
  return tag(
    'text',
    {
      id,
      x: r(x),
      y: r(y),
      'font-family': opts.family,
      'font-size': r(opts.size ?? 14),
      'font-weight': opts.weight ?? 400,
      fill: opts.fill ?? '#000000',
      'text-anchor': opts.anchor,
      'dominant-baseline': opts.baseline,
    },
    escapeXml(content),
  )
}

export function group(id: string, children: string, translate?: { x: number; y: number }): string {
  return tag(
    'g',
    { id, transform: translate ? `translate(${r(translate.x)} ${r(translate.y)})` : undefined },
    children,
  )
}

// ---- layout ---------------------------------------------------------------

export function rowLayout(
  count: number,
  itemW: number,
  itemH: number,
  gap: number,
  cols: number,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = []
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    out.push({ x: col * (itemW + gap), y: row * (itemH + gap) })
  }
  return out
}

// ---- color helpers --------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
const toHex2 = (n: number) => clampByte(n).toString(16).padStart(2, '0')

/** Linear mix of two hex colors, t in 0..1. mixHex('#000','#FFF',0.5) => #808080. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const m = (x: number, y: number) => x + (y - x) * t
  return `#${toHex2(m(ar, br))}${toHex2(m(ag, bg))}${toHex2(m(ab, bb))}`.toUpperCase()
}

const RAMP_FALLBACK = (system: HorizonSystem): Record<string, string | undefined> => {
  const p = system.colors?.primary
  const n = system.colors?.neutral
  const sem = system.colors?.semantic
  return {
    'color-bg-page': n?.['50'],
    'color-bg-surface': '#FFFFFF',
    'color-bg-brand': p?.['600'],
    'color-bg-brand-hover': p?.['700'],
    'color-text-primary': n?.['900'],
    'color-text-secondary': n?.['600'],
    'color-text-muted': n?.['400'],
    'color-text-on-brand': '#FFFFFF',
    'color-text-brand': p?.['700'],
    'color-border': n?.['200'],
    'color-border-strong': n?.['300'],
    'color-border-focus': p?.['500'],
    'color-success': sem?.success,
    'color-warning': sem?.warning,
    'color-error': sem?.error,
    'color-info': sem?.info,
  }
}

/** Resolve a semantic token name to a hex, following semanticTokens or the ramps. */
export function resolveToken(system: HorizonSystem, name: string): string {
  const tok = system.semanticTokens?.find((t) => t.name === name)
  const value = tok?.value ?? RAMP_FALLBACK(system)[name]
  return (value ?? '#000000').toUpperCase()
}

// ---- system accessors -----------------------------------------------------

export function fontStack(system: HorizonSystem): string {
  const f = system.typography?.fontFamily
  return f && f !== 'Inter' ? `${f}, Inter, sans-serif` : 'Inter, sans-serif'
}

export function stepSize(system: HorizonSystem, name: string, fallback: number): number {
  const s = system.typography?.scale?.find((x) => x.name === name)
  const n = s ? parseInt(s.size, 10) : NaN
  return Number.isFinite(n) ? n : fallback
}

export function radiusPx(system: HorizonSystem, key: 'sm' | 'md' | 'lg' | 'full'): number {
  const raw = system.radius?.[key]
  if (!raw) return key === 'full' ? 9999 : 8
  if (raw.includes('9999')) return 9999
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : 8
}

export function neutral(system: HorizonSystem, shade: string): string {
  return (system.colors?.neutral?.[shade as '50'] ?? '#9CA3AF').toUpperCase()
}

// ---- title/footer block (rule 6) ------------------------------------------

export function metaBlock(
  system: HorizonSystem,
  id: IdFactory,
  w: number,
  h: number,
): string {
  const ink = resolveToken(system, 'color-text-primary')
  const muted = neutral(system, '400')
  const family = fontStack(system)
  return group(
    id('_meta'),
    text(id('_meta_title'), 48, 56, system.name || 'Design System', {
      size: 26,
      weight: 700,
      fill: ink,
      family,
      baseline: 'central',
    }) +
      text(id('_meta_footer'), 48, h - 22, 'Generated by Horizon', {
        size: 11,
        weight: 400,
        fill: muted,
        family,
      }),
  )
}

// ---- swatch + labeled value ----------------------------------------------

export function swatch(
  id: string,
  x: number,
  y: number,
  size: number,
  hex: string,
  label: string,
  system: HorizonSystem,
): string {
  const family = fontStack(system)
  return group(
    id,
    rect(`${id}/box`, x, y, size, size, { fill: hex, rx: radiusPx(system, 'md') }) +
      text(`${id}/label`, x, y + size + 16, label, {
        size: 11,
        weight: 400,
        fill: neutral(system, '500'),
        family,
      }),
  )
}

export function labeledValue(
  idLabel: string,
  x: number,
  y: number,
  label: string,
  value: string,
  system: HorizonSystem,
): string {
  const family = fontStack(system)
  return (
    text(`${idLabel}/name`, x, y, label, {
      size: 13,
      weight: 600,
      fill: resolveToken(system, 'color-text-primary'),
      family,
    }) +
    text(`${idLabel}/value`, x, y + 16, value, {
      size: 11,
      weight: 400,
      fill: neutral(system, '500'),
      family,
    })
  )
}

// ---- validation (rule 2) --------------------------------------------------

const FORBIDDEN = [
  'filter',
  'feDropShadow',
  'mask',
  'clipPath',
  'foreignObject',
  'image',
  'style',
]
const BALANCED = ['svg', 'g', 'text', 'defs', 'linearGradient', 'tspan']

export function assertValidSvg(svg: string, filename: string): void {
  const problems: string[] = []
  if (!/viewBox=/.test(svg)) problems.push('missing viewBox')
  for (const f of FORBIDDEN) {
    if (new RegExp(`<${f}[\\s>/]`).test(svg)) problems.push(`forbidden <${f}>`)
  }
  if (/class=/.test(svg)) problems.push('CSS class present')
  for (const t of BALANCED) {
    const opens = (svg.match(new RegExp(`<${t}[\\s>]`, 'g')) ?? []).length
    const closes = (svg.match(new RegExp(`</${t}>`, 'g')) ?? []).length
    if (opens !== closes) problems.push(`unbalanced <${t}> (${opens}/${closes})`)
  }
  if (problems.length > 0) {
    const msg = `Invalid SVG "${filename}": ${problems.join(', ')}`
    if (process.env.NODE_ENV === 'production') console.warn(msg)
    else throw new Error(msg)
  }
}
