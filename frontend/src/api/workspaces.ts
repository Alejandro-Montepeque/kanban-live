import { api } from './client'

export interface WorkspaceListItem {
  id: string
  name: string
  slug: string
  role: 'OWNER' | 'MEMBER'
  boardCount: number
  memberCount: number
  createdAt: string
}

export interface WorkspaceDetail extends WorkspaceListItem {
  members: Array<{ userId: string; name: string; email: string; role: 'OWNER' | 'MEMBER' }>
}

export async function listWorkspaces(): Promise<WorkspaceListItem[]> {
  const res = await api.get<WorkspaceListItem[]>('/workspaces')
  return res.data
}

export async function getWorkspace(id: string): Promise<WorkspaceDetail> {
  const res = await api.get<WorkspaceDetail>(`/workspaces/${id}`)
  return res.data
}

export async function createWorkspace(name: string): Promise<WorkspaceListItem> {
  const res = await api.post<WorkspaceListItem>('/workspaces', { name })
  return res.data
}

export async function updateWorkspace(id: string, name: string): Promise<WorkspaceListItem> {
  const res = await api.patch<WorkspaceListItem>(`/workspaces/${id}`, { name })
  return res.data
}

export async function deleteWorkspace(id: string): Promise<void> {
  await api.delete(`/workspaces/${id}`)
}
