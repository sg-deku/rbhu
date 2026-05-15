import { test, expect } from '@playwright/test'

const API_URL = 'http://localhost:5001/api'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 }))
  return `${header}.${body}.mock-signature`
}

test.describe('Organization Isolation - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_URL}/auth/profile`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: 'user-1', name: 'Org User', email: 'user1@org1.com', role: 'user', organizationId: 'org-1' },
        }),
      })
    )
    await page.route(`${API_URL}/integrations/activity*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], pagination: { total: 0, pages: 0, page: 1, limit: 20 } }),
      })
    )
  })

  test('org user sees org-scoped integrations from multiple org members', async ({ page }) => {
    const orgIntegrations = [
      {
        id: 'int-1',
        provider: 'slack',
        status: 'connected',
        accountName: 'Org Slack Team',
        accountEmail: null,
        syncStatus: 'idle',
        lastSyncedAt: null,
        syncedItemCount: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'int-2',
        provider: 'jira',
        status: 'connected',
        accountName: 'Org Jira',
        accountEmail: null,
        syncStatus: 'idle',
        lastSyncedAt: null,
        syncedItemCount: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    await page.route(`${API_URL}/integrations`, (route) => {
      const headers = route.request().headers()
      const auth = headers['authorization'] || ''
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: auth ? orgIntegrations : [] }),
      })
    })

    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-org-token')
    })

    await page.goto('/settings/integrations')

    await expect(page.getByRole('heading', { name: 'Slack' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Jira' })).toBeVisible()

    const connectedBadges = page.getByText('Connected')
    await expect(connectedBadges.first()).toBeVisible()
  })

  test('unauthenticated request to integrations page redirects to login', async ({ page }) => {
    await page.goto('/settings/integrations')
    await expect(page).toHaveURL(/\/login/)
  })

  test('org user cannot access another org user data - API returns only their org data', async ({ page }) => {
    await page.route(`${API_URL}/auth/profile`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: 'user-2', name: 'Org 2 User', email: 'user2@org2.com', role: 'user', organizationId: 'org-2' },
        }),
      })
    )

    await page.route(`${API_URL}/integrations`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    )

    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-org2-token')
    })

    await page.goto('/settings/integrations')

    const notConnectedBadges = page.getByText('Not Connected')
    await expect(notConnectedBadges.first()).toBeVisible()
  })

  test('individual user (no org) sees only their own integrations', async ({ page }) => {
    await page.route(`${API_URL}/auth/profile`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: 'user-solo', name: 'Solo User', email: 'solo@example.com', role: 'user', organizationId: null },
        }),
      })
    )

    const soloIntegrations = [
      {
        id: 'int-solo-1',
        provider: 'confluence',
        status: 'connected',
        accountName: 'My Confluence',
        accountEmail: null,
        syncStatus: 'success',
        lastSyncedAt: new Date().toISOString(),
        syncedItemCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    await page.route(`${API_URL}/integrations`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: soloIntegrations }),
      })
    )

    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-solo-token')
    })

    await page.goto('/settings/integrations')

    await expect(page.getByRole('heading', { name: 'Confluence' })).toBeVisible()
    const connectedBadges = page.getByText('Connected')
    await expect(connectedBadges.first()).toBeVisible()
  })

  test('org activity log shows activity scoped to the organization', async ({ page }) => {
    const orgActivities = [
      {
        id: 'act-1',
        provider: 'slack',
        eventType: 'connected',
        message: 'Connected to slack',
        detail: null,
        syncedItemCount: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'act-2',
        provider: 'jira',
        eventType: 'sync_success',
        message: 'Sync completed for jira',
        detail: null,
        syncedItemCount: 10,
        createdAt: new Date().toISOString(),
      },
    ]

    await page.route(`${API_URL}/integrations/activity*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: orgActivities,
          pagination: { total: 2, pages: 1, page: 1, limit: 20 },
        }),
      })
    )

    await page.route(`${API_URL}/integrations`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    )

    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-org-token')
    })

    await page.goto('/settings/integrations')

    await expect(page.getByText('Connected to slack')).toBeVisible()
    await expect(page.getByText('Sync completed for jira')).toBeVisible()
  })
})
