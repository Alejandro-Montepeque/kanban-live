import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { listBoardsForWorkspace } from '@/api/boards'
import { deleteWorkspace, getWorkspace } from '@/api/workspaces'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CreateBoardModal } from '@/features/boards/CreateBoardModal'
import { InviteMemberModal } from './InviteMemberModal'
import { RenameWorkspaceModal } from './RenameWorkspaceModal'

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const workspaceQuery = useQuery({
    queryKey: ['workspace', id],
    queryFn: () => getWorkspace(id!),
    enabled: !!id,
  })

  const boardsQuery = useQuery({
    queryKey: ['boards', id],
    queryFn: () => listBoardsForWorkspace(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkspace(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      navigate('/dashboard', { replace: true })
    },
  })

  // Close menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  if (workspaceQuery.isLoading) {
    return (
      <section className="max-w-6xl mx-auto px-5 py-10">
        <p className="text-ink-muted text-sm">Loading workspace...</p>
      </section>
    )
  }

  if (workspaceQuery.isError || !workspaceQuery.data) {
    return (
      <section className="max-w-6xl mx-auto px-5 py-10">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          <p>Workspace not found or you don't have access.</p>
          <Link to="/dashboard" className="text-accent-glow hover:text-ink mt-2 inline-block">
            ← Back to dashboard
          </Link>
        </div>
      </section>
    )
  }

  const ws = workspaceQuery.data
  const boards = boardsQuery.data ?? []
  const isOwner = ws.role === 'OWNER'

  return (
    <section className="max-w-6xl mx-auto px-5 py-10 sm:py-14">
      <Link to="/dashboard" className="text-sm text-ink-muted hover:text-ink transition-colors">
        ← Back to dashboard
      </Link>

      <header className="mt-4 mb-8">
        <p className="text-[11px] uppercase tracking-widest text-accent-glow font-semibold mb-2">
          Workspace
        </p>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-end gap-3 flex-wrap min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight truncate">{ws.name}</h1>
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${
                isOwner
                  ? 'bg-accent/15 text-accent-glow border-accent/30'
                  : 'bg-bg-surface text-ink-muted border-bg-border'
              }`}
            >
              {ws.role}
            </span>
          </div>

          {/* Workspace actions menu */}
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Workspace actions"
              className="px-2"
            >
              ⋯
            </Button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-xl border border-bg-border bg-bg-card shadow-card z-30 overflow-hidden"
              >
                {isOwner ? (
                  <>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        setRenameOpen(true)
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-ink hover:bg-bg-surface transition-colors"
                    >
                      Rename workspace
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        setDeleteOpen(true)
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-bg-border"
                    >
                      Delete workspace
                    </button>
                  </>
                ) : (
                  <p className="px-3 py-2 text-xs text-ink-subtle">
                    Only the workspace owner can rename or delete this workspace.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-[11px] font-mono text-ink-subtle mt-1">{ws.slug}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Boards column */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Boards</h2>
            <Button onClick={() => setCreateOpen(true)}>+ New board</Button>
          </div>

          {boardsQuery.isLoading && (
            <div className="rounded-2xl border border-bg-border bg-bg-card/60 p-8 text-center text-ink-muted">
              Loading boards...
            </div>
          )}

          {boards.length === 0 && !boardsQuery.isLoading && (
            <div className="rounded-2xl border border-bg-border bg-bg-card/60 p-8 text-center text-ink-muted">
              <p className="text-sm">No boards yet.</p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                Create your first board
              </Button>
            </div>
          )}

          {boards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {boards.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                >
                  <Link
                    to={`/boards/${b.id}`}
                    className="group block rounded-xl border border-bg-border bg-bg-card/60 p-4 hover:border-accent/40 hover:bg-bg-card transition-all"
                  >
                    <h3 className="font-semibold text-ink group-hover:text-accent-glow transition-colors mb-2">
                      {b.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-ink-muted">
                      <span>
                        <strong className="text-ink font-mono">{b.columnCount}</strong> columns
                      </span>
                      <span className="text-ink-subtle">·</span>
                      <span>
                        <strong className="text-ink font-mono">{b.cardCount}</strong> cards
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Members aside */}
        <aside className="rounded-2xl border border-bg-border bg-bg-card/60 p-5 h-fit space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              Members <span className="text-ink-subtle">({ws.members.length})</span>
            </h2>
            {isOwner && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="text-[11px] text-accent-glow hover:text-ink transition-colors"
              >
                + Invite
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {ws.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-2.5 text-sm">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-cyan-glow grid place-items-center text-[10px] font-bold text-bg">
                  {m.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0]?.toUpperCase())
                    .join('') || '·'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-ink truncate">{m.name}</p>
                  <p className="text-[10px] text-ink-subtle truncate">{m.email}</p>
                </div>
                <span
                  className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md border ${
                    m.role === 'OWNER'
                      ? 'bg-accent/15 text-accent-glow border-accent/30'
                      : 'bg-bg-surface text-ink-muted border-bg-border'
                  }`}
                >
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <CreateBoardModal open={createOpen} onClose={() => setCreateOpen(false)} workspaceId={ws.id} />
      <RenameWorkspaceModal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        workspaceId={ws.id}
        currentName={ws.name}
      />
      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        workspaceId={ws.id}
        workspaceName={ws.name}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title={`Delete workspace "${ws.name}"?`}
        description="This removes ALL boards, columns and cards inside this workspace. This action cannot be undone."
        confirmLabel="Delete workspace"
        variant="danger"
        isPending={deleteMutation.isPending}
      />
    </section>
  )
}
