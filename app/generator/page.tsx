'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { Spinner } from '@/components/Spinner'
import { useToast } from '@/components/Toast'
import FilterPills, { type PanelKey } from '@/components/FilterPills'
import GlobalPanel from '@/components/panels/GlobalPanel'
import ComponentPanel from '@/components/panels/ComponentPanel'
import SimplePanel from '@/components/panels/SimplePanel'
import {
  createInitialFilters,
  INDUSTRY_OPTIONS,
  PLATFORM_OPTIONS,
  ACCESSIBILITY_OPTIONS,
  FIGMA_OPTIONS,
  DEVICE_OPTIONS,
} from '@/lib/constants'
import type { GenerationFilters } from '@/lib/types'

const STATUS_STEPS = [
  'Analyzing your brief',
  'Building color tokens',
  'Composing typography scale',
  'Assembling components',
  'Writing documentation',
]

function DecorBlobs() {
  return (
    <>
      <div
        className="pointer-events-none absolute -left-10 bottom-10 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, #DDE4FF 0%, rgba(221,228,255,0) 70%)',
          opacity: 0.6,
        }}
      />
      <div
        className="pointer-events-none absolute right-24 top-1/3 h-[300px] w-[300px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, #DDE4FF 0%, rgba(221,228,255,0) 70%)',
          opacity: 0.55,
        }}
      />
    </>
  )
}

export default function GeneratorPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [prompt, setPrompt] = useState('')
  const [filters, setFilters] = useState<GenerationFilters>(createInitialFilters)
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)

  useEffect(() => {
    if (!loading) return
    setStatusIndex(0)
    const id = setInterval(
      () => setStatusIndex((i) => (i + 1) % STATUS_STEPS.length),
      1600,
    )
    return () => clearInterval(id)
  }, [loading])

  const togglePanel = (key: PanelKey) =>
    setOpenPanel((prev) => (prev === key ? null : key))

  const toggleIn = (list: string[], item: string) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item]

  const canGenerate = prompt.trim().length >= 10

  async function handleGenerate() {
    if (!canGenerate || loading) return
    setOpenPanel(null)
    setLoading(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, filters }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        projectId?: string
        error?: string
      }
      if (!res.ok || !data.projectId) {
        toast(data.error || 'Generation failed, please try again', 'error')
        setLoading(false)
        return
      }
      router.push(`/project/${data.projectId}`)
    } catch {
      toast('Network error, please try again', 'error')
      setLoading(false)
    }
  }

  function renderPanel() {
    switch (openPanel) {
      case 'global':
        return (
          <GlobalPanel
            checked={filters.global}
            onToggle={(item) =>
              setFilters((f) => ({ ...f, global: toggleIn(f.global, item) }))
            }
          />
        )
      case 'component':
        return (
          <ComponentPanel
            checked={filters.components}
            onToggle={(item) =>
              setFilters((f) => ({
                ...f,
                components: toggleIn(f.components, item),
              }))
            }
          />
        )
      case 'industry':
        return (
          <SimplePanel
            options={INDUSTRY_OPTIONS}
            multi={false}
            selected={filters.industry ? [filters.industry] : []}
            onChange={(next) =>
              setFilters((f) => ({ ...f, industry: next[0] ?? null }))
            }
          />
        )
      case 'platform':
        return (
          <SimplePanel
            options={PLATFORM_OPTIONS}
            multi={false}
            selected={filters.platform ? [filters.platform] : []}
            onChange={(next) =>
              setFilters((f) => ({ ...f, platform: next[0] ?? null }))
            }
          />
        )
      case 'accessibility':
        return (
          <SimplePanel
            options={ACCESSIBILITY_OPTIONS}
            multi
            selected={filters.accessibility}
            onChange={(next) =>
              setFilters((f) => ({ ...f, accessibility: next }))
            }
          />
        )
      case 'figma':
        return (
          <SimplePanel
            options={FIGMA_OPTIONS}
            multi
            selected={filters.figma}
            onChange={(next) => setFilters((f) => ({ ...f, figma: next }))}
          />
        )
      case 'device':
        return (
          <SimplePanel
            options={DEVICE_OPTIONS}
            multi
            selected={filters.devices}
            onChange={(next) => setFilters((f) => ({ ...f, devices: next }))}
          />
        )
      default:
        return null
    }
  }

  return (
    <div>
      <Navbar
        links={[
          { label: 'Pricing' },
          { label: 'Resources' },
          { label: 'Help?' },
        ]}
      />
      <main className="relative min-h-[calc(100vh-72px)] overflow-hidden px-4">
        <DecorBlobs />
        <div className="relative z-10">
          {loading ? (
            <div className="mx-auto mt-24 max-w-5xl rounded-[24px] bg-white p-8 shadow-card">
              <div className="space-y-3">
                {['85%', '70%', '92%', '60%', '78%'].map((w, i) => (
                  <div
                    key={i}
                    className="h-4 animate-pulse rounded-full bg-page"
                    style={{ width: w }}
                  />
                ))}
              </div>
              <div className="mt-7 flex items-center gap-3 text-sm font-medium text-ink">
                <Spinner size={18} className="text-brand" />
                {STATUS_STEPS[statusIndex]}
              </div>
            </div>
          ) : (
            <>
              <div className="relative mx-auto mt-24 max-w-5xl rounded-[24px] bg-white p-8 shadow-card">
                <textarea
                  autoFocus
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Type Horizon to create component, design system..."
                  className="w-full resize-none border-0 bg-transparent text-xl text-ink placeholder:text-muted/70 focus:outline-none focus:ring-0 md:text-2xl"
                />
                <div className="mx-1 my-4 border-t border-line" />
                <div className="flex flex-wrap items-center gap-3">
                  <FilterPills
                    filters={filters}
                    openPanel={openPanel}
                    onToggle={togglePanel}
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className={`btn-gradient ml-auto flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold text-white ${
                      !canGenerate ? 'pointer-events-none opacity-40' : ''
                    }`}
                  >
                    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/25">
                      <Bot size={16} />
                    </span>
                    Generate
                  </button>
                </div>
              </div>

              {openPanel ? (
                <div className="mx-auto mt-4 max-w-5xl rounded-[24px] bg-white p-8 shadow-card">
                  {renderPanel()}
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
