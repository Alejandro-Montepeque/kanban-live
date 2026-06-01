import { motion } from 'framer-motion'
import type { PropsWithChildren } from 'react'

import { AuthBackdrop } from '@/components/brand/AuthBackdrop'
import { KanbanPreview } from '@/components/brand/KanbanPreview'
import { Logo } from '@/components/brand/Logo'

interface AuthShellProps {
  eyebrow?: string
  title: string
  subtitle?: string
}

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: PropsWithChildren<AuthShellProps>) {
  return (
    <div className="relative min-h-screen text-ink overflow-hidden">
      <AuthBackdrop />

      <div className="relative grid min-h-screen lg:grid-cols-2">
        {/* Left: brand + preview (hidden on mobile to keep things clean) */}
        <aside className="hidden lg:flex flex-col justify-between p-10 xl:p-14 border-r border-white/5">
          <Logo />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="max-w-md"
          >
            <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight mb-3">
              The Kanban that <span className="text-gradient">moves with you</span>.
            </h2>
            <p className="text-ink-muted text-sm xl:text-base leading-relaxed mb-8">
              Real-time boards for teams that ship. Drag a card — your teammates see it move
              instantly. No reloads, no conflicts, no friction.
            </p>
            <KanbanPreview />
          </motion.div>
          <footer className="text-[11px] text-ink-subtle font-mono">
            v0.1 · alpha · built with NestJS + React
          </footer>
        </aside>

        {/* Right: form */}
        <section className="flex flex-col">
          <div className="lg:hidden p-6">
            <Logo />
          </div>
          <div className="flex-1 grid place-items-center px-6 py-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full max-w-sm"
            >
              <div className="glass rounded-2xl p-8 shadow-card noise relative">
                <header className="mb-6">
                  {eyebrow && (
                    <p className="text-[11px] uppercase tracking-widest text-accent-glow font-semibold mb-2">
                      {eyebrow}
                    </p>
                  )}
                  <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                  {subtitle && (
                    <p className="text-ink-muted text-sm mt-1.5 leading-relaxed">{subtitle}</p>
                  )}
                </header>
                {children}
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  )
}
