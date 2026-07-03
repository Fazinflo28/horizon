'use client'

import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import type { SystemDiff } from '@/lib/figma/diff'

function Swatch({ hex }: { hex: string }) {
  return (
    <span
      className="inline-block h-4 w-4 shrink-0 rounded border border-line align-middle"
      style={{ background: hex }}
    />
  )
}

export function DiffModal({
  open,
  diff,
  onClose,
  onApply,
  applying,
}: {
  open: boolean
  diff: SystemDiff | null
  onClose: () => void
  onApply: () => void
  applying: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !applying) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, applying, onClose])

  if (!open || !diff) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={() => !applying && onClose()}
    >
      <div
        className="max-h-[70vh] w-[560px] max-w-full overflow-auto rounded-card bg-surface p-8 shadow-pop thin-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-ink">Changes detected in Figma</h2>

        {diff.colorsChanged.length > 0 ? (
          <section className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-ink">Colors</h3>
            <div className="space-y-1.5">
              {diff.colorsChanged.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-body">
                  <Swatch hex={c.from} />
                  <ArrowRight size={14} className="text-muted" />
                  <Swatch hex={c.to} />
                  <span className="ml-1 text-muted">
                    {c.ramp} {c.shade}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {diff.typeChanged.length > 0 ? (
          <section className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-ink">Typography</h3>
            <div className="space-y-1 text-sm text-body">
              {diff.typeChanged.map((t, i) => (
                <p key={i}>
                  {t.step}: {t.field} {t.from} to {t.to}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {diff.componentsAdded.length > 0 ||
        diff.componentsRemoved.length > 0 ||
        diff.componentsRenamed.length > 0 ? (
          <section className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-ink">Components</h3>
            <div className="space-y-1 text-sm">
              {diff.componentsAdded.map((n) => (
                <p key={`a-${n}`} className="text-success">
                  + {n}
                </p>
              ))}
              {diff.componentsRemoved.map((n) => (
                <p key={`r-${n}`} className="text-danger">
                  - {n}
                </p>
              ))}
              {diff.componentsRenamed.map((r, i) => (
                <p key={`n-${i}`} className="text-warning">
                  {r.from} renamed to {r.to}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {diff.spacingChanged || diff.radiusChanged ? (
          <section className="mt-5 space-y-1 text-sm text-body">
            {diff.spacingChanged ? <p>Spacing scale changed</p> : null}
            {diff.radiusChanged ? <p>Radius values changed</p> : null}
          </section>
        ) : null}

        <div className="mt-6 rounded-xl bg-warning/10 p-4 text-sm text-body">
          Applying will update the draft and reset all review approvals to
          pending. Published versions are not affected.
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={applying}
            className="h-10 rounded-full px-4 text-sm font-semibold text-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            disabled={applying}
            className="h-10 rounded-full bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {applying ? 'Applying…' : 'Apply and reset reviews'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DiffModal
