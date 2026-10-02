import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import ExcelJS from 'exceljs'

const workbookPath = resolve('tools', 'curriculum-coverage-checklist.xlsx')
const workbook = new ExcelJS.Workbook()
await workbook.xlsx.readFile(workbookPath)

const checklist = workbook.getWorksheet('Checklist')
const summary = workbook.getWorksheet('Summary')
if (!checklist || !summary) throw new Error('Workbook must contain Checklist and Summary worksheets.')

const headerValues = checklist.getRow(3).values.slice(1)
for (const required of ['Complete', 'Subject', 'Level 1', 'Description', 'Component / paper', 'Tier', 'Applicability', 'Source']) {
  if (!headerValues.includes(required)) throw new Error(`Checklist is missing the ${required} column.`)
}

const dataRows = checklist.actualRowCount - 3
if (dataRows !== 710) throw new Error(`Expected 710 detailed checklist rows, found ${dataRows}.`)
if (summary.actualRowCount < 11) throw new Error('Summary worksheet does not contain all eight subjects and totals.')

const firstStatus = checklist.getCell('A4')
if (firstStatus.value !== '☐' || firstStatus.dataValidation?.type !== 'list') throw new Error('Checklist status cells must use the ☐/☑ dropdown.')

let links = 0
for (let rowNumber = 4; rowNumber <= checklist.actualRowCount; rowNumber += 1) {
  const row = checklist.getRow(rowNumber)
  const source = row.getCell(checklist.columnCount).value
  if (source && typeof source === 'object' && 'hyperlink' in source) links += 1
}
if (links < 700) throw new Error(`Expected source links for the curriculum rows, found ${links}.`)

const file = await stat(workbookPath)
if (file.size < 50_000) throw new Error(`Workbook is unexpectedly small (${file.size} bytes).`)

console.log(`Excel checklist validation passed: ${dataRows} rows, ${links} source links, ${Math.round(file.size / 1024)} KB.`)
