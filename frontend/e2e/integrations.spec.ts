import { test, expect } from '@playwright/test'

const API_URL = 'http://localhost:5000/api'

async function loginAndSetToken(page: any) {
  const res = await page.request.post(`${API_URL}/auth/login`, {
    data: { email: 'test@example.com', password: 'Test1234!' },
  })
  const body = await res.json()
  if (body.token) {
    await page.addInitScript((token: string) => {
      localStorage.setItem('token', token)
    }, body.token)
  }
}

test.describe('Integrations page', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/settings/integrations')
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows three integration cards with provider names', async ({ page }) => {
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

    await page.goto('/settings/integrations')

    await expect(page.getByText('Jira')).toBeVisible()
    await expect(page.getByText('Slack')).toBeVisible()
    await expect(page.getByText('Confluence')).toBeVisible()
  })

  test('each card shows a status badge', async ({ page }) => {
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

    await page.goto('/settings/integrations')

    const badges = page.getByText('Not Connected')
    await expect(badges.first()).toBeVisible()
  })
})
