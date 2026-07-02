'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import KitCard from '@/components/KitCard'
import KitModal from '@/components/KitModal'
import { Spinner } from '@/components/Spinner'
import EmptyState from '@/components/EmptyState'
import { Reveal } from '@/components/motion/Reveal'
import { Store } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SHOP_INDUSTRIES } from '@/lib/constants'
import type { ShopKit } from '@/lib/types'

export default function ShopPage() {
  const [kits, setKits] = useState<ShopKit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('All')
  const [selected, setSelected] = useState<ShopKit | null>(null)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase
      .from('shop_kits')
      .select('*')
      .order('views', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return
        if (!error && data) setKits(data as ShopKit[])
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const pills = [...SHOP_INDUSTRIES, 'All']
  const filtered =
    filter === 'All'
      ? kits
      : kits.filter((k) => k.industry.toLowerCase() === filter.toLowerCase())

  return (
    <div>
      <Navbar />

      <div className="mx-auto max-w-[1400px]">
        <h1 className="px-8 pt-8 text-3xl font-bold text-ink">
          Pre - Build Design System
        </h1>

        <div className="flex flex-wrap gap-2.5 px-8 pt-6">
          {pills.map((p) => {
            const active = filter === p
            return (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`h-10 rounded-full border px-4 text-sm transition-colors ${
                  active
                    ? 'border-brand bg-brand-50 font-medium text-brand'
                    : 'border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                {p}
              </button>
            )
          })}
        </div>

        <div className="mx-8 my-6 rounded-card bg-surface p-6 shadow-card">
          {loading ? (
            <div className="flex justify-center py-24">
              <Spinner size={28} className="text-brand" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {filtered.map((kit, i) => (
                <Reveal key={kit.id} delay={Math.min(i * 0.04, 0.4)} y={16}>
                  <KitCard kit={kit} onOpen={setSelected} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Store}
              title="No kits in this category"
              subtitle="Try a different industry filter"
            />
          )}
        </div>
      </div>

      <KitModal kit={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
