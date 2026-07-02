import type { ComponentSpec, HorizonSystem } from '@/lib/types'

export interface GeneratedFile {
  filename: string
  code: string
}

function pascal(type: string): string {
  return type
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('')
}
function normalize(type: string): string {
  return type.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// ---- Real templates (CSS-variable bound, never hardcoded hex) --------------

const button = (n: string) => `import * as React from 'react'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ${n}Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[var(--color-bg-brand)] text-[var(--color-text-on-brand)] hover:bg-[var(--color-bg-brand-hover)]',
  secondary: 'bg-[var(--color-primary-50)] text-[var(--color-text-brand)] hover:bg-[var(--color-primary-100)]',
  tertiary: 'bg-transparent text-[var(--color-text-brand)] hover:bg-[var(--color-primary-50)]',
  ghost: 'bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-primary-50)]',
  danger: 'bg-[var(--color-error)] text-white hover:brightness-95',
}
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-10 px-6 text-sm',
  lg: 'h-11 px-8 text-base',
}

export function ${n}({ variant = 'primary', size = 'md', loading = false, disabled, children, className = '', ...props }: ${n}Props) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-md)] transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-border-focus)]',
        'disabled:opacity-40 disabled:pointer-events-none',
        VARIANTS[variant], SIZES[size], className,
      ].join(' ')}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  )
}

export default ${n}
`

const textfield = (n: string) => `import * as React from 'react'

export interface ${n}Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  helperText?: string
  error?: string
}

export function ${n}({ label, helperText, error, id, className = '', ...props }: ${n}Props) {
  const inputId = id || React.useId()
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={!!error}
        className={[
          'h-11 w-full rounded-[var(--radius-md)] px-4 text-base bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]',
          'border outline-none transition-colors placeholder:text-[var(--color-text-muted)]',
          error
            ? 'border-[var(--color-error)] focus:ring-2 focus:ring-[var(--color-error)]'
            : 'border-[var(--color-border)] focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-border-focus)]',
          className,
        ].join(' ')}
        {...props}
      />
      {(error || helperText) && (
        <p className={error ? 'text-xs text-[var(--color-error)]' : 'text-xs text-[var(--color-text-muted)]'}>
          {error || helperText}
        </p>
      )}
    </div>
  )
}

export default ${n}
`

const checkbox = (n: string) => `import * as React from 'react'

export interface ${n}Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export function ${n}({ label, id, className = '', ...props }: ${n}Props) {
  const inputId = id || React.useId()
  return (
    <label htmlFor={inputId} className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <input
        id={inputId}
        type="checkbox"
        className={[
          'peer h-[18px] w-[18px] appearance-none rounded-[4px] border-2 border-[var(--color-border)] bg-[var(--color-bg-surface)]',
          'checked:bg-[var(--color-bg-brand)] checked:border-[var(--color-bg-brand)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
          className,
        ].join(' ')}
        {...props}
      />
      {label && <span className="text-sm text-[var(--color-text-primary)]">{label}</span>}
    </label>
  )
}

export default ${n}
`

const radiobutton = (n: string) => `import * as React from 'react'

export interface ${n}Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export function ${n}({ label, id, className = '', ...props }: ${n}Props) {
  const inputId = id || React.useId()
  return (
    <label htmlFor={inputId} className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <input
        id={inputId}
        type="radio"
        className={[
          'peer h-[18px] w-[18px] appearance-none rounded-full border-2 border-[var(--color-border)] bg-[var(--color-bg-surface)]',
          'checked:border-[var(--color-bg-brand)] checked:border-[6px]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
          className,
        ].join(' ')}
        {...props}
      />
      {label && <span className="text-sm text-[var(--color-text-primary)]">{label}</span>}
    </label>
  )
}

export default ${n}
`

const togglebutton = (n: string) => `import * as React from 'react'

export interface ${n}Option { label: string; value: string }
export interface ${n}Props {
  options: ${n}Option[]
  value: string
  onChange: (value: string) => void
}

export function ${n}({ options, value, onChange }: ${n}Props) {
  return (
    <div className="inline-flex overflow-hidden rounded-[var(--radius-full)] border border-[var(--color-border)]">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-[var(--color-bg-brand)] text-[var(--color-text-on-brand)]'
                : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-50)]',
            ].join(' ')}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default ${n}
`

const tabs = (n: string) => `import * as React from 'react'

export interface ${n}Item { label: string; value: string }
export interface ${n}Props {
  items: ${n}Item[]
  value: string
  onChange: (value: string) => void
}

export function ${n}({ items, value, onChange }: ${n}Props) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-[var(--color-border)]">
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={[
              '-mb-px border-b-2 pb-3 text-sm font-medium transition-colors',
              active
                ? 'border-[var(--color-text-brand)] text-[var(--color-text-brand)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export default ${n}
`

const card = (n: string) => `import * as React from 'react'

export interface ${n}Props extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outlined' | 'filled'
}

export function ${n}({ variant = 'elevated', className = '', children, ...props }: ${n}Props) {
  const variants = {
    elevated: 'bg-[var(--color-bg-surface)] shadow-[var(--shadow-md)]',
    outlined: 'bg-[var(--color-bg-surface)] border border-[var(--color-border)]',
    filled: 'bg-[var(--color-bg-page)]',
  }
  return (
    <div className={['rounded-[var(--radius-lg)] p-6 text-[var(--color-text-primary)]', variants[variant], className].join(' ')} {...props}>
      {children}
    </div>
  )
}

export default ${n}
`

const badge = (n: string) => `import * as React from 'react'

type Tone = 'brand' | 'neutral' | 'success' | 'warning' | 'error'
export interface ${n}Props extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

const TONES: Record<Tone, string> = {
  brand: 'bg-[var(--color-primary-50)] text-[var(--color-text-brand)]',
  neutral: 'bg-[var(--color-bg-page)] text-[var(--color-text-secondary)]',
  success: 'text-white bg-[var(--color-success)]',
  warning: 'text-white bg-[var(--color-warning)]',
  error: 'text-white bg-[var(--color-error)]',
}

export function ${n}({ tone = 'brand', className = '', children, ...props }: ${n}Props) {
  return (
    <span className={['inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-semibold', TONES[tone], className].join(' ')} {...props}>
      {children}
    </span>
  )
}

export default ${n}
`

const chip = (n: string) => `import * as React from 'react'

export interface ${n}Props extends React.HTMLAttributes<HTMLSpanElement> {
  selected?: boolean
  onRemove?: () => void
}

export function ${n}({ selected = false, onRemove, className = '', children, ...props }: ${n}Props) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-3 py-1.5 text-xs font-medium border transition-colors',
        selected
          ? 'bg-[var(--color-bg-brand)] text-[var(--color-text-on-brand)] border-transparent'
          : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove" className="opacity-70 hover:opacity-100">×</button>
      )}
    </span>
  )
}

export default ${n}
`

const alert = (n: string) => `import * as React from 'react'

type Tone = 'info' | 'success' | 'warning' | 'error'
export interface ${n}Props extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone
  title?: string
}

const ACCENT: Record<Tone, string> = {
  info: 'var(--color-info)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
}

export function ${n}({ tone = 'info', title, className = '', children, ...props }: ${n}Props) {
  return (
    <div
      role="alert"
      className={['flex gap-3 rounded-[var(--radius-md)] border p-4 bg-[var(--color-bg-surface)]', className].join(' ')}
      style={{ borderColor: ACCENT[tone] }}
      {...props}
    >
      <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ACCENT[tone] }} />
      <div>
        {title && <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>}
        <div className="text-sm text-[var(--color-text-secondary)]">{children}</div>
      </div>
    </div>
  )
}

export default ${n}
`

const toast = (n: string) => `import * as React from 'react'

export interface ${n}Props extends React.HTMLAttributes<HTMLDivElement> {
  message: string
}

export function ${n}({ message, className = '', ...props }: ${n}Props) {
  return (
    <div
      role="status"
      className={['inline-flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 shadow-[var(--shadow-lg)] bg-[var(--color-text-primary)] text-[var(--color-bg-surface)] text-sm', className].join(' ')}
      {...props}
    >
      {message}
    </div>
  )
}

export default ${n}
`

const dialog = (n: string) => `import * as React from 'react'

export interface ${n}Props {
  open: boolean
  title: string
  onClose: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
}

export function ${n}({ open, title, onClose, children, footer }: ${n}Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] p-6 shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h2>
        <div className="mt-2 text-sm text-[var(--color-text-secondary)]">{children}</div>
        <div className="mt-5 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  )
}

export default ${n}
`

const progressbar = (n: string) => `import * as React from 'react'

export interface ${n}Props {
  value: number
  max?: number
}

export function ${n}({ value, max = 100 }: ${n}Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="h-2 w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-border)]" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className="h-full rounded-[var(--radius-full)] bg-[var(--color-bg-brand)] transition-[width]" style={{ width: pct + '%' }} />
    </div>
  )
}

export default ${n}
`

const breadcrumb = (n: string) => `import * as React from 'react'

export interface ${n}Item { label: string; href?: string }
export interface ${n}Props {
  items: ${n}Item[]
}

export function ${n}({ items }: ${n}Props) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <React.Fragment key={i}>
            {last ? (
              <span aria-current="page" className="font-semibold text-[var(--color-text-brand)]">{item.label}</span>
            ) : (
              <a href={item.href} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">{item.label}</a>
            )}
            {!last && <span className="text-[var(--color-text-muted)]">/</span>}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export default ${n}
`

const dropdownselect = (n: string) => `import * as React from 'react'

export interface ${n}Option { label: string; value: string }
export interface ${n}Props {
  label?: string
  options: ${n}Option[]
  value: string
  onChange: (value: string) => void
}

export function ${n}({ label, options, value, onChange }: ${n}Props) {
  const id = React.useId()
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 text-base text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-border-focus)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export default ${n}
`

const TEMPLATES: Record<string, (n: string) => string> = {
  button,
  textfield,
  checkbox,
  radiobutton,
  togglebutton,
  tabs,
  card,
  badge,
  chip,
  alert,
  toast,
  dialog,
  progressbar,
  breadcrumb,
  dropdownselect,
}

function stub(component: ComponentSpec, n: string): string {
  return `import * as React from 'react'

/**
 * ${component.type} — spec stub generated by Horizon.
 * Variants: ${component.variants.join(', ')}
 * States: ${component.states.join(', ')}
 * Specs: height ${component.specs.height}, paddingX ${component.specs.paddingX}, radius ${component.specs.radius}, fontSize ${component.specs.fontSize}
 * Guideline: ${(component.guidelines || '').replace(/\n/g, ' ')}
 *
 * Build it using the CSS variables in tokens/variables.css, e.g.
 * bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] rounded-[var(--radius-md)].
 */
export interface ${n}Props extends React.HTMLAttributes<HTMLDivElement> {}

export function ${n}({ className = '', children, ...props }: ${n}Props) {
  return (
    <div
      className={['rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 text-[var(--color-text-primary)]', className].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

export default ${n}
`
}

export function generateComponentCode(
  component: ComponentSpec,
  system: HorizonSystem,
): GeneratedFile {
  const name = pascal(component.type) || 'Component'
  const template = TEMPLATES[normalize(component.type)]
  const banner = `// ${name} — part of the ${system.name} design system, generated by Horizon.\n// Styling references the CSS variables in tokens/variables.css.\n\n`
  const code = template ? template(name) : stub(component, name)
  return { filename: `${name}.tsx`, code: banner + code }
}

export function generateIndexFile(components: ComponentSpec[]): string {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const c of components) {
    const name = pascal(c.type) || 'Component'
    if (seen.has(name)) continue
    seen.add(name)
    lines.push(`export { default as ${name} } from './${name}'`)
  }
  return lines.join('\n') + '\n'
}
