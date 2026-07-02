'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, User } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { formatCount, coverTextColor } from '@/components/KitCard'
import type { ShopKit } from '@/lib/types'

export function KitModal({
  kit,
  onClose,
}: {
  kit: ShopKit | null
  onClose: () => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!kit) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [kit, onClose])

  async function useKit() {
    if (!kit) return
    setBusy(true)
    try {
      const res = await fetch('/api/kits/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kitId: kit.id }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        projectId?: string
        error?: string
      }
      if (!res.ok || !data.projectId) {
        toast(data.error || 'Could not add kit', 'error')
        setBusy(false)
        return
      }
      toast('Kit added to your projects', 'success')
      router.push(`/project/${data.projectId}`)
    } catch {
      toast('Network error, please try again', 'error')
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {kit ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="w-[520px] max-w-full rounded-card bg-white p-6 shadow-pop"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="text-muted transition-colors hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="flex h-[200px] flex-col justify-between rounded-xl p-6"
              style={{ background: kit.cover_gradient }}
            >
              <span
                className="inline-flex w-fit rounded-full bg-white/25 px-3 py-1 text-xs font-semibold backdrop-blur-sm"
                style={{ color: coverTextColor(kit.cover_gradient) }}
              >
                {kit.industry}
              </span>
              <p
                className="text-2xl font-bold"
                style={{ color: coverTextColor(kit.cover_gradient) }}
              >
                {kit.title}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink">{kit.title}</h2>
                <p className="text-sm text-muted">by {kit.author}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Heart size={14} /> {formatCount(kit.likes)}
                </span>
                <span className="flex items-center gap-1">
                  <User size={14} /> {formatCount(kit.views)}
                </span>
              </div>
            </div>

            <p className="mt-3 text-sm text-body">
              A production-ready starter design system for{' '}
              {kit.industry.toLowerCase()} products.
            </p>

            <button
              onClick={useKit}
              disabled={busy}
              className={`btn-gradient mt-5 flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white ${
                busy ? 'pointer-events-none opacity-70' : ''
              }`}
            >
              {busy ? 'Adding…' : 'Use this kit'}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default KitModal
