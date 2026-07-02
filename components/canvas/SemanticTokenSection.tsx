import type { SemanticToken } from '@/lib/types'

export function SemanticTokenSection({ tokens }: { tokens: SemanticToken[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-1 md:grid-cols-2">
      {tokens.map((t) => (
        <div
          key={t.name}
          className="flex items-center gap-3 border-b border-line py-2.5"
        >
          <span
            className="h-5 w-5 shrink-0 rounded border border-line"
            style={{ background: t.value }}
          />
          <span className="font-mono text-xs text-ink">{t.name}</span>
          <span className="ml-auto font-mono text-xs text-body">{t.value}</span>
          {t.ref ? (
            <span className="w-24 shrink-0 text-right text-xs text-muted">
              {t.ref}
            </span>
          ) : (
            <span className="w-24 shrink-0" />
          )}
        </div>
      ))}
    </div>
  )
}

export default SemanticTokenSection
