import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import type { WorkspaceListItem } from '@/api/workspaces'

interface Props {
  workspace: WorkspaceListItem
  index: number
}

export function WorkspaceCard({ workspace, index }: Props) {
  const isOwner = workspace.role === 'OWNER'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: index * 0.04 }}
    >
      <Link
        to={`/workspaces/${workspace.id}`}
        className="group block rounded-2xl border border-bg-border bg-bg-card/60 p-5 hover:border-accent/40 hover:bg-bg-card transition-all duration-200"
      >
        <header className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-ink truncate group-hover:text-accent-glow transition-colors">
              {workspace.name}
            </h3>
            <p className="text-[11px] font-mono text-ink-subtle truncate">{workspace.slug}</p>
          </div>
          <span
            className={`shrink-0 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${
              isOwner
                ? 'bg-accent/15 text-accent-glow border-accent/30'
                : 'bg-bg-surface text-ink-muted border-bg-border'
            }`}
          >
            {workspace.role}
          </span>
        </header>

        <div className="flex items-center gap-4 text-xs text-ink-muted">
          <span>
            <strong className="text-ink font-mono">{workspace.boardCount}</strong>{' '}
            {workspace.boardCount === 1 ? 'board' : 'boards'}
          </span>
          <span className="text-ink-subtle">·</span>
          <span>
            <strong className="text-ink font-mono">{workspace.memberCount}</strong>{' '}
            {workspace.memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
