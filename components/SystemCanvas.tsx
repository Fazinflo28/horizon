'use client'

import { useMemo } from 'react'
import ColorSection from '@/components/canvas/ColorSection'
import SemanticTokenSection from '@/components/canvas/SemanticTokenSection'
import TypographySection from '@/components/canvas/TypographySection'
import SpacingSection from '@/components/canvas/SpacingSection'
import ShapeSection from '@/components/canvas/ShapeSection'
import ComponentPreview from '@/components/canvas/ComponentPreview'
import { ExportMenu } from '@/components/ExportMenu'
import ResyncButton from '@/components/ResyncButton'
import { useGoogleFont } from '@/components/canvas/useGoogleFont'
import FigmaMark from '@/components/FigmaMark'
import type { HorizonSystem, PreviewEntry } from '@/lib/types'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-lg font-bold text-ink">{children}</h2>
}

export function SystemCanvas({
  system,
  versionLabel,
  projectId,
  versionId,
  previews,
  onResynced,
}: {
  system: HorizonSystem
  versionLabel: string
  projectId?: string
  versionId?: string
  previews?: Record<string, PreviewEntry> | null
  onResynced?: (res: {
    system: HorizonSystem
    previews: Record<string, PreviewEntry> | null
  }) => void
}) {
  const components = useMemo(() => system.components ?? [], [system.components])
  const tokens = useMemo(
    () => system.semanticTokens ?? [],
    [system.semanticTokens],
  )
  const personality = system.meta?.decisions?.personality ?? []

  // Load the actual generated fonts so samples render for real.
  useGoogleFont(system.typography?.fontFamily)
  useGoogleFont(system.typography?.fontFamilyMono)

  const nav = useMemo(() => {
    const base = [{ id: 'sec-colors', label: 'Colors' }]
    if (tokens.length > 0)
      base.push({ id: 'sec-tokens', label: 'Semantic Tokens' })
    base.push(
      { id: 'sec-typography', label: 'Typography' },
      { id: 'sec-spacing', label: 'Spacing' },
      { id: 'sec-shape', label: 'Shape & Elevation' },
    )
    const comps = components.map((c, i) => ({
      id: `sec-comp-${i}`,
      label: c.type,
    }))
    return [...base, ...comps, { id: 'sec-docs', label: 'Documentation' }]
  }, [components, tokens.length])

  const goto = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })

  return (
    <div className="flex gap-6">
      <aside className="hidden w-[180px] shrink-0 lg:block">
        <div className="sticky top-24">
          <span className="mb-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand">
            {versionLabel}
          </span>
          <nav className="space-y-1">
            {nav.map((n, i) => (
              <button
                key={n.id}
                onClick={() => goto(n.id)}
                className="block w-full truncate text-left text-sm text-body transition-colors hover:text-brand"
              >
                {i + 1}. {n.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-8">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-ink">{system.name}</h2>
              {system.meta?.source === 'figma' ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">
                  <FigmaMark size={12} /> Figma import
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted">{system.description}</p>
            {personality.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {personality.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium capitalize text-brand"
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {system.meta?.source === 'figma' && projectId && onResynced ? (
              <ResyncButton projectId={projectId} onResynced={onResynced} />
            ) : null}
            <ExportMenu
              system={system}
              projectId={projectId}
              versionId={versionId}
            />
          </div>
        </div>

        <section id="sec-colors" className="scroll-mt-24">
          <SectionTitle>Colors</SectionTitle>
          <ColorSection system={system} />
        </section>

        {tokens.length > 0 ? (
          <section id="sec-tokens" className="scroll-mt-24">
            <SectionTitle>Semantic Tokens</SectionTitle>
            <SemanticTokenSection tokens={tokens} />
          </section>
        ) : null}

        <section id="sec-typography" className="scroll-mt-24">
          <SectionTitle>Typography</SectionTitle>
          <TypographySection system={system} />
        </section>

        <section id="sec-spacing" className="scroll-mt-24">
          <SectionTitle>Spacing</SectionTitle>
          <SpacingSection system={system} />
        </section>

        <section id="sec-shape" className="scroll-mt-24">
          <SectionTitle>Shape &amp; Elevation</SectionTitle>
          <ShapeSection system={system} />
        </section>

        {components.length > 0 ? (
          <section className="scroll-mt-24">
            <SectionTitle>Components</SectionTitle>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {components.map((c, i) => (
                <div key={i} id={`sec-comp-${i}`} className="scroll-mt-24">
                  <ComponentPreview
                    component={c}
                    system={system}
                    previewUrl={previews?.[c.type]?.imageUrl}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section id="sec-docs" className="scroll-mt-24">
          <SectionTitle>Documentation</SectionTitle>
          <div className="space-y-5 rounded-card bg-surface p-6 shadow-card">
            {(system.documentation ?? []).map((d, i) => (
              <div key={i}>
                <h3 className="text-base font-semibold text-ink">{d.section}</h3>
                <p className="mt-1 text-sm leading-relaxed text-body">
                  {d.content}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default SystemCanvas
