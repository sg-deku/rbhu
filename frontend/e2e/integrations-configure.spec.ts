import { test, expect } from '@playwright/test'

const API_URL = 'http://localhost:5001/api'

const connectedSlack = {
  id: 'int-1',
  provider: 'slack',
  status: 'connected',
  accountName: 'My Team',
  accountEmail: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
  syncedItemCount: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockResources = [
  { id: 'C001', name: 'general', type: 'channel' },
  { id: 'C002', name: 'random', type: 'channel' },
]

const mockActivity = [
  {
    id: 'act-1',
    provider: 'slack',
    eventType: 'config_updated',
    message: 'Configuration updated for slack',
    detail: null,
    syncedItemCount: null,
    createdAt: new Date().toISOString(),
  },
]

test.describe('Integration configure flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_URL}/integrations`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [connectedSlack] }),
      })
    )

    await page.route(`${API_URL}/integrations/activity*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0 } }),
      })
    )

    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token')
    })
  })

  test('clicking Configure on Slack card opens drawer with resource list', async ({ page }) => {
    await page.route(`${API_URL}/integrations/slack/resources*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockResources, pagination: { page: 1, limit: 50, total: 2 } }),
      })
    )

    await page.route(`${API_URL}/integrations/slack/config`, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { selectedResourceIds: [] } }),
        })
      } else {
        route.continue()
      }
    })

    await page.goto('/settings/integrations')

    const slackCard = page.locator('div').filter({ hasText: /^Slack/ }).first()
    await slackCard.getByRole('button', { name: 'Configure' }).click()

    await expect(page.getByText('Configure Slack')).toBeVisible()
    await expect(page.getByText('general')).toBeVisible()
    await expect(page.getByText('random')).toBeVisible()
  })

  test('toggling a resource checkbox changes its checked state', async ({ page }) => {
    await page.route(`${API_URL}/integrations/slack/resources*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockResources, pagination: { page: 1, limit: 50, total: 2 } }),
      })
    )

    await page.route(`${API_URL}/integrations/slack/config`, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { selectedResourceIds: [] } }),
        })
      } else {
        route.continue()
      }
    })

    await page.goto('/settings/integrations')

    const slackCard = page.locator('div').filter({ hasText: /^Slack/ }).first()
    await slackCard.getByRole('button', { name: 'Configure' }).click()

    await page.waitForSelector('text=general')
    const checkboxes = page.getByRole('checkbox')
    await checkboxes.first().check()
    await expect(checkboxes.first()).toBeChecked()
  })

  test('clicking Save closes drawer and shows success toast', async ({ page }) => {
    await page.route(`${API_URL}/integrations/slack/resources*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockResources, pagination: { page: 1, limit: 50, total: 2 } }),
      })
    )

    await page.route(`${API_URL}/integrations/slack/config`, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { selectedResourceIds: [] } }),
        })
      } else if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { selectedResourceIds: ['C001'] } }),
        })
      }
    })

    await page.route(`${API_URL}/integrations/activity*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockActivity, pagination: { page: 1, limit: 20, total: 1 } }),
      })
    )

    await page.goto('/settings/integrations')

    const slackCard = page.locator('div').filter({ hasText: /^Slack/ }).first()
    await slackCard.getByRole('button', { name: 'Configure' }).click()

    await page.waitForSelector('text=general')
    await page.getByRole('checkbox').first().check()
    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText(/configuration saved/i)).toBeVisible()
  })

  test('activity log section is visible below integration cards', async ({ page }) => {
    await page.goto('/settings/integrations')
    await expect(page.getByText('Activity Log')).toBeVisible()
  })
})
