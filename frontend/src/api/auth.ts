import { api } from './client'
import type { AuthUser } from '@/stores/auth'

export interface AuthResponse {
  user: AuthUser
  accessToken: string
}

export async function register(input: {
  email: string
  name: string
  password: string
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', input)
  return res.data
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', input)
  return res.data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function me(): Promise<AuthUser> {
  const res = await api.get<AuthUser>('/auth/me')
  return res.data
}

export async function refresh(): Promise<{ accessToken: string }> {
  const res = await api.post<{ accessToken: string }>('/auth/refresh')
  return res.data
}
