import { test, expect } from '@playwright/test'

const API_URL = 'http://localhost:5001/api'

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

test.describe('Integrations disconnect flow', () => {
  test.beforeEach(async ({ page }) => {
    // page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    await page.route('**/api/auth/profile', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'user' }),
      })
    )

    await page.route('**/api/integrations', (route) => {
      const url = route.request().url();
      if (route.request().method() === 'GET' && (url.endsWith('/integrations') || url.endsWith('/integrations/'))) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [connectedSlackIntegration] }),
        })
      }
      return route.continue();
    })

    await page.route('**/api/integrations/activity**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], pagination: { total: 0, page: 1, limit: 20 } }),
      })
    )

    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token')
    })
  })

  test('clicking Disconnect opens DisconnectDialog with warning text', async ({ page }) => {
    await page.goto('/settings/integrations')
    await expect(page.getByText('Connected')).toBeVisible()

    const slackCard = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Slack' }) }).first()
    const disconnectButton = slackCard.getByRole('button', { name: /Disconnect/i })

    await expect(disconnectButton).toBeVisible()
    await disconnectButton.click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/stored tokens and sync history for Slack/)).toBeVisible()
    await expect(page.getByText(/This action cannot be undone/)).toBeVisible()
  })

  test('clicking Cancel closes the dialog and card still shows Connected', async ({ page }) => {
    await page.goto('/settings/integrations')
    await expect(page.getByText('Connected')).toBeVisible()

    const slackCard = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Slack' }) }).first()
    await slackCard.getByRole('button', { name: /Disconnect/i }).click()

    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('button', { name: /cancel/i }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Connected')).toBeVisible()
  })

  test('confirming disconnect removes card integration and shows success toast', async ({ page }) => {
    await page.route('**/api/integrations/slack', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Integration disconnected' }),
      })
    )

    await page.goto('/settings/integrations')
    await expect(page.getByText('Connected')).toBeVisible()

    const slackCard = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Slack' }) }).first()
    await slackCard.getByRole('button', { name: /Disconnect/i }).click()

    await expect(page.getByRole('dialog')).toBeVisible()

    const confirmButton = page.getByRole('dialog').getByRole('button', { name: /disconnect/i })
    await confirmButton.click()

    await expect(page.getByText('Disconnected Slack')).toBeVisible()
    await expect(page.getByText('Connected')).not.toBeVisible()
  })
})
