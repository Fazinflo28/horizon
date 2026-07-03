import type { ComponentSpec, HorizonSystem } from '@/lib/types'
import {
  type IdFactory,
  makeIdFactory,
  svgDoc,
  rect,
  text,
  group,
  metaBlock,
  neutral,
  resolveToken,
  fontStack,
  radiusPx,
} from './primitives'
import { renderPreview } from './components'

// ---------------------------------------------------------------------------
// Lays every generated component onto SVG sheets: a 2-column masonry, one
// card per component (title + variant/state chips + real vector preview).
// Splits into continuation files (03, 03b, 03c…) if a sheet grows past the cap.
// ---------------------------------------------------------------------------

const W = 1216
const PAGE_PAD = 48
const CARD_W = 544
const GUTTER = 32
const PAD_IN = 20
const PREVIEW_W = CARD_W - PAD_IN * 2
const TOP = 150
const HEIGHT_CAP = 12000

interface Card {
  svg: string
  h: number
}

// ---- chips ----------------------------------------------------------------

function flowChips(
  prefix: string,
  items: Array<{ label: string; kind: 'variant' | 'state' }>,
  x0: number,
  y0: number,
  maxW: number,
  s: HorizonSystem,
): { svg: string; bottom: number } {
  const family = fontStack(s)
  const surface = resolveToken(s, 'color-bg-surface')
  const border = resolveToken(s, 'color-border')
  const muted = resolveToken(s, 'color-text-muted')
  const stateBg = neutral(s, '100')
  const stateFg = resolveToken(s, 'color-text-secondary')
  const H = 24
  const gapX = 8
  const gapY = 8
  const size = 11
  const parts: string[] = []
  let x = x0
  let y = y0
  items.forEach((it, i) => {
    const w = Math.round(it.label.length * size * 0.58) + 20
    if (x + w > x0 + maxW && x > x0) {
      x = x0
      y += H + gapY
    }
    const isVar = it.kind === 'variant'
    parts.push(
      group(
        `${prefix}/chip-${i}`,
        rect(`${prefix}/chip-${i}/bg`, x, y, w, H, {
          fill: isVar ? surface : stateBg,
          stroke: isVar ? border : undefined,
          rx: 9999,
        }) +
          text(`${prefix}/chip-${i}/label`, x + w / 2, y + H / 2, it.label, {
            size,
            weight: 500,
            fill: isVar ? muted : stateFg,
            family,
            anchor: 'middle',
            baseline: 'central',
          }),
      ),
    )
    x += w + gapX
  })
  return { svg: parts.join(''), bottom: y + H }
}

// ---- one component card (local coords, ids under `prefix`) -----------------

function buildCard(s: HorizonSystem, prefix: string, c: ComponentSpec): Card {
  const family = fontStack(s)
  const surface = resolveToken(s, 'color-bg-surface')
  const border = resolveToken(s, 'color-border')
  const ink = resolveToken(s, 'color-text-primary')
  const pageBg = neutral(s, '50')
  const rxLg = radiusPx(s, 'lg')
  const rxMd = radiusPx(s, 'md')

  const title = text(`${prefix}/title`, PAD_IN, 32, c.type, { size: 16, weight: 700, fill: ink, family })

  const chipItems = [
    ...(c.variants ?? []).map((label) => ({ label, kind: 'variant' as const })),
    ...(c.states ?? []).map((label) => ({ label, kind: 'state' as const })),
  ]
  const chips = chipItems.length
    ? flowChips(`${prefix}/chips`, chipItems, PAD_IN, 50, CARD_W - PAD_IN * 2, s)
    : { svg: '', bottom: 46 }

  const previewTop = chips.bottom + 16
  const preview = renderPreview(s, `${prefix}/preview`, PREVIEW_W - 48, c)
  const zoneH = preview.h + 40
  // center the preview horizontally within the zone when it is narrower
  const px = PAD_IN + Math.max(24, Math.round((PREVIEW_W - preview.w) / 2))
  const py = previewTop + Math.round((zoneH - preview.h) / 2)

  const cardH = previewTop + zoneH + PAD_IN
  const svg =
    rect(`${prefix}/card`, 0, 0, CARD_W, cardH, { fill: surface, stroke: border, rx: rxLg }) +
    title +
    chips.svg +
    rect(`${prefix}/preview-bg`, PAD_IN, previewTop, PREVIEW_W, zoneH, { fill: pageBg, rx: rxMd }) +
    group(`${prefix}/preview`, preview.inner, { x: px, y: py })
  return { svg, h: cardH }
}

// ---- sheet(s) -------------------------------------------------------------

export function buildComponentSheets(system: HorizonSystem): Array<{ name: string; svg: string }> {
  const comps = system.components ?? []
  if (comps.length === 0) return []

  const sheets: Array<{ name: string; svg: string }> = []
  let ids: IdFactory = makeIdFactory()
  let placed: string[] = []
  let colH = [TOP, TOP]
  let part = 0

  const flush = () => {
    if (placed.length === 0) return
    const H = Math.max(colH[0], colH[1]) - GUTTER + PAGE_PAD
    const family = fontStack(system)
    const muted = neutral(system, '500')
    const label = part === 0 ? 'Components' : 'Components (continued)'
    const header = text(ids('_sub'), PAGE_PAD, 92, label, { size: 15, weight: 600, fill: muted, family })
    const inner =
      rect(ids('_bg'), 0, 0, W, H, { fill: '#FFFFFF' }) +
      metaBlock(system, ids, W, H) +
      header +
      placed.join('')
    // continuation files: 03, 03b, 03c … (skip 'a' so the first is just "03")
    const suffix = part === 0 ? '' : String.fromCharCode(97 + part) // b, c, d…
    sheets.push({ name: `03${suffix} Components.svg`, svg: svgDoc(W, H, inner) })
    placed = []
    colH = [TOP, TOP]
    ids = makeIdFactory()
    part += 1
  }

  for (const c of comps) {
    // pick the shorter column
    let col = colH[0] <= colH[1] ? 0 : 1
    // provisional build to know the height (uses a throwaway prefix on a temp id space)
    const prefix = ids(`Component/${c.type}`)
    const card = buildCard(system, prefix, c)
    if (colH[col] + card.h + PAGE_PAD > HEIGHT_CAP && placed.length > 0) {
      flush()
      col = 0
      // rebuild with the fresh id space
      const p2 = ids(`Component/${c.type}`)
      const card2 = buildCard(system, p2, c)
      placed.push(group(p2, card2.svg, { x: PAGE_PAD, y: colH[col] }))
      colH[col] += card2.h + GUTTER
      continue
    }
    const x = PAGE_PAD + col * (CARD_W + GUTTER)
    placed.push(group(prefix, card.svg, { x, y: colH[col] }))
    colH[col] += card.h + GUTTER
  }
  flush()
  return sheets
}
