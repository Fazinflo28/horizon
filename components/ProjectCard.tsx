'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import { validateSystem } from '@/lib/validate'
import type { HorizonSystem, ProjectSource, ProjectStatus } from '@/lib/types'

export interface ProjectRow {
  id: string
  title: string
  source: ProjectSource
  status: ProjectStatus
  created_at: string
  /** Newest version's system, used for the swatches + health. Null = no version yet. */
  system: HorizonSystem | null
  versionLabel: string | null
}

const SOURCE_LABEL: Record<ProjectSource, string> = {
  ai: 'AI generated',
  figma: 'Figma import',
  kit: 'From kit',
  sketch: 'Sketch import',
  xd: 'Adobe XD import',
}

export function ProjectCard({
  project,
  onDelete,
}: {
  project: ProjectRow
  onDelete: (id: string) => void
}) {
  const sys = project.system
  const primary = sys?.colors?.primary
  const secondary = sys?.colors?.secondary
  const swatches = [
    primary?.['300'],
    primary?.['500'],
    primary?.['700'],
    secondary?.['500'],
  ].filter(Boolean) as string[]
  const componentCount = sys?.components?.length ?? 0

  // Real rule-engine run — not a decorative number.
  const health = validateSystem(sys)
  // matches tailwind.config danger/warning/success (they are literal hex, not vars)
  const healthColor =
    health.blockers > 0 ? '#EE5D50' : health.warnings > 0 ? '#FFB547' : '#05CD99'

  return (
    <Link
      href={`/project/${project.id}`}
      className="flex h-full flex-col rounded-2xl border border-line/70 bg-surface p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-pop"
    >
      {/* swatch strip — always rendered so every card is the same height */}
      <div className="flex gap-1">
        {swatches.length > 0 ? (
          swatches.map((hex, i) => (
            <span key={i} className="h-7 flex-1 rounded-md" style={{ background: hex }} />
          ))
        ) : (
          <span className="flex h-7 flex-1 items-center justify-center rounded-md border border-dashed border-line text-[10px] text-muted">
            No palette yet
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-start justify-between gap-2">
        <span className="truncate text-[13px] font-bold text-ink">{project.title}</span>
        <button
          aria-label="Delete project"
          onClick={(e) => {
            e.preventDefault()
            onDelete(project.id)
          }}
          className="-mr-0.5 shrink-0 rounded-md p-0.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <X size={13} />
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
        <StatusBadge status={project.status} />
        <span className="truncate">
          {project.versionLabel ? `${project.versionLabel} · ` : ''}
          {SOURCE_LABEL[project.source]}
          {componentCount > 0 ? ` · ${componentCount} components` : ''}
        </span>
      </div>

      {/* health row pinned to the bottom, so cards line up even when text wraps */}
      <div className="mt-auto pt-3">
        {sys ? (
          <>
            <div className="h-1.5 overflow-hidden rounded-full bg-field">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${health.pct}%`, background: healthColor }}
              />
            </div>
            <div className="mt-1.5 flex justify-between gap-2 text-[10.5px] text-muted">
              <span>Compiler health</span>
              <span className="truncate">
                {health.passed
                  ? 'compiles clean'
                  : `${health.blockers} blocker${health.blockers === 1 ? '' : 's'} · ${health.warnings} warning${health.warnings === 1 ? '' : 's'}`}{' '}
                · {health.pct}%
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="h-1.5 rounded-full bg-field" />
            <div className="mt-1.5 text-[10.5px] text-muted">
              Not generated yet — open to build it
            </div>
          </>
        )}
      </div>
    </Link>
  )
}

export default ProjectCard
