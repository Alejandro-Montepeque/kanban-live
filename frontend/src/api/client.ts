import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/stores/auth'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // needed for the HttpOnly refresh cookie
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token && config.headers) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// On 401, attempt one silent refresh and retry the original request.
interface RetriableRequest extends AxiosRequestConfig {
  _retried?: boolean
}

let refreshInFlight: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post<{ accessToken: string }>(
        `${API_URL}/api/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then((res) => {
        useAuthStore.getState().setAccessToken(res.data.accessToken)
        return res.data.accessToken
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableRequest | undefined
    const isAuthEndpoint = original?.url?.includes('/auth/')

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !isAuthEndpoint
    ) {
      original._retried = true
      try {
        const newToken = await refreshAccessToken()
        if (original.headers) {
          original.headers['Authorization'] = `Bearer ${newToken}`
        }
        return api(original)
      } catch {
        useAuthStore.getState().clear()
      }
    }
    return Promise.reject(error)
  },
)
