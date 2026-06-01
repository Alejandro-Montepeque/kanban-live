import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isHydrated: boolean
  setAuth: (user: AuthUser, accessToken: string) => void
  setAccessToken: (accessToken: string) => void
  setHydrated: (value: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isHydrated: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setHydrated: (value) => set({ isHydrated: value }),
  clear: () => set({ user: null, accessToken: null }),
}))
