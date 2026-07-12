'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import type { GenerationFilters } from '@/lib/types'

export type PanelKey =
  | 'global'
  | 'industry'
  | 'platform'
  | 'component'
  | 'accessibility'
  | 'figma'
  | 'device'

interface PillState {
  key: PanelKey
  label: string
  highlighted: boolean
}

function pillStates(filters: GenerationFilters): PillState[] {
  return [
    {
      key: 'global',
      label: filters.global.length > 0 ? `${filters.global.length} Global` : 'Branding',
      highlighted: filters.global.length > 0,
    },
    {
      key: 'industry',
      label: filters.industry ?? 'Industry',
      highlighted: Boolean(filters.industry),
    },
    {
      key: 'platform',
      label: filters.platform ?? 'Platform',
      highlighted: Boolean(filters.platform),
    },
    {
      key: 'component',
      label:
        filters.components.length > 0
          ? `${filters.components.length} Component`
          : 'Component',
      highlighted: filters.components.length > 0,
    },
    {
      key: 'accessibility',
      label: 'Accessibility',
      highlighted: filters.accessibility.length > 0,
    },
    { key: 'figma', label: 'Figma', highlighted: filters.figma.length > 0 },
    { key: 'device', label: 'Device', highlighted: filters.devices.length > 0 },
  ]
}

export function FilterPills({
  filters,
  openPanel,
  onToggle,
}: {
  filters: GenerationFilters
  openPanel: PanelKey | null
  onToggle: (key: PanelKey) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pillStates(filters).map((p) => {
        const open = openPanel === p.key
        const active = open || p.highlighted
        return (
          <button
            key={p.key}
            onClick={() => onToggle(p.key)}
            className={`flex h-8 items-center gap-1 rounded-full border px-3 text-xs transition-colors ${
              active
                ? 'border-brand bg-brand-50 font-medium text-brand'
                : 'border-line bg-surface text-muted hover:border-brand/40 hover:text-ink'
            }`}
          >
            {p.label}
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )
      })}
    </div>
  )
}

export default FilterPills
