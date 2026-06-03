import { api } from './client'
import type { AuthUser } from '@/stores/auth'

export interface AuthResponse {
  user: AuthUser
  accessToken: string
}

export interface RegisterResponse {
  user: AuthUser
  emailVerificationRequired: true
}

export async function register(input: {
  email: string
  name: string
  password: string
}): Promise<RegisterResponse> {
  const res = await api.post<RegisterResponse>('/auth/register', input)
  return res.data
}

export async function verifyEmail(token: string): Promise<void> {
  await api.post('/auth/verify-email', { token })
}

export async function resendVerification(email: string): Promise<void> {
  await api.post('/auth/resend-verification', { email })
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

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email })
}

export async function resetPassword(input: { token: string; password: string }): Promise<void> {
  await api.post('/auth/reset-password', input)
}
