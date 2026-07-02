/**
 * The "Horizon" wordmark. The first "o" is replaced by the logo glyph — a
 * white disc with a dark-blue half-moon rising at its base. `currentColor`
 * drives the disc/letters, so control it with a text color class.
 */
export function HorizonMark({
  className = '',
  notch = '#2E3FE0',
}: {
  className?: string
  notch?: string
}) {
  return (
    <span
      className={`inline-flex items-center font-extrabold leading-none tracking-tight ${className}`}
    >
      H
      <span
        className="relative inline-block"
        style={{ width: '0.72em', height: '0.72em', margin: '0 0.02em' }}
        aria-hidden
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle cx="50" cy="50" r="42" fill="currentColor" />
          <path d="M24 58 A26 26 0 0 1 76 58 Z" fill={notch} />
        </svg>
      </span>
      rizon
    </span>
  )
}

export default HorizonMark
