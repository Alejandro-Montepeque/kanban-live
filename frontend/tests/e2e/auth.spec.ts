import { expect, test } from '@playwright/test'

/**
 * Auth flow E2E.
 *
 * These tests run against a real backend + database. CI starts both services
 * before running this file. Locally, you must have `docker compose up` running.
 *
 * Each test generates a unique email so they don't collide if the test DB is
 * not reset between runs.
 */

function uniqueEmail(prefix = 'user'): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now()}-${random}@e2e.test`
}

test.describe('Auth flow', () => {
  test('register → lands on dashboard and shows the user name', async ({ page }) => {
    const email = uniqueEmail('register')
    const name = 'Alice Tester'

    await page.goto('/register')
    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('correctHorseBatteryStaple')

    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: new RegExp(`welcome, ${name}`, 'i') })).toBeVisible()
  })

  test('login with wrong password shows an error and stays on the login page', async ({ page }) => {
    const email = uniqueEmail('badlogin')

    // Register first so the email exists.
    await page.goto('/register')
    await page.getByLabel('Name').fill('Bob')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('rightPassword123')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    // Log out to come back to /login.
    await page.getByRole('button', { name: /log out/i }).click()
    await expect(page).toHaveURL(/\/login/)

    // Attempt login with wrong password.
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('wrongPassword999')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByRole('alert')).toHaveText(/invalid email or password/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('session persists across reload (refresh token works)', async ({ page }) => {
    const email = uniqueEmail('persist')
    await page.goto('/register')
    await page.getByLabel('Name').fill('Persistent Pat')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('correctHorseBatteryStaple')
    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page).toHaveURL(/\/dashboard/)

    await page.reload()

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /welcome, persistent pat/i })).toBeVisible()
  })

  test('logout clears the session and revokes the refresh token', async ({ page }) => {
    const email = uniqueEmail('logout')
    await page.goto('/register')
    await page.getByLabel('Name').fill('Logger Outter')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('correctHorseBatteryStaple')
    await page.getByRole('button', { name: /create account/i }).click()

    await page.getByRole('button', { name: /log out/i }).click()
    await expect(page).toHaveURL(/\/login/)

    // Try to access /dashboard directly: should redirect back to /login.
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('client-side validation blocks empty form submission', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/invalid email/i)).toBeVisible()
  })
})
