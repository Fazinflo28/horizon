'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bot } from 'lucide-react'
import Navbar from '@/components/Navbar'
import CreateProjectModal from '@/components/CreateProjectModal'
import type { ProjectSource } from '@/lib/types'

function FigmaMark() {
  return (
    <svg viewBox="0 0 38 57" height={40} aria-hidden>
      <path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
      <path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" />
      <path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
      <path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" />
      <path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" />
    </svg>
  )
}

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

const TOOLS: { source: ProjectSource; mark: React.ReactNode; label: string }[] = [
  { source: 'figma', mark: <FigmaMark />, label: 'Figma' },
  { source: 'sketch', mark: <SketchMark />, label: 'Sketch' },
  { source: 'xd', mark: <XdMark />, label: 'Adobe XD' },
]

function DecorBlobs() {
  return (
    <>
      <div
        className="pointer-events-none absolute -left-10 bottom-10 h-[380px] w-[380px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, #DDE4FF 0%, rgba(221,228,255,0) 70%)',
          opacity: 0.6,
        }}
      />
      <div
        className="pointer-events-none absolute right-16 top-1/3 h-[300px] w-[300px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, #DDE4FF 0%, rgba(221,228,255,0) 70%)',
          opacity: 0.6,
        }}
      />
      <div
        className="pointer-events-none absolute -right-8 bottom-20 h-[340px] w-[340px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, #DDE4FF 0%, rgba(221,228,255,0) 70%)',
          opacity: 0.5,
        }}
      />
    </>
  )
}

export default function HomePage() {
  const [selected, setSelected] = useState<ProjectSource | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const pick = (s: ProjectSource) => {
    setSelected(s)
    setModalOpen(true)
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
        <DecorBlobs />
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-8 rounded-full bg-white px-10 py-6 shadow-pop">
            {TOOLS.map((t) => (
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

          <p className="my-6 text-muted">Or</p>

          <Link
            href="/generator"
            className="btn-gradient flex h-14 items-center gap-3 rounded-full px-8 font-semibold text-white"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <Bot size={18} />
            </span>
            Try AI Design System
          </Link>

          <p className="mt-6 text-center text-sm leading-relaxed text-muted">
            Start your project using one of the tools
            <br />
            or create project from main tab
          </p>
        </div>
      </main>

      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        source={selected ?? 'ai'}
      />
    </div>
  )
}
