'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Download,
  ChevronDown,
  ChevronUp,
  FileCode,
  Braces,
  FileText,
  FileJson,
  Package,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { systemToCss } from '@/lib/exporters/css'
import { systemToTailwind } from '@/lib/exporters/tailwind'
import { systemToDtcg } from '@/lib/exporters/dtcg'
import { systemToRulesMd } from '@/lib/exporters/rules-md'
import FigmaMark from '@/components/FigmaMark'
import type { HorizonSystem } from '@/lib/types'

function slugify(s: string): string {
  return (
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'horizon'
  )
}

export function ExportMenu({
  system,
  projectId,
  versionId,
}: {
  system: HorizonSystem
  projectId?: string
  versionId?: string
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [kitting, setKitting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const slug = slugify(system.name)

  const copy = (text: string, label: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => toast(`${label} copied`, 'success'))
      .catch(() => toast('Copy failed', 'error'))
    setOpen(false)
  }

  const downloadText = (text: string, filename: string, mime: string) => {
    const blob = new Blob([text], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const downloadArchive = async (
    kind: 'code' | 'figma-kit',
    filename: string,
    setLoading: (b: boolean) => void,
    successMsg: string,
  ) => {
    if (!projectId) {
      toast('Publish or save a version first', 'info')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, versionId, kind }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast(data.error || 'Export failed', 'error')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast(successMsg, 'success')
      setOpen(false)
    } catch {
      toast('Export failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const downloadZip = () =>
    downloadArchive(
      'code',
      `${slug}-design-system.zip`,
      setZipping,
      'Downloaded design system',
    )
  const downloadFigmaKit = () =>
    downloadArchive(
      'figma-kit',
      `${slug}-figma-kit.zip`,
      setKitting,
      'Figma kit downloaded',
    )

  const Item = ({
    icon: Icon,
    label,
    onClick,
    disabled,
  }: {
    icon: typeof FileCode
    label: string
    onClick: () => void
    disabled?: boolean
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-body transition-colors hover:bg-page disabled:opacity-50"
    >
      <Icon size={16} className="shrink-0 text-muted" />
      {label}
    </button>
  )

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-full border border-brand px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-50"
      >
        <Download size={16} /> Export
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-30 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-pop">
          <Item
            icon={FileCode}
            label="Copy CSS Variables"
            onClick={() => copy(systemToCss(system), 'CSS variables')}
          />
          <Item
            icon={Braces}
            label="Copy Tailwind Config"
            onClick={() => copy(systemToTailwind(system), 'Tailwind config')}
          />
          <Item
            icon={FileText}
            label="Copy AI Rules (.md)"
            onClick={() => copy(systemToRulesMd(system), 'AI rules')}
          />
          <div className="my-1 border-t border-line" />
          <Item
            icon={FileJson}
            label="Download tokens.json"
            onClick={() =>
              downloadText(
                systemToDtcg(system),
                `${slug}.tokens.dtcg.json`,
                'application/json',
              )
            }
          />
          <Item
            icon={FileText}
            label="Download AI Rules file"
            onClick={() =>
              downloadText(
                systemToRulesMd(system),
                `${slug}-rules.md`,
                'text/markdown',
              )
            }
          />
          <button
            onClick={downloadFigmaKit}
            disabled={kitting}
            className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-page disabled:opacity-50"
          >
            <span className="mt-0.5 shrink-0">
              <FigmaMark size={16} />
            </span>
            <span>
              <span className="block text-sm text-body">
                {kitting ? 'Building…' : 'Download Figma Kit (.svg)'}
              </span>
              <span className="block text-[11px] text-muted">
                Editable layers, import by drag &amp; drop
              </span>
            </span>
          </button>
          <Item
            icon={Package}
            label={zipping ? 'Zipping…' : 'Download components (.zip)'}
            onClick={downloadZip}
            disabled={zipping}
          />
        </div>
      ) : null}
    </div>
  )
}

export default ExportMenu
