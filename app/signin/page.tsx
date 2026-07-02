'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import { Checkbox } from '@/components/Checkbox'
import { BrandPanel } from '@/components/BrandPanel'
import { Spinner } from '@/components/Spinner'
import { Reveal } from '@/components/motion/Reveal'

type Mode = 'signin' | 'signup'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  )
}

export default function SignInPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [mode, setMode] = useState<Mode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keep, setKeep] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    fullName?: string
    email?: string
    password?: string
  }>({})

  const isSignup = mode === 'signup'

  function validate(): boolean {
    const next: typeof errors = {}
    if (isSignup && !fullName.trim()) next.fullName = 'Please enter your name'
    if (!EMAIL_RE.test(email)) next.email = 'Enter a valid email address'
    if (password.length < 8) next.password = 'Password must be at least 8 characters'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const supabase = createClient()
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        })
        if (error) {
          toast(error.message, 'error')
          return
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          toast(error.message, 'error')
          return
        }
      }
      router.push('/home')
      router.refresh()
    } catch {
      toast('Something went wrong. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${location.origin}/home` },
      })
      if (error) toast('Google sign-in not configured yet, use email', 'error')
    } catch {
      toast('Google sign-in not configured yet, use email', 'error')
    }
  }

  const footerLinks = (
    <div className="flex items-center justify-center gap-8 text-xs text-white/70">
      {['Platform', 'License', 'Terms of Use', 'Blog'].map((l) => (
        <button
          key={l}
          onClick={() => toast('Coming soon', 'info')}
          className="transition-colors hover:text-white"
        >
          {l}
        </button>
      ))}
    </div>
  )

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col px-6 py-10">
        <div className="flex flex-1 items-center justify-center">
          <Reveal className="w-full max-w-[420px]">
            <h1 className="text-4xl font-bold text-ink">
              {isSignup ? 'Create Account' : 'Sign In'}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {isSignup
                ? 'Enter your details to get started!'
                : 'Enter your email and password to sign in!'}
            </p>

            <button
              onClick={handleGoogle}
              className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-field text-sm font-medium text-ink transition-colors hover:bg-line/60"
            >
              <GoogleG />
              Sign in with Google
            </button>

            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-line" />
              <span className="text-sm text-muted">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {isSignup ? (
                <div>
                  <label className="text-sm font-medium text-ink">
                    Full Name<span className="text-brand">*</span>
                  </label>
                  <input
                    autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  {errors.fullName ? (
                    <p className="mt-1 text-xs text-danger">{errors.fullName}</p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="text-sm font-medium text-ink">
                  Email<span className="text-brand">*</span>
                </label>
                <input
                  autoFocus={!isSignup}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mail@company.com"
                  className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                {errors.email ? (
                  <p className="mt-1 text-xs text-danger">{errors.email}</p>
                ) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-ink">
                  Password<span className="text-brand">*</span>
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="h-11 w-full rounded-xl border border-line px-4 pr-11 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="mt-1 text-xs text-danger">{errors.password}</p>
                ) : null}
              </div>

              <div className="flex items-center justify-between">
                <Checkbox
                  checked={keep}
                  onChange={setKeep}
                  label="Keep me logged in"
                />
                <button
                  type="button"
                  onClick={() => toast('Reset flow not in this prototype', 'info')}
                  className="text-sm text-brand hover:underline"
                >
                  Forget password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition ${
                  loading ? 'pointer-events-none opacity-70' : 'hover:bg-brand-700'
                }`}
              >
                {loading ? (
                  <>
                    <Spinner size={16} className="text-white" />
                    {isSignup ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : isSignup ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <p className="mt-6 text-sm text-muted">
              {isSignup ? 'Already have an account? ' : 'Not registered yet? '}
              <button
                onClick={() => {
                  setMode(isSignup ? 'signin' : 'signup')
                  setErrors({})
                }}
                className="font-semibold text-brand hover:underline"
              >
                {isSignup ? 'Sign In' : 'Create an Account'}
              </button>
            </p>
          </Reveal>
        </div>

        <p className="pt-8 text-center text-xs text-muted">
          © 2026 Horizon. All Rights Reserved. Made with Intelligence
        </p>
      </div>

      {/* Right: brand panel */}
      <BrandPanel className="hidden lg:block" footer={footerLinks} />
    </div>
  )
}
