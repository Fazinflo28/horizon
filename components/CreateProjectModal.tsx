'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, GripVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import { Checkbox } from '@/components/Checkbox'
import { DEVICE_OPTIONS } from '@/lib/constants'
import type { ProjectSource, FolderKind, ReviewStage } from '@/lib/types'

const FOLDER_DEFS: { name: string; kind: FolderKind }[] = [
  { name: 'Components', kind: 'components' },
  { name: 'Templates', kind: 'templates' },
  { name: 'Assets', kind: 'assets' },
  { name: 'Documentation', kind: 'documentation' },
]

const REVIEW_STAGES: ReviewStage[] = ['copy', 'tech', 'accessibility', 'design']

export function CreateProjectModal({
  open,
  onClose,
  source,
}: {
  open: boolean
  onClose: () => void
  source: ProjectSource
}) {
  const router = useRouter()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [devices, setDevices] = useState<Record<string, boolean>>({
    Desktop: false,
    Mobile: true,
    Tablet: true,
  })
  const [busy, setBusy] = useState(false)

  // Reset + Escape handling + focus on open.
  useEffect(() => {
    if (!open) return
    setTitle('')
    setDevices({ Desktop: false, Mobile: true, Tablet: true })
    setBusy(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => inputRef.current?.focus(), 40)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [open, onClose])

  const selectedDevices = DEVICE_OPTIONS.filter((d) => devices[d])
  const canCreate = title.trim().length > 0 && selectedDevices.length > 0 && !busy

  async function handleCreate() {
    if (title.trim().length === 0 || selectedDevices.length === 0 || busy) return
    setBusy(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast('Please sign in again', 'error')
        setBusy(false)
        return
      }

      const { data: project, error: pErr } = await supabase
        .from('projects')
        .insert({
          owner_id: user.id,
          title: title.trim(),
          source,
          devices: selectedDevices,
          status: 'draft',
        })
        .select()
        .single()
      if (pErr || !project) {
        toast('Could not create project', 'error')
        setBusy(false)
        return
      }

      const { error: fErr } = await supabase.from('folders').insert(
        FOLDER_DEFS.map((f) => ({
          project_id: project.id,
          name: f.name,
          kind: f.kind,
        })),
      )
      if (fErr) {
        toast('Could not create project', 'error')
        setBusy(false)
        return
      }

      const { error: rErr } = await supabase.from('reviews').insert(
        REVIEW_STAGES.map((stage) => ({
          project_id: project.id,
          stage,
          status: 'pending',
        })),
      )
      if (rErr) {
        toast('Could not create project', 'error')
        setBusy(false)
        return
      }

      toast('Project created', 'success')
      onClose()
      router.push(`/project/${project.id}`)
    } catch {
      toast('Could not create project', 'error')
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="w-[400px] max-w-full rounded-card bg-surface p-8 shadow-pop"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-ink">Create new project</h2>
          <button
            onClick={onClose}
            className="text-muted transition-colors hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mt-5 block text-sm font-medium text-ink">
          Project Title
        </label>
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Type here"
          className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />

        <p className="mt-5 text-sm font-semibold text-ink">Select Device</p>
        <div className="mt-2">
          {DEVICE_OPTIONS.map((d) => (
            <div key={d} className="flex h-11 items-center justify-between">
              <Checkbox
                checked={Boolean(devices[d])}
                onChange={(v) => setDevices((s) => ({ ...s, [d]: v }))}
                label={d}
              />
              <GripVertical size={16} className="text-muted" />
            </div>
          ))}
        </div>

        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className={`mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-700 ${
            !canCreate ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          {busy ? 'Creating...' : 'Create now'}
        </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default CreateProjectModal
