"use client"

import { cn } from "@/lib/utils"

export function PageShell({ children, className = "" }) {
  return (
    <div className={cn("mx-auto w-[95%] max-w-[1240px] py-5", className)}>
      {children}
    </div>
  )
}

export function PageTitle({ children, className = "" }) {
  return (
    <h1
      className={cn(
        "text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]",
        className,
      )}
    >
      {children}
    </h1>
  )
}
