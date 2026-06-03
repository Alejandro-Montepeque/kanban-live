import { api } from './client'
import type { ColumnData } from './boards'

export async function createColumn(boardId: string, name: string): Promise<ColumnData> {
  const res = await api.post<ColumnData>(`/boards/${boardId}/columns`, { name })
  return { ...res.data, cards: [] }
}

export async function updateColumn(
  columnId: string,
  input: { name?: string; position?: number },
): Promise<ColumnData> {
  const res = await api.patch<ColumnData>(`/columns/${columnId}`, input)
  return { ...res.data, cards: res.data.cards ?? [] }
}

export async function deleteColumn(columnId: string): Promise<void> {
  await api.delete(`/columns/${columnId}`)
}
