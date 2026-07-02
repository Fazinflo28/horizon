'use client'

import { useMemo } from 'react'
import { Copy } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { systemToCss } from '@/lib/css-export'
import ColorSection from '@/components/canvas/ColorSection'
import TypographySection from '@/components/canvas/TypographySection'
import SpacingSection from '@/components/canvas/SpacingSection'
import ShapeSection from '@/components/canvas/ShapeSection'
import ComponentPreview from '@/components/canvas/ComponentPreview'
import type { HorizonSystem } from '@/lib/types'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-lg font-bold text-ink">{children}</h2>
}

export function SystemCanvas({
  system,
  versionLabel,
}: {
  system: HorizonSystem
  versionLabel: string
}) {
  const { toast } = useToast()
  const components = system.components ?? []

  const nav = useMemo(() => {
    const base = [
      { id: 'sec-colors', label: 'Colors' },
      { id: 'sec-typography', label: 'Typography' },
      { id: 'sec-spacing', label: 'Spacing' },
      { id: 'sec-shape', label: 'Shape & Elevation' },
    ]
    const comps = components.map((c, i) => ({
      id: `sec-comp-${i}`,
      label: c.type,
    }))
    return [...base, ...comps, { id: 'sec-docs', label: 'Documentation' }]
  }, [components])

  const copyCss = () => {
    navigator.clipboard
      ?.writeText(systemToCss(system))
      .then(() => toast('CSS variables copied', 'success'))
      .catch(() => {})
  }

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

      <div className="min-w-0 flex-1 space-y-10">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-ink">{system.name}</h2>
            <p className="text-sm text-muted">{system.description}</p>
          </div>
          <button
            onClick={copyCss}
            className="ml-auto flex h-10 items-center gap-2 rounded-full border border-brand px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-50"
          >
            <Copy size={16} /> Copy CSS variables
          </button>
        </div>

        <section id="sec-colors" className="scroll-mt-24">
          <SectionTitle>Colors</SectionTitle>
          <ColorSection system={system} />
        </section>

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
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {components.map((c, i) => (
                <div key={i} id={`sec-comp-${i}`} className="scroll-mt-24">
                  <ComponentPreview component={c} system={system} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section id="sec-docs" className="scroll-mt-24">
          <SectionTitle>Documentation</SectionTitle>
          <div className="space-y-5 rounded-card bg-white p-6 shadow-card">
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
