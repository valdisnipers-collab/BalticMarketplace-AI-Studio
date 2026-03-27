import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export interface FilterPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  value?: string
  onRemove?: () => void
}

export const FilterPill = React.forwardRef<HTMLButtonElement, FilterPillProps>(
  ({ className, label, value, onRemove, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          className
        )}
        {...props}
      >
        <span className="text-slate-500">{label}</span>
        {value && <span className="font-semibold text-slate-900">{value}</span>}
        {onRemove && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onRemove()
              }
            }}
            className="ml-1 -mr-1 rounded-full p-0.5 hover:bg-slate-200 focus:bg-slate-200 focus:outline-none"
          >
            <X className="h-3.5 w-3.5 text-slate-500" />
            <span className="sr-only">Remove filter</span>
          </span>
        )}
      </button>
    )
  }
)
FilterPill.displayName = "FilterPill"
