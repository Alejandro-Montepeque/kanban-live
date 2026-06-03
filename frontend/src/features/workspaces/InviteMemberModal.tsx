import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { createInvitation, type InvitationCreated } from '@/api/invitations'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'

interface Props {
  open: boolean
  onClose: () => void
  workspaceId: string
  workspaceName: string
}

export function InviteMemberModal({ open, onClose, workspaceId, workspaceName }: Props) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  const [result, setResult] = useState<InvitationCreated | null>(null)
  const [copied, setCopied] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      createInvitation(workspaceId, {
        email: email.trim() || undefined,
        sendEmail: sendEmail && email.trim().length > 0,
      }),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['invitations', workspaceId] })
    },
  })

  function close() {
    setResult(null)
    setEmail('')
    setSendEmail(false)
    setCopied(false)
    onClose()
  }

  async function copyLink() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard might be unavailable in some contexts (insecure http etc.)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Invite to ${workspaceName}`}
      description="Generate a join link. Optionally send it to an email."
    >
      {!result ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email (optional)</Label>
            <Input
              id="invite-email"
              type="email"
              autoFocus
              placeholder="person@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-[11px] text-ink-subtle">
              Leave blank to just generate a shareable link.
            </p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              disabled={!email.trim()}
              className="mt-0.5"
            />
            <span className="text-sm text-ink-muted">
              Also send an email with the link
              {!email.trim() && <span className="block text-[11px] text-ink-subtle">Fill in an email above to enable</span>}
            </span>
          </label>

          {mutation.isError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              Could not create the invitation. Please try again.
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={close} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Generating...' : 'Generate invite link'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            Invite ready{result.email ? ` — sent to ${result.email}` : ''}. Expires in 7 days.
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-link">Shareable link</Label>
            <div className="flex gap-2">
              <Input
                id="invite-link"
                readOnly
                value={result.link}
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-[11px]"
              />
              <Button type="button" onClick={copyLink} variant="subtle" className="shrink-0">
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-[11px] text-ink-subtle">
              Anyone with this link can join until it expires.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setResult(null)
                setEmail('')
              }}
            >
              Generate another
            </Button>
            <Button type="button" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
