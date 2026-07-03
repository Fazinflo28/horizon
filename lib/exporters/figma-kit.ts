import JSZip from 'jszip'
import type { HorizonSystem } from '@/lib/types'
import { makeIdFactory, assertValidSvg } from './svg/primitives'
import { buildColorSheet } from './svg/color-sheet'
import { buildTypeSheet } from './svg/type-sheet'
import { systemToDtcg } from './dtcg'

export function kitSlug(name: string): string {
  return (
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'horizon'
  )
}

function buildReadme(system: HorizonSystem): string {
  const family = system.typography?.fontFamily ?? 'Inter'
  return `# ${system.name} Figma Kit

## How to import
1. Unzip.
2. In Figma create or open a file.
3. Drag the SVG files onto the canvas (drag several at once, they land as separate frames).
4. Everything is editable: shapes, colors, radii and text are real layers.
5. Select any component's group and press Cmd/Ctrl+Alt+K to turn it into a Figma component.
6. Optional: install the free Tokens Studio plugin and import tokens/tokens.json to get all color and type styles as Figma tokens.

## Font
This kit uses ${family}. Install it (Google Fonts) or Figma will substitute Inter, then swap via Edit menu.

## Notes
Shadows are listed as reference values on the Colors sheet, apply them as Figma effects; layer names mirror token names.
`
}

export async function buildFigmaKit(system: HorizonSystem): Promise<Uint8Array> {
  const zip = new JSZip()
  const root = zip.folder(`${kitSlug(system.name)}-figma-kit`)

  // Each SVG file gets its own id factory (ids must be unique per file).
  const sheets: Array<{ name: string; svg: string }> = [
    { name: '01 Colors.svg', svg: buildColorSheet(system, makeIdFactory()) },
    { name: '02 Typography.svg', svg: buildTypeSheet(system, makeIdFactory()) },
  ]

  for (const s of sheets) {
    assertValidSvg(s.svg, s.name)
    root?.file(s.name, s.svg)
  }

  root?.folder('tokens')?.file('tokens.json', systemToDtcg(system))
  root?.file('README.md', buildReadme(system))

  return zip.generateAsync({ type: 'uint8array' })
}
