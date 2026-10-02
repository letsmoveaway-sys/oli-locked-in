import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ExcelJS from 'exceljs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const databaseRoot = join(projectRoot, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject')
const outputPath = join(projectRoot, 'tools', 'curriculum-coverage-checklist.html')
const excelOutputPath = join(projectRoot, 'tools', 'curriculum-coverage-checklist.xlsx')

function sqliteFiles(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? sqliteFiles(path) : name.endsWith('.sqlite') ? [path] : []
  })
}

function readCurriculum(path) {
  const database = new DatabaseSync(path, { readOnly: true })
  try {
    const hasTopics = database.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'topics'").get().count
    if (!hasTopics) return null
    const subjects = database.prepare(`
      SELECT DISTINCT s.id, s.name, s.exam_board AS examBoard, s.specification_code AS specificationCode
      FROM subjects s JOIN topics t ON t.subject_id = s.id
      WHERE t.active = 1 ORDER BY s.name
    `).all()
    const topics = database.prepare(`
      SELECT id, subject_id AS subjectId, parent_topic_id AS parentTopicId, component, name,
             description, tier, applicability, source_reference AS sourceReference
      FROM topics WHERE active = 1 ORDER BY subject_id, component, name
    `).all()
    return subjects.length && topics.length ? { subjects, topics } : null
  } finally {
    database.close()
  }
}

const candidates = sqliteFiles(databaseRoot)
  .map((path) => ({ path, curriculum: readCurriculum(path) }))
  .filter((item) => item.curriculum)
  .sort((left, right) => right.curriculum.topics.length - left.curriculum.topics.length)

if (!candidates.length) {
  throw new Error('No migrated local curriculum database was found. Run npm run db:migrate:local first.')
}

const curriculum = candidates[0].curriculum

const coverageOverrides = {
  'maths-number-standard-surds': [
    'Convert between ordinary numbers and standard form',
    'Compare and order numbers in standard form',
    'Calculate with numbers in standard form',
    'Solve contextual problems using standard form',
    'Simplify surds by identifying square factors',
    'Add and subtract like surds',
    'Multiply surds and simplify the result',
    'Expand brackets containing surds',
    'Rationalise a denominator containing one surd',
    'Rationalise a binomial denominator using a conjugate',
    'Use exact surd values in multi-step problems',
  ],
}

function coveragePoints(topic) {
  const overridden = coverageOverrides[topic.id]
  if (overridden) return overridden
  const text = String(topic.description ?? '').replace(/[.;]+$/, '')
  if (!text) return []
  const parts = text
    .split(/\s*;\s*|\s*\.\s+(?=[A-Z])/)
    .flatMap((part) => part.includes(',') ? part.split(/\s*,\s*/) : [part])
    .map((part) => part.trim())
    .filter((part) => part.length >= 4)
  return [...new Set(parts.map((part) => part[0].toUpperCase() + part.slice(1)))]
}

const existingParentIds = new Set(curriculum.topics.map((topic) => topic.parentTopicId).filter(Boolean))
const detailTopics = curriculum.topics.flatMap((topic) => {
  if (existingParentIds.has(topic.id)) return []
  const points = coveragePoints(topic)
  if (points.length < 2) return []
  return points.map((name, index) => ({
    id: `${topic.id}--coverage-${index + 1}`,
    subjectId: topic.subjectId,
    parentTopicId: topic.id,
    component: topic.component,
    name,
    description: '',
    tier: topic.tier,
    applicability: topic.applicability,
    sourceReference: topic.sourceReference,
    derivedCoveragePoint: true,
  }))
})

curriculum.topics.push(...detailTopics)
const generatedAt = new Date().toISOString()
const encodedData = JSON.stringify({ ...curriculum, generatedAt }).replaceAll('</script>', '<\\/script>')

function curriculumLeaves() {
  const byId = new Map(curriculum.topics.map((topic) => [topic.id, topic]))
  const childIds = new Set(curriculum.topics.map((topic) => topic.parentTopicId).filter(Boolean))
  return curriculum.topics.filter((topic) => !childIds.has(topic.id)).map((topic) => {
    const path = []
    let current = topic
    while (current) {
      path.unshift(current)
      current = current.parentTopicId ? byId.get(current.parentTopicId) : null
    }
    return { topic, path }
  }).sort((left, right) => {
    const leftSubject = curriculum.subjects.find((subject) => subject.id === left.topic.subjectId)?.name ?? ''
    const rightSubject = curriculum.subjects.find((subject) => subject.id === right.topic.subjectId)?.name ?? ''
    return leftSubject.localeCompare(rightSubject) || left.path.map((item) => item.name).join(' / ').localeCompare(right.path.map((item) => item.name).join(' / '))
  })
}

async function writeExcelChecklist() {
  const leaves = curriculumLeaves()
  const maximumDepth = Math.max(...leaves.map((item) => item.path.length))
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Oli: Locked In'
  workbook.created = new Date(generatedAt)
  workbook.modified = new Date(generatedAt)
  workbook.properties.date1904 = false
  workbook.calcProperties.fullCalcOnLoad = true

  const checklist = workbook.addWorksheet('Checklist', {
    properties: { defaultRowHeight: 18, outlineLevelCol: 1 },
    views: [{ state: 'frozen', xSplit: 2, ySplit: 3, activeCell: 'C4' }],
  })
  const headers = ['Complete', 'Subject', ...Array.from({ length: maximumDepth }, (_, index) => `Level ${index + 1}`), 'Description', 'Component / paper', 'Tier', 'Applicability', 'Source']
  checklist.mergeCells(1, 1, 1, headers.length)
  checklist.getCell(1, 1).value = 'GCSE curriculum coverage checklist'
  checklist.getCell(1, 1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 18 }
  checklist.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17324D' } }
  checklist.getCell(1, 1).alignment = { vertical: 'middle' }
  checklist.getRow(1).height = 32
  checklist.mergeCells(2, 1, 2, headers.length)
  checklist.getCell(2, 1).value = 'Choose ☐ or ☑ in the Complete column. Filter by subject, level, paper or tier to plan revision.'
  checklist.getCell(2, 1).font = { italic: true, color: { argb: 'FF405B69' } }
  checklist.getCell(2, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF2F5' } }
  checklist.getCell(2, 1).alignment = { vertical: 'middle', wrapText: true }
  checklist.getRow(2).height = 30
  const headerRow = checklist.getRow(3)
  headerRow.values = headers
  headerRow.height = 27
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2455D6' } }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF17324D' } } }
  })

  const subjectById = new Map(curriculum.subjects.map((subject) => [subject.id, subject]))
  leaves.forEach(({ topic, path }, index) => {
    const subject = subjectById.get(topic.subjectId)
    const rowNumber = index + 4
    const sourceColumn = headers.length
    const values = ['☐', subject?.name ?? topic.subjectId, ...path.map((item) => item.name), ...Array(maximumDepth - path.length).fill(''), topic.description ?? '', topic.component ?? '', topic.tier === 'both' ? 'All tiers' : topic.tier ?? '', topic.applicability === 'common' ? 'Common' : topic.applicability ?? '', '']
    const row = checklist.addRow(values)
    row.alignment = { vertical: 'top', wrapText: true }
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(1).font = { size: 14, color: { argb: 'FF496178' } }
    row.getCell(1).dataValidation = { type: 'list', allowBlank: false, formulae: ['"☐,☑"'], showErrorMessage: true, errorTitle: 'Choose a checklist value', error: 'Select ☐ or ☑ from the dropdown.' }
    if (topic.sourceReference) {
      row.getCell(sourceColumn).value = { text: 'Open source', hyperlink: topic.sourceReference, tooltip: topic.sourceReference }
      row.getCell(sourceColumn).font = { color: { argb: 'FF2455D6' }, underline: true }
    }
    if (index % 2 === 1) row.eachCell((cell) => { if (!cell.fill || cell.fill.type !== 'pattern') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FC' } } })
    if (index > 0 && leaves[index - 1].topic.subjectId !== topic.subjectId) {
      row.eachCell((cell) => { cell.border = { top: { style: 'medium', color: { argb: 'FF2455D6' } } } })
    }
    if (rowNumber % 100 === 0) checklist.getCell(rowNumber, 1).note = 'Use the dropdown to change this cell from ☐ to ☑.'
    row.getCell(maximumDepth + 3).alignment = { vertical: 'top', wrapText: true }
  })

  const finalRow = leaves.length + 3
  checklist.autoFilter = { from: { row: 3, column: 1 }, to: { row: finalRow, column: headers.length } }
  checklist.getColumn(1).width = 12
  checklist.getColumn(2).width = 24
  for (let index = 0; index < maximumDepth; index += 1) checklist.getColumn(index + 3).width = index === maximumDepth - 1 ? 42 : 30
  checklist.getColumn(maximumDepth + 3).width = 48
  checklist.getColumn(maximumDepth + 4).width = 24
  checklist.getColumn(maximumDepth + 5).width = 14
  checklist.getColumn(maximumDepth + 6).width = 18
  checklist.getColumn(maximumDepth + 7).width = 16
  checklist.addConditionalFormatting({
    ref: `A4:A${finalRow}`,
    rules: [{ type: 'cellIs', operator: 'equal', formulae: ['"☑"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE7F7F0' }, fgColor: { argb: 'FFE7F7F0' } }, font: { color: { argb: 'FF16805C' }, bold: true } } }],
  })

  const summary = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 2 }] })
  summary.mergeCells('A1:G1')
  summary.getCell('A1').value = 'Curriculum coverage by subject'
  summary.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 18 }
  summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17324D' } }
  summary.getRow(1).height = 32
  const summaryHeaders = ['Subject', 'Exam board', 'Specification', 'Detailed topics', 'Covered', 'Remaining', 'Completion']
  const summaryHeader = summary.getRow(2)
  summaryHeader.values = summaryHeaders
  summaryHeader.eachCell((cell) => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2455D6' } } })
  curriculum.subjects.forEach((subject, index) => {
    const rowNumber = index + 3
    const total = leaves.filter((item) => item.topic.subjectId === subject.id).length
    const row = summary.addRow([subject.name, subject.examBoard ?? '', subject.specificationCode ?? '', total])
    row.getCell(5).value = { formula: `COUNTIFS(Checklist!$B$4:$B$${finalRow},A${rowNumber},Checklist!$A$4:$A$${finalRow},"☑")`, result: 0 }
    row.getCell(6).value = { formula: `D${rowNumber}-E${rowNumber}`, result: total }
    row.getCell(7).value = { formula: `IFERROR(E${rowNumber}/D${rowNumber},0)`, result: 0 }
    row.getCell(7).numFmt = '0%'
  })
  summary.addRow([])
  const totalRowNumber = curriculum.subjects.length + 4
  const totalRow = summary.addRow(['All subjects', '', '', { formula: `SUM(D3:D${totalRowNumber - 2})`, result: leaves.length }, { formula: `SUM(E3:E${totalRowNumber - 2})`, result: 0 }, { formula: `SUM(F3:F${totalRowNumber - 2})`, result: leaves.length }, { formula: `IFERROR(E${totalRowNumber}/D${totalRowNumber},0)`, result: 0 }])
  totalRow.font = { bold: true }
  totalRow.getCell(7).numFmt = '0%'
  summary.columns = [{ width: 26 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 14 }]
  summary.autoFilter = 'A2:G2'

  await workbook.xlsx.writeFile(excelOutputPath)
  return { leaves: leaves.length, maximumDepth }
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GCSE curriculum coverage checklist</title>
  <style>
    :root { color-scheme: light; --ink:#17243a; --muted:#657287; --paper:#f4f6fa; --card:#fff; --line:#d9dfeb; --blue:#2455d6; --blue-soft:#eaf0ff; --green:#16805c; --green-soft:#e7f7f0; --amber:#a65b00; --shadow:0 14px 40px rgba(31,48,82,.09); }
    * { box-sizing:border-box; }
    body { background:linear-gradient(145deg,#f7f9fc 0,#edf2fa 100%); color:var(--ink); font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; margin:0; min-height:100vh; }
    button,input { font:inherit; }
    button { cursor:pointer; }
    .shell { margin:0 auto; max-width:1180px; padding:32px 22px 80px; }
    .hero { align-items:flex-end; display:flex; gap:24px; justify-content:space-between; margin-bottom:24px; }
    .eyebrow { color:var(--blue); font-size:.76rem; font-weight:800; letter-spacing:.11em; margin:0 0 7px; text-transform:uppercase; }
    h1 { font-size:clamp(2rem,5vw,3.65rem); letter-spacing:-.045em; line-height:.98; margin:0; max-width:750px; }
    .intro { color:var(--muted); font-size:1rem; line-height:1.6; margin:14px 0 0; max-width:760px; }
    .save-note { background:var(--green-soft); border:1px solid #b9e4d4; border-radius:999px; color:#126348; flex:none; font-size:.82rem; font-weight:750; padding:9px 13px; }
    .dashboard { background:rgba(255,255,255,.88); border:1px solid rgba(217,223,235,.9); border-radius:20px; box-shadow:var(--shadow); margin-bottom:18px; padding:18px; position:sticky; top:10px; z-index:5; backdrop-filter:blur(14px); }
    .stats { display:grid; gap:10px; grid-template-columns:repeat(3,1fr); margin-bottom:14px; }
    .stat { background:var(--paper); border-radius:12px; padding:12px 14px; }
    .stat strong { display:block; font-size:1.35rem; }
    .stat span { color:var(--muted); font-size:.78rem; font-weight:650; }
    .progress { background:#e5e9f1; border-radius:20px; height:9px; overflow:hidden; }
    .progress span { background:linear-gradient(90deg,var(--blue),#5e83eb); display:block; height:100%; transition:width .2s ease; }
    .tools { display:grid; gap:10px; grid-template-columns:minmax(220px,1fr) auto auto; margin-top:15px; }
    .search { border:1px solid var(--line); border-radius:10px; min-height:42px; padding:8px 12px; width:100%; }
    .button { background:var(--ink); border:1px solid var(--ink); border-radius:10px; color:white; font-weight:750; min-height:42px; padding:8px 14px; }
    .button.secondary { background:white; border-color:var(--line); color:var(--ink); }
    .tool-row { display:flex; flex-wrap:wrap; gap:9px; margin-top:10px; }
    .toggle { align-items:center; color:var(--muted); display:flex; font-size:.87rem; font-weight:650; gap:7px; margin-right:auto; }
    .toggle input { accent-color:var(--blue); height:18px; width:18px; }
    .subject { background:var(--card); border:1px solid var(--line); border-radius:18px; box-shadow:0 7px 25px rgba(31,48,82,.055); margin:13px 0; overflow:hidden; }
    .subject > summary { align-items:center; cursor:pointer; display:grid; gap:18px; grid-template-columns:1fr auto; list-style:none; padding:20px 22px; }
    .subject > summary::-webkit-details-marker,.branch > summary::-webkit-details-marker { display:none; }
    .subject > summary::before { color:var(--muted); content:"›"; font-size:1.7rem; grid-column:2; grid-row:1; transform:rotate(0); transition:transform .15s; }
    .subject[open] > summary::before { transform:rotate(90deg); }
    .subject-title { grid-column:1; grid-row:1; }
    .subject-title h2 { font-size:1.35rem; margin:2px 0 5px; }
    .subject-title p { color:var(--muted); font-size:.82rem; margin:0; }
    .subject-count { grid-column:2; grid-row:2; text-align:right; }
    .subject-count strong { display:block; }
    .subject-count span { color:var(--muted); font-size:.76rem; }
    .subject-bar { background:#e7ebf2; border-radius:10px; grid-column:1; grid-row:2; height:7px; overflow:hidden; }
    .subject-bar span { background:var(--green); display:block; height:100%; }
    .tree { border-top:1px solid var(--line); padding:12px 20px 22px; }
    .branch { border-left:2px solid #dfe5ef; margin:8px 0 8px 8px; padding-left:14px; }
    .branch > summary { align-items:flex-start; cursor:pointer; display:flex; gap:9px; list-style:none; padding:8px 0; }
    .branch > summary::after { color:var(--muted); content:"›"; font-size:1.2rem; margin-left:auto; transform:rotate(0); }
    .branch[open] > summary::after { transform:rotate(90deg); }
    .topic-row { align-items:flex-start; border-radius:11px; display:flex; gap:11px; padding:9px 10px; }
    .topic-row:hover { background:var(--paper); }
    .topic-row input { accent-color:var(--green); flex:none; height:20px; margin-top:2px; width:20px; }
    .topic-copy { min-width:0; }
    .topic-copy strong { display:block; font-size:.94rem; line-height:1.35; }
    .topic-copy p { color:var(--muted); font-size:.8rem; line-height:1.45; margin:4px 0 0; }
    .topic-row.checked .topic-copy strong { color:#617082; text-decoration:line-through; }
    .badges { display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
    .badge { background:var(--blue-soft); border-radius:999px; color:#34549e; font-size:.67rem; font-weight:750; padding:3px 7px; }
    .badge.option { background:#fff1dc; color:var(--amber); }
    .children { margin-left:8px; }
    .empty { background:white; border:1px dashed var(--line); border-radius:14px; color:var(--muted); padding:30px; text-align:center; }
    .footer { color:var(--muted); font-size:.76rem; line-height:1.5; margin-top:22px; text-align:center; }
    .danger { color:#a32626!important; }
    @media (max-width:720px) { .shell{padding:22px 12px 60px}.hero{align-items:flex-start;flex-direction:column}.dashboard{position:static}.tools{grid-template-columns:1fr 1fr}.search{grid-column:1/-1}.stats{grid-template-columns:1fr 1fr}.stat:last-child{grid-column:1/-1}.subject>summary{padding:17px}.tree{padding:9px 10px 18px}.topic-row{padding-left:5px}.save-note{align-self:flex-start} }
    @media print { body{background:white}.shell{max-width:none;padding:0}.dashboard,.save-note,.footer{display:none}.subject{break-inside:avoid;box-shadow:none}.subject,.branch{border-color:#aaa}.subject>summary::before,.branch>summary::after{display:none}.topic-copy p{color:#333} }
  </style>
</head>
<body>
  <main class="shell">
    <header class="hero">
      <div><p class="eyebrow">Standalone planning tool</p><h1>GCSE curriculum coverage checklist</h1><p class="intro">See the complete curriculum hierarchy, open every subdivision and manually tick the most detailed topics as they are covered. Broad headings update automatically from their child topics.</p></div>
      <span class="save-note">Saved on this device</span>
    </header>
    <section class="dashboard" aria-label="Checklist controls">
      <div class="stats"><div class="stat"><strong id="total-count">0</strong><span>detailed topics</span></div><div class="stat"><strong id="done-count">0</strong><span>covered</span></div><div class="stat"><strong id="remaining-count">0</strong><span>remaining</span></div></div>
      <div class="progress" role="progressbar" aria-label="Overall curriculum coverage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="progress-fill"></span></div>
      <div class="tools"><input class="search" id="search" type="search" placeholder="Search subjects, topics or descriptions…"><button class="button secondary" id="expand" type="button">Expand all</button><button class="button secondary" id="collapse" type="button">Collapse all</button></div>
      <div class="tool-row"><label class="toggle"><input id="remaining-only" type="checkbox"> Show remaining topics only</label><button class="button secondary" id="export" type="button">Export progress</button><button class="button secondary" id="import" type="button">Import progress</button><button class="button secondary danger" id="reset" type="button">Reset ticks</button><input id="import-file" type="file" accept="application/json" hidden></div>
    </section>
    <div id="subjects"></div>
    <p class="footer">Curriculum snapshot generated ${generatedAt.slice(0, 10)} from the project’s active course data. Exam-board specifications remain the authoritative source.</p>
  </main>
  <script id="curriculum-data" type="application/json">${encodedData}</script>
  <script>
    (() => {
      const data = JSON.parse(document.getElementById('curriculum-data').textContent)
      const storageKey = 'gcse-curriculum-coverage-v1'
      const saved = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'))
      const byParent = new Map()
      data.topics.forEach(topic => {
        const key = topic.parentTopicId || '__root__:' + topic.subjectId
        byParent.set(key, [...(byParent.get(key) || []), topic])
      })
      const childrenOf = topic => byParent.get(topic.id) || []
      const leavesOf = topic => childrenOf(topic).length ? childrenOf(topic).flatMap(leavesOf) : [topic]
      const subjectLeaves = subject => (byParent.get('__root__:' + subject.id) || []).flatMap(leavesOf)
      const allLeaves = data.subjects.flatMap(subjectLeaves)
      const search = document.getElementById('search')
      const remainingOnly = document.getElementById('remaining-only')

      function persist() { localStorage.setItem(storageKey, JSON.stringify([...saved])) }
      function matches(topic, term) { return [topic.name,topic.description,topic.component,topic.tier,topic.applicability].some(value => String(value || '').toLowerCase().includes(term)) }
      function visible(topic, term) {
        const leaves = leavesOf(topic)
        const searchMatch = !term || matches(topic, term) || childrenOf(topic).some(child => visible(child, term))
        const remainingMatch = !remainingOnly.checked || leaves.some(leaf => !saved.has(leaf.id))
        return searchMatch && remainingMatch
      }
      function setTopic(topic, checked) { leavesOf(topic).forEach(leaf => checked ? saved.add(leaf.id) : saved.delete(leaf.id)); persist(); render() }
      function badge(text, optional = false) { const span=document.createElement('span'); span.className='badge'+(optional?' option':''); span.textContent=text; return span }

      function topicLabel(topic, parent = false) {
        const leaves = leavesOf(topic), checked = leaves.every(leaf => saved.has(leaf.id)), partial = !checked && leaves.some(leaf => saved.has(leaf.id))
        const label=document.createElement('label'); label.className='topic-row'+(checked?' checked':'')
        const input=document.createElement('input'); input.type='checkbox'; input.checked=checked; input.indeterminate=partial; input.setAttribute('aria-label',(checked?'Mark not covered: ':'Mark covered: ')+topic.name); input.addEventListener('change',event=>setTopic(topic,event.currentTarget.checked))
        const copy=document.createElement('span'); copy.className='topic-copy'; const strong=document.createElement('strong'); strong.textContent=topic.name; copy.append(strong)
        if(topic.description){const description=document.createElement('p'); description.textContent=topic.description; copy.append(description)}
        const badges=document.createElement('span'); badges.className='badges'
        if(topic.component) badges.append(badge(topic.component))
        if(topic.tier && topic.tier!=='both') badges.append(badge(topic.tier==='higher'?'Higher only':topic.tier))
        if(topic.applicability && topic.applicability!=='common') badges.append(badge('Option: '+topic.applicability,true))
        if(parent) badges.append(badge(leaves.filter(leaf=>saved.has(leaf.id)).length+' / '+leaves.length+' detailed topics'))
        if(badges.childNodes.length) copy.append(badges)
        label.append(input,copy); return label
      }

      function topicNode(topic, term) {
        const children=childrenOf(topic).filter(child=>visible(child,term))
        if(childrenOf(topic).length){const details=document.createElement('details'); details.className='branch'; details.open=Boolean(term); const summary=document.createElement('summary'); summary.append(topicLabel(topic,true)); details.append(summary); const wrapper=document.createElement('div'); wrapper.className='children'; children.forEach(child=>wrapper.append(topicNode(child,term))); details.append(wrapper); return details}
        return topicLabel(topic)
      }

      function render() {
        const term=search.value.trim().toLowerCase(), host=document.getElementById('subjects'); host.replaceChildren()
        data.subjects.forEach(subject=>{
          const roots=(byParent.get('__root__:'+subject.id)||[]).filter(topic=>visible(topic,term)); if(!roots.length)return
          const leaves=subjectLeaves(subject), done=leaves.filter(topic=>saved.has(topic.id)).length
          const details=document.createElement('details'); details.className='subject'; details.open=Boolean(term)
          const summary=document.createElement('summary'); const title=document.createElement('div'); title.className='subject-title'; const eye=document.createElement('p'); eye.textContent=[subject.examBoard,subject.specificationCode].filter(Boolean).join(' · '); const heading=document.createElement('h2'); heading.textContent=subject.name; const note=document.createElement('p'); note.textContent=roots.length+' top-level areas'; title.append(eye,heading,note)
          const bar=document.createElement('div'); bar.className='subject-bar'; const fill=document.createElement('span'); fill.style.width=(leaves.length?done/leaves.length*100:0)+'%'; bar.append(fill)
          const count=document.createElement('div'); count.className='subject-count'; count.innerHTML='<strong>'+done+' / '+leaves.length+'</strong><span>detailed topics covered</span>'
          summary.append(title,bar,count); details.append(summary); const tree=document.createElement('div'); tree.className='tree'; roots.forEach(topic=>tree.append(topicNode(topic,term))); details.append(tree); host.append(details)
        })
        if(!host.childNodes.length){const empty=document.createElement('p'); empty.className='empty'; empty.textContent='No topics match the current filters.'; host.append(empty)}
        const done=allLeaves.filter(topic=>saved.has(topic.id)).length, percent=allLeaves.length?Math.round(done/allLeaves.length*100):0
        document.getElementById('total-count').textContent=allLeaves.length; document.getElementById('done-count').textContent=done; document.getElementById('remaining-count').textContent=allLeaves.length-done; document.getElementById('progress-fill').style.width=percent+'%'; document.querySelector('.progress').setAttribute('aria-valuenow',String(percent))
      }

      search.addEventListener('input',render); remainingOnly.addEventListener('change',render)
      document.getElementById('expand').addEventListener('click',()=>document.querySelectorAll('details').forEach(item=>item.open=true))
      document.getElementById('collapse').addEventListener('click',()=>document.querySelectorAll('details').forEach(item=>item.open=false))
      document.getElementById('reset').addEventListener('click',()=>{if(confirm('Clear every curriculum tick saved in this browser?')){saved.clear();persist();render()}})
      document.getElementById('export').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),completed:[...saved]},null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='gcse-curriculum-progress.json';link.click();URL.revokeObjectURL(link.href)})
      document.getElementById('import').addEventListener('click',()=>document.getElementById('import-file').click())
      document.getElementById('import-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{const value=JSON.parse(await file.text());if(!Array.isArray(value.completed))throw new Error();saved.clear();value.completed.filter(id=>typeof id==='string').forEach(id=>saved.add(id));persist();render()}catch{alert('That progress file could not be read.')}event.target.value=''})
      render()
    })()
  </script>
</body>
</html>
`

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, html, 'utf8')
const excelResult = await writeExcelChecklist()
console.log(`Generated ${outputPath}`)
console.log(`Generated ${excelOutputPath}`)
console.log(`${curriculum.subjects.length} subjects, ${curriculum.topics.length} curriculum nodes (${detailTopics.length} detailed coverage points)`)
console.log(`${excelResult.leaves} Excel checklist rows across ${excelResult.maximumDepth} hierarchy levels`)
