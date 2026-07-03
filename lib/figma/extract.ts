import type {
  HorizonSystem,
  Palette,
  TypeStep,
  ComponentSpec,
  Decisions,
} from '@/lib/types'
import type {
  FigmaFile,
  FigmaNode,
  FigmaColor,
  VariablesResponse,
} from './client'
import {
  generateRamp,
  generateNeutralRamp,
  semanticColors,
  contrastRatio,
  hexToHsl,
  hslToHex,
} from '@/lib/engine/color'
import { buildSemanticTokens } from '@/lib/engine/foundations'
import { BLUEPRINTS, normalizeType } from '@/lib/engine/blueprints'
import {
  TOKENS_USED,
  TOKENS_FALLBACK,
  resolveFontSize,
} from '@/lib/engine/assemble'
import { staticDocs, type FoundationSummary } from '@/lib/engine/docs'

export class ExtractError extends Error {
  code: string
  constructor(code: string) {
    super(code)
    this.name = 'ExtractError'
    this.code = code
  }
}

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
const SHADE_RE = /^(50|100|200|300|400|500|600|700|800|900)$/
const STATE_WORDS = new Set([
  'default',
  'hover',
  'focus',
  'pressed',
  'active',
  'disabled',
  'error',
  'loading',
  'selected',
  'checked',
])

const LADDER = [
  'Display Large',
  'Display Medium',
  'Display Small',
  'Headline Small',
  'Title Large',
  'Title Small',
  'Body Large',
  'Body Small',
]
const USAGE: Record<string, string> = {
  'Display Large': 'Hero headlines',
  'Display Medium': 'Large display headings',
  'Display Small': 'Section display headings',
  'Headline Small': 'Prominent headings',
  'Title Large': 'Card and section titles',
  'Title Small': 'Subsection titles',
  'Body Large': 'Primary body text',
  'Body Small': 'Secondary and caption text',
}

const FUZZY_MAP: Record<string, string[]> = {
  button: ['btn', 'cta'],
  iconbutton: ['icon button', 'iconbtn'],
  textfield: ['input', 'text input', 'field', 'textbox'],
  dropdownselect: ['select', 'dropdown', 'combo'],
  checkbox: ['check'],
  radiobutton: ['radio'],
  togglebutton: ['toggle', 'switch'],
  tabs: ['tab', 'tabbar'],
  navigationbar: ['navbar', 'bottom nav', 'nav bar'],
  navigationrail: ['rail'],
  card: ['tile'],
  chip: ['tag', 'pill'],
  alert: ['callout'],
  toast: ['snackbar'],
  dialog: ['modal dialog', 'popup'],
  tooltip: ['hint'],
  progressbar: ['progress', 'loader bar'],
  skeletonloader: ['skeleton', 'shimmer'],
}

function fig2hex(c: FigmaColor): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n * 255)))
      .toString(16)
      .padStart(2, '0')
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`.toUpperCase()
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'shadow'
}

function parseColorName(
  name: string,
): { ramp: string; shade: string } | null {
  const parts = name.split(/[/.\-]+/).map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return null
  const last = parts[parts.length - 1]
  if (!SHADE_RE.test(last)) return null
  return { ramp: parts.slice(0, -1).join('/').toLowerCase(), shade: last }
}

function firstSolid(node: FigmaNode | undefined): string | null {
  const fill = node?.fills?.find((f) => f.type === 'SOLID' && f.color)
  return fill?.color ? fig2hex(fill.color) : null
}

function lerpHsl(a: string, b: string, t: number): string {
  const A = hexToHsl(a)
  const B = hexToHsl(b)
  return hslToHex(A.h + (B.h - A.h) * t, A.s + (B.s - A.s) * t, A.l + (B.l - A.l) * t)
}

function completeRamp(shades: Map<string, string>): Palette {
  const present = SHADES.filter((s) => shades.has(s))
  if (present.length === 0) return generateNeutralRamp('#808080')
  if (present.length < 3) {
    const seed =
      shades.get('500') ??
      shades.get('600') ??
      shades.get('400') ??
      shades.get(present[Math.floor(present.length / 2)]) ??
      shades.get(present[0])!
    return generateRamp(seed)
  }
  const pal = {} as Palette
  const idx = (s: string) => SHADES.indexOf(s)
  for (const s of SHADES) {
    if (shades.has(s)) {
      pal[s as keyof Palette] = shades.get(s)!
      continue
    }
    const i = idx(s)
    const lower = [...present].reverse().find((p) => idx(p) < i)
    const upper = present.find((p) => idx(p) > i)
    if (lower && upper) {
      const t = (i - idx(lower)) / (idx(upper) - idx(lower))
      pal[s as keyof Palette] = lerpHsl(shades.get(lower)!, shades.get(upper)!, t)
    } else {
      pal[s as keyof Palette] = shades.get(lower ?? upper ?? present[0])!
    }
  }
  return pal
}

function findAccessibleShade(pal: Palette): keyof Palette {
  for (const s of ['500', '600', '700', '800', '900'] as Array<keyof Palette>) {
    if (contrastRatio(pal[s], '#FFFFFF') >= 4.5) return s
  }
  return '900'
}

function matchBlueprint(baseName: string): string | null {
  const norm = normalizeType(baseName)
  if (BLUEPRINTS[norm]) return norm
  for (const [key, aliases] of Object.entries(FUZZY_MAP)) {
    if (aliases.some((a) => normalizeType(a) === norm)) return key
  }
  const lname = baseName.toLowerCase()
  for (const [key, aliases] of Object.entries(FUZZY_MAP)) {
    if (aliases.some((a) => lname.includes(a))) return key
  }
  return null
}

// ---- Single-pass iterative walker -----------------------------------------

interface WalkResult {
  styleUsages: Map<string, FigmaNode>
  autoLayoutSpacings: number[]
  cornerRadii: number[]
  componentSets: FigmaNode[]
  components: FigmaNode[]
  componentSetChildIds: Set<string>
}

function walk(root: FigmaNode): WalkResult {
  const styleUsages = new Map<string, FigmaNode>()
  const autoLayoutSpacings: number[] = []
  const cornerRadii: number[] = []
  const componentSets: FigmaNode[] = []
  const components: FigmaNode[] = []
  const componentSetChildIds = new Set<string>()

  const stack: FigmaNode[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()!

    if (node.styles) {
      for (const styleId of Object.values(node.styles)) {
        if (styleId && !styleUsages.has(styleId)) styleUsages.set(styleId, node)
      }
    }
    if (node.layoutMode && node.layoutMode !== 'NONE') {
      for (const v of [
        node.itemSpacing,
        node.paddingLeft,
        node.paddingRight,
        node.paddingTop,
        node.paddingBottom,
      ]) {
        if (typeof v === 'number' && v > 0) autoLayoutSpacings.push(v)
      }
    }
    if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
      cornerRadii.push(node.cornerRadius)
    }
    if (Array.isArray(node.rectangleCornerRadii)) {
      for (const r of node.rectangleCornerRadii) if (r > 0) cornerRadii.push(r)
    }
    if (node.type === 'COMPONENT_SET') {
      componentSets.push(node)
      for (const child of node.children ?? []) componentSetChildIds.add(child.id)
    } else if (node.type === 'COMPONENT') {
      components.push(node)
    }
    if (node.children) {
      for (const c of node.children) stack.push(c)
    }
  }

  return {
    styleUsages,
    autoLayoutSpacings,
    cornerRadii,
    componentSets,
    components,
    componentSetChildIds,
  }
}

// ---- Main -----------------------------------------------------------------

export async function extractSystem(
  file: FigmaFile,
  variables: VariablesResponse | null,
  fileKey: string,
): Promise<{ system: HorizonSystem; previewNodeIds: Record<string, string> }> {
  const styles = file.styles ?? {}
  const walkResult = walk(file.document)
  const { styleUsages, autoLayoutSpacings, cornerRadii } = walkResult

  // ---- Colors -------------------------------------------------------------
  const allNamedColors: Array<{ name: string; hex: string }> = []
  const varRampMap = new Map<string, Map<string, string>>()

  if (variables) {
    for (const v of Object.values(variables.meta.variables)) {
      if (v.resolvedType !== 'COLOR') continue
      const raw = Object.values(v.valuesByMode)[0]
      if (!raw || typeof raw !== 'object' || !('r' in raw)) continue
      const hex = fig2hex(raw as FigmaColor)
      allNamedColors.push({ name: v.name, hex })
      const parsed = parseColorName(v.name)
      if (parsed) {
        if (!varRampMap.has(parsed.ramp)) varRampMap.set(parsed.ramp, new Map())
        varRampMap.get(parsed.ramp)!.set(parsed.shade, hex)
      }
    }
  }

  const styleRampMap = new Map<string, Map<string, string>>()
  for (const [styleId, st] of Object.entries(styles)) {
    if (st.styleType !== 'FILL') continue
    const hex = firstSolid(styleUsages.get(styleId))
    if (!hex) continue
    allNamedColors.push({ name: st.name, hex })
    const parsed = parseColorName(st.name)
    if (parsed) {
      if (!styleRampMap.has(parsed.ramp)) styleRampMap.set(parsed.ramp, new Map())
      styleRampMap.get(parsed.ramp)!.set(parsed.shade, hex)
    }
  }

  const varHasRamp = [...varRampMap.values()].some((m) => m.size >= 2)
  const rampMap = varHasRamp ? varRampMap : styleRampMap

  const isNeutralName = (n: string) => /neutral|grey|gray|slate|zinc|stone/.test(n)
  const ramps = [...rampMap.entries()].map(([name, shades]) => ({ name, shades }))
  const neutralRamp = ramps.find((r) => isNeutralName(r.name) && r.shades.size >= 2)
  const satOf = (shades: Map<string, string>) => {
    const hex = shades.get('500') ?? [...shades.values()][Math.floor(shades.size / 2)]
    return hex ? hexToHsl(hex).s : 0
  }
  const colorRamps = ramps
    .filter((r) => r !== neutralRamp)
    .sort((a, b) => b.shades.size - a.shades.size || satOf(b.shades) - satOf(a.shades))

  let primary: Palette
  let secondary: Palette
  let neutral: Palette

  if (colorRamps.length > 0) {
    primary = completeRamp(colorRamps[0].shades)
    secondary = completeRamp((colorRamps[1] ?? colorRamps[0]).shades)
    neutral = neutralRamp
      ? completeRamp(neutralRamp.shades)
      : generateNeutralRamp(primary['500'])
  } else {
    const seed =
      allNamedColors.find((c) => /primary|brand|accent/.test(c.name.toLowerCase()))
        ?.hex ?? allNamedColors[0]?.hex
    if (!seed) throw new ExtractError('no_styles')
    primary = generateRamp(seed)
    const shifted = hexToHsl(seed)
    secondary = generateRamp(hslToHex(shifted.h + 30, shifted.s, shifted.l))
    neutral = neutralRamp
      ? completeRamp(neutralRamp.shades)
      : generateNeutralRamp(seed)
  }

  const defaults = semanticColors(4.5)
  const findSem = (kw: string[]): string | undefined => {
    const cands = allNamedColors.filter((c) =>
      kw.some((k) => c.name.toLowerCase().includes(k)),
    )
    return (cands.find((c) => /500|base|default/i.test(c.name)) ?? cands[0])?.hex
  }
  const semantic = {
    success: findSem(['success', 'green']) ?? defaults.success,
    warning: findSem(['warning', 'amber', 'yellow']) ?? defaults.warning,
    error: findSem(['error', 'danger', 'red']) ?? defaults.error,
    info: findSem(['info', 'blue']) ?? defaults.info,
  }

  const accessibleShade = findAccessibleShade(primary)
  const semanticTokens = buildSemanticTokens(
    primary,
    neutral,
    semantic,
    accessibleShade,
  )

  // ---- Typography ---------------------------------------------------------
  const textStyleEntries = Object.entries(styles).filter(
    ([, st]) => st.styleType === 'TEXT',
  )
  const textStyles: Array<{
    name: string
    family: string
    size: number
    weight: number
    lineHeight: string
  }> = []
  for (const [styleId, st] of textStyleEntries) {
    const ts = styleUsages.get(styleId)?.style
    if (!ts || !ts.fontSize) continue
    const lh =
      ts.lineHeightPx && ts.fontSize
        ? String(+(ts.lineHeightPx / ts.fontSize).toFixed(2))
        : ts.lineHeightPercentFontSize
          ? String(+(ts.lineHeightPercentFontSize / 100).toFixed(2))
          : '1.4'
    textStyles.push({
      name: st.name,
      family: ts.fontFamily ?? 'Inter',
      size: ts.fontSize,
      weight: ts.fontWeight ?? 400,
      lineHeight: lh,
    })
  }
  textStyles.sort((a, b) => b.size - a.size)

  let scale: TypeStep[] = textStyles.slice(0, 8).map((ts, i) => ({
    name: LADDER[i],
    size: `${Math.round(ts.size)}px`,
    lineHeight: ts.lineHeight,
    weight: ts.weight,
    usage: USAGE[LADDER[i]] ?? '',
    sourceName: ts.name,
  }))
  if (scale.length === 0) {
    scale = [
      { name: 'Display Small', size: '32px', lineHeight: '1.15', weight: 700, usage: USAGE['Display Small'] },
      { name: 'Title Large', size: '20px', lineHeight: '1.35', weight: 600, usage: USAGE['Title Large'] },
      { name: 'Body Large', size: '16px', lineHeight: '1.5', weight: 400, usage: USAGE['Body Large'] },
      { name: 'Body Small', size: '14px', lineHeight: '1.5', weight: 400, usage: USAGE['Body Small'] },
    ]
  } else if (!scale.some((s) => /body/i.test(s.name))) {
    scale.push({
      name: 'Body Small',
      size: '14px',
      lineHeight: '1.5',
      weight: 400,
      usage: USAGE['Body Small'],
    })
  }

  const famFreq = new Map<string, number>()
  for (const ts of textStyles) famFreq.set(ts.family, (famFreq.get(ts.family) ?? 0) + 1)
  const fontFamily =
    [...famFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Inter'
  const fontFamilyMono = 'IBM Plex Mono'
  const bodySize =
    scale.find((s) => s.name === 'Body Large')?.size ??
    scale.find((s) => /body/i.test(s.name))?.size ??
    '16px'

  // ---- Spacing ------------------------------------------------------------
  const spacingObs = autoLayoutSpacings.filter((v) => v >= 2 && v <= 64)
  let base = 8
  if (spacingObs.length > 0) {
    const freq = new Map<number, number>()
    for (const v of spacingObs) freq.set(v, (freq.get(v) ?? 0) + 1)
    const top5 = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((e) => e[0])
      .sort((a, b) => a - b)
    for (const cand of top5) {
      const div = spacingObs.filter((v) => v % cand === 0).length
      if (div / spacingObs.length >= 0.6) {
        base = cand
        break
      }
    }
  }
  let spacingScale = [...new Set(spacingObs.filter((v) => v % base === 0))].sort(
    (a, b) => a - b,
  )
  if (spacingScale.length < 6) {
    const mult = [1, 2, 3, 4, 6, 8, 10, 12]
    spacingScale = [...new Set([...spacingScale, ...mult.map((m) => m * base)])].sort(
      (a, b) => a - b,
    )
  }
  spacingScale = spacingScale.slice(0, 10)
  if (!spacingScale.includes(base)) spacingScale.unshift(base)
  const spacing = { base, scale: spacingScale }

  // ---- Radius -------------------------------------------------------------
  const radiiSorted = [...cornerRadii].sort((a, b) => a - b)
  const pct = (p: number) =>
    radiiSorted.length === 0
      ? 0
      : radiiSorted[Math.min(radiiSorted.length - 1, Math.floor(p * (radiiSorted.length - 1)))]
  let radius =
    radiiSorted.length >= 5
      ? {
          sm: `${Math.round(pct(0.25))}px`,
          md: `${Math.round(pct(0.5))}px`,
          lg: `${Math.round(pct(0.75))}px`,
          full: '9999px',
        }
      : { sm: '4px', md: '8px', lg: '12px', full: '9999px' }
  if (radius.md === '0px') radius = { ...radius, md: '8px' }

  // ---- Shadows ------------------------------------------------------------
  let shadows: Array<{ name: string; value: string }> = []
  for (const [styleId, st] of Object.entries(styles)) {
    if (st.styleType !== 'EFFECT') continue
    const eff = styleUsages
      .get(styleId)
      ?.effects?.find((e) => e.type === 'DROP_SHADOW' && e.visible !== false)
    if (!eff) continue
    const c = eff.color ?? { r: 0, g: 0, b: 0, a: 0.1 }
    const rgba = `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(
      c.b * 255,
    )}, ${+c.a.toFixed(2)})`
    shadows.push({
      name: slug(st.name),
      value: `${eff.offset?.x ?? 0}px ${eff.offset?.y ?? 0}px ${eff.radius ?? 0}px ${rgba}`,
    })
  }
  if (shadows.length === 0) {
    shadows = [
      { name: 'sm', value: '0 1px 2px rgba(16,24,40,0.06)' },
      { name: 'md', value: '0 4px 12px rgba(16,24,40,0.10)' },
      { name: 'lg', value: '0 12px 32px rgba(16,24,40,0.14)' },
      { name: 'focus', value: `0 0 0 3px ${primary['100']}` },
    ]
  }

  // ---- Components ---------------------------------------------------------
  interface Group {
    baseName: string
    nodeId: string
    description?: string
    names: string[]
    props: Array<Record<string, string> | null | undefined>
    measuredHeight?: number
  }
  const groups: Group[] = []

  for (const set of walkResult.componentSets) {
    const children = set.children ?? []
    groups.push({
      baseName: set.name,
      nodeId: set.id,
      description: set.description,
      names: children.map((c) => c.name),
      props: children.map((c) => c.variantProperties),
      measuredHeight: set.absoluteBoundingBox?.height,
    })
  }
  const standalone = walkResult.components.filter(
    (c) => !walkResult.componentSetChildIds.has(c.id),
  )
  const byBase = new Map<
    string,
    { ids: string[]; names: string[]; props: Array<Record<string, string> | null | undefined>; node: FigmaNode }
  >()
  for (const c of standalone) {
    const bn = (c.name.split('/')[0] || c.name).trim()
    const g = byBase.get(bn) ?? { ids: [], names: [], props: [], node: c }
    g.ids.push(c.id)
    g.names.push(c.name)
    g.props.push(c.variantProperties)
    byBase.set(bn, g)
  }
  for (const [bn, g] of byBase) {
    groups.push({
      baseName: bn,
      nodeId: g.ids[0],
      description: g.node.description,
      names: g.names,
      props: g.props,
      measuredHeight: g.node.absoluteBoundingBox?.height,
    })
  }

  const capped = groups.slice(0, 60)
  if (groups.length > 60) {
    console.warn(`[extract] ${groups.length} component groups; capping at 60`)
  }

  const variantsStates = (g: Group): { variants: string[]; states: string[] } => {
    const values = new Set<string>()
    for (const p of g.props) {
      if (p) for (const v of Object.values(p)) values.add(String(v))
    }
    for (const name of g.names) {
      if (name.includes('=')) {
        for (const pair of name.split(',')) {
          const val = pair.split('=')[1]?.trim()
          if (val) values.add(val)
        }
      } else {
        for (const seg of name.split('/').slice(1)) {
          const s = seg.trim()
          if (s) values.add(s)
        }
      }
    }
    const all = [...values]
    return {
      variants: all.filter((v) => !STATE_WORDS.has(v.toLowerCase())).slice(0, 8),
      states: all.filter((v) => STATE_WORDS.has(v.toLowerCase())).slice(0, 8),
    }
  }

  const components: ComponentSpec[] = []
  const previewNodeIds: Record<string, string> = {}
  for (const g of capped) {
    const key = matchBlueprint(g.baseName)
    const { variants, states } = variantsStates(g)
    let entry: ComponentSpec
    if (key && BLUEPRINTS[key]) {
      const bp = BLUEPRINTS[key]
      const s = bp.sizing('comfortable')
      const paddingX = `${spacingScale[Math.min(s.paddingX, spacingScale.length - 1)] ?? spacingScale[0]}px`
      entry = {
        type: bp.type,
        variants: variants.length ? variants : bp.variants,
        states: states.length ? states : bp.states,
        specs: {
          height: s.height,
          paddingX,
          radius: radius.md,
          fontSize: resolveFontSize(s.fontSize, scale),
        },
        guidelines: g.description || '',
        tokensUsed: TOKENS_USED[key] ?? TOKENS_FALLBACK,
        sourceName: g.baseName,
        nodeId: g.nodeId,
      }
    } else {
      entry = {
        type: g.baseName,
        variants,
        states,
        specs: {
          height: g.measuredHeight ? `${Math.round(g.measuredHeight)}px` : 'auto',
          paddingX: `${spacingScale[3] ?? 16}px`,
          radius: radius.md,
          fontSize: bodySize,
        },
        guidelines: g.description || '',
        tokensUsed: [],
        sourceName: g.baseName,
        nodeId: g.nodeId,
      }
    }
    components.push(entry)
    previewNodeIds[entry.type] = g.nodeId
  }

  // ---- Docs + assemble ----------------------------------------------------
  const fillCount = Object.values(styles).filter((s) => s.styleType === 'FILL').length
  const colorVarCount = variables
    ? Object.values(variables.meta.variables).filter((v) => v.resolvedType === 'COLOR')
        .length
    : 0
  const colorCount = fillCount + colorVarCount
  const description = `Imported from Figma. ${colorCount} color styles, ${textStyleEntries.length} text styles, ${components.length} components`

  const pseudoDecisions: Decisions = {
    personality: ['imported', 'systematic', 'consistent'],
    primarySeed: primary['500'],
    secondarySeed: secondary['500'],
    neutralTint: neutral['500'],
    fontFamily,
    fontFamilyMono,
    radiusCharacter: 'rounded',
    density: 'comfortable',
    typeRatio: 1.25,
    reasoning: description,
  }
  const summary: FoundationSummary = {
    primary500: primary['500'],
    primary600: primary['600'],
    neutralRange: `${neutral['50']}..${neutral['900']}`,
    font: fontFamily,
    ratio: 1.25,
    spacingBase: base,
    radiusCharacter: 'rounded',
  }
  const docs = staticDocs(pseudoDecisions, summary, components.map((c) => c.type))
  for (const c of components) {
    if (!c.guidelines) c.guidelines = docs.componentGuidelines[c.type] ?? ''
  }

  const system: HorizonSystem = {
    name: file.name,
    description,
    colors: { primary, secondary, neutral, semantic },
    semanticTokens,
    typography: { fontFamily, fontFamilyMono, scale },
    spacing,
    radius,
    shadows,
    components,
    documentation: docs.documentation,
    meta: {
      source: 'figma',
      importedAt: new Date().toISOString(),
      figmaFileKey: fileKey,
      figmaLastModified: file.lastModified,
      filters: null,
      decisions: null,
    },
  }

  return { system, previewNodeIds }
}
