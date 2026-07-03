'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { Spinner } from '@/components/Spinner'
import FigmaMark from '@/components/FigmaMark'

export function FigmaConnectCard({
  initialHandle,
  initialImg,
}: {
  initialHandle: string | null
  initialImg: string | null
}) {
  const { toast } = useToast()
  const [handle, setHandle] = useState(initialHandle)
  const [img, setImg] = useState(initialImg)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)

  async function connect() {
    if (!token.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/figma/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        handle?: string
        img?: string
        error?: string
      }
      if (!res.ok || !data.handle) {
        toast(data.error || 'Could not connect', 'error')
        return
      }
      setHandle(data.handle)
      setImg(data.img ?? null)
      setToken('')
      toast(`Connected as ${data.handle}`, 'success')
    } catch {
      toast('Network error, please try again', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect your Figma account?')) return
    setBusy(true)
    try {
      const res = await fetch('/api/figma/connect', { method: 'DELETE' })
      if (!res.ok) {
        toast('Could not disconnect', 'error')
        return
      }
      setHandle(null)
      setImg(null)
      toast('Figma disconnected', 'info')
    } catch {
      toast('Network error, please try again', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (handle) {
    return (
      <div className="rounded-card bg-surface p-8 shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className="h-10 w-10 rounded-full" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-brand-100" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">Connected as {handle}</p>
            <p className="text-sm text-muted">
              You can now import Figma files into projects
            </p>
          </div>
          <button
            onClick={disconnect}
            disabled={busy}
            className="h-10 rounded-full border border-danger px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-card bg-surface p-8 shadow-card">
      <div className="flex items-start gap-3">
        <FigmaMark size={32} />
        <div>
          <h3 className="font-semibold text-ink">Connect Figma</h3>
          <p className="mt-1 text-sm text-muted">
            Paste a personal access token to import your design files. Create one
            in Figma under Settings, Security, Personal access tokens (read scope
            is enough).
          </p>
          <a
            href="https://www.figma.com/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-brand hover:underline"
          >
            Open Figma settings <ExternalLink size={13} />
          </a>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="figd_..."
          className="h-11 flex-1 rounded-xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          onClick={connect}
          disabled={!token.trim() || busy}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
        >
          {busy ? (
            <>
              <Spinner size={16} className="text-white" /> Validating...
            </>
          ) : (
            'Connect'
          )}
        </button>
      </div>
    </div>
  )
}

export default FigmaConnectCard
