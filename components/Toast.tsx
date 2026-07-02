'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Module-level counter (not Date.now/Math.random) keeps ids stable & SSR-safe.
let idCounter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idCounter
    setItems((prev) => [...prev, { id, message, type }])
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <ToastRow key={t.id} item={t} onClose={() => remove(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

function ToastRow({
  item,
  onClose,
}: {
  item: ToastItem
  onClose: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3800)
    return () => clearTimeout(timer)
  }, [onClose])

  const Icon =
    item.type === 'success'
      ? CheckCircle2
      : item.type === 'error'
        ? AlertCircle
        : Info
  const color =
    item.type === 'success'
      ? 'text-success'
      : item.type === 'error'
        ? 'text-danger'
        : 'text-brand'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-pop"
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${color}`} />
      <p className="flex-1 text-sm text-ink">{item.message}</p>
      <button
        onClick={onClose}
        className="mt-0.5 shrink-0 text-muted transition-colors hover:text-ink"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </motion.div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
