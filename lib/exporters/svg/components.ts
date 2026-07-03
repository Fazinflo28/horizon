import type { ComponentSpec, HorizonSystem } from '@/lib/types'
import {
  rect,
  strokeRect,
  circle,
  line,
  path,
  text,
  group,
  resolveToken,
  neutral,
  radiusPx,
  fontStack,
} from './primitives'

// ---------------------------------------------------------------------------
// Per-component vector builders. Each draws a real, editable preview at local
// origin (0,0) and returns its markup + bounding size. All layer ids are
// prefixed with the unique `p` the caller supplies, so ids stay file-unique.
// Fidelity rules: integer px (helpers round), real <text>, translate-only,
// only rect/circle/line/path/text/g. No scale, rotate, filter, mask or image.
// ---------------------------------------------------------------------------

export interface Preview {
  inner: string
  w: number
  h: number
}

export type Builder = (s: HorizonSystem, p: string, W: number) => Preview

export function normType(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// ---- small local helpers --------------------------------------------------

interface PillColors {
  bg?: string
  fg: string
  border?: string
}

/** A rounded-full pill with centered label. Returns markup + measured width. */
function pill(
  p: string,
  x: number,
  y: number,
  label: string,
  size: number,
  c: PillColors,
  s: HorizonSystem,
): { svg: string; w: number; h: number } {
  const family = fontStack(s)
  const padX = Math.round(size * 0.9)
  const h = size + 12
  const w = Math.round(label.length * size * 0.58) + padX * 2
  const svg =
    rect(`${p}/bg`, x, y, w, h, { fill: c.bg ?? 'none', stroke: c.border, rx: 9999 }) +
    text(`${p}/label`, x + w / 2, y + h / 2, label, {
      size,
      weight: 600,
      fill: c.fg,
      family,
      anchor: 'middle',
      baseline: 'central',
    })
  return { svg, w, h }
}

/** Centered single-line label inside a box of height h at top y. */
function centered(
  id: string,
  cx: number,
  y: number,
  h: number,
  label: string,
  size: number,
  weight: number,
  fill: string,
  s: HorizonSystem,
): string {
  return text(id, cx, y + h / 2, label, {
    size,
    weight,
    fill,
    family: fontStack(s),
    anchor: 'middle',
    baseline: 'central',
  })
}

// ---- builders -------------------------------------------------------------

const buildButton: Builder = (s, p) => {
  const family = fontStack(s)
  const brand = resolveToken(s, 'color-bg-brand')
  const onBrand = resolveToken(s, 'color-text-on-brand')
  const surface = resolveToken(s, 'color-bg-surface')
  const border = resolveToken(s, 'color-border')
  const brandText = resolveToken(s, 'color-text-brand')
  const focus = resolveToken(s, 'color-border-focus')
  const rx = radiusPx(s, 'md')
  const bw = 128
  const bh = 44
  const gap = 18
  const label = (id: string, cx: number, fill: string) =>
    centered(id, cx, 0, bh, 'Button', 15, 600, fill, s)

  const filled = group(
    `${p}/Filled`,
    rect(`${p}/Filled/bg`, 0, 0, bw, bh, { fill: brand, rx }) + label(`${p}/Filled/label`, bw / 2, onBrand),
  )
  const outline = group(
    `${p}/Outline`,
    rect(`${p}/Outline/bg`, 0, 0, bw, bh, { fill: surface, stroke: border, rx }) +
      label(`${p}/Outline/label`, bw / 2, brandText),
    { x: bw + gap, y: 0 },
  )
  const fx = (bw + gap) * 2
  const focused = group(
    `${p}/Focused`,
    // focus ring is a separate, editable rect — never baked into the fill
    strokeRect(`${p}/Focused/focus-ring`, -4, -4, bw + 8, bh + 8, focus, { rx: rx + 4, strokeWidth: 2 }) +
      rect(`${p}/Focused/bg`, 0, 0, bw, bh, { fill: brand, rx }) +
      label(`${p}/Focused/label`, bw / 2, onBrand),
    { x: fx, y: 0 },
  )
  void family
  return { inner: filled + outline + focused, w: fx + bw, h: bh + 4 }
}

const buildIconButton: Builder = (s, p) => {
  const brand = resolveToken(s, 'color-bg-brand')
  const onBrand = resolveToken(s, 'color-text-on-brand')
  const surface = resolveToken(s, 'color-bg-surface')
  const border = resolveToken(s, 'color-border')
  const ink = resolveToken(s, 'color-text-primary')
  const rx = radiusPx(s, 'md')
  const sz = 44
  const bell = (ox: number, stroke: string) =>
    path(
      `${p}/bell-${ox}`,
      `M${ox + 22} 14 C${ox + 18} 14 ${ox + 17} 17 ${ox + 17} 21 L${ox + 16} 27 L${ox + 28} 27 L${ox + 27} 21 C${ox + 27} 17 ${ox + 26} 14 ${ox + 22} 14 Z M${ox + 20} 29 L${ox + 24} 29`,
      { stroke, strokeWidth: 2 },
    )
  const filled = group(
    `${p}/Solid`,
    rect(`${p}/Solid/bg`, 0, 0, sz, sz, { fill: brand, rx }) + bell(0, onBrand),
  )
  const ghost = group(
    `${p}/Ghost`,
    rect(`${p}/Ghost/bg`, 0, 0, sz, sz, { fill: surface, stroke: border, rx }) + bell(sz + 18, ink),
    { x: sz + 18, y: 0 },
  )
  return { inner: filled + ghost, w: sz * 2 + 18, h: sz }
}

const buildFab: Builder = (s, p) => {
  const brand = resolveToken(s, 'color-bg-brand')
  const onBrand = resolveToken(s, 'color-text-on-brand')
  const r = 28
  const cx = r
  const cy = r
  const plus = path(`${p}/plus`, `M${cx} ${cy - 10} L${cx} ${cy + 10} M${cx - 10} ${cy} L${cx + 10} ${cy}`, {
    stroke: onBrand,
    strokeWidth: 3,
  })
  return {
    inner: group(`${p}/circle`, circle(`${p}/circle/bg`, cx, cy, r, { fill: brand }) + plus),
    w: r * 2,
    h: r * 2,
  }
}

const buildTextField: Builder = (s, p, W) => {
  const family = fontStack(s)
  const surface = resolveToken(s, 'color-bg-surface')
  const border = resolveToken(s, 'color-border')
  const focus = resolveToken(s, 'color-border-focus')
  const ink = resolveToken(s, 'color-text-primary')
  const muted = resolveToken(s, 'color-text-muted')
  const rx = radiusPx(s, 'md')
  const gap = 26
  // two fields side by side must fit inside the available width W
  const fw = Math.min(300, Math.floor((W - gap) / 2))
  const fh = 46
  const restLabel = text(`${p}/rest/label`, 0, 8, 'Label', { size: 12, weight: 600, fill: ink, family })
  const rest = group(
    `${p}/Default`,
    restLabel +
      rect(`${p}/rest/box`, 0, 16, fw, fh, { fill: surface, stroke: border, rx }) +
      text(`${p}/rest/placeholder`, 14, 16 + fh / 2, 'Placeholder', {
        size: 14,
        weight: 400,
        fill: muted,
        family,
        baseline: 'central',
      }),
  )
  const focused = group(
    `${p}/Focused`,
    text(`${p}/focus/label`, 0, 8, 'Label', { size: 12, weight: 600, fill: focus, family }) +
      strokeRect(`${p}/focus/box`, 0, 16, fw, fh, focus, { rx, strokeWidth: 2 }) +
      rect(`${p}/focus/fill`, 1, 17, fw - 2, fh - 2, { fill: surface, rx: rx - 1 }) +
      text(`${p}/focus/value`, 14, 16 + fh / 2, 'Typed value', {
        size: 14,
        weight: 400,
        fill: ink,
        family,
        baseline: 'central',
      }),
    { x: fw + gap, y: 0 },
  )
  return { inner: rest + focused, w: fw * 2 + gap, h: 16 + fh }
}

const buildDropdown: Builder = (s, p, W) => {
  const family = fontStack(s)
  const surface = resolveToken(s, 'color-bg-surface')
  const border = resolveToken(s, 'color-border')
  const ink = resolveToken(s, 'color-text-primary')
  const rx = radiusPx(s, 'md')
  const fw = Math.min(W, 320)
  const fh = 46
  const cx = fw - 26
  const chevron = path(`${p}/chevron`, `M${cx - 6} ${fh / 2 - 3} L${cx} ${fh / 2 + 3} L${cx + 6} ${fh / 2 - 3}`, {
    stroke: ink,
    strokeWidth: 2,
  })
  return {
    inner: group(
      `${p}/Select`,
      rect(`${p}/Select/box`, 0, 0, fw, fh, { fill: surface, stroke: border, rx }) +
        text(`${p}/Select/value`, 14, fh / 2, 'Choose an option', {
          size: 14,
          weight: 400,
          fill: ink,
          family,
          baseline: 'central',
        }) +
        chevron,
    ),
    w: fw,
    h: fh,
  }
}

const buildCheckbox: Builder = (s, p) => {
  const family = fontStack(s)
  const brand = resolveToken(s, 'color-bg-brand')
  const onBrand = resolveToken(s, 'color-text-on-brand')
  const surface = resolveToken(s, 'color-bg-surface')
  const border = resolveToken(s, 'color-border-strong')
  const ink = resolveToken(s, 'color-text-primary')
  const rx = Math.min(radiusPx(s, 'sm'), 6)
  const bx = 22
  const row = (id: string, oy: number, checked: boolean, label: string) => {
    const box = checked
      ? rect(`${id}/box`, 0, oy, bx, bx, { fill: brand, rx }) +
        path(`${id}/check`, `M5 ${oy + 11} L9 ${oy + 15} L17 ${oy + 6}`, { stroke: onBrand, strokeWidth: 2 })
      : rect(`${id}/box`, 0, oy, bx, bx, { fill: surface, stroke: border, rx })
    return (
      box +
      text(`${id}/label`, bx + 12, oy + bx / 2, label, {
        size: 14,
        weight: 400,
        fill: ink,
        family,
        baseline: 'central',
      })
    )
  }
  return {
    inner:
      group(`${p}/Checked`, row(`${p}/Checked`, 0, true, 'Checked')) +
      group(`${p}/Unchecked`, row(`${p}/Unchecked`, 0, false, 'Unchecked'), { x: 170, y: 0 }),
    w: 320,
    h: bx,
  }
}

const buildRadio: Builder = (s, p) => {
  const family = fontStack(s)
  const brand = resolveToken(s, 'color-bg-brand')
  const border = resolveToken(s, 'color-border-strong')
  const ink = resolveToken(s, 'color-text-primary')
  const rr = 11
  const row = (id: string, ox: number, sel: boolean, label: string) => {
    const ring = sel
      ? circle(`${id}/ring`, ox + rr, rr, rr, { stroke: brand, strokeWidth: 2 }) +
        circle(`${id}/dot`, ox + rr, rr, 5, { fill: brand })
      : circle(`${id}/ring`, ox + rr, rr, rr, { stroke: border, strokeWidth: 2 })
    return (
      ring +
      text(`${id}/label`, ox + rr * 2 + 12, rr, label, {
        size: 14,
        weight: 400,
        fill: ink,
        family,
        baseline: 'central',
      })
    )
  }
  return {
    inner: group(`${p}/Selected`, row(`${p}/Selected`, 0, true, 'Selected')) + group(`${p}/Rest`, row(`${p}/Rest`, 0, false, 'Option'), { x: 170, y: 0 }),
    w: 320,
    h: rr * 2,
  }
}

const buildToggle: Builder = (s, p) => {
  const brand = resolveToken(s, 'color-bg-brand')
  const track = neutral(s, '300')
  const knob = resolveToken(s, 'color-bg-surface')
  const tw = 52
  const th = 30
  const on = group(
    `${p}/On`,
    rect(`${p}/On/track`, 0, 0, tw, th, { fill: brand, rx: 9999 }) + circle(`${p}/On/knob`, tw - th / 2, th / 2, th / 2 - 4, { fill: knob }),
  )
  const off = group(
    `${p}/Off`,
    rect(`${p}/Off/track`, 0, 0, tw, th, { fill: track, rx: 9999 }) + circle(`${p}/Off/knob`, th / 2, th / 2, th / 2 - 4, { fill: knob }),
    { x: tw + 24, y: 0 },
  )
  return { inner: on + off, w: tw * 2 + 24, h: th }
}

const buildSlider: Builder = (s, p, W) => {
  const brand = resolveToken(s, 'color-bg-brand')
  const track = neutral(s, '200')
  const knob = resolveToken(s, 'color-bg-surface')
  const w = Math.min(W, 360)
  const cy = 12
  const fillW = Math.round(w * 0.55)
  return {
    inner: group(
      `${p}/Slider`,
      rect(`${p}/Slider/track`, 0, cy - 3, w, 6, { fill: track, rx: 9999 }) +
        rect(`${p}/Slider/fill`, 0, cy - 3, fillW, 6, { fill: brand, rx: 9999 }) +
        circle(`${p}/Slider/knob-ring`, fillW, cy, 11, { fill: knob, stroke: brand, strokeWidth: 2 }),
    ),
    w,
    h: 24,
  }
}

const buildBadge: Builder = (s, p) => {
  const brand = resolveToken(s, 'color-bg-brand')
  const onBrand = resolveToken(s, 'color-text-on-brand')
  const success = resolveToken(s, 'color-success')
  const neutralBg = neutral(s, '100')
  const ink = resolveToken(s, 'color-text-primary')
  let x = 0
  const parts: string[] = []
  const push = (id: string, label: string, bg: string, fg: string) => {
    const r = pill(id, x, 0, label, 12, { bg, fg }, s)
    parts.push(group(id, r.svg))
    x += r.w + 12
  }
  push(`${p}/Brand`, 'Brand', brand, onBrand)
  push(`${p}/Success`, 'Active', success, '#FFFFFF')
  push(`${p}/Neutral`, 'Neutral', neutralBg, ink)
  return { inner: parts.join(''), w: x, h: 24 }
}

const buildChip: Builder = (s, p) => {
  const surface = resolveToken(s, 'color-bg-surface')
  const border = resolveToken(s, 'color-border')
  const ink = resolveToken(s, 'color-text-primary')
  const brand50 = neutral(s, '100')
  const brandText = resolveToken(s, 'color-text-brand')
  let x = 0
  const parts: string[] = []
  const push = (id: string, label: string, bg: string, fg: string, bd?: string) => {
    const r = pill(id, x, 0, label, 13, { bg, fg, border: bd }, s)
    parts.push(group(id, r.svg))
    x += r.w + 12
  }
  push(`${p}/Rest`, 'Default', surface, ink, border)
  push(`${p}/Selected`, 'Selected', brand50, brandText)
  push(`${p}/Rest2`, 'Filter', surface, ink, border)
  return { inner: parts.join(''), w: x, h: 25 }
}

const buildTabs: Builder = (s, p, W) => {
  const family = fontStack(s)
  const brand = resolveToken(s, 'color-bg-brand')
  const ink = resolveToken(s, 'color-text-primary')
  const muted = resolveToken(s, 'color-text-muted')
  const border = resolveToken(s, 'color-border')
  const w = Math.min(W, 420)
  const labels = ['Overview', 'Activity', 'Settings']
  const colW = Math.round(w / labels.length)
  const baseY = 34
  const parts = [line(`${p}/baseline`, 0, baseY, w, baseY, border, 1)]
  labels.forEach((lb, i) => {
    const cx = colW * i + colW / 2
    const active = i === 0
    parts.push(
      group(
        `${p}/tab-${normType(lb)}`,
        text(`${p}/tab-${normType(lb)}/label`, cx, baseY / 2, lb, {
          size: 14,
          weight: active ? 600 : 400,
          fill: active ? brand : muted,
          family,
          anchor: 'middle',
          baseline: 'central',
        }) +
          (active
            ? rect(`${p}/tab-${normType(lb)}/indicator`, colW * i + 12, baseY - 2, colW - 24, 3, {
                fill: brand,
                rx: 9999,
              })
            : ''),
      ),
    )
  })
  void ink
  return { inner: parts.join(''), w, h: baseY + 4 }
}

const buildCard: Builder = (s, p, W) => {
  const family = fontStack(s)
  const surface = resolveToken(s, 'color-bg-surface')
  const border = resolveToken(s, 'color-border')
  const ink = resolveToken(s, 'color-text-primary')
  const muted = resolveToken(s, 'color-text-secondary')
  const brand = resolveToken(s, 'color-bg-brand')
  const onBrand = resolveToken(s, 'color-text-on-brand')
  const media = neutral(s, '100')
  const rx = radiusPx(s, 'lg')
  const cw = Math.min(W, 280)
  const mediaH = 96
  // media placeholder with a small mountain glyph (real path, editable)
  const glyph = path(
    `${p}/media/glyph`,
    `M${cw / 2 - 20} ${mediaH - 20} L${cw / 2 - 6} ${mediaH - 38} L${cw / 2 + 2} ${mediaH - 28} L${cw / 2 + 10} ${mediaH - 40} L${cw / 2 + 22} ${mediaH - 20} Z`,
    { fill: neutral(s, '300') },
  )
  const bw = 96
  const bh = 36
  const inner =
    rect(`${p}/card`, 0, 0, cw, 232, { fill: surface, stroke: border, rx }) +
    rect(`${p}/media`, 12, 12, cw - 24, mediaH, { fill: media, rx: Math.max(rx - 4, 4) }) +
    glyph +
    text(`${p}/title`, 16, mediaH + 34, 'Card title', { size: 16, weight: 700, fill: ink, family }) +
    text(`${p}/body`, 16, mediaH + 58, 'Supporting copy for the card.', {
      size: 13,
      weight: 400,
      fill: muted,
      family,
    }) +
    group(
      `${p}/action`,
      rect(`${p}/action/bg`, 16, mediaH + 78, bw, bh, { fill: brand, rx: radiusPx(s, 'md') }) +
        centered(`${p}/action/label`, 16 + bw / 2, mediaH + 78, bh, 'Action', 13, 600, onBrand, s),
    )
  return { inner, w: cw, h: 232 }
}

const buildAlert: Builder = (s, p, W) => {
  const family = fontStack(s)
  const info = resolveToken(s, 'color-info')
  const ink = resolveToken(s, 'color-text-primary')
  const body = resolveToken(s, 'color-text-secondary')
  const rx = radiusPx(s, 'md')
  const w = Math.min(W, 420)
  const h = 78
  const tintBg = neutral(s, '100')
  const iconCx = 30
  const iconCy = h / 2
  return {
    inner: group(
      `${p}/Info`,
      rect(`${p}/Info/bg`, 0, 0, w, h, { fill: tintBg, rx }) +
        rect(`${p}/Info/accent`, 0, 0, 4, h, { fill: info, rx: 0 }) +
        circle(`${p}/Info/icon`, iconCx, iconCy, 11, { fill: info }) +
        text(`${p}/Info/i`, iconCx, iconCy, 'i', {
          size: 13,
          weight: 700,
          fill: '#FFFFFF',
          family,
          anchor: 'middle',
          baseline: 'central',
        }) +
        text(`${p}/Info/title`, 52, 28, 'Heads up', { size: 14, weight: 700, fill: ink, family }) +
        text(`${p}/Info/desc`, 52, 50, 'Your changes have been saved automatically.', {
          size: 13,
          weight: 400,
          fill: body,
          family,
        }),
    ),
    w,
    h,
  }
}

const buildToast: Builder = (s, p, W) => {
  const family = fontStack(s)
  const dark = resolveToken(s, 'color-text-primary')
  const brand = resolveToken(s, 'color-text-brand')
  const rx = radiusPx(s, 'md')
  const w = Math.min(W, 360)
  const h = 56
  return {
    inner: group(
      `${p}/Toast`,
      rect(`${p}/Toast/bg`, 0, 0, w, h, { fill: dark, rx }) +
        circle(`${p}/Toast/dot`, 24, h / 2, 5, { fill: resolveToken(s, 'color-success') }) +
        text(`${p}/Toast/msg`, 40, h / 2, 'Project published', {
          size: 14,
          weight: 500,
          fill: '#FFFFFF',
          family,
          baseline: 'central',
        }) +
        text(`${p}/Toast/action`, w - 20, h / 2, 'Undo', {
          size: 14,
          weight: 600,
          fill: brand,
          family,
          anchor: 'end',
          baseline: 'central',
        }),
    ),
    w,
    h,
  }
}

const buildTooltip: Builder = (s, p) => {
  const dark = resolveToken(s, 'color-text-primary')
  const w = 148
  const h = 34
  return {
    inner: group(
      `${p}/Tooltip`,
      rect(`${p}/Tooltip/bg`, 0, 0, w, h, { fill: dark, rx: 8 }) +
        path(`${p}/Tooltip/arrow`, `M${w / 2 - 6} ${h} L${w / 2} ${h + 7} L${w / 2 + 6} ${h} Z`, { fill: dark }) +
        centered(`${p}/Tooltip/label`, w / 2, 0, h, 'Tooltip label', 13, 500, '#FFFFFF', s),
    ),
    w,
    h: h + 7,
  }
}

const buildBanner: Builder = (s, p, W) => {
  const family = fontStack(s)
  const brand50 = neutral(s, '100')
  const ink = resolveToken(s, 'color-text-primary')
  const brand = resolveToken(s, 'color-bg-brand')
  const onBrand = resolveToken(s, 'color-text-on-brand')
  const rx = radiusPx(s, 'md')
  const w = Math.min(W, 480)
  const h = 60
  const bw = 92
  const bh = 36
  return {
    inner: group(
      `${p}/Banner`,
      rect(`${p}/Banner/bg`, 0, 0, w, h, { fill: brand50, rx }) +
        text(`${p}/Banner/msg`, 20, h / 2, "You're on the free plan.", {
          size: 14,
          weight: 500,
          fill: ink,
          family,
          baseline: 'central',
        }) +
        group(
          `${p}/Banner/cta`,
          rect(`${p}/Banner/cta/bg`, w - bw - 16, (h - bh) / 2, bw, bh, { fill: brand, rx: radiusPx(s, 'md') }) +
            centered(`${p}/Banner/cta/label`, w - bw - 16 + bw / 2, (h - bh) / 2, bh, 'Upgrade', 13, 600, onBrand, s),
        ),
    ),
    w,
    h,
  }
}

const buildDivider: Builder = (s, p, W) => {
  const family = fontStack(s)
  const border = resolveToken(s, 'color-border')
  const muted = resolveToken(s, 'color-text-muted')
  const w = Math.min(W, 440)
  const label = 'Section'
  const lw = 70
  const midY = 10
  return {
    inner: group(
      `${p}/Divider`,
      line(`${p}/Divider/left`, 0, midY, w / 2 - lw / 2, midY, border, 1) +
        line(`${p}/Divider/right`, w / 2 + lw / 2, midY, w, midY, border, 1) +
        text(`${p}/Divider/label`, w / 2, midY, label, {
          size: 12,
          weight: 500,
          fill: muted,
          family,
          anchor: 'middle',
          baseline: 'central',
        }),
    ),
    w,
    h: 20,
  }
}

const buildProgress: Builder = (s, p, W) => {
  const brand = resolveToken(s, 'color-bg-brand')
  const track = neutral(s, '200')
  const w = Math.min(W, 400)
  return {
    inner: group(
      `${p}/Progress`,
      rect(`${p}/Progress/track`, 0, 0, w, 8, { fill: track, rx: 9999 }) +
        rect(`${p}/Progress/fill`, 0, 0, Math.round(w * 0.62), 8, { fill: brand, rx: 9999 }),
    ),
    w,
    h: 8,
  }
}

const buildRating: Builder = (s, p) => {
  const filled = resolveToken(s, 'color-warning')
  const empty = neutral(s, '300')
  const size = 26
  const parts: string[] = []
  // 22px star authored at integer coords, translated per star (translate only)
  const starPath = (id: string, fill: string) =>
    path(id, 'M11 1 L13 8 L21 8 L15 12 L17 19 L11 15 L5 19 L7 12 L1 8 L9 8 Z', { fill })
  for (let i = 0; i < 5; i++) {
    parts.push(group(`${p}/star-${i + 1}`, starPath(`${p}/star-${i + 1}/shape`, i < 3 ? filled : empty), { x: i * size, y: 0 }))
  }
  return { inner: parts.join(''), w: size * 5, h: 22 }
}

const buildAvatar: Builder = (s, p) => {
  const brand100 = neutral(s, '100')
  const brandText = resolveToken(s, 'color-text-brand')
  const surface = resolveToken(s, 'color-bg-surface')
  const r = 22
  const item = (id: string, ox: number, initials: string) =>
    circle(`${id}/ring`, ox + r, r, r, { fill: brand100, stroke: surface, strokeWidth: 2 }) +
    centered(`${id}/initials`, ox + r, 0, r * 2, initials, 14, 600, brandText, s)
  return {
    inner: group(`${p}/AL`, item(`${p}/AL`, 0, 'AL')) + group(`${p}/GH`, item(`${p}/GH`, r * 2 - 12, 'GH')) + group(`${p}/AT`, item(`${p}/AT`, (r * 2 - 12) * 2, 'AT')),
    w: r * 2 + (r * 2 - 12) * 2,
    h: r * 2,
  }
}

const buildBreadcrumb: Builder = (s, p) => {
  const family = fontStack(s)
  const muted = resolveToken(s, 'color-text-muted')
  const ink = resolveToken(s, 'color-text-primary')
  const crumbs = ['Home', 'Projects', 'Nimbus']
  let x = 0
  const parts: string[] = []
  crumbs.forEach((c, i) => {
    const last = i === crumbs.length - 1
    parts.push(
      text(`${p}/crumb-${i}`, x, 9, c, {
        size: 13,
        weight: last ? 600 : 400,
        fill: last ? ink : muted,
        family,
        baseline: 'central',
      }),
    )
    x += Math.round(c.length * 7.4) + 8
    if (!last) {
      parts.push(text(`${p}/sep-${i}`, x, 9, '/', { size: 13, weight: 400, fill: muted, family, baseline: 'central' }))
      x += 16
    }
  })
  return { inner: parts.join(''), w: x, h: 18 }
}

const buildListItem: Builder = (s, p, W) => {
  const family = fontStack(s)
  const surface = resolveToken(s, 'color-bg-surface')
  const border = resolveToken(s, 'color-border')
  const ink = resolveToken(s, 'color-text-primary')
  const muted = resolveToken(s, 'color-text-secondary')
  const brand100 = neutral(s, '100')
  const brandText = resolveToken(s, 'color-text-brand')
  const rx = radiusPx(s, 'md')
  const w = Math.min(W, 360)
  const rowH = 60
  const people: Array<[string, string, string]> = [
    ['AL', 'Ada Lovelace', 'Member'],
    ['GH', 'Grace Hopper', 'Admin'],
  ]
  const parts = [rect(`${p}/bg`, 0, 0, w, rowH * people.length, { fill: surface, stroke: border, rx })]
  people.forEach(([initials, name, role], i) => {
    const oy = i * rowH
    if (i > 0) parts.push(line(`${p}/sep-${i}`, 16, oy, w - 16, oy, border, 1))
    parts.push(
      group(
        `${p}/row-${i}`,
        circle(`${p}/row-${i}/avatar`, 34, oy + rowH / 2, 16, { fill: brand100 }) +
          centered(`${p}/row-${i}/initials`, 34, oy, rowH, initials, 12, 600, brandText, s) +
          text(`${p}/row-${i}/name`, 62, oy + rowH / 2 - 8, name, { size: 14, weight: 600, fill: ink, family, baseline: 'central' }) +
          text(`${p}/row-${i}/role`, 62, oy + rowH / 2 + 10, role, { size: 12, weight: 400, fill: muted, family, baseline: 'central' }),
      ),
    )
  })
  return { inner: parts.join(''), w, h: rowH * people.length }
}

const buildAccordion: Builder = (s, p, W) => {
  const family = fontStack(s)
  const surface = resolveToken(s, 'color-bg-surface')
  const border = resolveToken(s, 'color-border')
  const ink = resolveToken(s, 'color-text-primary')
  const rx = radiusPx(s, 'md')
  const w = Math.min(W, 400)
  const rows = ['What is included?', 'How does billing work?']
  const rowH = 52
  const parts = [rect(`${p}/bg`, 0, 0, w, rowH * rows.length, { fill: surface, stroke: border, rx })]
  rows.forEach((label, i) => {
    const oy = i * rowH
    if (i > 0) parts.push(line(`${p}/sep-${i}`, 0, oy, w, oy, border, 1))
    const cx = w - 26
    parts.push(
      group(
        `${p}/row-${i}`,
        text(`${p}/row-${i}/label`, 18, oy + rowH / 2, label, { size: 14, weight: 600, fill: ink, family, baseline: 'central' }) +
          path(`${p}/row-${i}/chevron`, `M${cx - 6} ${oy + rowH / 2 - 3} L${cx} ${oy + rowH / 2 + 3} L${cx + 6} ${oy + rowH / 2 - 3}`, {
            stroke: ink,
            strokeWidth: 2,
          }),
      ),
    )
  })
  return { inner: parts.join(''), w, h: rowH * rows.length }
}

const buildAppBar: Builder = (s, p, W) => {
  const family = fontStack(s)
  const brand = resolveToken(s, 'color-bg-brand')
  const onBrand = resolveToken(s, 'color-text-on-brand')
  const rx = radiusPx(s, 'md')
  const w = Math.min(W, 460)
  const h = 56
  return {
    inner: group(
      `${p}/AppBar`,
      rect(`${p}/AppBar/bg`, 0, 0, w, h, { fill: brand, rx }) +
        path(`${p}/AppBar/menu`, `M18 ${h / 2 - 5} L34 ${h / 2 - 5} M18 ${h / 2} L34 ${h / 2} M18 ${h / 2 + 5} L34 ${h / 2 + 5}`, {
          stroke: onBrand,
          strokeWidth: 2,
        }) +
        text(`${p}/AppBar/title`, 48, h / 2, 'Horizon', { size: 16, weight: 700, fill: onBrand, family, baseline: 'central' }) +
        circle(`${p}/AppBar/avatar`, w - 28, h / 2, 14, { fill: onBrand }),
    ),
    w,
    h,
  }
}

// ---- generic spec-card fallback (any unmapped component) -------------------

const buildGeneric = (s: HorizonSystem, p: string, W: number, c: ComponentSpec): Preview => {
  const family = fontStack(s)
  const surface = resolveToken(s, 'color-bg-surface')
  const border = resolveToken(s, 'color-border')
  const ink = resolveToken(s, 'color-text-primary')
  const muted = resolveToken(s, 'color-text-muted')
  const rx = radiusPx(s, 'sm')
  const specs = c.specs ?? {}
  const rows: Array<[string, string]> = [
    ['Height', specs.height ?? 'auto'],
    ['Padding', specs.paddingX ?? '16px'],
    ['Radius', specs.radius ?? `${radiusPx(s, 'md')}px`],
    ['Font size', specs.fontSize ?? '14px'],
  ]
  const colW = Math.round((Math.min(W, 460) - 16) / 2)
  const rowH = 40
  const parts: string[] = []
  rows.forEach(([k, v], i) => {
    const col = i % 2
    const rowN = Math.floor(i / 2)
    const x = col * (colW + 16)
    const y = rowN * (rowH + 12)
    parts.push(
      group(
        `${p}/spec-${normType(k)}`,
        rect(`${p}/spec-${normType(k)}/bg`, x, y, colW, rowH, { fill: surface, stroke: border, rx }) +
          text(`${p}/spec-${normType(k)}/label`, x + 12, y + rowH / 2, k, {
            size: 12,
            weight: 400,
            fill: muted,
            family,
            baseline: 'central',
          }) +
          text(`${p}/spec-${normType(k)}/value`, x + colW - 12, y + rowH / 2, v, {
            size: 13,
            weight: 600,
            fill: ink,
            family,
            anchor: 'end',
            baseline: 'central',
          }),
      ),
    )
  })
  return { inner: parts.join(''), w: colW * 2 + 16, h: rowH * 2 + 12 }
}

// ---- registry + dispatch --------------------------------------------------

const REGISTRY: Record<string, Builder> = {
  button: buildButton,
  iconbutton: buildIconButton,
  floatingbuttonfab: buildFab,
  fab: buildFab,
  extendedfab: buildFab,
  textfield: buildTextField,
  dropdownselect: buildDropdown,
  combobox: buildDropdown,
  checkbox: buildCheckbox,
  radiobutton: buildRadio,
  togglebutton: buildToggle,
  switch: buildToggle,
  slider: buildSlider,
  rangeslider: buildSlider,
  badge: buildBadge,
  chip: buildChip,
  tabs: buildTabs,
  card: buildCard,
  alert: buildAlert,
  banner: buildBanner,
  toast: buildToast,
  tooltip: buildTooltip,
  divider: buildDivider,
  progressbar: buildProgress,
  rating: buildRating,
  avatar: buildAvatar,
  breadcrumb: buildBreadcrumb,
  listitem: buildListItem,
  list: buildListItem,
  accordion: buildAccordion,
  appbar: buildAppBar,
}

/** How many hand-crafted vector builders exist (for reporting/tests). */
export const REAL_BUILDER_COUNT = new Set(Object.values(REGISTRY)).size

export function hasRealBuilder(type: string): boolean {
  return normType(type) in REGISTRY
}

/** Draw a component preview at local origin; falls back to a spec card. */
export function renderPreview(
  s: HorizonSystem,
  p: string,
  W: number,
  component: ComponentSpec,
): Preview {
  const b = REGISTRY[normType(component.type)]
  if (b) return b(s, p, W)
  return buildGeneric(s, p, W, component)
}
