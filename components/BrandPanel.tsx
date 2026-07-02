import { HorizonMark } from '@/components/HorizonMark'

/** The layered brand gradient + floating spheres, reused by splash & sign-in. */
function GradientLayers() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(120% 80% at 15% 6%, rgba(240,171,252,0.55), rgba(240,171,252,0) 45%)',
            'radial-gradient(90% 70% at 88% 18%, rgba(124,58,237,0.5), rgba(124,58,237,0) 50%)',
            'radial-gradient(130% 120% at 50% 105%, rgba(99,102,241,0.9), rgba(99,102,241,0) 60%)',
            'linear-gradient(160deg, #3B48F0 0%, #2A3CE8 45%, #4F46E5 100%)',
          ].join(','),
        }}
      />
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 280,
          height: 280,
          left: '6%',
          top: '42%',
          background:
            'radial-gradient(circle at 35% 30%, #6D7BFF, #2C3AD8 72%)',
          opacity: 0.9,
        }}
      />
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 190,
          height: 190,
          right: '12%',
          top: '12%',
          background:
            'radial-gradient(circle at 35% 30%, #5B6BF5, #2734C9 72%)',
          opacity: 0.9,
        }}
      />
    </>
  )
}

/** The bordered tagline card shown on the brand gradient. */
export function TaglineCard() {
  return (
    <div className="rounded-2xl border border-white/30 px-10 py-6 text-center backdrop-blur-sm">
      <p className="text-lg text-white/80">Consistency at Scale.</p>
      <p className="mt-1 text-2xl font-bold text-white md:text-3xl">
        Build Once. Stay Consistent Everywhere.
      </p>
    </div>
  )
}

export function BrandPanel({
  markSize = 'text-6xl',
  children,
  footer,
  className = '',
}: {
  markSize?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: '#2A3CE8' }}
    >
      <GradientLayers />
      <div className="relative z-10 flex h-full min-h-full w-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-10 px-8 text-center">
          <HorizonMark className={`text-white ${markSize}`} />
          <TaglineCard />
          {children}
        </div>
        {footer ? <div className="relative z-10 pb-8">{footer}</div> : null}
      </div>
    </div>
  )
}

export default BrandPanel
