import { motion } from 'framer-motion'

import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const firstName = user?.name?.split(' ')[0] ?? user?.name ?? 'there'

  return (
    <section className="max-w-6xl mx-auto px-5 py-10 sm:py-14">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-10"
      >
        <p className="text-[11px] uppercase tracking-widest text-accent-glow font-semibold mb-2">
          Your workspace
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Welcome, <span className="text-gradient">{user?.name}</span>
        </h1>
        <p className="text-ink-muted mt-2 max-w-xl">
          Hi {firstName} — your Personal workspace is ready. Boards and real-time collaboration land
          in the next release.
        </p>
      </motion.header>

      {/* Stat strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut', delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10"
      >
        <Stat label="Boards" value="0" hint="Phase 2 unlocks this" />
        <Stat label="Members" value="1" hint="just you for now" />
        <Stat label="Status" value="Live" hint="account active" accent />
      </motion.div>

      {/* Empty state with mock board */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        className="relative rounded-2xl border border-bg-border bg-bg-card/60 overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none bg-aurora-1 opacity-30 blur-2xl" />

        <div className="relative p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-lg font-semibold">No boards yet</h2>
              <p className="text-sm text-ink-muted mt-1 max-w-md">
                Boards live here. Each one has columns and cards that you and your teammates can
                edit in real time.
              </p>
            </div>
            <Button variant="subtle" disabled title="Available in Phase 2">
              Create board · coming soon
            </Button>
          </div>

          {/* Mock board */}
          <div className="grid grid-cols-3 gap-3 max-w-3xl">
            {[
              { name: 'Backlog', items: 4 },
              { name: 'In progress', items: 2 },
              { name: 'Done', items: 3 },
            ].map((col, i) => (
              <div
                key={col.name}
                className="rounded-xl border border-bg-border bg-bg-surface/50 p-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted">
                    {col.name}
                  </span>
                  <span className="text-[10px] font-mono text-ink-subtle">{col.items}</span>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: col.items }).map((_, idx) => (
                    <div
                      key={idx}
                      className="rounded-md h-7 bg-bg-surface border border-bg-border/60"
                      style={{
                        opacity: 1 - idx * 0.15 - i * 0.05,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-bg-border bg-bg-card/60 px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-ink-subtle font-semibold">
          {label}
        </p>
        <p
          className={`text-2xl font-bold tracking-tight mt-0.5 ${
            accent ? 'text-accent-glow' : 'text-ink'
          }`}
        >
          {value}
        </p>
      </div>
      <span className="text-[11px] text-ink-subtle">{hint}</span>
    </div>
  )
}
