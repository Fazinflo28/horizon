import JSZip from 'jszip'
import type { HorizonSystem } from '@/lib/types'
import { makeIdFactory, assertValidSvg } from './svg/primitives'
import { buildColorSheet } from './svg/color-sheet'
import { buildTypeSheet } from './svg/type-sheet'
import { buildComponentSheets } from './svg/component-sheet'
import { systemToDtcg } from './dtcg'

export function kitSlug(name: string): string {
  return (
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'horizon'
  )
}

function buildReadme(system: HorizonSystem): string {
  const family = system.typography?.fontFamily ?? 'Inter'
  const count = system.components?.length ?? 0
  return `# ${system.name} Figma Kit

## What's inside
- **01 Colors.svg** — full color ramps, semantic swatches and elevation reference.
- **02 Typography.svg** — every type step as a live text specimen.
- **03 Components.svg** — all ${count} components as editable cards (03b, 03c… if it splits).
- **tokens/tokens.json** — DTCG tokens for the Tokens Studio plugin.

## How to import
1. Unzip.
2. In Figma create or open a file.
3. Drag the SVG files onto the canvas (drag several at once — they land as separate frames).
4. Everything is editable: shapes, colors, radii and text are real layers, named after the tokens and components.
5. Select any component's group (e.g. "Component/Button") and press Cmd/Ctrl+Alt+K to turn it into a Figma component.
6. Optional: install the free Tokens Studio plugin and import tokens/tokens.json to get every color and type style as Figma tokens.

## Font
This kit uses ${family}. Install it (Google Fonts) or Figma will substitute Inter, then swap it via the type panel.

## Notes
- Focus states are drawn as separate ring rects so you can restyle or delete them.
- Shadows are listed as reference values on the Colors sheet — apply them as Figma effects.
- Layer names mirror token and component names, so search in the layers panel works.
`
}

export async function buildFigmaKit(system: HorizonSystem): Promise<Uint8Array> {
  const zip = new JSZip()
  const root = zip.folder(`${kitSlug(system.name)}-figma-kit`)

  // Each SVG file gets its own id factory (ids must be unique per file).
  const sheets: Array<{ name: string; svg: string }> = [
    { name: '01 Colors.svg', svg: buildColorSheet(system, makeIdFactory()) },
    { name: '02 Typography.svg', svg: buildTypeSheet(system, makeIdFactory()) },
    // 03 Components.svg (+ 03b, 03c … if the masonry grows past the height cap)
    ...buildComponentSheets(system),
  ]

  for (const s of sheets) {
    assertValidSvg(s.svg, s.name)
    root?.file(s.name, s.svg)
  }

  root?.folder('tokens')?.file('tokens.json', systemToDtcg(system))
  root?.file('README.md', buildReadme(system))

  return zip.generateAsync({ type: 'uint8array' })
}
