'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { Spinner } from '@/components/Spinner'
import FigmaMark from '@/components/FigmaMark'
import { extractFileKey } from '@/lib/figma/client'

const STATUS_STEPS = [
  'Fetching file from Figma',
  'Reading styles and variables',
  'Extracting color and type tokens',
  'Mapping components',
  'Rendering previews',
  'Finalizing',
]

interface Meta {
  name: string
  lastModified: string
  key: string
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  if (Number.isNaN(then)) return 'unknown'
  const min = Math.round(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`
  const mo = Math.round(day / 30)
  return `${mo} month${mo === 1 ? '' : 's'} ago`
}

export function ImportFigmaModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [url, setUrl] = useState('')
  const [meta, setMeta] = useState<Meta | null>(null)
  const [title, setTitle] = useState('')
  const [fetching, setFetching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)

  useEffect(() => {
    if (!open) return
    setUrl('')
    setMeta(null)
    setTitle('')
    setFetching(false)
    setImporting(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !importing) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!importing) return
    setStatusIndex(0)
    const id = setInterval(
      () => setStatusIndex((i) => (i + 1) % STATUS_STEPS.length),
      1400,
    )
    return () => clearInterval(id)
  }, [importing])

  if (!open) return null

  const validKey = extractFileKey(url)

  async function fetchMeta() {
    if (!validKey) return
    setFetching(true)
    try {
      const res = await fetch('/api/figma/file-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        name?: string
        lastModified?: string
        key?: string
        error?: string
      }
      if (!res.ok || !data.key) {
        if (data.error === 'not_connected') {
          toast('Connect Figma first in Settings', 'error')
          onClose()
          return
        }
        toast(data.error || 'Could not fetch file', 'error')
        return
      }
      const m = {
        name: data.name || 'Untitled',
        lastModified: data.lastModified || '',
        key: data.key,
      }
      setMeta(m)
      setTitle(m.name)
    } catch {
      toast('Network error, please try again', 'error')
    } finally {
      setFetching(false)
    }
  }

  async function doImport() {
    if (!meta || !title.trim()) return
    setImporting(true)
    try {
      const res = await fetch('/api/figma/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: meta.key, title: title.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        projectId?: string
        componentCount?: number
        error?: string
      }
      if (!res.ok || !data.projectId) {
        toast(data.error || 'Import failed', 'error')
        setImporting(false)
        return
      }
      toast(
        `Imported ${data.componentCount ?? 0} components from Figma`,
        'success',
      )
      router.push(`/project/${data.projectId}`)
    } catch {
      toast('Network error, please try again', 'error')
      setImporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={() => !importing && onClose()}
    >
      <div
        className="w-[480px] max-w-full rounded-card bg-surface p-8 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {importing ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
              <FigmaMark size={36} />
            </div>
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-ink">
              <Spinner size={16} className="text-brand" />
              {STATUS_STEPS[statusIndex]}
            </div>
            <p className="mt-2 text-xs text-muted">
              This can take up to a minute for large files.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FigmaMark size={22} />
                <h2 className="text-xl font-bold text-ink">Import from Figma</h2>
              </div>
              <button
                onClick={onClose}
                className="text-muted transition-colors hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {!meta ? (
              <div className="mt-5">
                <label className="text-sm font-medium text-ink">
                  Figma file link
                </label>
                <input
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.figma.com/design/..."
                  className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <p className="mt-1 text-xs text-muted">
                  Paste the link from your browser or Figma&apos;s Share button
                </p>
                <button
                  onClick={fetchMeta}
                  disabled={!validKey || fetching}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
                >
                  {fetching ? (
                    <>
                      <Spinner size={16} className="text-white" /> Fetching...
                    </>
                  ) : (
                    'Fetch file'
                  )}
                </button>
              </div>
            ) : (
              <div className="mt-5">
                <div className="flex items-center gap-3 rounded-xl border border-line p-4">
                  <FileText size={22} className="shrink-0 text-brand" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {meta.name}
                    </p>
                    <p className="text-xs text-muted">
                      Last modified {relativeTime(meta.lastModified)}
                    </p>
                  </div>
                </div>

                <label className="mt-5 block text-sm font-medium text-ink">
                  Project Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />

                <button
                  onClick={doImport}
                  disabled={!title.trim()}
                  className="btn-gradient mt-5 flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-40"
                >
                  Import design system
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ImportFigmaModal
