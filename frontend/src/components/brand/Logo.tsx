import { motion } from 'framer-motion'

import { cn } from '@/lib/cn'

interface LogoProps {
  className?: string
  showWordmark?: boolean
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <div className="relative" aria-hidden="true">
        <div className="absolute inset-0 bg-accent/30 blur-lg rounded-full" />
        <svg width="28" height="28" viewBox="0 0 32 32" className="relative">
          <rect x="3" y="6" width="6" height="20" rx="2" fill="#a78bfa" opacity="0.85" />
          <rect x="13" y="10" width="6" height="16" rx="2" fill="#22d3ee" opacity="0.85" />
          <rect x="23" y="14" width="6" height="12" rx="2" fill="#ec4899" opacity="0.85" />
          <motion.circle
            cx="16"
            cy="4"
            r="2.5"
            fill="#a78bfa"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </div>
      {showWordmark && (
        <span className="font-display font-bold tracking-tight text-[15px] leading-none">
          kanban<span className="text-accent-glow">.live</span>
        </span>
      )}
    </div>
  )
}
