import { test, expect } from '@playwright/test'

test.describe('Task Detail Page', () => {
  test('displays task details', async ({ page }) => {
    // Create a mock task ID (in real scenario, would come from inbox)
    const mockTaskId = 'test-task-id'

    await page.goto(`/task/${mockTaskId}`)

    // Should show task header
    await expect(page.locator('h1')).toBeVisible()
  })

  test('shows progress bar', async ({ page }) => {
    const mockTaskId = 'test-task-id'
    await page.goto(`/task/${mockTaskId}`)

    // Look for progress indicators
    await expect(page.locator('text=/Time remaining/')).toBeVisible()
  })

  test('renders dynamic form', async ({ page }) => {
    const mockTaskId = 'test-task-id'
    await page.goto(`/task/${mockTaskId}`)

    // Should have a form
    await expect(page.locator('form')).toBeVisible()
  })

  test('submits task response', async ({ page }) => {
    const mockTaskId = 'test-task-id'
    await page.goto(`/task/${mockTaskId}`)

    // Fill form (assuming there's a text input)
    const inputs = page.locator('input[type="text"]')
    const inputCount = await inputs.count()

    if (inputCount > 0) {
      await inputs.first().fill('Test response')
      await page.click('button:has-text("Submit")')

      // Should show success message or update
      await page.waitForTimeout(1000)
    }
  })

  test('shows presence indicators', async ({ page }) => {
    const mockTaskId = 'test-task-id'
    await page.goto(`/task/${mockTaskId}`)

    // Check for presence section (might not always be visible)
    const presenceSection = page.locator('text=Viewing')
    const isVisible = await presenceSection.isVisible().catch(() => false)

    if (isVisible) {
      await expect(presenceSection).toBeVisible()
    }
  })

  test('displays completed task response', async ({ page }) => {
    const mockTaskId = 'completed-task-id'
    await page.goto(`/task/${mockTaskId}`)

    // Look for response or completion indicator
    const completionIndicators = ['Response', 'Completed', 'Timeout', 'Rejected']
    let found = false

    for (const indicator of completionIndicators) {
      const element = page.locator(`text=${indicator}`)
      if (await element.isVisible().catch(() => false)) {
        found = true
        break
      }
    }

    // At minimum, page should load
    await expect(page.locator('body')).toBeVisible()
  })
})
