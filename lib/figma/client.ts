// Server-side Figma REST wrapper. All calls send the X-Figma-Token header.

export type FigmaErrorCode =
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'api_error'

export class FigmaError extends Error {
  code: FigmaErrorCode
  status?: number
  retryAfter?: number
  constructor(code: FigmaErrorCode, status?: number, retryAfter?: number) {
    super(code)
    this.name = 'FigmaError'
    this.code = code
    this.status = status
    this.retryAfter = retryAfter
  }
}

const BASE = 'https://api.figma.com'

// ---- Minimal typing of the parts of the Figma payload we read -------------

export interface FigmaColor {
  r: number
  g: number
  b: number
  a: number
}

export interface FigmaPaint {
  type: string
  color?: FigmaColor
  opacity?: number
  gradientStops?: Array<{ color: FigmaColor; position: number }>
}

export interface FigmaEffect {
  type: string
  visible?: boolean
  color?: FigmaColor
  offset?: { x: number; y: number }
  radius?: number
  spread?: number
}

export interface FigmaTextStyle {
  fontFamily?: string
  fontPostScriptName?: string
  fontWeight?: number
  fontSize?: number
  lineHeightPx?: number
  lineHeightPercentFontSize?: number
}

export interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
  fills?: FigmaPaint[]
  strokes?: FigmaPaint[]
  effects?: FigmaEffect[]
  styles?: Record<string, string>
  style?: FigmaTextStyle
  cornerRadius?: number
  rectangleCornerRadii?: number[]
  layoutMode?: string
  itemSpacing?: number
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number } | null
  componentPropertyDefinitions?: Record<string, unknown>
  variantProperties?: Record<string, string> | null
  description?: string
}

export interface FigmaStyle {
  key: string
  name: string
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID'
  description?: string
}

export interface FigmaComponentMeta {
  name: string
  description?: string
  componentSetId?: string
}

export interface FigmaFile {
  name: string
  lastModified: string
  document: FigmaNode
  styles: Record<string, FigmaStyle>
  components: Record<string, FigmaComponentMeta>
  componentSets?: Record<string, FigmaComponentMeta>
}

export interface FigmaVariable {
  id: string
  name: string
  resolvedType: string
  valuesByMode: Record<string, FigmaColor | number | string | boolean | { type: string; id: string }>
}

export interface VariablesResponse {
  meta: {
    variables: Record<string, FigmaVariable>
    variableCollections: Record<string, unknown>
  }
}

// ---- Fetch with 429 retry-once -------------------------------------------

function retryAfterSeconds(res: Response): number | undefined {
  const ra = Number(res.headers.get('retry-after'))
  return Number.isFinite(ra) && ra > 0 ? ra : undefined
}

async function req<T>(
  token: string,
  path: string,
  retryOn429 = true,
): Promise<T> {
  const opts = { headers: { 'X-Figma-Token': token } }
  let res = await fetch(BASE + path, opts)
  let attempts = 0
  while (res.status === 429 && retryOn429 && attempts < 2) {
    const waitS = Math.min(retryAfterSeconds(res) ?? 2, 8)
    await new Promise((r) => setTimeout(r, waitS * 1000))
    res = await fetch(BASE + path, opts)
    attempts++
  }
  if (res.status === 429) {
    throw new FigmaError('rate_limited', 429, retryAfterSeconds(res))
  }
  if (res.ok) return (await res.json()) as T
  if (res.status === 403) throw new FigmaError('forbidden', 403)
  if (res.status === 404) throw new FigmaError('not_found', 404)
  throw new FigmaError('api_error', res.status)
}

export async function figmaGetMe(
  token: string,
): Promise<{ handle: string; img_url: string; email?: string }> {
  const d = await req<{ handle: string; img_url: string; email?: string }>(
    token,
    '/v1/me',
  )
  return { handle: d.handle, img_url: d.img_url, email: d.email }
}

export async function figmaGetFile(token: string, key: string): Promise<FigmaFile> {
  return req<FigmaFile>(token, `/v1/files/${key}`)
}

export async function figmaGetFileMeta(
  token: string,
  key: string,
): Promise<{ name: string; lastModified: string; key: string }> {
  const d = await req<{ name: string; lastModified: string }>(
    token,
    `/v1/files/${key}?depth=1`,
  )
  return { name: d.name, lastModified: d.lastModified, key }
}

/** Enterprise-only endpoint. Returns null (never throws) on 403/404. */
export async function figmaGetVariables(
  token: string,
  key: string,
): Promise<VariablesResponse | null> {
  try {
    return await req<VariablesResponse>(token, `/v1/files/${key}/variables/local`)
  } catch (e) {
    if (e instanceof FigmaError && (e.code === 'forbidden' || e.code === 'not_found')) {
      return null
    }
    throw e
  }
}

/** Render node images as PNG@2x. Batches ids in groups of 50. */
export async function figmaGetImages(
  token: string,
  key: string,
  nodeIds: string[],
): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {}
  for (let i = 0; i < nodeIds.length; i += 50) {
    const batch = nodeIds.slice(i, i + 50)
    const ids = batch.map((id) => encodeURIComponent(id)).join(',')
    // Images are best-effort — fail fast on 429 instead of burning retry budget.
    const d = await req<{ images?: Record<string, string | null> }>(
      token,
      `/v1/images/${key}?ids=${ids}&format=png&scale=2`,
      false,
    )
    Object.assign(out, d.images ?? {})
  }
  return out
}

/** Accepts figma.com/file/KEY, figma.com/design/KEY, or a bare key. */
export function extractFileKey(url: string): string | null {
  const m = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/)
  if (m) return m[1]
  const bare = url.trim()
  if (/^[a-zA-Z0-9]{22,}$/.test(bare)) return bare
  return null
}
