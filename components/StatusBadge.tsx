import type { ProjectStatus } from '@/lib/types'

const MAP: Record<ProjectStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-field text-muted' },
  in_review: { label: 'In Review', cls: 'bg-warning/10 text-warning' },
  published: { label: 'Published', cls: 'bg-success/10 text-success' },
  rejected: { label: 'Rejected', cls: 'bg-danger/10 text-danger' },
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = MAP[status]
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${s.cls}`}
    >
      {s.label}
    </span>
  )
}

export default StatusBadge
