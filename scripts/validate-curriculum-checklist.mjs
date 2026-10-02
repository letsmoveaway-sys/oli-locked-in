import { strict as assert } from 'node:assert'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const checklistPath = join(projectRoot, 'tools', 'curriculum-coverage-checklist.html')
assert(existsSync(checklistPath), 'Generate the curriculum checklist before validating it.')

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.goto(pathToFileURL(checklistPath).href)
  const total = Number(await page.locator('#total-count').textContent())
  assert(total >= 600, `Expected a detailed curriculum, found only ${total} leaf topics.`)

  await page.locator('#search').fill('surds')
  await page.getByText('Standard form and surds', { exact: true }).waitFor()
  await page.getByText('Simplify surds by identifying square factors', { exact: true }).waitFor()
  await page.getByLabel('Mark covered: Simplify surds by identifying square factors').click()
  assert.equal(await page.locator('#done-count').textContent(), '1')

  await page.reload()
  assert.equal(await page.locator('#done-count').textContent(), '1', 'A completed tick was not retained after reload.')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  assert.equal(await page.locator('#done-count').textContent(), '0')
  console.log(`Checklist validation passed with ${total} detailed topics.`)
} finally {
  await browser.close()
}
