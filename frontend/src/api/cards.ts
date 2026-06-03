import { api } from './client'
import type { CardData } from './boards'

export async function createCard(
  columnId: string,
  input: { title: string; description?: string },
): Promise<CardData> {
  const res = await api.post<CardData>(`/columns/${columnId}/cards`, input)
  return res.data
}

export async function updateCard(
  cardId: string,
  input: {
    title?: string
    description?: string
    columnId?: string
    position?: number
    assigneeId?: string | null
    dueDate?: string | null
  },
): Promise<CardData> {
  const res = await api.patch<CardData>(`/cards/${cardId}`, input)
  return res.data
}

export async function deleteCard(cardId: string): Promise<void> {
  await api.delete(`/cards/${cardId}`)
}
