import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BrandPanel } from '@/components/BrandPanel'

export default function SplashPage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <BrandPanel markSize="text-7xl md:text-8xl" className="h-screen">
        <Link
          href="/signin"
          className="inline-flex h-12 items-center gap-2 rounded-full border border-white/60 px-8 text-white transition-colors hover:bg-white/10"
        >
          Start
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
            <ArrowRight size={14} className="text-[#2A3CE8]" />
          </span>
        </Link>
      </BrandPanel>
    </main>
  )
}
