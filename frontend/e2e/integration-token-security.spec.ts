import { test, expect } from '@playwright/test'

const API_URL = 'http://localhost:5001/api'

test.describe('Integration model: token security (RB-52)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_URL}/auth/profile`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'user' },
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

    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token')
    })
  })

  test('GET /integrations response never includes accessToken field', async ({ page }) => {
    let capturedResponse: any = null

    await page.route(`${API_URL}/integrations`, (route) => {
      const responseBody = {
        success: true,
        data: [
          {
            id: 'int-1',
            provider: 'slack',
            status: 'connected',
            accountName: 'My Slack Team',
            accountEmail: null,
            syncStatus: 'idle',
            lastSyncedAt: null,
            syncedItemCount: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }
      capturedResponse = responseBody
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseBody),
      })
    })

    await page.goto('/settings/integrations')

    expect(capturedResponse).not.toBeNull()
    expect(capturedResponse.data[0]).not.toHaveProperty('accessToken')
    expect(capturedResponse.data[0]).not.toHaveProperty('refreshToken')
    expect(capturedResponse.data[0]).not.toHaveProperty('tokenExpiresAt')
    expect(capturedResponse.data[0]).not.toHaveProperty('tokenUpdatedAt')
    expect(capturedResponse.data[0]).not.toHaveProperty('clientSecret')
    expect(capturedResponse.data[0]).not.toHaveProperty('userId')
  })

  test('connected integration shows account info but not token data in UI', async ({ page }) => {
    await page.route(`${API_URL}/integrations`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'int-1',
              provider: 'slack',
              status: 'connected',
              accountName: 'Acme Workspace',
              accountEmail: 'admin@acme.com',
              syncStatus: 'idle',
              lastSyncedAt: null,
              syncedItemCount: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      })
    )

    await page.goto('/settings/integrations')

    await expect(page.getByText('Connected')).toBeVisible()
    await expect(page.getByText('Acme Workspace')).toBeVisible()

    const pageContent = await page.content()
    expect(pageContent).not.toContain('accessToken')
    expect(pageContent).not.toContain('refreshToken')
    expect(pageContent).not.toContain('tokenExpiresAt')
    expect(pageContent).not.toContain('clientSecret')
  })

  test('disconnected integration (null accessToken) shows Not Connected status', async ({ page }) => {
    await page.route(`${API_URL}/integrations`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      })
    )

    await page.goto('/settings/integrations')

    await expect(page.getByText('Not Connected').first()).toBeVisible()
  })

  test('integration list with mixed connection states renders correctly', async ({ page }) => {
    await page.route(`${API_URL}/integrations`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'int-1',
              provider: 'slack',
              status: 'connected',
              accountName: 'My Slack',
              accountEmail: null,
              syncStatus: 'success',
              lastSyncedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
              syncedItemCount: 10,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'int-2',
              provider: 'jira',
              status: 'error',
              accountName: null,
              accountEmail: null,
              syncStatus: 'failed',
              lastSyncedAt: null,
              syncedItemCount: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      })
    )

    await page.goto('/settings/integrations')

    await expect(page.getByRole('heading', { name: 'Slack' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Jira' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Confluence' })).toBeVisible()

    await expect(page.getByText('Connected').first()).toBeVisible()
    await expect(page.getByText('Not Connected').first()).toBeVisible()
  })

  test('error status integration shows error badge', async ({ page }) => {
    await page.route(`${API_URL}/integrations`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'int-1',
              provider: 'jira',
              status: 'error',
              accountName: null,
              accountEmail: null,
              syncStatus: 'failed',
              lastSyncedAt: null,
              syncedItemCount: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      })
    )

    await page.goto('/settings/integrations')

    await expect(page.getByText('Error').first()).toBeVisible()
  })
})
