// src/components/ui/Breadcrumb.tsx
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <div className="flex items-center gap-1.5 text-sm mb-6 flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-slate-500 hover:text-slate-900 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}