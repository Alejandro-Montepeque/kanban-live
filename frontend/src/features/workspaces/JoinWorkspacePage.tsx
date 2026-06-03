import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { acceptInvitation, previewInvitation } from '@/api/invitations'
import { AuthShell } from '@/features/auth/AuthShell'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth'

export default function JoinWorkspacePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isHydrated = useAuthStore((s) => s.isHydrated)

  // Persist the redirect target so the auth pages can come back here after login.
  useEffect(() => {
    if (token) sessionStorage.setItem('post-auth-redirect', `/join/${token}`)
  }, [token])

  const preview = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () => previewInvitation(token!),
    enabled: !!token,
    retry: false,
  })

  const accept = useMutation({
    mutationFn: () => acceptInvitation(token!),
    onSuccess: ({ workspaceId }) => {
      sessionStorage.removeItem('post-auth-redirect')
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
      navigate(`/workspaces/${workspaceId}`, { replace: true })
    },
  })

  if (!token) {
    return (
      <AuthShell title="Missing invitation token" subtitle="Open this page from the link you received.">
        <p className="text-center text-sm text-ink-muted">
          <Link to="/login" className="text-accent-glow">Back to sign in</Link>
        </p>
      </AuthShell>
    )
  }

  if (preview.isLoading || !isHydrated) {
    return (
      <AuthShell title="Checking invitation...">
        <p className="text-center text-sm text-ink-muted">One moment.</p>
      </AuthShell>
    )
  }

  if (preview.isError) {
    const status =
      preview.error instanceof AxiosError ? preview.error.response?.status : undefined
    return (
      <AuthShell
        title="Invitation invalid"
        subtitle={
          status === 401
            ? 'This invitation has expired or has already been used.'
            : 'We could not load this invitation. The link may be malformed.'
        }
      >
        <p className="text-center text-sm text-ink-muted">
          <Link to="/login" className="text-accent-glow">Back to sign in</Link>
        </p>
      </AuthShell>
    )
  }

  const data = preview.data!

  if (!user) {
    return (
      <AuthShell
        eyebrow="Invitation"
        title={`Join ${data.workspaceName}`}
        subtitle="Sign in or create an account to accept the invitation. We'll bring you back here."
      >
        <div className="space-y-3">
          <Button onClick={() => navigate('/login')} className="w-full">
            Sign in
          </Button>
          <Button
            variant="subtle"
            onClick={() => navigate('/register')}
            className="w-full"
          >
            Create account
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Invitation"
      title={`Join ${data.workspaceName}`}
      subtitle={`You're signed in as ${user.name}. Accept to become a member.`}
    >
      {accept.isError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {accept.error instanceof AxiosError && accept.error.response?.status === 409
            ? 'You are already a member of this workspace.'
            : 'Could not accept the invitation. Please try again.'}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          disabled={accept.isPending}
          className="flex-1"
        >
          Decline
        </Button>
        <Button onClick={() => accept.mutate()} disabled={accept.isPending} className="flex-1">
          {accept.isPending ? 'Joining...' : 'Join workspace'}
        </Button>
      </div>
    </AuthShell>
  )
}
