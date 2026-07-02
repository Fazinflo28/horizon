'use client'

import { MoreHorizontal } from 'lucide-react'
import { GLOBAL_COLUMNS } from '@/lib/constants'
import { Checkbox } from '@/components/Checkbox'

export function GlobalPanel({
  checked,
  onToggle,
}: {
  checked: string[]
  onToggle: (item: string) => void
}) {
  const isOn = (item: string) => checked.includes(item)

  return (
    <div className="relative">
      <button
        className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-page hover:text-ink"
        aria-label="More options"
      >
        <MoreHorizontal size={18} />
      </button>

      <div className="grid grid-cols-2 gap-x-6 gap-y-8 pr-10 md:grid-cols-3 xl:grid-cols-5 xl:gap-x-0">
        {GLOBAL_COLUMNS.map((column, ci) => (
          <div
            key={ci}
            className={`space-y-7 ${
              ci > 0 ? 'xl:border-l xl:border-line xl:pl-6' : 'xl:pr-6'
            }`}
          >
            {column.map((group) => (
              <div key={group.heading}>
                <h4 className="mb-4 text-base font-semibold text-ink">
                  {group.heading}
                </h4>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <Checkbox
                      key={item}
                      checked={isOn(item)}
                      onChange={() => onToggle(item)}
                      label={item}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default GlobalPanel
