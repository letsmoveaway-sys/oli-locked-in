import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const { studentPassword, parentPassword } = JSON.parse(readFileSync('.e2e/auth.json', 'utf8')) as { studentPassword: string; parentPassword: string }

async function expectNoSeriousAccessibilityIssues(page: import('@playwright/test').Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(result.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([])
}

test('student can learn a topic and check an answer', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Username or email').fill('oliver')
  await page.getByLabel('Password').fill(studentPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Learn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'What you will be tested on' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Exam papers and mark schemes/ }).first()).toBeVisible()
  const medicine = page.locator('.topic-list details').filter({ has: page.getByText('Medicine in Britain, c1250–present', { exact: true }) }).first()
  await medicine.locator('summary').click()
  await medicine.getByRole('button', { name: 'Learn and practise' }).first().click()
  await expect(page.getByRole('heading', { name: 'Understand the topic first' })).toBeVisible()
  await page.getByRole('button', { name: '2. Worked examples' }).click()
  await expect(page.getByRole('heading', { name: 'See how to work it through' })).toBeVisible()
  await page.getByRole('button', { name: 'Show high-level exemplar' }).first().click()
  await expect(page.getByText(/Exemplar answer:/).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /official specification content/ })).toBeVisible()
  await page.getByRole('button', { name: '3. Test yourself' }).click()
  await page.getByRole('button', { name: 'Continue on phone' }).click()
  await expect(page.getByRole('img', { name: /QR code linking to this revision question/ })).toBeVisible()
  const phoneLink = await page.getByLabel('Phone link').inputValue()
  expect(new URL(phoneLink).searchParams.get('stage')).toBe('test')
  await page.context().clearCookies()
  await page.goto(phoneLink)
  await page.getByLabel('Username or email').fill('oliver')
  await page.getByLabel('Password').fill(studentPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Written exam practice')).toBeVisible()
  await page.getByLabel('Type your answer in the app').fill('A developed answer using precise knowledge and an explained consequence.')
  await expect(page.getByText(/One-tap marking is not connected/)).toBeVisible()
  await page.getByLabel(/I understand and want to use optional AI marking/).check()
  await page.getByRole('button', { name: /Mark with Gemini.*no API key/ }).click()
  await expect(page.getByRole('heading', { name: /Optional Gemini marking/ })).toBeVisible()
  await expect(page.getByLabel('Prepared prompt')).toContainText('A developed answer using precise knowledge')
  await expect(page.getByRole('link', { name: /Open Gemini/ })).toHaveAttribute('href', 'https://gemini.google.com/app')
  await expect(page.getByText('No generic quiz has been substituted for this topic.')).toBeVisible()
})

test('student signs in, completes revision and sees updated evidence', async ({ page }) => {
  let completionRequest: { url: string; body: string } | null = null
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/sessions/complete') {
      completionRequest = { url: request.url(), body: request.postData() ?? '{}' }
    }
  })
  await page.goto('/')
  await page.getByLabel('Username or email').fill('oliver')
  await page.getByLabel('Password').fill(studentPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Your revision for today' })).toBeVisible()

  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Subject overview' }).click()
  const history = page.locator('.subject-overview').filter({ has: page.getByRole('heading', { name: 'History', exact: true }) })
  await history.locator('summary').click()
  const topicButton = history.locator('.subject-topic-list button').first()
  const topicName = await topicButton.locator('strong').innerText()
  await topicButton.click()
  await page.getByRole('button', { name: 'Revise now' }).click()

  const session = page.locator('.today-session').filter({ hasText: 'Revision now' }).filter({ has: page.getByRole('button', { name: 'Complete' }) }).first()
  await expect(session).toContainText(topicName)
  await session.getByRole('button', { name: 'Complete' }).click()
  await page.getByLabel('Actual time spent (minutes)').fill('12')
  await page.getByRole('button', { name: 'Confident', exact: true }).click()
  await page.getByLabel('Quick-check score % optional').fill('80')
  await page.getByLabel('Notes optional').fill('E2E completion evidence')
  await page.getByRole('button', { name: 'Save and finish' }).click()
  await expect(page.getByRole('status')).toContainText('Session completed')
  const xpTotal = page.getByText(/XP total/)
  await expect(xpTotal).toBeVisible()
  const xpBeforeRetry = await xpTotal.innerText()

  expect(completionRequest).not.toBeNull()
  const retry = await page.request.post(completionRequest!.url, {
    data: JSON.parse(completionRequest!.body),
    headers: { Origin: new URL(page.url()).origin },
  })
  expect(retry.ok()).toBe(true)
  await page.reload()
  await expect(page.getByText(/XP total/)).toHaveText(xpBeforeRetry)

  const completedSession = page.locator('.today-session').filter({ hasText: topicName }).filter({ has: page.getByRole('button', { name: 'Review content' }) }).first()
  await completedSession.getByRole('button', { name: 'Review content' }).click()
  await expect(page.getByRole('status')).toContainText('Nothing in this session will replace or change your saved test scores')
  await page.getByRole('button', { name: /Back/ }).click()

  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Subject overview' }).click()
  await history.locator('summary').click()
  await history.getByRole('button', { name: new RegExp(topicName) }).click()
  await expect(page.locator('.saved-notes')).toHaveText('E2E completion evidence')
})

test('student routes survive refresh and key screens pass accessibility checks', async ({ page }) => {
  await page.goto('/?view=progress')
  await page.getByLabel('Username or email').fill('oliver')
  await page.getByLabel('Password').fill(studentPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Your topic progress' })).toBeVisible()
  await expectNoSeriousAccessibilityIssues(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your topic progress' })).toBeVisible()
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your revision for today' })).toBeVisible()
  await expectNoSeriousAccessibilityIssues(page)
})

test('parent can reset POC activity without deleting configuration', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Username or email').fill('parent')
  await page.getByLabel('Password').fill(parentPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expectNoSeriousAccessibilityIssues(page)
  await page.getByRole('button', { name: 'Reset POC revision progress' }).click()
  await page.getByLabel(/Type RESET PROGRESS/).fill('RESET PROGRESS')
  await page.getByRole('button', { name: 'Clear trial activity' }).click()
  await expect(page.getByRole('status')).toContainText('POC revision activity was cleared')
  await expect(page.getByRole('button', { name: 'Course configuration' })).toBeVisible()
})
