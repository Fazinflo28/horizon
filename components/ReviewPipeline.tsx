'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import type {
  Review,
  ReviewStage,
  ProjectStatus,
  ProjectVersion,
  HorizonSystem,
} from '@/lib/types'

const ORDER: ReviewStage[] = ['copy', 'tech', 'accessibility', 'design']
const LABEL: Record<ReviewStage, string> = {
  copy: 'Copy Review',
  tech: 'Tech Review',
  accessibility: 'Accessibility Review',
  design: 'Design Review',
}
const CHIP: Record<Review['status'], { cls: string; text: string }> = {
  pending: { cls: 'bg-field text-muted', text: 'Pending' },
  approved: { cls: 'bg-success/10 text-success', text: 'Approved' },
  rejected: { cls: 'bg-danger/10 text-danger', text: 'Rejected' },
}

export function ReviewPipeline({
  projectId,
  reviews,
  projectStatus,
  systemForPublish,
  versions,
  onReviewsChange,
  onStatusChange,
  onPublished,
}: {
  projectId: string
  reviews: Review[]
  projectStatus: ProjectStatus
  systemForPublish: HorizonSystem
  versions: ProjectVersion[]
  onReviewsChange: (next: Review[]) => void
  onStatusChange: (next: ProjectStatus) => void
  onPublished: (version: ProjectVersion) => void
}) {
  const { toast } = useToast()
  const [rejectingStage, setRejectingStage] = useState<ReviewStage | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [busy, setBusy] = useState(false)

  const byStage = (stage: ReviewStage) => reviews.find((r) => r.stage === stage)
  const terminal = projectStatus === 'rejected' || projectStatus === 'published'
  const activeIndex = terminal
    ? -1
    : ORDER.findIndex((s) => byStage(s)?.status !== 'approved')
  const allApproved = ORDER.every((s) => byStage(s)?.status === 'approved')
  const rejectedReview = reviews.find((r) => r.status === 'rejected')

  async function approve(stage: ReviewStage) {
    setBusy(true)
    try {
      const now = new Date().toISOString()
      const supabase = createClient()
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'approved', reviewed_at: now })
        .eq('project_id', projectId)
        .eq('stage', stage)
      if (error) {
        toast('Could not approve', 'error')
        return
      }
      let nextStatus = projectStatus
      if (projectStatus === 'draft') {
        const { error: e2 } = await supabase
          .from('projects')
          .update({ status: 'in_review' })
          .eq('id', projectId)
        if (!e2) nextStatus = 'in_review'
      }
      onReviewsChange(
        reviews.map((r) =>
          r.stage === stage
            ? { ...r, status: 'approved', reviewed_at: now }
            : r,
        ),
      )
      if (nextStatus !== projectStatus) onStatusChange(nextStatus)
    } finally {
      setBusy(false)
    }
  }

  async function reject(stage: ReviewStage) {
    setBusy(true)
    try {
      const note = rejectNote.trim() || null
      const supabase = createClient()
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'rejected', note })
        .eq('project_id', projectId)
        .eq('stage', stage)
      if (error) {
        toast('Could not reject', 'error')
        return
      }
      const { error: e2 } = await supabase
        .from('projects')
        .update({ status: 'rejected' })
        .eq('id', projectId)
      if (e2) {
        toast('Could not reject', 'error')
        return
      }
      onReviewsChange(
        reviews.map((r) =>
          r.stage === stage ? { ...r, status: 'rejected', note } : r,
        ),
      )
      onStatusChange('rejected')
      setRejectingStage(null)
      setRejectNote('')
    } finally {
      setBusy(false)
    }
  }

  async function restart() {
    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'pending', note: null, reviewed_at: null })
        .eq('project_id', projectId)
      if (error) {
        toast('Could not restart review', 'error')
        return
      }
      const { error: e2 } = await supabase
        .from('projects')
        .update({ status: 'draft' })
        .eq('id', projectId)
      if (e2) {
        toast('Could not restart review', 'error')
        return
      }
      onReviewsChange(
        reviews.map((r) => ({
          ...r,
          status: 'pending' as const,
          note: null,
          reviewed_at: null,
        })),
      )
      onStatusChange('draft')
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    setBusy(true)
    try {
      const supabase = createClient()
      const publishedNums = versions
        .filter((v) => v.version_number > 0)
        .map((v) => v.version_number)
      const nextN = (publishedNums.length ? Math.max(...publishedNums) : 0) + 1
      const label = `V.0${nextN}`
      const { data, error } = await supabase
        .from('project_versions')
        .insert({
          project_id: projectId,
          version_number: nextN,
          label,
          system_json: systemForPublish,
        })
        .select()
        .single()
      if (error || !data) {
        toast('Could not publish', 'error')
        return
      }
      const { error: e2 } = await supabase
        .from('projects')
        .update({ status: 'published' })
        .eq('id', projectId)
      if (e2) {
        toast('Could not publish', 'error')
        return
      }
      onPublished(data as ProjectVersion)
      onStatusChange('published')
      toast(`Published ${label}`, 'success')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <p className="mb-4 text-sm font-semibold text-ink">Review Pipeline</p>

      {projectStatus === 'rejected' ? (
        <div className="mb-4 rounded-xl bg-danger/10 p-4">
          <p className="text-sm font-medium text-danger">
            Design file is not aligned with the components. Admins cannot save
            this file in the system.
          </p>
          {rejectedReview?.note ? (
            <p className="mt-2 text-xs text-danger/80">
              Note: {rejectedReview.note}
            </p>
          ) : null}
          <button
            onClick={restart}
            disabled={busy}
            className="mt-3 h-9 rounded-full border border-danger px-4 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
          >
            Restart Review
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        {ORDER.map((stage, i) => {
          const review = byStage(stage)
          const status = review?.status ?? 'pending'
          const isActive = i === activeIndex
          const locked = activeIndex !== -1 && i > activeIndex
          return (
            <div
              key={stage}
              className={`rounded-xl border border-line p-4 ${
                locked ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">
                  {LABEL[stage]}
                </span>
                <div className="flex items-center gap-2">
                  {locked ? <Lock size={14} className="text-muted" /> : null}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${CHIP[status].cls}`}
                  >
                    {CHIP[status].text}
                  </span>
                </div>
              </div>

              {isActive ? (
                rejectingStage === stage ? (
                  <div className="mt-3">
                    <textarea
                      autoFocus
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Reason (optional)"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-line p-2 text-xs text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => reject(stage)}
                        disabled={busy}
                        className="h-9 flex-1 rounded-lg bg-danger text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Confirm reject
                      </button>
                      <button
                        onClick={() => {
                          setRejectingStage(null)
                          setRejectNote('')
                        }}
                        className="h-9 rounded-lg border border-line px-3 text-xs font-semibold text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => approve(stage)}
                      disabled={busy}
                      className="h-9 flex-1 rounded-lg bg-brand text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectingStage(stage)}
                      disabled={busy}
                      className="h-9 flex-1 rounded-lg border border-danger text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )
              ) : null}
            </div>
          )
        })}
      </div>

      <button
        onClick={publish}
        disabled={!allApproved || busy || projectStatus === 'published'}
        className={`btn-gradient mt-4 flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white ${
          !allApproved || projectStatus === 'published'
            ? 'pointer-events-none opacity-40'
            : ''
        }`}
      >
        Save &amp; Publish
      </button>
    </div>
  )
}

export default ReviewPipeline
