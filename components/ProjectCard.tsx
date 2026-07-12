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
  /** Newest version's system, used for the swatches + component count. */
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
      className="block rounded-2xl bg-surface p-4 shadow-card transition-transform hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div className="flex gap-1">
        {swatches.length > 0 ? (
          swatches.map((hex, i) => (
            <span
              key={i}
              className="h-8 flex-1 rounded-md"
              style={{ background: hex }}
            />
          ))
        ) : (
          <span className="h-8 flex-1 rounded-md bg-field" />
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <span className="truncate text-sm font-bold text-ink">{project.title}</span>
        <button
          aria-label="Delete project"
          onClick={(e) => {
            e.preventDefault()
            onDelete(project.id)
          }}
          className="-mr-1 shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <StatusBadge status={project.status} />
        <span>
          {project.versionLabel ? `${project.versionLabel} · ` : ''}
          {SOURCE_LABEL[project.source]}
          {componentCount > 0 ? ` · ${componentCount} components` : ''}
        </span>
      </div>

      {sys ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-field">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${health.pct}%`, background: healthColor }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted">
            <span>Compiler health</span>
            <span>
              {health.passed
                ? 'compiles clean'
                : `${health.blockers} blocker${health.blockers === 1 ? '' : 's'} · ${health.warnings} warning${health.warnings === 1 ? '' : 's'}`}{' '}
              · {health.pct}%
            </span>
          </div>
        </div>
      ) : null}
    </Link>
  )
}

export default ProjectCard
