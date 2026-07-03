// Tiny assertion runner — no jest. Run with: npm run test:engine
import {
  contrastRatio,
  generateRamp,
  generateNeutralRamp,
  enforceContrast,
  semanticColors,
  hexToHsl,
  hslToHex,
} from '../color'
import { buildScale } from '../typography'
import { buildSemanticTokens } from '../foundations'
import { mixHex, resolveToken } from '@/lib/exporters/svg/primitives'
import type { HorizonSystem } from '@/lib/types'

let failures = 0
const HEX = /^#[0-9A-Fa-f]{6}$/

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log('  ✓', msg)
  } else {
    console.error('  ✗', msg)
    failures++
  }
}

console.log('color.ts')
assert(Math.abs(contrastRatio('#FFFFFF', '#000000') - 21) < 0.1, 'white/black contrast = 21')
assert(Math.abs(contrastRatio('#FFFFFF', '#FFFFFF') - 1) < 0.001, 'white/white contrast = 1')

const ramp = generateRamp('#4F46E5')
assert(Object.keys(ramp).length === 10, 'ramp has 10 shades')
assert(Object.values(ramp).every((h) => HEX.test(h)), 'all ramp values are valid hex')
assert(hexToHsl(ramp['500']).l < hexToHsl(ramp['50']).l, 'ramp darkens as shade increases')

const neutral = generateNeutralRamp('#4F46E5')
assert(hexToHsl(neutral['500']).s <= 8.001, 'neutral ramp is desaturated (s <= 8)')

for (const target of [4.5, 7] as const) {
  const { palette, accessibleShade } = enforceContrast(generateRamp('#4F46E5'), target)
  assert(
    contrastRatio(palette['600'], '#FFFFFF') >= target,
    `enforced 600 passes ${target}:1 on white`,
  )
  assert(
    contrastRatio(palette[accessibleShade], '#FFFFFF') >= target,
    `accessibleShade (${accessibleShade}) passes ${target}:1 on white`,
  )
}

const sem = semanticColors(7)
assert(contrastRatio(sem.error, '#FFFFFF') >= 7, 'AAA error color passes 7:1 on white')

// round-trip sanity
const rt = hexToHsl('#4F46E5')
assert(HEX.test(hslToHex(rt.h, rt.s, rt.l)), 'hsl round-trip yields valid hex')

console.log('typography.ts')
const scale = buildScale(1.25, ['Body Small', 'Body Large', 'Title Large', 'Display Large'])
assert(scale.length === 4, 'buildScale returns only selected steps')
assert(scale[0].name === 'Display Large', 'scale ordered largest-first')
assert(
  parseInt(scale[0].size) > parseInt(scale[scale.length - 1].size),
  'display larger than body',
)
const empty = buildScale(1.25, [])
assert(empty.length === 4, 'empty selection falls back to minimum viable set')

console.log('figma-kit primitives')
{
  const mid = mixHex('#000000', '#FFFFFF', 0.5)
  const chans = [
    parseInt(mid.slice(1, 3), 16),
    parseInt(mid.slice(3, 5), 16),
    parseInt(mid.slice(5, 7), 16),
  ]
  assert(chans.every((c) => Math.abs(c - 128) <= 1), `mixHex mid ~#808080 (got ${mid})`)
  assert(mixHex('#4F46E5', '#FFFFFF', 0).toUpperCase() === '#4F46E5', 'mixHex t=0 returns a')

  const primary = generateRamp('#4F46E5')
  const neutralRamp = generateNeutralRamp('#4F46E5')
  const sem = semanticColors(4.5)
  const tokens = buildSemanticTokens(primary, neutralRamp, sem, '700')
  const sample = {
    name: 'Sample',
    colors: { primary, secondary: primary, neutral: neutralRamp, semantic: sem },
    semanticTokens: tokens,
  } as unknown as HorizonSystem
  assert(
    tokens.every((t) => HEX.test(resolveToken(sample, t.name))),
    'resolveToken returns valid hex for every semantic token',
  )
  assert(
    resolveToken(sample, 'color-bg-brand').toUpperCase() === primary['600'].toUpperCase(),
    'resolveToken color-bg-brand -> primary 600',
  )
  // fallback path (no semanticTokens)
  const noTokens = { colors: sample.colors } as unknown as HorizonSystem
  assert(HEX.test(resolveToken(noTokens, 'color-text-primary')), 'resolveToken falls back to ramps')
}

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`)
  process.exit(1)
} else {
  console.log('\nAll engine tests passed ✓')
}
