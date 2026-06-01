import { expect, test } from '@playwright/test'

test.describe('smoke', () => {
  test('home page renders the kanban-live title', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'kanban-live' })).toBeVisible()
  })
})
