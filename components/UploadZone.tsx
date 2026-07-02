'use client'

import { useRef, useState } from 'react'
import { CloudUpload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import { Spinner } from '@/components/Spinner'
import type { FileRow } from '@/lib/types'

const MAX_BYTES = 25 * 1024 * 1024

export function UploadZone({
  projectId,
  folderId,
  onUploaded,
}: {
  projectId: string
  folderId: string | null
  onUploaded: (rows: FileRow[]) => void
}) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    const all = Array.from(list)
    const ok = all.filter((f) => f.size <= MAX_BYTES)
    const tooBig = all.length - ok.length
    if (tooBig > 0) toast(`${tooBig} file(s) over 25MB were skipped`, 'error')
    if (ok.length === 0) {
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setBusy(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast('Please sign in again', 'error')
        return
      }

      const inserted: FileRow[] = []
      for (const file of ok) {
        const path = `${user.id}/${projectId}/${crypto.randomUUID()}-${file.name}`
        const { error: upErr } = await supabase.storage
          .from('uploads')
          .upload(path, file)
        if (upErr) {
          toast(`Upload failed: ${file.name}`, 'error')
          continue
        }
        const { data: row, error: insErr } = await supabase
          .from('files')
          .insert({
            project_id: projectId,
            folder_id: folderId,
            name: file.name,
            storage_path: path,
            size_bytes: file.size,
          })
          .select()
          .single()
        if (insErr || !row) {
          toast(`Could not save ${file.name}`, 'error')
          continue
        }
        inserted.push(row as FileRow)
      }

      if (inserted.length > 0) {
        onUploaded(inserted)
        toast(`${inserted.length} files uploaded`, 'success')
      }
    } catch {
      toast('Upload failed', 'error')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        handleFiles(e.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        drag ? 'border-brand bg-brand-50' : 'border-line hover:border-brand/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <CloudUpload size={22} className="mx-auto text-muted" />
      <p className="mt-2 text-xs text-muted">Drop files here or click to upload</p>
      {busy ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
          <Spinner size={20} className="text-brand" />
        </div>
      ) : null}
    </div>
  )
}

export default UploadZone
