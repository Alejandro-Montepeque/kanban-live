import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type Variant = 'primary' | 'ghost' | 'subtle'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-glow focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-[0.98]'

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-accent to-accent-deep text-white shadow-glow hover:shadow-[0_0_36px_rgba(124,58,237,0.55)]',
  ghost:
    'bg-transparent text-ink-muted hover:bg-bg-card hover:text-ink border border-transparent hover:border-bg-border',
  subtle:
    'bg-bg-surface text-ink border border-bg-border hover:border-accent/40 hover:bg-bg-card',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return <button ref={ref} className={cn(base, variants[variant], className)} {...props} />
  },
)
Button.displayName = 'Button'
