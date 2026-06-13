import { cn } from "~/lib/utils"

interface StatusIndicatorProps {
  active: boolean
  className?: string
}

export function StatusIndicator({ active, className }: StatusIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "h-2 w-2 rounded-full transition-colors",
          active
            ? "bg-primary shadow-[0_0_8px_oklch(0.7686_0.1647_70.0804_/_0.5)]"
            : "bg-muted-foreground/40"
        )}
        aria-hidden="true"
      />
      <span className="text-xs font-medium text-muted-foreground">
        {active ? "Active" : "Idle"}
      </span>
    </div>
  )
}
