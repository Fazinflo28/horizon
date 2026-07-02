import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-dashed border-line text-muted">
        <Icon size={28} />
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {subtitle ? (
        <p className="mt-1 max-w-sm text-sm text-muted">{subtitle}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export default EmptyState
