import type { HorizonSystem } from '@/lib/types'
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
  stepSize,
} from './primitives'

const SPECIMEN = 'Ag The quick brown fox'

export function buildTypeSheet(system: HorizonSystem, id: IdFactory): string {
  const W = 1160
  const PAD = 48
  const ink = resolveToken(system, 'color-text-primary')
  const sub = neutral(system, '500')
  const family = fontStack(system)
  const titleSize = Math.min(stepSize(system, 'Title Large', 22), 24)
  const LABEL_X = 860
  const parts: string[] = []
  let y = 104

  parts.push(
    text(id('Type/heading'), PAD, y, 'Typography', {
      size: titleSize,
      weight: 700,
      fill: ink,
      family,
      baseline: 'central',
    }),
  )
  y += 40
  parts.push(
    text(id('Type/font'), PAD, y, `Font: ${system.typography?.fontFamily ?? 'Inter'}`, {
      size: 14,
      weight: 400,
      fill: sub,
      family,
    }),
  )
  y += 44

  const scale = system.typography?.scale ?? []
  for (const step of scale) {
    const actual = parseInt(step.size, 10) || 16
    const rendered = Math.min(actual, 64)
    const rowH = Math.max(rendered + 14, 34)
    const baseline = y + rendered
    const midY = y + rowH * 0.5
    const gid = id(`Type/${step.name}`)
    parts.push(
      group(
        gid,
        text(`${gid}/specimen`, PAD, baseline, SPECIMEN, {
          size: rendered,
          weight: step.weight,
          fill: ink,
          family,
        }) +
          text(`${gid}/name`, LABEL_X, midY - 4, step.name, {
            size: 13,
            weight: 600,
            fill: ink,
            family,
          }) +
          text(
            `${gid}/specs`,
            LABEL_X,
            midY + 14,
            `${step.size} / ${step.lineHeight} / ${step.weight}`,
            { size: 11, weight: 400, fill: sub, family },
          ),
      ),
    )
    y += rowH + 24
  }

  const H = y - 24 + PAD
  const inner =
    rect('_bg', 0, 0, W, H, { fill: '#FFFFFF' }) +
    metaBlock(system, id, W, H) +
    parts.join('')
  return svgDoc(W, H, inner)
}
