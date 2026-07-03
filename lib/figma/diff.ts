import type { HorizonSystem, Palette } from '@/lib/types'

export interface SystemDiff {
  colorsChanged: Array<{ ramp: string; shade: string; from: string; to: string }>
  typeChanged: Array<{
    step: string
    field: 'size' | 'weight' | 'lineHeight'
    from: string
    to: string
  }>
  componentsAdded: string[]
  componentsRemoved: string[]
  componentsRenamed: Array<{ from: string; to: string }>
  spacingChanged: boolean
  radiusChanged: boolean
  isEmpty: boolean
}

const SHADES: Array<keyof Palette> = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
]

const eqHex = (a?: string, b?: string) =>
  (a ?? '').toUpperCase() === (b ?? '').toUpperCase()

export function diffSystems(
  oldSys: HorizonSystem,
  newSys: HorizonSystem,
): SystemDiff {
  const colorsChanged: SystemDiff['colorsChanged'] = []
  for (const ramp of ['primary', 'secondary', 'neutral'] as const) {
    const o = oldSys.colors?.[ramp]
    const n = newSys.colors?.[ramp]
    if (!o || !n) continue
    for (const shade of SHADES) {
      if (o[shade] && n[shade] && !eqHex(o[shade], n[shade])) {
        colorsChanged.push({ ramp, shade, from: o[shade], to: n[shade] })
      }
    }
  }
  for (const slot of ['success', 'warning', 'error', 'info'] as const) {
    const o = oldSys.colors?.semantic?.[slot]
    const n = newSys.colors?.semantic?.[slot]
    if (o && n && !eqHex(o, n)) {
      colorsChanged.push({ ramp: 'semantic', shade: slot, from: o, to: n })
    }
  }

  const typeChanged: SystemDiff['typeChanged'] = []
  const oldSteps = new Map((oldSys.typography?.scale ?? []).map((s) => [s.name, s]))
  for (const s of newSys.typography?.scale ?? []) {
    const o = oldSteps.get(s.name)
    if (!o) continue
    if (o.size !== s.size)
      typeChanged.push({ step: s.name, field: 'size', from: o.size, to: s.size })
    if (o.weight !== s.weight)
      typeChanged.push({
        step: s.name,
        field: 'weight',
        from: String(o.weight),
        to: String(s.weight),
      })
    if (o.lineHeight !== s.lineHeight)
      typeChanged.push({
        step: s.name,
        field: 'lineHeight',
        from: o.lineHeight,
        to: s.lineHeight,
      })
  }

  const oldComps = oldSys.components ?? []
  const newComps = newSys.components ?? []
  const oldByNode = new Map(
    oldComps.filter((c) => c.nodeId).map((c) => [c.nodeId as string, c]),
  )
  const newByNode = new Map(
    newComps.filter((c) => c.nodeId).map((c) => [c.nodeId as string, c]),
  )
  const componentsRenamed: SystemDiff['componentsRenamed'] = []
  for (const [nodeId, oc] of oldByNode) {
    const nc = newByNode.get(nodeId)
    if (nc && nc.type !== oc.type) {
      componentsRenamed.push({ from: oc.type, to: nc.type })
    }
  }
  const renamedFrom = new Set(componentsRenamed.map((r) => r.from))
  const renamedTo = new Set(componentsRenamed.map((r) => r.to))
  const oldTypes = new Set(oldComps.map((c) => c.type))
  const newTypes = new Set(newComps.map((c) => c.type))
  const componentsAdded = [...newTypes].filter(
    (t) => !oldTypes.has(t) && !renamedTo.has(t),
  )
  const componentsRemoved = [...oldTypes].filter(
    (t) => !newTypes.has(t) && !renamedFrom.has(t),
  )

  const spacingChanged =
    JSON.stringify(oldSys.spacing) !== JSON.stringify(newSys.spacing)
  const radiusChanged =
    JSON.stringify(oldSys.radius) !== JSON.stringify(newSys.radius)

  const isEmpty =
    colorsChanged.length === 0 &&
    typeChanged.length === 0 &&
    componentsAdded.length === 0 &&
    componentsRemoved.length === 0 &&
    componentsRenamed.length === 0 &&
    !spacingChanged &&
    !radiusChanged

  return {
    colorsChanged,
    typeChanged,
    componentsAdded,
    componentsRemoved,
    componentsRenamed,
    spacingChanged,
    radiusChanged,
    isEmpty,
  }
}
