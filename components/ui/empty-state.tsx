import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-slate-50/50", className)} {...props}>
      {Icon && (
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-6">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
