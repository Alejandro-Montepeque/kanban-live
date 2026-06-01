import { expect, test } from '@playwright/test'

test.describe('smoke', () => {
  test('unauthenticated visitors are redirected to the login page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })
})
