'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bot, Sparkles, Search, Store } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import { Spinner } from '@/components/Spinner'
import EmptyState from '@/components/EmptyState'
import { useToast } from '@/components/Toast'
import { AmbientBlobs } from '@/components/motion/AmbientBlobs'
import { Reveal } from '@/components/motion/Reveal'
import FilterPills, { type PanelKey } from '@/components/FilterPills'
import GlobalPanel from '@/components/panels/GlobalPanel'
import ComponentPanel from '@/components/panels/ComponentPanel'
import SimplePanel from '@/components/panels/SimplePanel'
import ImportFigmaModal from '@/components/ImportFigmaModal'
import FigmaMark from '@/components/FigmaMark'
import KitCard from '@/components/KitCard'
import KitModal from '@/components/KitModal'
import ProjectCard, { type ProjectRow } from '@/components/ProjectCard'
import { createClient } from '@/lib/supabase/client'
import {
  createInitialFilters,
  INDUSTRY_OPTIONS,
  PLATFORM_OPTIONS,
  ACCESSIBILITY_OPTIONS,
  FIGMA_OPTIONS,
  DEVICE_OPTIONS,
  SHOP_INDUSTRIES,
} from '@/lib/constants'
import type {
  GenerationFilters,
  HorizonSystem,
  ProjectSource,
  ProjectStatus,
  ShopKit,
} from '@/lib/types'

const STATUS_STEPS = [
  'Analyzing your brief',
  'Building color tokens',
  'Composing typography scale',
  'Assembling components',
  'Writing documentation',
]

/** Shape returned by the nested projects + versions select. */
interface RawProject {
  id: string
  title: string
  source: ProjectSource
  status: ProjectStatus
  created_at: string
  project_versions:
    | Array<{ version_number: number; label: string; system_json: HorizonSystem }>
    | null
}

export default function HomePage() {
  const router = useRouter()
  const { toast } = useToast()

  // --- generator ---
  const [prompt, setPrompt] = useState('')
  const [filters, setFilters] = useState<GenerationFilters>(createInitialFilters)
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null)
  const [generating, setGenerating] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)

  // --- figma import ---
  const [importOpen, setImportOpen] = useState(false)
  const [connectFirst, setConnectFirst] = useState(false)
  const [hasFigma, setHasFigma] = useState(false)

  // --- projects ---
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  // --- shop ---
  const [kits, setKits] = useState<ShopKit[]>([])
  const [kitsLoading, setKitsLoading] = useState(true)
  const [industry, setIndustry] = useState('All')
  const [kitQuery, setKitQuery] = useState('')
  const [selectedKit, setSelectedKit] = useState<ShopKit | null>(null)

  const loadProjects = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('projects')
      .select(
        'id,title,source,status,created_at,project_versions(version_number,label,system_json)',
      )
      .order('created_at', { ascending: false })
    const rows = (data ?? []) as unknown as RawProject[]
    setProjects(
      rows.map((p) => {
        // newest version wins for swatches + counts
        const latest = [...(p.project_versions ?? [])].sort(
          (a, b) => b.version_number - a.version_number,
        )[0]
        return {
          id: p.id,
          title: p.title,
          source: p.source,
          status: p.status,
          created_at: p.created_at,
          system: latest?.system_json ?? null,
          versionLabel: latest?.label ?? null,
        }
      }),
    )
    setProjectsLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    const supabase = createClient()

    supabase
      .from('figma_connections')
      .select('figma_user_handle')
      .maybeSingle()
      .then(({ data }) => {
        if (active) setHasFigma(!!data)
      })

    supabase
      .from('shop_kits')
      .select('*')
      .order('views', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return
        if (!error && data) setKits(data as ShopKit[])
        setKitsLoading(false)
      })

    loadProjects()
    return () => {
      active = false
    }
  }, [loadProjects])

  useEffect(() => {
    if (!generating) return
    setStatusIndex(0)
    const id = setInterval(
      () => setStatusIndex((i) => (i + 1) % STATUS_STEPS.length),
      1600,
    )
    return () => clearInterval(id)
  }, [generating])

  const toggleIn = (list: string[], item: string) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item]

  const canGenerate = prompt.trim().length >= 10

  async function handleGenerate() {
    if (!canGenerate || generating) return
    setOpenPanel(null)
    setGenerating(true)
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
        setGenerating(false)
        return
      }
      router.push(`/project/${data.projectId}`)
    } catch {
      toast('Network error, please try again', 'error')
      setGenerating(false)
    }
  }

  function openFigmaImport() {
    if (hasFigma) setImportOpen(true)
    else setConnectFirst(true)
  }

  async function deleteProject(id: string) {
    if (!window.confirm('Delete this project? This cannot be undone.')) return
    const prev = projects
    setProjects((p) => p.filter((x) => x.id !== id)) // optimistic
    const supabase = createClient()
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) {
      setProjects(prev)
      toast('Could not delete project', 'error')
      return
    }
    toast('Project deleted', 'success')
  }

  const filteredKits = useMemo(() => {
    const q = kitQuery.trim().toLowerCase()
    return kits.filter((k) => {
      const industryOk =
        industry === 'All' || k.industry.toLowerCase() === industry.toLowerCase()
      const queryOk =
        !q ||
        [k.title, k.author, k.industry].some((f) => f.toLowerCase().includes(q))
      return industryOk && queryOk
    })
  }, [kits, industry, kitQuery])

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
            onChange={(next) => setFilters((f) => ({ ...f, accessibility: next }))}
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

  const shopPills = [...SHOP_INDUSTRIES, 'All']

  return (
    <div>
      <Navbar
        links={[
          { label: 'Pricing' },
          { label: 'Shop', href: '#shop' },
          { label: 'Help?' },
        ]}
      />

      <main className="relative overflow-hidden px-4">
        <AmbientBlobs
          blobs={[
            { size: 440, left: '-5%', top: '2%', opacity: 0.55 },
            { size: 320, right: '8%', top: '8%', opacity: 0.5 },
          ]}
        />

        <div className="relative z-10 mx-auto max-w-[1180px] pb-24">
          {/* ================= Generator ================= */}
          <section className="mx-auto max-w-5xl pt-16">
            {generating ? (
              <div className="rounded-[24px] bg-surface p-8 shadow-card">
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
                <Reveal delay={0.05}>
                  <div className="rounded-[24px] bg-surface p-7 shadow-card md:p-8">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                        <Sparkles size={14} /> AI Design System
                      </span>
                      <button
                        onClick={openFigmaImport}
                        className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:bg-brand-50"
                      >
                        <FigmaMark size={15} />
                        Import a Figma file
                      </button>
                    </div>

                    <textarea
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
                        onToggle={(key) =>
                          setOpenPanel((prev) => (prev === key ? null : key))
                        }
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
                </Reveal>

                <AnimatePresence>
                  {openPanel ? (
                    <motion.div
                      key={openPanel}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-4 rounded-[24px] bg-surface p-8 shadow-card"
                    >
                      {renderPanel()}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <p className="mt-4 text-center text-[13px] text-muted">
                  Describe a system to generate it, or import a Figma file — either
                  way it runs through the same compiler before it ships.
                </p>
              </>
            )}
          </section>

          {/* ============= Your design systems ============= */}
          <section id="projects" className="mt-14 scroll-mt-24">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-ink">Your design systems</h2>
              {projects.length > 0 ? (
                <span className="text-xs text-muted">
                  {projects.length} project{projects.length > 1 ? 's' : ''}
                </span>
              ) : null}
            </div>

            {projectsLoading ? (
              <div className="flex justify-center py-14">
                <Spinner size={24} className="text-brand" />
              </div>
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {projects.map((p, i) => (
                  <Reveal key={p.id} delay={Math.min(i * 0.04, 0.3)} y={14}>
                    <ProjectCard project={p} onDelete={deleteProject} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-line bg-surface p-9 text-center text-[13.5px] text-muted">
                No systems yet — generate one above or import a Figma file to get
                started.
              </div>
            )}
          </section>

          {/* ==================== Shop ==================== */}
          <section id="shop" className="mt-14 scroll-mt-24">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-ink">
                Pre-build design systems
              </h2>
              <label className="flex h-11 w-[300px] max-w-[60vw] items-center gap-2 rounded-full border border-line bg-surface px-4 transition-colors focus-within:border-brand">
                <Search size={16} className="shrink-0 text-muted" />
                <input
                  value={kitQuery}
                  onChange={(e) => setKitQuery(e.target.value)}
                  placeholder="Search kits, authors, industries"
                  className="w-full border-0 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-0"
                />
              </label>
            </div>

            <div className="mb-5 flex flex-wrap gap-2.5">
              {shopPills.map((p) => {
                const active = industry === p
                return (
                  <button
                    key={p}
                    onClick={() => setIndustry(p)}
                    className={`h-9 rounded-full border px-3.5 text-[13px] transition-colors ${
                      active
                        ? 'border-brand bg-brand-50 font-medium text-brand'
                        : 'border-line bg-surface text-muted hover:text-ink'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>

            {kitsLoading ? (
              <div className="flex justify-center py-16">
                <Spinner size={28} className="text-brand" />
              </div>
            ) : filteredKits.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredKits.map((kit, i) => (
                  <Reveal key={kit.id} delay={Math.min(i * 0.04, 0.4)} y={16}>
                    <KitCard kit={kit} onOpen={setSelectedKit} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Store}
                title="No kits match your search"
                subtitle="Try another search term or industry filter"
              />
            )}
          </section>
        </div>
      </main>

      <ImportFigmaModal open={importOpen} onClose={() => setImportOpen(false)} />
      <KitModal kit={selectedKit} onClose={() => setSelectedKit(null)} />

      {connectFirst ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={() => setConnectFirst(false)}
        >
          <div
            className="w-[380px] max-w-full rounded-card bg-surface p-8 text-center shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 flex justify-center">
              <FigmaMark size={32} />
            </div>
            <h2 className="text-lg font-bold text-ink">Connect Figma first</h2>
            <p className="mt-1 text-sm text-muted">
              Link your Figma account in Settings, then import any file.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConnectFirst(false)}
                className="h-11 flex-1 rounded-xl border border-line text-sm font-semibold text-muted hover:text-ink"
              >
                Cancel
              </button>
              <Link
                href="/settings"
                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-700"
              >
                Go to Settings
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
