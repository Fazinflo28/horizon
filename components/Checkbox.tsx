'use client'

import { Check } from 'lucide-react'

/** Custom 18px checkbox used everywhere (sign-in, modal, generator panels). */
export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label?: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2.5 text-left ${
        disabled ? 'pointer-events-none opacity-40' : ''
      } ${className}`}
    >
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-2 transition-colors ${
          checked ? 'border-brand bg-brand' : 'border-line bg-white'
        }`}
      >
        {checked ? <Check size={12} strokeWidth={3} className="text-white" /> : null}
      </span>
      {label !== undefined ? (
        <span
          className={`text-sm ${
            checked ? 'font-semibold text-ink' : 'text-muted'
          }`}
        >
          {label}
        </span>
      ) : null}
    </button>
  )
}

export default Checkbox
