import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'

import { listWorkspaces } from '@/api/workspaces'
import { Button } from '@/components/ui/Button'
import { CreateWorkspaceModal } from '@/features/workspaces/CreateWorkspaceModal'
import { WorkspaceCard } from '@/features/workspaces/WorkspaceCard'
import { useAuthStore } from '@/stores/auth'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: workspaces, isLoading, isError } = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  })

  const ownedCount = workspaces?.filter((w) => w.role === 'OWNER').length ?? 0
  const memberCount = workspaces?.filter((w) => w.role === 'MEMBER').length ?? 0

  return (
    <section className="max-w-6xl mx-auto px-5 py-10 sm:py-14">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-10"
      >
        <p className="text-[11px] uppercase tracking-widest text-accent-glow font-semibold mb-2">
          Your workspaces
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Welcome, <span className="text-gradient">{user?.name}</span>
        </h1>
        <p className="text-ink-muted mt-2 max-w-xl">
          Workspaces group your boards and members. Pick one to dive in, or spin up a new one.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut', delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10"
      >
        <Stat label="Workspaces" value={String(workspaces?.length ?? '·')} hint="all" />
        <Stat label="Owned by you" value={String(ownedCount)} hint="role: OWNER" />
        <Stat label="Member of" value={String(memberCount)} hint="role: MEMBER" />
      </motion.div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">All workspaces</h2>
        <Button onClick={() => setCreateOpen(true)}>+ New workspace</Button>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-bg-border bg-bg-card/60 p-8 text-center text-ink-muted">
          Loading...
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          Could not load workspaces. Reload the page or try again later.
        </div>
      )}

      {workspaces && workspaces.length === 0 && (
        <div className="rounded-2xl border border-bg-border bg-bg-card/60 p-8 text-center text-ink-muted">
          <p className="text-sm">You don't belong to any workspace yet.</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            Create your first workspace
          </Button>
        </div>
      )}

      {workspaces && workspaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((w, i) => (
            <WorkspaceCard key={w.id} workspace={w} index={i} />
          ))}
        </div>
      )}

      <CreateWorkspaceModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-bg-border bg-bg-card/60 px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-ink-subtle font-semibold">
          {label}
        </p>
        <p className="text-2xl font-bold tracking-tight mt-0.5">{value}</p>
      </div>
      <span className="text-[11px] text-ink-subtle">{hint}</span>
    </div>
  )
}
