import { api } from './client'

export interface InvitationCreated {
  token: string
  link: string
  expiresAt: string
  email: string | null
}

export interface InvitationPreview {
  token: string
  workspaceName: string
  expiresAt: string
  email: string | null
}

export interface PendingInvitation {
  id: string
  email: string | null
  expiresAt: string
  createdAt: string
}

export async function createInvitation(
  workspaceId: string,
  input: { email?: string; sendEmail?: boolean },
): Promise<InvitationCreated> {
  const res = await api.post<InvitationCreated>(
    `/workspaces/${workspaceId}/invitations`,
    input,
  )
  return res.data
}

export async function listInvitations(workspaceId: string): Promise<PendingInvitation[]> {
  const res = await api.get<PendingInvitation[]>(`/workspaces/${workspaceId}/invitations`)
  return res.data
}

export async function revokeInvitation(id: string): Promise<void> {
  await api.delete(`/invitations/${id}`)
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const res = await api.get<InvitationPreview>(`/invitations/${token}`)
  return res.data
}

export async function acceptInvitation(token: string): Promise<{ workspaceId: string }> {
  const res = await api.post<{ workspaceId: string }>(`/invitations/${token}/accept`)
  return res.data
}
