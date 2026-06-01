import type { LabelHTMLAttributes, PropsWithChildren } from 'react'

import { cn } from '@/lib/cn'

export function Label({
  className,
  children,
  ...props
}: PropsWithChildren<LabelHTMLAttributes<HTMLLabelElement>>) {
  return (
    <label className={cn('text-sm font-medium text-ink', className)} {...props}>
      {children}
    </label>
  )
}
