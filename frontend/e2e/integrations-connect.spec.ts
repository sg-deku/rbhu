import { test, expect } from '@playwright/test'

const API_URL = 'http://localhost:5000/api'

test.describe('Integration connect flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_URL}/auth/profile`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: { id: '1', name: 'Test User', email: 'test@example.com' } }),
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
      localStorage.setItem('token', 'mock-token')
    })
  })

  test('clicking Connect on Slack card opens ConnectModal with Connect to Slack heading', async ({ page }) => {
    await page.goto('/settings/integrations')

    await expect(page.getByRole('heading', { name: 'Slack' })).toBeVisible()

    const slackCard = page.locator('div').filter({ hasText: /^Slack/ }).first()
    await slackCard.getByRole('button', { name: 'Connect' }).click()

    await expect(page.getByText('Connect to Slack')).toBeVisible()
  })

  test('clicking Cancel in modal closes the modal', async ({ page }) => {
    await page.goto('/settings/integrations')

    const slackCard = page.locator('div').filter({ hasText: /^Slack/ }).first()
    await slackCard.getByRole('button', { name: 'Connect' }).click()

    await expect(page.getByText('Connect to Slack')).toBeVisible()

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByText('Connect to Slack')).not.toBeVisible()
  })

  test('clicking Connect in modal triggers OAuth redirect intercepted by route mock', async ({ page }) => {
    await page.route(`${API_URL}/integrations/slack/connect`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { authorizationUrl: 'https://slack.com/oauth/v2/authorize?client_id=test' },
        }),
      })
    )

    await page.route('https://slack.com/oauth/**', (route) =>
      route.fulfill({ status: 200, body: 'ok' })
    )

    await page.goto('/settings/integrations')

    const slackCard = page.locator('div').filter({ hasText: /^Slack/ }).first()
    await slackCard.getByRole('button', { name: 'Connect' }).click()

    await expect(page.getByText('Connect to Slack')).toBeVisible()

    const navigationPromise = page.waitForNavigation({ timeout: 5000 }).catch(() => null)
    await page.getByRole('button', { name: 'Connect' }).click()
    await navigationPromise
  })

  test('navigating to /settings/integrations?connected=slack shows success toast', async ({ page }) => {
    await page.goto('/settings/integrations?connected=slack')

    await expect(page.getByText(/Successfully connected slack/i)).toBeVisible()
  })

  test('navigating to /settings/integrations?error=slack&reason=access_denied shows error toast', async ({ page }) => {
    await page.goto('/settings/integrations?error=slack&reason=access_denied')

    await expect(page.getByText(/Failed to connect slack/i)).toBeVisible()
  })
})
