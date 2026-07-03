'use client'

import { useState } from 'react'
import {
  Star,
  Plus,
  Heart,
  Settings,
  Search,
  ChevronDown,
  ChevronRight,
  Home,
  Bell,
  User,
  Check,
  X,
  MoreVertical,
  Info,
  Image as ImageIcon,
  CheckCircle2,
  LayoutGrid,
  Code,
} from 'lucide-react'
import type { HorizonSystem, ComponentSpec } from '@/lib/types'
import { useToast } from '@/components/Toast'
import { generateComponentCode } from '@/lib/exporters/component-code'
import FigmaMark from '@/components/FigmaMark'

function resolveTokens(system: HorizonSystem) {
  const p = system.colors?.primary
  const n = system.colors?.neutral
  const sem = system.colors?.semantic
  const primary = p?.['500'] ?? '#4F46E5'
  const primaryDark = p?.['700'] ?? '#4338CA'
  const primary100 = p?.['100'] ?? '#E0E7FF'
  const primary50 = p?.['50'] ?? '#EEF2FF'
  const border = n?.['200'] ?? '#E5E7EB'
  const textMuted = n?.['500'] ?? '#6B7280'
  const textInk = n?.['800'] ?? '#1F2937'
  const bodyStep =
    system.typography?.scale?.find((s) => /body/i.test(s.name)) ??
    system.typography?.scale?.[0]
  return {
    primary,
    primaryDark,
    primary100,
    primary50,
    border,
    textMuted,
    textInk,
    radiusMd: system.radius?.md ?? '10px',
    radiusFull: system.radius?.full ?? '9999px',
    error: sem?.error ?? '#EE5D50',
    success: sem?.success ?? '#05CD99',
    warning: sem?.warning ?? '#FFB547',
    info: sem?.info ?? primary,
    fontSize: bodyStep?.size ?? '14px',
    base: system.spacing?.base ?? 4,
  }
}

type Tokens = ReturnType<typeof resolveTokens>

// -- small shared bits ------------------------------------------------------
function Solid({ t, label, style }: { t: Tokens; label: string; style?: React.CSSProperties }) {
  return (
    <button
      className="h-11 px-5 text-sm font-semibold text-white"
      style={{ background: t.primary, borderRadius: t.radiusMd, ...style }}
    >
      {label}
    </button>
  )
}

// -- renderers --------------------------------------------------------------
const RENDERERS: Record<string, (t: Tokens) => React.ReactNode> = {
  button: (t) => (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Solid t={t} label="Primary" />
        <button
          className="h-11 px-5 text-sm font-semibold"
          style={{ background: t.primary50, color: t.primary, borderRadius: t.radiusMd }}
        >
          Secondary
        </button>
        <button
          className="h-11 px-5 text-sm font-semibold"
          style={{ border: `1px solid ${t.primary}`, color: t.primary, borderRadius: t.radiusMd }}
        >
          Outline
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Solid t={t} label="Default" />
        <Solid t={t} label="Hover" style={{ background: t.primaryDark }} />
        <Solid t={t} label="Disabled" style={{ opacity: 0.4 }} />
      </div>
    </div>
  ),

  iconbutton: (t) => (
    <div className="flex items-center gap-3">
      {[Plus, Heart, Settings, Search].map((Icon, i) => (
        <button
          key={i}
          className="flex h-11 w-11 items-center justify-center text-white"
          style={{ background: i === 0 ? t.primary : t.primary50, borderRadius: t.radiusMd, color: i === 0 ? '#fff' : t.primary }}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  ),

  floatingbuttonfab: (t) => (
    <div className="flex items-center gap-4">
      <button
        className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
        style={{ background: t.primary }}
      >
        <Plus size={24} />
      </button>
      <button
        className="flex h-12 w-12 items-center justify-center rounded-full text-white"
        style={{ background: t.primaryDark }}
      >
        <Plus size={20} />
      </button>
    </div>
  ),

  extendedfab: (t) => (
    <button
      className="flex h-14 items-center gap-2 rounded-full px-6 font-semibold text-white shadow-lg"
      style={{ background: t.primary }}
    >
      <Plus size={20} /> Create
    </button>
  ),

  togglebutton: (t) => (
    <div className="inline-flex overflow-hidden rounded-full border" style={{ borderColor: t.border }}>
      {['Day', 'Week', 'Month'].map((l, i) => (
        <button
          key={l}
          className="px-4 py-2 text-sm font-medium"
          style={
            i === 0
              ? { background: t.primary, color: '#fff' }
              : { background: '#fff', color: t.textMuted }
          }
        >
          {l}
        </button>
      ))}
    </div>
  ),

  splitbutton: (t) => (
    <div className="inline-flex overflow-hidden text-white" style={{ borderRadius: t.radiusMd }}>
      <button className="h-11 px-5 text-sm font-semibold" style={{ background: t.primary }}>
        Save
      </button>
      <span className="w-px" style={{ background: 'rgba(255,255,255,0.3)' }} />
      <button className="flex h-11 w-10 items-center justify-center" style={{ background: t.primary }}>
        <ChevronDown size={16} />
      </button>
    </div>
  ),

  textfield: (t) => (
    <div className="max-w-sm space-y-3">
      <input
        placeholder="Default"
        className="h-11 w-full px-4 text-sm outline-none"
        style={{ border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textInk }}
      />
      <input
        placeholder="Focused"
        className="h-11 w-full px-4 text-sm outline-none"
        style={{ border: `2px solid ${t.primary}`, borderRadius: t.radiusMd, boxShadow: `0 0 0 3px ${t.primary50}`, color: t.textInk }}
      />
      <div>
        <input
          placeholder="Error"
          className="h-11 w-full px-4 text-sm outline-none"
          style={{ border: `1.5px solid ${t.error}`, borderRadius: t.radiusMd, color: t.textInk }}
        />
        <p className="mt-1 text-xs" style={{ color: t.error }}>
          This field is required
        </p>
      </div>
    </div>
  ),

  dropdownselect: (t) => (
    <button
      className="flex h-11 w-64 items-center justify-between px-4 text-sm"
      style={{ border: `1px solid ${t.border}`, borderRadius: t.radiusMd, color: t.textInk }}
    >
      Select an option
      <ChevronDown size={16} style={{ color: t.textMuted }} />
    </button>
  ),

  combobox: (t) => (
    <div className="w-64" style={{ border: `1px solid ${t.border}`, borderRadius: t.radiusMd }}>
      <div className="flex h-11 items-center gap-2 px-4">
        <Search size={16} style={{ color: t.textMuted }} />
        <input placeholder="Search…" className="w-full text-sm outline-none" />
      </div>
    </div>
  ),

  checkbox: (t) => (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <span
          className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px]"
          style={{ background: t.primary }}
        >
          <Check size={12} color="#fff" strokeWidth={3} />
        </span>
        <span className="text-sm" style={{ color: t.textInk }}>Checked</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-[18px] w-[18px] rounded-[4px]" style={{ border: `2px solid ${t.border}` }} />
        <span className="text-sm" style={{ color: t.textMuted }}>Unchecked</span>
      </div>
    </div>
  ),

  radiobutton: (t) => (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <span
          className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
          style={{ border: `2px solid ${t.primary}` }}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.primary }} />
        </span>
        <span className="text-sm" style={{ color: t.textInk }}>Selected</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-[18px] w-[18px] rounded-full" style={{ border: `2px solid ${t.border}` }} />
        <span className="text-sm" style={{ color: t.textMuted }}>Option</span>
      </div>
    </div>
  ),

  slider: (t) => (
    <div className="max-w-sm">
      <div className="relative h-1.5 rounded-full" style={{ background: t.border }}>
        <div className="absolute left-0 top-0 h-1.5 rounded-full" style={{ width: '60%', background: t.primary }} />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 bg-surface"
          style={{ left: '60%', borderColor: t.primary }}
        />
      </div>
    </div>
  ),

  rangeslider: (t) => (
    <div className="max-w-sm">
      <div className="relative h-1.5 rounded-full" style={{ background: t.border }}>
        <div className="absolute top-0 h-1.5 rounded-full" style={{ left: '25%', width: '45%', background: t.primary }} />
        {['25%', '70%'].map((l) => (
          <div
            key={l}
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 bg-surface"
            style={{ left: l, borderColor: t.primary }}
          />
        ))}
      </div>
    </div>
  ),

  rating: (t) => (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={22}
          style={{ color: t.warning }}
          fill={i < 3 ? t.warning : 'transparent'}
        />
      ))}
    </div>
  ),

  tabs: (t) => (
    <div className="border-b" style={{ borderColor: t.border }}>
      <div className="flex gap-6">
        {['Overview', 'Activity', 'Settings'].map((l, i) => (
          <button
            key={l}
            className="pb-3 text-sm font-medium"
            style={
              i === 0
                ? { color: t.primary, borderBottom: `2px solid ${t.primary}` }
                : { color: t.textMuted, borderBottom: '2px solid transparent' }
            }
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  ),

  appbar: (t) => (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 text-white"
      style={{ background: t.primary }}
    >
      <div className="flex items-center gap-3">
        <LayoutGrid size={18} />
        <span className="text-sm font-semibold">Horizon</span>
      </div>
      <div className="flex items-center gap-3">
        <Search size={18} />
        <Bell size={18} />
      </div>
    </div>
  ),

  navigationbar: (t) => (
    <div
      className="flex items-center justify-around rounded-xl bg-surface px-2 py-2 shadow-sm"
      style={{ border: `1px solid ${t.border}` }}
    >
      {[Home, Search, Heart, User].map((Icon, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <Icon size={20} style={{ color: i === 0 ? t.primary : t.textMuted }} />
          <span className="h-1 w-1 rounded-full" style={{ background: i === 0 ? t.primary : 'transparent' }} />
        </div>
      ))}
    </div>
  ),

  navigationrail: (t) => (
    <div
      className="flex w-14 flex-col items-center gap-5 rounded-xl bg-surface py-4"
      style={{ border: `1px solid ${t.border}` }}
    >
      {[Home, Search, Settings].map((Icon, i) => (
        <div
          key={i}
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={i === 0 ? { background: t.primary50, color: t.primary } : { color: t.textMuted }}
        >
          <Icon size={18} />
        </div>
      ))}
    </div>
  ),

  sidebar: (t) => (
    <div className="w-52 rounded-xl bg-surface p-2" style={{ border: `1px solid ${t.border}` }}>
      {['Dashboard', 'Projects', 'Team', 'Settings'].map((l, i) => (
        <div
          key={l}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          style={i === 0 ? { background: t.primary50, color: t.primary, fontWeight: 600 } : { color: t.textMuted }}
        >
          <LayoutGrid size={16} /> {l}
        </div>
      ))}
    </div>
  ),

  breadcrumb: (t) => (
    <div className="flex items-center gap-2 text-sm" style={{ color: t.textMuted }}>
      <Home size={15} />
      <span>Projects</span>
      <ChevronRight size={14} />
      <span>Horizon</span>
      <ChevronRight size={14} />
      <span style={{ color: t.primary, fontWeight: 600 }}>Overview</span>
    </div>
  ),

  menu: (t) => (
    <div className="w-52 rounded-xl bg-surface p-1.5 shadow-lg" style={{ border: `1px solid ${t.border}` }}>
      {['Edit', 'Duplicate', 'Delete'].map((l) => (
        <div key={l} className="rounded-lg px-3 py-2 text-sm" style={{ color: t.textInk }}>
          {l}
        </div>
      ))}
    </div>
  ),

  contextmenu: (t) => (
    <div className="w-44 rounded-xl bg-surface p-1.5 shadow-lg" style={{ border: `1px solid ${t.border}` }}>
      {['Cut', 'Copy', 'Paste'].map((l) => (
        <div key={l} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm" style={{ color: t.textInk }}>
          {l}
          <span className="text-xs" style={{ color: t.textMuted }}>⌘{l[0]}</span>
        </div>
      ))}
    </div>
  ),

  card: (t) => (
    <div className="w-64 overflow-hidden rounded-xl bg-surface" style={{ border: `1px solid ${t.border}` }}>
      <div className="flex h-24 items-center justify-center" style={{ background: t.primary50 }}>
        <ImageIcon size={28} style={{ color: t.primary }} />
      </div>
      <div className="p-4">
        <p className="text-sm font-semibold" style={{ color: t.textInk }}>Card title</p>
        <p className="mt-1 text-xs" style={{ color: t.textMuted }}>
          Supporting copy that describes the card content briefly.
        </p>
        <button className="mt-3 h-9 px-4 text-xs font-semibold text-white" style={{ background: t.primary, borderRadius: t.radiusMd }}>
          Action
        </button>
      </div>
    </div>
  ),

  accordion: (t) => (
    <div className="max-w-sm divide-y rounded-xl bg-surface" style={{ border: `1px solid ${t.border}`, borderColor: t.border }}>
      {['What is included?', 'How does billing work?'].map((l, i) => (
        <div key={l} className="flex items-center justify-between px-4 py-3 text-sm" style={{ color: t.textInk }}>
          {l}
          <ChevronDown size={16} style={{ color: t.textMuted, transform: i === 0 ? 'rotate(180deg)' : 'none' }} />
        </div>
      ))}
    </div>
  ),

  badge: (t) => (
    <div className="flex items-center gap-5">
      <div className="relative">
        <Bell size={26} style={{ color: t.textMuted }} />
        <span
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
          style={{ background: t.error }}
        >
          3
        </span>
      </div>
      <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: t.primary50, color: t.primary }}>
        New
      </span>
      <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: t.success }}>
        Active
      </span>
    </div>
  ),

  chip: (t) => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-white" style={{ background: t.primary }}>
        Design <X size={12} />
      </span>
      <span className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: t.primary50, color: t.primary }}>
        Research
      </span>
      <span className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ border: `1px solid ${t.border}`, color: t.textMuted }}>
        Draft
      </span>
    </div>
  ),

  divider: (t) => (
    <div className="max-w-sm space-y-3">
      <p className="text-sm" style={{ color: t.textInk }}>Section one</p>
      <div className="h-px w-full" style={{ background: t.border }} />
      <p className="text-sm" style={{ color: t.textInk }}>Section two</p>
    </div>
  ),

  list: (t) => listPreview(t),
  listitem: (t) => listPreview(t),

  datagrid: (t) => (
    <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${t.border}` }}>
      <table className="w-full text-left text-xs">
        <thead>
          <tr style={{ background: t.primary50, color: t.primary }}>
            {['Name', 'Role', 'Status', 'Date'].map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody style={{ color: t.textInk }}>
          {[0, 1, 2].map((r) => (
            <tr key={r} style={{ background: r % 2 ? '#fff' : t.primary50 + '55' }}>
              {['Ada L.', 'Designer', 'Active', '2026'].map((c, ci) => (
                <td key={ci} className="px-3 py-2">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),

  carousel: (t) => (
    <div className="max-w-sm">
      <div className="flex h-28 items-center justify-center rounded-xl" style={{ background: t.primary50, color: t.primary }}>
        <ImageIcon size={30} />
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all"
            style={{ width: i === 1 ? 20 : 6, background: i === 1 ? t.primary : t.border }}
          />
        ))}
      </div>
    </div>
  ),

  alert: (t) => (
    <div className="flex max-w-md items-start gap-3 rounded-xl p-4" style={{ background: t.primary50 }}>
      <Info size={18} style={{ color: t.primary }} className="mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold" style={{ color: t.textInk }}>Heads up</p>
        <p className="text-xs" style={{ color: t.textMuted }}>Your changes have been saved automatically.</p>
      </div>
    </div>
  ),

  toast: (t) => (
    <div className="inline-flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-lg" style={{ background: t.textInk }}>
      <CheckCircle2 size={18} style={{ color: t.success }} />
      <span className="text-sm">Project published successfully</span>
    </div>
  ),

  dialog: (t) => (
    <div className="w-72 rounded-xl bg-surface p-5 shadow-xl" style={{ border: `1px solid ${t.border}` }}>
      <p className="text-sm font-semibold" style={{ color: t.textInk }}>Delete project?</p>
      <p className="mt-1 text-xs" style={{ color: t.textMuted }}>This action cannot be undone.</p>
      <div className="mt-4 flex justify-end gap-2">
        <button className="h-9 px-4 text-xs font-semibold" style={{ color: t.textMuted, border: `1px solid ${t.border}`, borderRadius: t.radiusMd }}>
          Cancel
        </button>
        <button className="h-9 px-4 text-xs font-semibold text-white" style={{ background: t.error, borderRadius: t.radiusMd }}>
          Delete
        </button>
      </div>
    </div>
  ),

  popover: (t) => (
    <div className="relative w-56 rounded-xl bg-surface p-4 shadow-lg" style={{ border: `1px solid ${t.border}` }}>
      <span
        className="absolute -top-1.5 left-6 h-3 w-3 rotate-45 bg-surface"
        style={{ borderLeft: `1px solid ${t.border}`, borderTop: `1px solid ${t.border}` }}
      />
      <p className="text-sm font-semibold" style={{ color: t.textInk }}>Quick tip</p>
      <p className="mt-1 text-xs" style={{ color: t.textMuted }}>Popovers anchor to a trigger element.</p>
    </div>
  ),

  tooltip: (t) => (
    <div className="relative inline-block rounded-lg px-3 py-1.5 text-xs text-white" style={{ background: t.textInk }}>
      Tooltip label
      <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45" style={{ background: t.textInk }} />
    </div>
  ),

  banner: (t) => (
    <div className="flex max-w-lg items-center justify-between gap-4 rounded-xl px-4 py-3 text-white" style={{ background: t.primary }}>
      <span className="text-sm font-medium">New workspace features are available.</span>
      <button className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">Explore</button>
    </div>
  ),

  progressbar: (t) => (
    <div className="max-w-sm">
      <div className="h-2 w-full rounded-full" style={{ background: t.border }}>
        <div className="h-2 rounded-full" style={{ width: '60%', background: t.primary }} />
      </div>
      <p className="mt-1.5 text-xs" style={{ color: t.textMuted }}>60% complete</p>
    </div>
  ),

  skeletonloader: () => (
    <div className="max-w-sm space-y-2.5">
      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
    </div>
  ),
}

function listPreview(t: Tokens): React.ReactNode {
  return (
    <div className="max-w-sm divide-y rounded-xl bg-surface" style={{ border: `1px solid ${t.border}`, borderColor: t.border }}>
      {['Ada Lovelace', 'Alan Turing', 'Grace Hopper'].map((name, i) => (
        <div key={name} className="flex items-center gap-3 px-4 py-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: t.primary50, color: t.primary }}
          >
            {name.split(' ').map((w) => w[0]).join('')}
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: t.textInk }}>{name}</p>
            <p className="text-xs" style={{ color: t.textMuted }}>Member</p>
          </div>
          {i === 0 ? <MoreVertical size={16} style={{ color: t.textMuted }} /> : null}
        </div>
      ))}
    </div>
  )
}

function normalize(type: string): string {
  return type.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function SpecFallback({ component, t }: { component: ComponentSpec; t: Tokens }) {
  const rows: Array<[string, string]> = [
    ['Height', component.specs?.height ?? '—'],
    ['Padding X', component.specs?.paddingX ?? '—'],
    ['Radius', component.specs?.radius ?? '—'],
    ['Font size', component.specs?.fontSize ?? '—'],
  ]
  return (
    <div className="flex items-center gap-4">
      <div
        className="flex h-10 items-center rounded-lg px-4 text-xs font-semibold"
        style={{ background: t.primary50, color: t.primary }}
      >
        {component.type}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs" style={{ color: t.textMuted }}>
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span>{k}:</span>
            <span style={{ color: t.textInk }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ComponentPreview({
  component,
  system,
  previewUrl,
}: {
  component: ComponentSpec
  system: HorizonSystem
  previewUrl?: string
}) {
  const { toast } = useToast()
  const [imgFailed, setImgFailed] = useState(false)
  const t = resolveTokens(system)
  const render = RENDERERS[normalize(component.type)]
  const showImage = Boolean(previewUrl) && !imgFailed

  const copyCode = () => {
    const { code } = generateComponentCode(component, system)
    navigator.clipboard
      ?.writeText(code)
      .then(() => toast(`${component.type} code copied`, 'success'))
      .catch(() => {})
  }

  return (
    <div className="rounded-card bg-surface p-6 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-ink">{component.type}</h3>
        <button
          onClick={copyCode}
          aria-label="Copy component code"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-page hover:text-brand"
        >
          <Code size={16} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(component.variants ?? []).map((v) => (
          <span key={v} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
            {v}
          </span>
        ))}
        {(component.states ?? []).map((s) => (
          <span key={s} className="rounded-full bg-page px-2 py-0.5 text-[11px] text-muted">
            {s}
          </span>
        ))}
      </div>
      <div
        className={`relative mt-4 flex min-h-[96px] items-center rounded-xl bg-page p-6 ${
          showImage ? 'justify-center' : ''
        }`}
      >
        {showImage ? (
          <>
            <span className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] text-muted shadow-sm">
              <FigmaMark size={12} /> from Figma
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={component.type}
              onError={() => setImgFailed(true)}
              className="max-h-[220px] max-w-full rounded-lg object-contain"
            />
          </>
        ) : render ? (
          render(t)
        ) : (
          <SpecFallback component={component} t={t} />
        )}
      </div>
      {component.guidelines ? (
        <p className="mt-3 text-xs text-muted">{component.guidelines}</p>
      ) : null}
    </div>
  )
}

export default ComponentPreview
