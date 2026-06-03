import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { getProfile, resendVerification, revokeAllSessions } from '@/api/auth'
import { disconnectSocket } from '@/api/socket'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/stores/auth'
import { ChangePasswordModal } from './ChangePasswordModal'
import { EditNameModal } from './EditNameModal'

export default function ProfilePage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clear)
  const [editNameOpen, setEditNameOpen] = useState(false)
  const [changePassOpen, setChangePassOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  })

  const resendMutation = useMutation({
    mutationFn: () => resendVerification(data?.email ?? ''),
  })

  const revokeMutation = useMutation({
    mutationFn: revokeAllSessions,
    onSuccess: () => {
      disconnectSocket()
      clearAuth()
      navigate('/login', { replace: true })
    },
  })

  if (isLoading) {
    return (
      <section className="max-w-3xl mx-auto px-5 py-10">
        <p className="text-ink-muted text-sm">Loading profile...</p>
      </section>
    )
  }

  if (isError || !data) {
    return (
      <section className="max-w-3xl mx-auto px-5 py-10">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          <p>Could not load your profile.</p>
          <Link to="/dashboard" className="text-accent-glow hover:text-ink mt-2 inline-block">
            ← Back to dashboard
          </Link>
        </div>
      </section>
    )
  }

  const initials = data.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || '·'

  return (
    <section className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
      <Link to="/dashboard" className="text-sm text-ink-muted hover:text-ink transition-colors">
        ← Back to dashboard
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-4 mb-8"
      >
        <p className="text-[11px] uppercase tracking-widest text-accent-glow font-semibold mb-2">
          Account
        </p>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-cyan-glow grid place-items-center text-lg font-bold text-bg shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{data.name}</h1>
            <p className="text-sm text-ink-muted">{data.email}</p>
          </div>
        </div>
      </motion.header>

      <div className="space-y-4">
        {/* Identity */}
        <Card title="Identity">
          <Row label="Name" value={data.name}>
            <Button variant="subtle" onClick={() => setEditNameOpen(true)}>
              Edit
            </Button>
          </Row>
          <Row label="Email" value={data.email} />
          <Row
            label="Email verified"
            value={
              data.emailVerifiedAt ? (
                <span className="text-emerald-300">
                  ✓ Verified ({new Date(data.emailVerifiedAt).toLocaleDateString()})
                </span>
              ) : (
                <span className="text-amber-300">Pending verification</span>
              )
            }
          >
            {!data.emailVerifiedAt && (
              <Button
                variant="subtle"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending || resendMutation.isSuccess}
              >
                {resendMutation.isSuccess
                  ? 'Sent ✓'
                  : resendMutation.isPending
                    ? 'Sending...'
                    : 'Resend email'}
              </Button>
            )}
          </Row>
          <Row label="Member since" value={new Date(data.createdAt).toLocaleDateString()} />
        </Card>

        {/* Security */}
        <Card title="Security">
          <Row
            label="Password"
            value={<span className="text-ink-muted">••••••••</span>}
          >
            <Button variant="subtle" onClick={() => setChangePassOpen(true)}>
              Change
            </Button>
          </Row>
          <Row
            label="Active sessions"
            value={
              <span className="text-ink-muted">
                Sign out from all your devices at once
              </span>
            }
          >
            <Button
              variant="subtle"
              onClick={() => setRevokeOpen(true)}
              className="text-red-400 hover:text-red-300"
            >
              Sign out everywhere
            </Button>
          </Row>
        </Card>
      </div>

      <EditNameModal
        open={editNameOpen}
        onClose={() => setEditNameOpen(false)}
        currentName={data.name}
      />
      <ChangePasswordModal
        open={changePassOpen}
        onClose={() => setChangePassOpen(false)}
      />
      <ConfirmDialog
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        onConfirm={() => revokeMutation.mutate()}
        title="Sign out from all devices?"
        description="This will revoke every active session of your account, including this one. You'll need to log in again."
        confirmLabel="Sign out everywhere"
        variant="danger"
        isPending={revokeMutation.isPending}
      />
    </section>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-bg-border bg-bg-card/60 overflow-hidden">
      <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider px-5 pt-4 pb-3">
        {title}
      </h2>
      <div className="divide-y divide-bg-border">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  children,
}: {
  label: string
  value: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-subtle">
          {label}
        </p>
        <div className="text-sm text-ink mt-0.5 break-words">{value}</div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  )
}
