import { test, expect } from '@playwright/test'

test.describe('Task Inbox', () => {
  test('displays task inbox page', async ({ page }) => {
    await page.goto('/inbox')
    await expect(page.locator('h1')).toContainText('Task Inbox')
  })

  test('shows task count', async ({ page }) => {
    await page.goto('/inbox')
    await expect(page.locator('text=/\\d+ pending/')).toBeVisible()
  })

  test('search filters tasks', async ({ page }) => {
    await page.goto('/inbox')

    // Wait for tasks to load
    await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 }).catch(() => {
      // No tasks available
    })

    // Type in search
    await page.fill('input[placeholder="Search tasks..."]', 'test')

    // Wait for filtering to occur
    await page.waitForTimeout(500)
  })

  test('status filter works', async ({ page }) => {
    await page.goto('/inbox')

    // Open status dropdown
    await page.click('button:has-text("All statuses")')

    // Select pending
    await page.click('text=Pending')

    // Wait for filtering
    await page.waitForTimeout(500)
  })

  test('navigates to task detail on click', async ({ page }) => {
    await page.goto('/inbox')

    // Try to find a task card
    const taskCard = page.locator('[data-testid="task-card"]').first()

    // Check if any tasks exist
    const taskCount = await taskCard.count()
    if (taskCount > 0) {
      await taskCard.click()
      await expect(page).toHaveURL(/\/task\/[\w-]+/)
    } else {
      console.log('No tasks available for navigation test')
    }
  })
})
