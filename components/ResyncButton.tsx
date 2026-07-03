'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useToast } from '@/components/Toast'
import DiffModal from '@/components/DiffModal'
import type { SystemDiff } from '@/lib/figma/diff'
import type { HorizonSystem, PreviewEntry } from '@/lib/types'

export function ResyncButton({
  projectId,
  onResynced,
}: {
  projectId: string
  onResynced: (res: {
    system: HorizonSystem
    previews: Record<string, PreviewEntry> | null
  }) => void
}) {
  const { toast } = useToast()
  const [checking, setChecking] = useState(false)
  const [applying, setApplying] = useState(false)
  const [diff, setDiff] = useState<SystemDiff | null>(null)

  async function check() {
    setChecking(true)
    try {
      const res = await fetch('/api/figma/resync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, apply: false }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        upToDate?: boolean
        diff?: SystemDiff | null
        error?: string
      }
      if (!res.ok) {
        toast(data.error || 'Re-sync failed', 'error')
        return
      }
      if (data.upToDate) {
        toast('Already up to date with Figma', 'info')
        return
      }
      if (!data.diff || data.diff.isEmpty) {
        toast('No token changes detected', 'info')
        return
      }
      setDiff(data.diff)
    } catch {
      toast('Network error, please try again', 'error')
    } finally {
      setChecking(false)
    }
  }

  async function apply() {
    setApplying(true)
    try {
      const res = await fetch('/api/figma/resync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, apply: true }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        applied?: boolean
        system?: HorizonSystem
        previews?: Record<string, PreviewEntry> | null
        error?: string
      }
      if (!res.ok || !data.applied || !data.system) {
        toast(data.error || 'Apply failed', 'error')
        return
      }
      onResynced({ system: data.system, previews: data.previews ?? null })
      toast('Synced. Reviews reset to pending.', 'success')
      setDiff(null)
    } catch {
      toast('Network error, please try again', 'error')
    } finally {
      setApplying(false)
    }
  }

  return (
    <>
      <button
        onClick={check}
        disabled={checking}
        className="flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-body transition-colors hover:text-ink disabled:opacity-50"
      >
        <RefreshCw size={16} className={checking ? 'animate-spin' : ''} /> Re-sync
      </button>
      <DiffModal
        open={Boolean(diff)}
        diff={diff}
        onClose={() => setDiff(null)}
        onApply={apply}
        applying={applying}
      />
    </>
  )
}

export default ResyncButton
