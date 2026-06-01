import { forwardRef, type InputHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg border bg-bg-surface/60 backdrop-blur-sm px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle transition-all duration-150',
          'border-bg-border hover:border-bg-border/80',
          'focus-visible:outline-none focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/30',
          'aria-[invalid=true]:border-red-500/50 aria-[invalid=true]:focus-visible:ring-red-500/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
