import { contrastRatio } from '@/lib/engine/color'
import type { HorizonSystem } from '@/lib/types'

// ---------------------------------------------------------------------------
// The compiler's rule set. Pure, synchronous, no I/O — runs on any HorizonSystem
// (AI-generated, Figma-imported or kit) and reports real violations, so the
// health score on a project card is measured, not decorative.
// ---------------------------------------------------------------------------

export type Severity = 'blocker' | 'warning'

export interface Violation {
  rule: string
  severity: Severity
  message: string
}

export interface ValidationResult {
  violations: Violation[]
  blockers: number
  warnings: number
  /** 0-100: share of rules that pass. */
  pct: number
  passed: boolean
}

const HEX = /^#[0-9A-Fa-f]{6}$/
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']

interface Rule {
  id: string
  severity: Severity
  /** Returns a message when the rule is violated, or null when it passes. */
  check: (s: HorizonSystem) => string | null
}

/** Look up a semantic token, falling back to the ramps when absent. */
function token(s: HorizonSystem, name: string, fallback?: string): string | undefined {
  const t = s.semanticTokens?.find((x) => x.name === name)?.value
  return t ?? fallback
}

const RULES: Rule[] = [
  {
    id: 'palette-complete',
    severity: 'blocker',
    check: (s) => {
      for (const key of ['primary', 'secondary', 'neutral'] as const) {
        const ramp = s.colors?.[key]
        if (!ramp) return `${key} palette is missing`
        const missing = SHADES.filter((sh) => !HEX.test(ramp[sh as '50'] ?? ''))
        if (missing.length > 0)
          return `${key} palette is missing shades: ${missing.join(', ')}`
      }
      return null
    },
  },
  {
    id: 'brand-contrast',
    severity: 'blocker',
    check: (s) => {
      const bg = token(s, 'color-bg-brand', s.colors?.primary?.['600'])
      const fg = token(s, 'color-text-on-brand', '#FFFFFF')
      if (!bg || !fg || !HEX.test(bg) || !HEX.test(fg)) return 'brand colors unresolved'
      const r = contrastRatio(fg, bg)
      return r < 4.5
        ? `text on brand fails WCAG AA (${r.toFixed(2)}:1, needs 4.5:1)`
        : null
    },
  },
  {
    id: 'body-contrast',
    severity: 'blocker',
    check: (s) => {
      const fg = token(s, 'color-text-primary', s.colors?.neutral?.['900'])
      const bg = token(s, 'color-bg-page', s.colors?.neutral?.['50'])
      if (!fg || !bg || !HEX.test(fg) || !HEX.test(bg)) return 'text colors unresolved'
      const r = contrastRatio(fg, bg)
      return r < 4.5
        ? `body text fails WCAG AA (${r.toFixed(2)}:1, needs 4.5:1)`
        : null
    },
  },
  {
    id: 'muted-contrast',
    severity: 'warning',
    check: (s) => {
      const fg = token(s, 'color-text-muted', s.colors?.neutral?.['400'])
      const bg = token(s, 'color-bg-page', s.colors?.neutral?.['50'])
      if (!fg || !bg || !HEX.test(fg) || !HEX.test(bg)) return null
      const r = contrastRatio(fg, bg)
      return r < 3
        ? `muted text is low contrast (${r.toFixed(2)}:1, prefer 3:1+)`
        : null
    },
  },
  {
    id: 'focus-token',
    severity: 'blocker',
    check: (s) => {
      const f = token(s, 'color-border-focus', s.colors?.primary?.['500'])
      return f && HEX.test(f) ? null : 'no focus-ring color defined'
    },
  },
  {
    id: 'semantic-colors',
    severity: 'warning',
    check: (s) => {
      const sem = s.colors?.semantic
      const missing = (['success', 'warning', 'error', 'info'] as const).filter(
        (k) => !HEX.test(sem?.[k] ?? ''),
      )
      return missing.length > 0
        ? `semantic colors missing: ${missing.join(', ')}`
        : null
    },
  },
  {
    id: 'type-scale',
    severity: 'blocker',
    check: (s) =>
      (s.typography?.scale?.length ?? 0) > 0 ? null : 'typography scale is empty',
  },
  {
    id: 'type-ordering',
    severity: 'warning',
    check: (s) => {
      const sizes = (s.typography?.scale ?? []).map((t) => parseInt(t.size, 10))
      for (let i = 1; i < sizes.length; i++) {
        if (
          Number.isFinite(sizes[i]) &&
          Number.isFinite(sizes[i - 1]) &&
          sizes[i] > sizes[i - 1]
        )
          return 'type scale is not ordered largest to smallest'
      }
      return null
    },
  },
  {
    id: 'type-line-height',
    severity: 'warning',
    check: (s) => {
      const bad = (s.typography?.scale ?? []).filter((t) => !t.lineHeight)
      return bad.length > 0
        ? `${bad.length} type step(s) missing a line height`
        : null
    },
  },
  {
    id: 'font-family',
    severity: 'warning',
    check: (s) =>
      s.typography?.fontFamily ? null : 'no font family defined',
  },
  {
    id: 'spacing-grid',
    severity: 'warning',
    check: (s) => {
      const base = s.spacing?.base ?? 4
      const scale = s.spacing?.scale ?? []
      if (scale.length === 0) return 'spacing scale is empty'
      const off = scale.filter((v) => base > 0 && v % base !== 0)
      return off.length > 0
        ? `${off.length} spacing value(s) off the ${base}px grid`
        : null
    },
  },
  {
    id: 'radius-defined',
    severity: 'warning',
    check: (s) => {
      const missing = (['sm', 'md', 'lg', 'full'] as const).filter(
        (k) => !s.radius?.[k],
      )
      return missing.length > 0 ? `radius missing: ${missing.join(', ')}` : null
    },
  },
  {
    id: 'elevation-defined',
    severity: 'warning',
    check: (s) =>
      (s.shadows?.length ?? 0) > 0 ? null : 'no elevation/shadow scale defined',
  },
  {
    id: 'component-specs',
    severity: 'warning',
    check: (s) => {
      const bad = (s.components ?? []).filter(
        (c) =>
          !c.specs?.height ||
          !c.specs?.paddingX ||
          !c.specs?.radius ||
          !c.specs?.fontSize,
      )
      return bad.length > 0
        ? `${bad.length} component(s) missing size specs`
        : null
    },
  },
  {
    id: 'component-states',
    severity: 'warning',
    check: (s) => {
      const comps = s.components ?? []
      if (comps.length === 0) return 'system has no components'
      const bad = comps.filter(
        (c) => (c.variants?.length ?? 0) === 0 || (c.states?.length ?? 0) === 0,
      )
      return bad.length > 0
        ? `${bad.length} component(s) missing variants or states`
        : null
    },
  },
]

export const RULE_COUNT = RULES.length

export function validateSystem(system: HorizonSystem | null): ValidationResult {
  if (!system) {
    return { violations: [], blockers: 0, warnings: 0, pct: 0, passed: false }
  }
  const violations: Violation[] = []
  for (const rule of RULES) {
    let message: string | null = null
    try {
      message = rule.check(system)
    } catch {
      message = 'rule could not be evaluated'
    }
    if (message)
      violations.push({ rule: rule.id, severity: rule.severity, message })
  }
  const blockers = violations.filter((v) => v.severity === 'blocker').length
  const warnings = violations.filter((v) => v.severity === 'warning').length
  const pct = Math.round(((RULE_COUNT - violations.length) / RULE_COUNT) * 100)
  return {
    violations,
    blockers,
    warnings,
    pct,
    passed: violations.length === 0,
  }
}
