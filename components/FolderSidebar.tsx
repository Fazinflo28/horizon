'use client'

import { useState } from 'react'
import { Folder as FolderIcon, Plus } from 'lucide-react'
import type { Folder, FileRow } from '@/lib/types'

export function FolderSidebar({
  folders,
  files,
  activeId,
  onSelect,
  onAddFolder,
  onRenameFolder,
  footer,
}: {
  folders: Folder[]
  files: FileRow[]
  activeId: string | null
  onSelect: (id: string) => void
  onAddFolder?: () => void
  onRenameFolder?: (id: string, name: string) => void
  footer?: React.ReactNode
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const countFor = (folderId: string) =>
    files.filter((f) => f.folder_id === folderId).length

  const startEdit = (f: Folder) => {
    if (!onRenameFolder) return
    setEditingId(f.id)
    setDraft(f.name)
  }

  const commit = (id: string) => {
    setEditingId(null)
    if (onRenameFolder) onRenameFolder(id, draft)
  }

  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <p className="mb-3 px-2 text-sm font-semibold text-ink">Folders</p>
      <ul className="space-y-1">
        {folders.map((f) => {
          const active = activeId === f.id
          const editing = editingId === f.id
          return (
            <li key={f.id}>
              {editing ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commit(f.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commit(f.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="h-9 w-full rounded-lg border border-brand px-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              ) : (
                <button
                  onClick={() => onSelect(f.id)}
                  onDoubleClick={() => startEdit(f)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-brand-50 font-medium text-brand'
                      : 'text-body hover:bg-page'
                  }`}
                >
                  <FolderIcon size={16} />
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto text-xs text-muted">
                    {countFor(f.id)}
                  </span>
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {onAddFolder ? (
        <button
          onClick={onAddFolder}
          className="mt-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-muted transition-colors hover:bg-page hover:text-ink"
        >
          <Plus size={16} /> Add
        </button>
      ) : null}

      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  )
}

export default FolderSidebar
