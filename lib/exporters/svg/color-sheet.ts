import type { HorizonSystem, Palette } from '@/lib/types'
import {
  type IdFactory,
  svgDoc,
  rect,
  text,
  group,
  metaBlock,
  fontStack,
  resolveToken,
  neutral,
  radiusPx,
  stepSize,
} from './primitives'

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function buildColorSheet(system: HorizonSystem, id: IdFactory): string {
  const W = 1160
  const PAD = 48
  const titleSize = Math.min(stepSize(system, 'Title Large', 22), 24)
  const ink = resolveToken(system, 'color-text-primary')
  const sub = neutral(system, '500')
  const family = fontStack(system)
  const mdR = radiusPx(system, 'md')
  const SW = 96
  const GAP = 12
  const parts: string[] = []
  let y = 104

  const heading = (label: string) => {
    parts.push(
      text(id(`Color/${label}/heading`), PAD, y, label, {
        size: titleSize,
        weight: 700,
        fill: ink,
        family,
        baseline: 'central',
      }),
    )
    y += 36
  }

  const ramps: Array<[string, Palette | undefined]> = [
    ['Primary', system.colors?.primary],
    ['Secondary', system.colors?.secondary],
    ['Neutral', system.colors?.neutral],
  ]
  for (const [label, pal] of ramps) {
    if (!pal) continue
    heading(label)
    const rowY = y
    SHADES.forEach((shade, i) => {
      const hex = pal[shade as keyof Palette]
      if (!hex) return
      const x = PAD + i * (SW + GAP)
      const gid = id(`Color/${label}/${shade}`)
      parts.push(
        group(
          gid,
          rect(`${gid}/box`, x, rowY, SW, SW, { fill: hex, rx: mdR }) +
            text(`${gid}/shade`, x, rowY + SW + 18, shade, {
              size: 12,
              weight: 600,
              fill: ink,
              family,
            }) +
            text(`${gid}/hex`, x, rowY + SW + 34, hex.toUpperCase(), {
              size: 11,
              weight: 400,
              fill: sub,
              family,
            }),
        ),
      )
    })
    y = rowY + SW + 44 + 64
  }

  const sem = system.colors?.semantic
  if (sem) {
    heading('Semantic')
    const rowY = y
    Object.entries(sem).forEach(([name, hex], i) => {
      const x = PAD + i * (SW + GAP)
      const gid = id(`Color/Semantic/${cap(name)}`)
      parts.push(
        group(
          gid,
          rect(`${gid}/box`, x, rowY, SW, SW, { fill: hex, rx: mdR }) +
            text(`${gid}/name`, x, rowY + SW + 18, cap(name), {
              size: 12,
              weight: 600,
              fill: ink,
              family,
            }) +
            text(`${gid}/hex`, x, rowY + SW + 34, hex.toUpperCase(), {
              size: 11,
              weight: 400,
              fill: sub,
              family,
            }),
        ),
      )
    })
    y = rowY + SW + 44 + 64
  }

  const shadows = system.shadows ?? []
  if (shadows.length > 0) {
    heading('Elevation (reference)')
    const rowY = y
    const CW = 248
    const CH = 72
    const CG = 24
    const cols = 4
    shadows.forEach((s, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = PAD + col * (CW + CG)
      const cy = rowY + row * (CH + CG)
      const gid = id(`Elevation/${s.name}`)
      parts.push(
        group(
          gid,
          rect(`${gid}/box`, x, cy, CW, CH, {
            fill: '#FFFFFF',
            stroke: neutral(system, '200'),
            strokeWidth: 1,
            rx: mdR,
          }) +
            text(`${gid}/name`, x + 14, cy + 28, s.name, {
              size: 12,
              weight: 600,
              fill: ink,
              family,
            }) +
            text(`${gid}/value`, x + 14, cy + 50, s.value, {
              size: 10,
              weight: 400,
              fill: neutral(system, '400'),
              family,
            }),
        ),
      )
    })
    const rows = Math.ceil(shadows.length / cols)
    y = rowY + rows * CH + (rows - 1) * CG + 64
  }

  const H = y - 64 + PAD
  const inner =
    rect('_bg', 0, 0, W, H, { fill: '#FFFFFF' }) +
    metaBlock(system, id, W, H) +
    parts.join('')
  return svgDoc(W, H, inner)
}
