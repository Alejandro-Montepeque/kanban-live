import { expect, test } from '@playwright/test'

// Auth E2E. Requires backend + DB running (docker compose up). Each test
// uses a unique email to avoid cross-run collisions.

function uniqueEmail(prefix = 'user'): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now()}-${random}@e2e.test`
}

test.describe('Auth flow', () => {
  test('register shows the "verify your email" screen instead of auto-logging in', async ({
    page,
  }) => {
    const email = uniqueEmail('register')
    await page.goto('/register')
    await page.getByLabel('Name').fill('Alice Tester')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('CorrectHorse123')
    await page.getByRole('button', { name: /create account/i }).click()

    // No redirect to /dashboard — user must verify email first.
    await expect(page.getByRole('heading', { name: /one last step/i })).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
    await expect(page.getByRole('button', { name: /resend verification/i })).toBeVisible()
  })

  test('login is blocked with a clear message when the email is not verified', async ({
    page,
  }) => {
    const email = uniqueEmail('unverified')

    // Register but DON'T verify.
    await page.goto('/register')
    await page.getByLabel('Name').fill('Bob')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('CorrectHorse123')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.getByRole('heading', { name: /one last step/i })).toBeVisible()

    // Try to sign in directly.
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('CorrectHorse123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByRole('alert')).toContainText(/verify your email/i)
    await expect(page.getByRole('button', { name: /resend verification/i })).toBeVisible()
  })

  test('forgot-password screen shows confirmation regardless of email existence', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /forgot your password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)

    await page.getByLabel('Email').fill('does-not-exist@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()

    await expect(page.getByRole('heading', { name: /check your inbox/i })).toBeVisible()
  })

  test('reset-password page shows error when no token is provided', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByRole('heading', { name: /missing reset token/i })).toBeVisible()
  })

  test('verify-email page shows error when no token is provided', async ({ page }) => {
    await page.goto('/verify-email')
    await expect(
      page.getByRole('heading', { name: /missing verification token/i }),
    ).toBeVisible()
  })

  test('client-side validation blocks empty login form submission', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/invalid email/i)).toBeVisible()
  })
})
