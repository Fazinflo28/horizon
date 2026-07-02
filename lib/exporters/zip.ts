import JSZip from 'jszip'
import type { HorizonSystem } from '@/lib/types'
import { systemToCss } from './css'
import { systemToTailwind } from './tailwind'
import { systemToDtcg } from './dtcg'
import { systemToRulesMd } from './rules-md'
import { generateComponentCode, generateIndexFile } from './component-code'

function renderReadme(system: HorizonSystem): string {
  const sections = (system.documentation ?? [])
    .map((d) => `## ${d.section}\n\n${d.content}`)
    .join('\n\n')
  return `# ${system.name}\n\n${system.description}\n\n${sections}\n`
}

/** Build a complete export bundle. Pure (jszip runs on server and client). */
export async function buildZip(system: HorizonSystem): Promise<Uint8Array> {
  const zip = new JSZip()

  const tokens = zip.folder('tokens')
  tokens?.file('variables.css', systemToCss(system))
  tokens?.file('tailwind.config.ts', systemToTailwind(system))
  tokens?.file('tokens.dtcg.json', systemToDtcg(system))

  const comps = zip.folder('components')
  for (const c of system.components ?? []) {
    const { filename, code } = generateComponentCode(c, system)
    comps?.file(filename, code)
  }
  comps?.file('index.ts', generateIndexFile(system.components ?? []))

  const docs = zip.folder('docs')
  docs?.file('README.md', renderReadme(system))
  docs?.file('horizon-rules.md', systemToRulesMd(system))

  return zip.generateAsync({ type: 'uint8array' })
}
