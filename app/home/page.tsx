'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bot } from 'lucide-react'
import Navbar from '@/components/Navbar'
import ImportFigmaModal from '@/components/ImportFigmaModal'
import FigmaMark from '@/components/FigmaMark'
import { AmbientBlobs } from '@/components/motion/AmbientBlobs'
import { Reveal } from '@/components/motion/Reveal'
import { useToast } from '@/components/Toast'
import { createClient } from '@/lib/supabase/client'
import type { ProjectSource } from '@/lib/types'

function SketchMark() {
  return (
    <svg viewBox="0 0 40 36" height={40} aria-hidden>
      <defs>
        <linearGradient id="sketchG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDB300" />
          <stop offset="1" stopColor="#F7A600" />
        </linearGradient>
      </defs>
      <polygon points="20,3 38,13 20,34 2,13" fill="url(#sketchG)" />
      <path d="M2 13h36L20 34z" fill="#EA6C00" opacity="0.55" />
      <path d="M20 3 8 13h24z" fill="#FDAD00" />
      <path d="M2 13 20 3 8 13z" fill="#FDD231" opacity="0.9" />
    </svg>
  )
}

function XdMark() {
  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{ width: 40, height: 40, background: '#470137' }}
      aria-hidden
    >
      <span className="text-sm font-bold" style={{ color: '#FF61F6' }}>
        Xd
      </span>
    </div>
  )
}

export default function HomePage() {
  const { toast } = useToast()
  const [selected, setSelected] = useState<ProjectSource | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [connectFirst, setConnectFirst] = useState(false)
  const [hasFigma, setHasFigma] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase
      .from('figma_connections')
      .select('figma_user_handle')
      .maybeSingle()
      .then(({ data }) => {
        if (active) setHasFigma(!!data)
      })
    return () => {
      active = false
    }
  }, [])

  const tools: { source: ProjectSource; mark: React.ReactNode; label: string }[] =
    [
      { source: 'figma', mark: <FigmaMark size={40} />, label: 'Figma' },
      { source: 'sketch', mark: <SketchMark />, label: 'Sketch' },
      { source: 'xd', mark: <XdMark />, label: 'Adobe XD' },
    ]

  const pick = (source: ProjectSource) => {
    if (source === 'figma') {
      setSelected('figma')
      if (hasFigma) setImportOpen(true)
      else setConnectFirst(true)
      return
    }
    toast('Sketch and Adobe XD support coming soon', 'info')
  }

  return (
    <div>
      <Navbar
        links={[
          { label: 'Product' },
          { label: 'Resources' },
          { label: 'Help?' },
        ]}
      />
      <main className="relative flex min-h-[calc(100vh-72px)] flex-col items-center justify-center overflow-hidden px-6">
        <AmbientBlobs />
        <div className="relative z-10 flex flex-col items-center">
          <Reveal delay={0.05}>
            <div className="flex items-center gap-8 rounded-full bg-surface px-10 py-6 shadow-pop">
              {tools.map((t) => (
                <button
                  key={t.source}
                  onClick={() => pick(t.source)}
                  aria-label={`Start with ${t.label}`}
                  className={`flex items-center justify-center rounded-full p-3 transition ${
                    selected === t.source ? 'ring-2 ring-brand' : 'hover:bg-page'
                  }`}
                >
                  {t.mark}
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="my-6 text-muted">Or</p>
          </Reveal>

          <Reveal delay={0.24}>
            <Link
              href="/generator"
              className="btn-gradient flex h-14 items-center gap-3 rounded-full px-8 font-semibold text-white"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                <Bot size={18} />
              </span>
              Try AI Design System
            </Link>
          </Reveal>

          <Reveal delay={0.34}>
            <p className="mt-6 text-center text-sm leading-relaxed text-muted">
              Import a Figma file, or generate a system with AI
              <br />
              or create a blank project from the top bar
            </p>
          </Reveal>
        </div>
      </main>

      <ImportFigmaModal open={importOpen} onClose={() => setImportOpen(false)} />

      {connectFirst ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={() => setConnectFirst(false)}
        >
          <div
            className="w-[380px] max-w-full rounded-card bg-surface p-8 text-center shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 flex justify-center">
              <FigmaMark size={32} />
            </div>
            <h2 className="text-lg font-bold text-ink">Connect Figma first</h2>
            <p className="mt-1 text-sm text-muted">
              Link your Figma account in Settings, then import any file.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConnectFirst(false)}
                className="h-11 flex-1 rounded-xl border border-line text-sm font-semibold text-muted hover:text-ink"
              >
                Cancel
              </button>
              <Link
                href="/settings"
                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-700"
              >
                Go to Settings
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
