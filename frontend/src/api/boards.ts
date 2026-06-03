import { api } from './client'

export interface BoardListItem {
  id: string
  name: string
  workspaceId: string
  cardCount: number
  columnCount: number
  createdAt: string
  updatedAt: string
}

export interface CardData {
  id: string
  title: string
  description: string | null
  position: number
  columnId: string
  dueDate: string | null
  authorId: string
  assigneeId: string | null
  createdAt: string
  updatedAt: string
}

export interface ColumnData {
  id: string
  name: string
  position: number
  cards: CardData[]
}

export interface BoardDetail extends BoardListItem {
  myRole: 'OWNER' | 'MEMBER'
  columns: ColumnData[]
}

export async function listBoardsForWorkspace(workspaceId: string): Promise<BoardListItem[]> {
  const res = await api.get<BoardListItem[]>(`/workspaces/${workspaceId}/boards`)
  return res.data
}

export async function getBoard(boardId: string): Promise<BoardDetail> {
  const res = await api.get<BoardDetail>(`/boards/${boardId}`)
  return res.data
}

export async function createBoard(workspaceId: string, name: string): Promise<BoardListItem> {
  const res = await api.post<BoardListItem>(`/workspaces/${workspaceId}/boards`, { name })
  return res.data
}

export async function updateBoard(boardId: string, name: string): Promise<BoardListItem> {
  const res = await api.patch<BoardListItem>(`/boards/${boardId}`, { name })
  return res.data
}

export async function deleteBoard(boardId: string): Promise<void> {
  await api.delete(`/boards/${boardId}`)
}
