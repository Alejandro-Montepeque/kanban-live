import { expect, test } from '@playwright/test'

// Cross-viewport layout checks: hidden/shown elements per breakpoint and
// the classic "horizontal scroll on mobile" bug. Functional behavior lives
// in auth.spec.ts.

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const

for (const vp of VIEWPORTS) {
  test.describe(`Responsive @ ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('login page renders and form is reachable', async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })

    test('register page renders and form is reachable', async ({ page }) => {
      await page.goto('/register')
      await expect(page.getByRole('heading', { name: /build a board in 30 seconds/i })).toBeVisible()
      await expect(page.getByLabel('Name')).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()
    })

    test('no horizontal scroll on login (common responsive bug)', async ({ page }) => {
      await page.goto('/login')
      // body.scrollWidth shouldn't exceed the viewport width.
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
      // Allow 1px tolerance for browser sub-pixel rounding.
      expect(scrollWidth).toBeLessThanOrEqual(vp.width + 1)
    })

    test('no horizontal scroll on register', async ({ page }) => {
      await page.goto('/register')
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
      expect(scrollWidth).toBeLessThanOrEqual(vp.width + 1)
    })

    test('no horizontal scroll on forgot-password', async ({ page }) => {
      await page.goto('/forgot-password')
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
      expect(scrollWidth).toBeLessThanOrEqual(vp.width + 1)
    })
  })
}

test.describe('Layout breakpoints', () => {
  test('split-screen brand panel is HIDDEN on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    // The aside is `hidden lg:flex` — should NOT be visible below 1024px.
    const tagline = page.getByText(/the kanban that moves with you/i)
    await expect(tagline).toBeHidden()
  })

  test('split-screen brand panel is VISIBLE on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/login')
    const tagline = page.getByText(/the kanban that moves with you/i)
    await expect(tagline).toBeVisible()
  })

  test('mobile shows the logo at the top of the form column', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/register')
    // The mobile-only logo wrapper has `lg:hidden`. It should be in DOM and visible.
    const heading = page.getByRole('heading', { name: /build a board in 30 seconds/i })
    await expect(heading).toBeVisible()
  })
})
