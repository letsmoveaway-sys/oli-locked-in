import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const { studentPassword, parentPassword } = JSON.parse(readFileSync('.e2e/auth.json', 'utf8')) as { studentPassword: string; parentPassword: string }

async function signIn(page: import('@playwright/test').Page, username: 'oliver' | 'parent', password: string) {
  await page.goto('/')
  await page.getByLabel('Username or email').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function openSurds(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Topics', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Subjects and topic allocations' })).toBeVisible()
  const mathematics = page.locator('.subject-overview').filter({ has: page.getByRole('heading', { name: 'Mathematics', exact: true }) })
  await mathematics.locator(':scope > summary').click()
  return mathematics.locator('.topic-allocation').filter({ hasText: 'Standard form and surds' })
}

async function expectNoSeriousAccessibilityIssues(page: import('@playwright/test').Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(result.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([])
}

test('student can inspect the detailed surds checklist and useful resources', async ({ page }) => {
  await signIn(page, 'oliver', studentPassword)
  const surds = await openSurds(page)
  await surds.getByRole('button', { name: /Standard form and surds/ }).click()

  await expect(page).toHaveURL(/view=topic&topic=maths-number-standard-surds/)
  await expect(page.getByRole('heading', { name: 'Standard form and surds', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What needs to be covered' })).toBeVisible()
  await expect(page.locator('.coverage-list--large li')).toHaveCount(11)
  await expect(page.getByText('Rationalise a denominator containing one surd')).toBeVisible()
  const bitesize = page.getByRole('link', { name: /Standard form and surds on BBC Bitesize/ })
  await expect(bitesize).toHaveAttribute('href', /^https:\/\/www\.bbc\.co\.uk\/bitesize\//)
  await expect(page.getByRole('link', { name: /Open official course source/ })).toBeVisible()
})

test('student completes a scheduled slot and unfinished coverage remains schedulable', async ({ page }) => {
  let completionRequest: { url: string; body: string } | null = null
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/sessions/complete') {
      completionRequest = { url: request.url(), body: request.postData() ?? '{}' }
    }
  })

  await signIn(page, 'oliver', studentPassword)
  await page.goto('/?view=plan')
  await expect(page.getByRole('heading', { name: 'Your next 14 days' })).toBeVisible()
  await page.getByRole('button', { name: /^(Build|Rebuild) schedule$/ }).click()

  const session = page.locator('.plan-session').filter({ has: page.getByRole('button', { name: 'Complete slot' }) }).first()
  await expect(session).toBeVisible()
  const topicName = await session.locator('h4').innerText()
  await session.getByRole('button', { name: 'Complete slot' }).click()
  await expect(page.getByRole('heading', { name: topicName })).toBeVisible()

  const firstCoverage = page.locator('.coverage-check').first()
  const coverageName = (await firstCoverage.innerText()).trim()
  await firstCoverage.getByRole('checkbox').check()
  await page.getByLabel('Session notes optional').fill('E2E scheduling coverage')
  await page.getByRole('button', { name: 'Save coverage' }).click()
  await expect(page.getByRole('status')).toContainText('Session completed')

  expect(completionRequest).not.toBeNull()
  const retry = await page.request.post(completionRequest!.url, {
    data: JSON.parse(completionRequest!.body),
    headers: { Origin: new URL(page.url()).origin },
  })
  expect(retry.ok()).toBe(true)

  const completedSession = page.locator('.plan-session').filter({ hasText: topicName }).filter({ hasText: 'completed' }).first()
  await completedSession.getByRole('button', { name: 'View topic' }).click()
  await expect(page.locator('li.is-covered').filter({ hasText: coverageName })).toBeVisible()
  await expect(page.getByText(/E2E scheduling coverage/)).toBeVisible()
  await expect(page.getByText(/follow-up slots required/)).toBeVisible()
})

test('topic routes survive refresh and key screens pass accessibility checks', async ({ page }) => {
  await page.goto('/?view=subjects')
  await page.getByLabel('Username or email').fill('oliver')
  await page.getByLabel('Password').fill(studentPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Subjects and topic allocations' })).toBeVisible()
  await expectNoSeriousAccessibilityIssues(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Subjects and topic allocations' })).toBeVisible()
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Today’s revision topics' })).toBeVisible()
  await expectNoSeriousAccessibilityIssues(page)
})

test('parent can allocate eight revision slots to surds', async ({ page }) => {
  await signIn(page, 'parent', parentPassword)
  await expectNoSeriousAccessibilityIssues(page)
  const surds = await openSurds(page)
  await surds.getByLabel('Allocated revision slots').fill('8')
  await surds.getByRole('button', { name: 'Save allocation' }).click()
  await expect(page.getByRole('status')).toContainText('Topic allocation updated')
  await expect(surds.getByLabel('Allocated revision slots')).toHaveValue('8')
})
