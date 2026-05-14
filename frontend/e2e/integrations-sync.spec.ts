import { test, expect } from '@playwright/test'

const API_URL = 'http://localhost:5000/api'

const connectedSlackIntegration = {
  id: 'int-1',
  provider: 'slack',
  status: 'connected',
  accountName: 'My Team',
  accountEmail: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
  syncedItemCount: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

test.describe('Integrations sync flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_URL}/integrations`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [connectedSlackIntegration] }),
      })
    )

    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token')
    })
  })

  test('clicking Sync Now disables the button and shows syncing state', async ({ page }) => {
    await page.route(`${API_URL}/integrations/slack/sync`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { jobId: 'int-1', status: 'queued' } }),
      })
    )

    await page.goto('/settings/integrations')

    const slackCard = page.locator('div').filter({ hasText: /^Slack/ }).first()
    const syncButton = slackCard.getByRole('button', { name: /Sync Now/i })

    await expect(syncButton).toBeVisible()
    await syncButton.click()

    await expect(syncButton).toBeDisabled()
  })

  test('shows Syncing badge after clicking Sync Now', async ({ page }) => {
    await page.route(`${API_URL}/integrations/slack/sync`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { jobId: 'int-1', status: 'queued' } }),
      })
    )

    await page.goto('/settings/integrations')

    const slackCard = page.locator('div').filter({ hasText: /^Slack/ }).first()
    await slackCard.getByRole('button', { name: /Sync Now/i }).click()

    await expect(page.getByText('Syncing')).toBeVisible()
  })

  test('Sync Now button re-enables when polling returns success status', async ({ page }) => {
    let callCount = 0

    await page.route(`${API_URL}/integrations/slack/sync`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { jobId: 'int-1', status: 'queued' } }),
      })
    )

    await page.route(`${API_URL}/integrations`, (route) => {
      callCount++
      const integration = callCount <= 1
        ? connectedSlackIntegration
        : { ...connectedSlackIntegration, syncStatus: 'success', syncedItemCount: 5 }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [integration] }),
      })
    })

    await page.goto('/settings/integrations')

    const slackCard = page.locator('div').filter({ hasText: /^Slack/ }).first()
    await slackCard.getByRole('button', { name: /Sync Now/i }).click()

    await expect(page.getByText('Success')).toBeVisible({ timeout: 15000 })

    const syncButton = slackCard.getByRole('button', { name: /Sync Now/i })
    await expect(syncButton).not.toBeDisabled({ timeout: 15000 })
  })
})
