'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Search,
  Bell,
  Moon,
  Sun,
  Plus,
  Menu as MenuIcon,
  Settings,
  LogOut,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { createClient } from '@/lib/supabase/client'
import CreateProjectModal from '@/components/CreateProjectModal'

export interface NavLink {
  label: string
  href?: string
}

const DEFAULT_LINKS: NavLink[] = [
  { label: 'Pricing' },
  { label: 'Shop', href: '/home#shop' },
  { label: 'Help?' },
]

function initialsFrom(name?: string | null): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const out = parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
  return out || 'U'
}

export default function Navbar({
  links = DEFAULT_LINKS,
  userName,
}: {
  links?: NavLink[]
  userName?: string | null
}) {
  const pathname = usePathname()
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [resolvedName, setResolvedName] = useState<string | null>(
    userName ?? null,
  )

  // Self-resolve the display name when a page did not pass one.
  useEffect(() => {
    if (userName !== undefined) {
      setResolvedName(userName)
      return
    }
    let active = true
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      const u = data.user
      if (u) {
        const meta = u.user_metadata as { full_name?: string } | undefined
        setResolvedName(meta?.full_name ?? u.email ?? null)
      }
    })
    return () => {
      active = false
    }
  }, [userName])

  // Theme toggle (mounted guard avoids a hydration icon mismatch).
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    setMounted(true)
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])
  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    const el = document.documentElement
    if (next) el.classList.add('dark')
    else el.classList.remove('dark')
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }

  const router = useRouter()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!avatarOpen) return
    const onClick = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node))
        setAvatarOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAvatarOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [avatarOpen])
  const signOut = async () => {
    setAvatarOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
    router.refresh()
  }

  const initials = initialsFrom(resolvedName)

  const renderLink = (l: NavLink) => {
    const active = Boolean(l.href) && pathname === l.href
    if (l.href) {
      return (
        <Link
          key={l.label}
          href={l.href}
          className={
            active
              ? 'text-sm font-semibold text-brand'
              : 'text-sm text-body transition-colors hover:text-ink'
          }
        >
          {l.label}
        </Link>
      )
    }
    return (
      <button
        key={l.label}
        onClick={() => {
          setMenuOpen(false)
          toast('Coming soon', 'info')
        }}
        className="text-sm text-body transition-colors hover:text-ink"
      >
        {l.label}
      </button>
    )
  }

  return (
    <header className="sticky top-0 z-40 h-[72px] border-b border-line bg-surface px-4 md:px-8">
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/home"
            className="text-xl font-extrabold tracking-wide text-ink"
          >
            HORIZON
          </Link>
          <button
            onClick={() => {
              setMenuOpen(false)
              setCreateOpen(true)
            }}
            className="hidden h-10 items-center gap-1.5 rounded-full border border-brand px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-50 sm:flex"
          >
            <Plus size={16} /> Create project
          </button>
        </div>

        <nav className="mx-auto hidden items-center gap-7 md:flex">
          {links.map(renderLink)}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative hidden lg:block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              placeholder="Search"
              className="h-10 w-56 rounded-full border-0 bg-field pl-9 pr-4 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <button
            onClick={() => toast('No new notifications', 'info')}
            className="text-muted transition-colors hover:text-ink"
            aria-label="Notifications"
          >
            <Bell size={20} />
          </button>
          <button
            onClick={toggleTheme}
            className="text-muted transition-colors hover:text-ink"
            aria-label="Toggle theme"
          >
            {mounted && isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="relative" ref={avatarRef}>
            <button
              onClick={() => setAvatarOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand"
              aria-label="Account menu"
            >
              {initials}
            </button>
            {avatarOpen ? (
              <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                <Link
                  href="/settings"
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-body transition-colors hover:bg-page"
                >
                  <Settings size={16} className="text-muted" /> Settings
                </Link>
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-body transition-colors hover:bg-page"
                >
                  <LogOut size={16} className="text-muted" /> Sign out
                </button>
              </div>
            ) : null}
          </div>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-ink md:hidden"
            aria-label="Open menu"
          >
            <MenuIcon size={20} />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="absolute left-0 right-0 top-[72px] border-b border-line bg-surface px-4 py-4 shadow-card md:hidden">
          <div className="flex flex-col gap-4">
            {links.map(renderLink)}
            <button
              onClick={() => {
                setMenuOpen(false)
                setCreateOpen(true)
              }}
              className="flex items-center gap-1.5 text-sm font-semibold text-brand"
            >
              <Plus size={16} /> Create project
            </button>
          </div>
        </div>
      ) : null}

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        source="ai"
      />
    </header>
  )
}
