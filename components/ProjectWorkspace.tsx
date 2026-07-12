'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  DownloadCloud,
  Sparkles,
  Download,
  Trash2,
  FileText,
  Clipboard,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import FolderSidebar from '@/components/FolderSidebar'
import UploadZone from '@/components/UploadZone'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import SystemCanvas from '@/components/SystemCanvas'
import ReviewPipeline from '@/components/ReviewPipeline'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import { systemToCss } from '@/lib/css-export'
import type {
  Project,
  Folder,
  FileRow,
  Review,
  ProjectVersion,
  ProjectStatus,
  HorizonSystem,
  PreviewEntry,
} from '@/lib/types'

type Tab = 'design' | 'assets' | 'documentation'

const UPLOAD_SOURCES = ['figma', 'sketch', 'xd']

function formatBytes(n: number): string {
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

// Minimal valid system used when publishing an upload-path project that has
// no AI-generated draft (project_versions.system_json is NOT NULL).
function buildFallbackSystem(title: string): HorizonSystem {
  const ramp = (base: string): HorizonSystem['colors']['primary'] => ({
    '50': '#EEF2FF',
    '100': '#E0E7FF',
    '200': '#C7D2FE',
    '300': '#A5B4FC',
    '400': '#818CF8',
    '500': base,
    '600': '#4F46E5',
    '700': '#4338CA',
    '800': '#3730A3',
    '900': '#312E81',
  })
  const neutral: HorizonSystem['colors']['neutral'] = {
    '50': '#F9FAFB',
    '100': '#F3F4F6',
    '200': '#E5E7EB',
    '300': '#D1D5DB',
    '400': '#9CA3AF',
    '500': '#6B7280',
    '600': '#4B5563',
    '700': '#374151',
    '800': '#1F2937',
    '900': '#111827',
  }
  return {
    name: title,
    description: 'Published from an uploaded design file.',
    colors: {
      primary: ramp('#6366F1'),
      secondary: ramp('#8B5CF6'),
      neutral,
      semantic: {
        success: '#05CD99',
        warning: '#FFB547',
        error: '#EE5D50',
        info: '#4F46E5',
      },
    },
    typography: {
      fontFamily: 'Plus Jakarta Sans',
      scale: [
        { name: 'Display', size: '40px', lineHeight: '48px', weight: 800, usage: 'Headlines' },
        { name: 'Title', size: '20px', lineHeight: '28px', weight: 700, usage: 'Titles' },
        { name: 'Body', size: '16px', lineHeight: '24px', weight: 400, usage: 'Body' },
      ],
    },
    spacing: { base: 4, scale: [4, 8, 12, 16, 24, 32, 48, 64] },
    radius: { sm: '6px', md: '10px', lg: '16px', full: '9999px' },
    shadows: [{ name: 'md', value: '0 4px 12px rgba(16,24,40,0.1)' }],
    components: [],
    documentation: [
      { section: 'Overview', content: 'Published from an uploaded file.' },
    ],
  }
}

export default function ProjectWorkspace({
  project: initialProject,
  initialFolders,
  initialFiles,
  initialReviews,
  initialVersions,
  userName,
}: {
  project: Project
  initialFolders: Folder[]
  initialFiles: FileRow[]
  initialReviews: Review[]
  initialVersions: ProjectVersion[]
  userName: string | null
}) {
  const router = useRouter()
  const { toast } = useToast()

  const [project, setProject] = useState(initialProject)
  const [folders, setFolders] = useState(initialFolders)
  const [files, setFiles] = useState(initialFiles)
  const [reviews, setReviews] = useState(initialReviews)
  const [versions, setVersions] = useState(initialVersions)

  const [activeFolderId, setActiveFolderId] = useState<string | null>(
    initialFolders[0]?.id ?? null,
  )
  const [activeTab, setActiveTab] = useState<Tab>('design')
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    initialVersions[0]?.id ?? null,
  )
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(initialProject.title)

  const currentVersion =
    versions.find((v) => v.id === selectedVersionId) ?? versions[0] ?? null
  const currentSystem = currentVersion?.system_json ?? null
  const draftVersion = versions.find((v) => v.version_number === 0)
  const draftSystem = draftVersion?.system_json ?? null
  const draftPreviewMap = draftVersion?.preview_map ?? null
  const isUploadSource = UPLOAD_SOURCES.includes(project.source)
  const systemForPublish =
    draftSystem ?? currentSystem ?? buildFallbackSystem(project.title)

  function onResynced(res: {
    system: HorizonSystem
    previews: Record<string, PreviewEntry> | null
  }) {
    const draftId = versions.find((v) => v.version_number === 0)?.id
    setVersions((prev) =>
      prev.map((v) =>
        v.version_number === 0
          ? { ...v, system_json: res.system, preview_map: res.previews }
          : v,
      ),
    )
    setReviews((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'pending' as const,
        note: null,
        reviewed_at: null,
      })),
    )
    setProject((p) => ({ ...p, status: 'draft' }))
    if (draftId) setSelectedVersionId(draftId)
  }

  const versionOptions =
    versions.length > 0
      ? versions.map((v) => ({ id: v.id, label: v.label }))
      : [{ id: 'none', label: 'Draft' }]

  // -- title -----------------------------------------------------------------
  async function saveTitle() {
    setEditingTitle(false)
    const next = titleDraft.trim()
    if (!next || next === project.title) {
      setTitleDraft(project.title)
      return
    }
    const previous = project.title
    setProject((p) => ({ ...p, title: next }))
    const supabase = createClient()
    const { error } = await supabase
      .from('projects')
      .update({ title: next })
      .eq('id', project.id)
    if (error) {
      setProject((p) => ({ ...p, title: previous }))
      setTitleDraft(previous)
      toast('Could not rename project', 'error')
    }
  }

  // -- folders ---------------------------------------------------------------
  async function addFolder() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('folders')
      .insert({ project_id: project.id, name: 'New Folder', kind: 'assets' })
      .select()
      .single()
    if (error || !data) {
      toast('Could not add folder', 'error')
      return
    }
    setFolders((prev) => [...prev, data as Folder])
    setActiveFolderId(data.id)
  }

  async function renameFolder(id: string, name: string) {
    const trimmed = name.trim() || 'Untitled'
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)),
    )
    const supabase = createClient()
    const { error } = await supabase
      .from('folders')
      .update({ name: trimmed })
      .eq('id', id)
    if (error) toast('Could not rename folder', 'error')
  }

  // -- files -----------------------------------------------------------------
  function onUploaded(rows: FileRow[]) {
    setFiles((prev) => [...prev, ...rows])
    setActiveTab('assets')
  }

  async function download(file: FileRow) {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('uploads')
      .createSignedUrl(file.storage_path, 60)
    if (error || !data) {
      toast('Could not create download link', 'error')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function removeFile(file: FileRow) {
    if (!window.confirm(`Delete ${file.name}?`)) return
    const supabase = createClient()
    await supabase.storage.from('uploads').remove([file.storage_path])
    const { error } = await supabase.from('files').delete().eq('id', file.id)
    if (error) {
      toast('Could not delete file', 'error')
      return
    }
    setFiles((prev) => prev.filter((f) => f.id !== file.id))
    toast('File deleted', 'info')
  }

  // -- version publish -------------------------------------------------------
  function onPublished(version: ProjectVersion) {
    setVersions((prev) =>
      [version, ...prev].sort((a, b) => b.version_number - a.version_number),
    )
    setSelectedVersionId(version.id)
  }

  function copyCss() {
    if (!currentSystem) return
    navigator.clipboard
      ?.writeText(systemToCss(currentSystem))
      .then(() => toast('Copied', 'success'))
      .catch(() => {})
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'design', label: 'Design' },
    { key: 'assets', label: 'Assets' },
    { key: 'documentation', label: 'Documentation' },
  ]

  return (
    <div>
      <Navbar userName={userName} />

      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 py-5">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-surface"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>

          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') {
                  setTitleDraft(project.title)
                  setEditingTitle(false)
                }
              }}
              className="h-10 rounded-lg border border-line px-3 text-2xl font-bold text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          ) : (
            <h1
              onDoubleClick={() => {
                setTitleDraft(project.title)
                setEditingTitle(true)
              }}
              title="Double-click to rename"
              className="cursor-text text-2xl font-bold text-ink"
            >
              {project.title}
            </h1>
          )}

          <StatusBadge status={project.status} />

          <select
            value={selectedVersionId ?? 'none'}
            onChange={(e) => {
              if (e.target.value !== 'none') setSelectedVersionId(e.target.value)
            }}
            className="h-9 rounded-full border border-line bg-surface px-4 text-sm text-body focus:border-brand focus:outline-none"
          >
            {versionOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>

          {!draftSystem ? (
            <Link
              href="/home"
              className="btn-gradient ml-auto flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white"
            >
              <Sparkles size={16} /> Generate AI
            </Link>
          ) : null}
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-1 gap-6 pb-16 lg:grid-cols-[260px_1fr_320px]">
          {/* Left: folders + upload */}
          <FolderSidebar
            folders={folders}
            files={files}
            activeId={activeFolderId}
            onSelect={setActiveFolderId}
            onAddFolder={addFolder}
            onRenameFolder={renameFolder}
            footer={
              <UploadZone
                projectId={project.id}
                folderId={activeFolderId}
                onUploaded={onUploaded}
              />
            }
          />

          {/* Main */}
          <div className="min-w-0">
            <div className="mb-5 flex gap-6 border-b border-line">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
                    activeTab === t.key
                      ? 'border-brand text-brand'
                      : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeTab === 'design' ? (
              currentSystem ? (
                <SystemCanvas
                  system={currentSystem}
                  versionLabel={currentVersion?.label ?? 'Draft'}
                  projectId={project.id}
                  versionId={currentVersion?.id}
                  previews={currentVersion?.preview_map ?? null}
                  onResynced={onResynced}
                />
              ) : (
                <div className="rounded-card bg-surface shadow-card">
                  {isUploadSource ? (
                    <EmptyState
                      icon={DownloadCloud}
                      title="No file uploaded"
                      subtitle="Upload your design file from the sidebar to get started"
                    />
                  ) : (
                    <EmptyState
                      icon={Sparkles}
                      title="No system yet"
                      subtitle="Generate a design system to see it rendered here"
                      action={
                        <Link
                          href="/home"
                          className="btn-gradient inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white"
                        >
                          <Sparkles size={16} /> Generate AI
                        </Link>
                      }
                    />
                  )}
                </div>
              )
            ) : null}

            {activeTab === 'assets' ? (
              files.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-card bg-surface p-4 shadow-card"
                    >
                      <div className="flex items-start justify-between">
                        <FileText size={22} className="text-brand" />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => download(file)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-page hover:text-ink"
                            aria-label="Download"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => removeFile(file)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                            aria-label="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 truncate text-sm font-medium text-ink">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted">
                        {formatBytes(file.size_bytes)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-card bg-surface shadow-card">
                  <EmptyState
                    icon={FileText}
                    title="No assets yet"
                    subtitle="Upload files from the sidebar to see them here"
                  />
                </div>
              )
            ) : null}

            {activeTab === 'documentation' ? (
              currentSystem ? (
                <div className="space-y-6">
                  <div className="space-y-5 rounded-card bg-surface p-6 shadow-card">
                    {(currentSystem.documentation ?? []).map((d, i) => (
                      <div key={i}>
                        <h3 className="text-base font-semibold text-ink">
                          {d.section}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-body">
                          {d.content}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-ink">
                        Design Tokens as CSS
                      </h3>
                      <button
                        onClick={copyCss}
                        className="flex h-9 items-center gap-1.5 rounded-full border border-brand px-4 text-xs font-semibold text-brand hover:bg-brand-50"
                      >
                        <Clipboard size={14} /> Copy
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded-xl bg-[#0F172A] p-5 font-mono text-xs leading-relaxed text-white/90 thin-scroll">
                      {systemToCss(currentSystem)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="rounded-card bg-surface shadow-card">
                  <EmptyState
                    icon={FileText}
                    title="No documentation yet"
                    subtitle="Generate or publish a system to see its documentation"
                  />
                </div>
              )
            ) : null}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right rail */}
          <ReviewPipeline
            projectId={project.id}
            source={project.source}
            reviews={reviews}
            projectStatus={project.status}
            systemForPublish={systemForPublish}
            draftPreviewMap={draftPreviewMap}
            versions={versions}
            onReviewsChange={setReviews}
            onStatusChange={(status: ProjectStatus) =>
              setProject((p) => ({ ...p, status }))
            }
            onPublished={onPublished}
          />
        </div>
      </div>
    </div>
  )
}
