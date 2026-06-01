import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import App from './App'

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

describe('App', () => {
  it('renders the login page on unknown route when unauthenticated', async () => {
    // The app starts at "/" → navigates to /dashboard → ProtectedRoute → /login
    renderApp()
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
  })
})
