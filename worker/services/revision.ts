import type { Env, SessionUser } from '../types'
import { reviewedPracticeFor } from '../content/reviewed-practice'
import { contentGuidanceFor } from '../content/content-guidance'

export interface RevisionResource {
  id: string
  title: string
  provider: string
  resourceType: string
  description: string
  url: string
  freeAccess: boolean
}

export interface SubjectRevisionGuide {
  subjectId: string
  examSummary: string
  assessmentObjectives: string[]
  examTips: string[]
  specificationUrl: string
  assessmentResourcesUrl: string
  provisional: boolean
  verifiedAt: string
  resources: RevisionResource[]
}

export interface PracticeQuestion {
  question: string
  hint: string
  answer: string
  marks: number
  level?: 'retrieval' | 'standard' | 'challenge'
  canUpdateMastery?: boolean
}

export interface AutoMarkQuestion {
  id: string
  question: string
  options: string[]
  correctOption: number
  explanation: string
  marks: number
}

export interface WrittenQuestion {
  id: string
  question: string
  marks: number
  suggestedMinutes: number
  expectedLength: string
  hint: string
  markingPoints: string[]
  exemplar: string
  exemplarAnnotations: Array<{ label: string; explanation: string }>
  canUpdateMastery: boolean
  level?: 'retrieval' | 'standard' | 'challenge'
}

export interface TopicRevision {
  topicId: string
  summary: string
  learningObjectives: string[]
  keyPoints: string[]
  commonMistakes: string[]
  examUse: string[]
  examTips: string[]
  workedExample: { title: string; prompt: string; steps: string[]; answer: string }
  practiceQuestions: PracticeQuestion[]
  testQuestions: AutoMarkQuestion[]
  writtenQuestions: WrittenQuestion[]
  assessmentAvailable: boolean
  automaticMarkingAvailable?: boolean
  aiMarkingAllowed: boolean
  resources: RevisionResource[]
  bespoke: boolean
  contentProvenance: {
    version: string
    author: string
    reviewer: string | null
    reviewStatus: 'draft' | 'editorial_checked' | 'subject_expert_checked'
    reviewedAt: string | null
    sourceUrl: string | null
  }
}

interface GuideRow {
  subject_id: string
  exam_summary: string
  assessment_objectives_json: string
  exam_tips_json: string
  specification_url: string
  assessment_resources_url: string
  provisional: number
  verified_at: string
}

interface ResourceRow {
  id: string
  title: string
  provider: string
  resource_type: string
  description: string
  url: string
  free_access: number
}

interface TopicRow {
  id: string
  name: string
  description: string
  component: string | null
  subject_id: string
  subject_name: string
  exam_board?: string
  source_reference?: string | null
}

interface LessonRow {
  summary: string
  learning_objectives_json: string
  key_points_json: string
  exam_tips_json: string
  worked_example_json: string
  practice_questions_json: string
  content_version: string
  author: string
  reviewer: string | null
  review_status: 'draft' | 'editorial_checked' | 'subject_expert_checked'
  reviewed_at: string | null
}

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T } catch { return fallback }
}

async function studentIdFor(user: SessionUser, env: Env): Promise<string | null> {
  if (user.role === 'student') return user.id
  return (await env.DB.prepare('SELECT user_id FROM student_profiles ORDER BY created_at LIMIT 1').first<{ user_id: string }>())?.user_id ?? null
}

function mapResource(row: ResourceRow): RevisionResource {
  return { id: row.id, title: row.title, provider: row.provider, resourceType: row.resource_type, description: row.description, url: row.url, freeAccess: row.free_access === 1 }
}

async function resourcesFor(subjectId: string, topicId: string | null, env: Env): Promise<RevisionResource[]> {
  const result = await env.DB.prepare(
    `SELECT id, title, provider, resource_type, description, url, free_access
     FROM revision_resources
     WHERE subject_id = ? AND ${topicId ? 'topic_id = ?' : 'topic_id IS NULL'}
     ORDER BY sort_order, title`,
  )
  const rows = topicId ? await result.bind(subjectId, topicId).all<ResourceRow>() : await result.bind(subjectId).all<ResourceRow>()
  return rows.results.map(mapResource)
}

const bitesizeLessons: Record<string, string> = {
  'english-language-p2-language': 'https://www.bbc.co.uk/bitesize/articles/z4d4xyc',
  'english-lit-carol-characters': 'https://www.bbc.co.uk/bitesize/articles/zx6bdnb',
  'english-lit-carol-methods': 'https://www.bbc.co.uk/bitesize/articles/zvs9239',
  'english-lit-carol-plot': 'https://www.bbc.co.uk/bitesize/articles/zxtrjfr',
  'english-lit-carol-themes': 'https://www.bbc.co.uk/bitesize/articles/zkk6vj6',
  'english-lit-inspector-characters': 'https://www.bbc.co.uk/bitesize/articles/zkn9239',
  'english-lit-inspector-plot': 'https://www.bbc.co.uk/bitesize/articles/zkskmbk',
  'english-lit-inspector-themes': 'https://www.bbc.co.uk/bitesize/articles/zqf8xg8',
  'english-lit-macbeth-characters': 'https://www.bbc.co.uk/bitesize/articles/zs87fdm',
  'english-lit-macbeth-methods': 'https://www.bbc.co.uk/bitesize/articles/zgmpcxs',
  'english-lit-macbeth-plot': 'https://www.bbc.co.uk/bitesize/articles/zvd2ywx',
  'english-lit-macbeth-themes': 'https://www.bbc.co.uk/bitesize/articles/zvwmvj6',
  'english-lit-poem-bayonet': 'https://www.bbc.co.uk/bitesize/articles/zvbkvj6',
  'english-lit-poem-charge': 'https://www.bbc.co.uk/bitesize/articles/zkpb8p3',
  'english-lit-poem-prelude': 'https://www.bbc.co.uk/bitesize/articles/zmy4qyc',
  'history-edexcel-elizabeth-challenges': 'https://www.bbc.co.uk/bitesize/articles/zndpg2p',
  'history-edexcel-elizabeth-society': 'https://www.bbc.co.uk/bitesize/articles/znjscxs',
  'history-edexcel-germany-control': 'https://www.bbc.co.uk/bitesize/guides/zsvhk7h/revision/1',
  'history-edexcel-germany-life': 'https://www.bbc.co.uk/bitesize/guides/zqrfj6f/revision/1',
  'history-edexcel-germany-rise': 'https://www.bbc.co.uk/bitesize/guides/z3bp82p/revision/1',
  'history-edexcel-germany-weimar': 'https://www.bbc.co.uk/bitesize/guides/z9y64j6/revision/1',
  'history-edexcel-industrial': 'https://www.bbc.co.uk/bitesize/guides/zxbqjsg/revision/1',
  'history-edexcel-medieval': 'https://www.bbc.co.uk/bitesize/guides/zfkt6g8/revision/1',
  'history-edexcel-modern-medicine': 'https://www.bbc.co.uk/bitesize/guides/z3qfsk7/revision/1',
  'history-edexcel-renaissance': 'https://www.bbc.co.uk/bitesize/guides/zktrg7h/revision/1',
  'history-edexcel-western-front': 'https://www.bbc.co.uk/bitesize/guides/z8p4cmn/revision/1',
  'maths-algebra-functions': 'https://www.bbc.co.uk/bitesize/articles/zftbh4j',
  'maths-algebra-graphs': 'https://www.bbc.co.uk/bitesize/articles/z6jtb7h',
  'maths-algebra-manipulation': 'https://www.bbc.co.uk/bitesize/topics/z3shw6f/watch/z9cpyrd',
  'maths-algebra-simultaneous': 'https://www.bbc.co.uk/bitesize/topics/zrqpr82/watch/zg22fg8',
  'maths-geometry-angles': 'https://www.bbc.co.uk/bitesize/articles/zjf7s82',
  'maths-geometry-circles': 'https://www.bbc.co.uk/bitesize/articles/zmv8ywx',
  'maths-geometry-measures': 'https://www.bbc.co.uk/bitesize/articles/zp6rqyc',
  'maths-geometry-similarity': 'https://www.bbc.co.uk/bitesize/articles/zvpxkhv',
  'maths-geometry-transformations': 'https://www.bbc.co.uk/bitesize/articles/zcfwg2p',
  'maths-geometry-trig': 'https://www.bbc.co.uk/bitesize/topics/z93rkqt',
  'maths-number-accuracy': 'https://www.bbc.co.uk/bitesize/topics/zjh6wnb',
  'maths-number-fdp': 'https://www.bbc.co.uk/bitesize/articles/zhy2nk7',
  'maths-number-powers': 'https://www.bbc.co.uk/bitesize/topics/ztqmhyc',
  'maths-number-standard-surds': 'https://www.bbc.co.uk/bitesize/topics/zr269ty/watch/zmqbxg8',
  'maths-number-structure': 'https://www.bbc.co.uk/bitesize/articles/zcryvwx',
  'maths-probability-combined': 'https://www.bbc.co.uk/bitesize/articles/zsmmp9q',
  'maths-ratio-direct-inverse': 'https://www.bbc.co.uk/bitesize/topics/zsgxwsg/watch/zjvwcxs',
  'maths-ratio-rates': 'https://www.bbc.co.uk/bitesize/articles/zccmfdm',
  'maths-statistics-represent': 'https://www.bbc.co.uk/bitesize/articles/z7cx7yc',
  'maths-statistics-sampling': 'https://www.bbc.co.uk/bitesize/guides/zhksjhv/revision/1',
  'science-b-homeostasis': 'https://www.bbc.co.uk/bitesize/guides/zq73tv4/revision/1',
  'science-b-infection': 'https://www.bbc.co.uk/bitesize/articles/ztqmnk7',
  'science-b-inheritance': 'https://www.bbc.co.uk/bitesize/articles/z4kbkhv',
  'science-c-atmosphere': 'https://www.bbc.co.uk/bitesize/guides/zcqbpbk/revision/1',
  'science-c-atomic': 'https://www.bbc.co.uk/bitesize/articles/znfkxg8',
  'science-c-bonding': 'https://www.bbc.co.uk/bitesize/topics/z33rrwx',
  'science-c-changes': 'https://www.bbc.co.uk/bitesize/articles/zhs86rd',
  'science-c-organic': 'https://www.bbc.co.uk/bitesize/articles/zcpdxg8',
  'science-c-quantitative': 'https://www.bbc.co.uk/bitesize/guides/zs24h39/revision/1',
  'science-c-rates': 'https://www.bbc.co.uk/bitesize/guides/zgpxdxs/revision/1',
  'science-p-particles': 'https://www.bbc.co.uk/bitesize/guides/zyjvtv4/revision/1',
}

export function bitesizeResourceFor(topic: { id: string; name: string }): RevisionResource | null {
  const url = bitesizeLessons[topic.id]
  if (!url) return null
  const isAnglesAndPolygons = topic.id === 'maths-geometry-angles'
  return {
    id: `bitesize-${topic.id}`,
    title: isAnglesAndPolygons ? 'Angles in polygons: explanations, examples and self-test' : `${topic.name} on BBC Bitesize`,
    provider: 'BBC Bitesize',
    resourceType: 'topic_revision',
    description: isAnglesAndPolygons
      ? 'Covers polygon angle sums, regular polygons and missing-angle calculations with diagrams and worked examples.'
      : `Free BBC revision material selected specifically for this ${topic.name} lesson.`,
    url,
    freeAccess: true,
  }
}

export function createAutoTest(topicId: string): AutoMarkQuestion[] {
  const tests: Record<string, AutoMarkQuestion[]> = {
    'maths-geometry-angles': [
      { id: 'angles-1', question: 'Two parallel lines are crossed by a transversal. One angle is 68°. What is the alternate angle?', options: ['22°', '68°', '112°', '292°'], correctOption: 1, explanation: 'Alternate angles between parallel lines are equal, so the angle is 68°.', marks: 1 },
      { id: 'angles-2', question: 'What is the sum of the interior angles of a hexagon?', options: ['360°', '540°', '720°', '900°'], correctOption: 2, explanation: 'A hexagon can be split into 6 − 2 = 4 triangles, so its interior angles total 4 × 180° = 720°.', marks: 2 },
      { id: 'angles-3', question: 'Each exterior angle of a regular polygon is 30°. How many sides does it have?', options: ['10', '12', '15', '30'], correctOption: 1, explanation: 'Exterior angles make one full turn, so the number of sides is 360 ÷ 30 = 12.', marks: 2 },
    ],
    'maths-algebra-equations': [
      { id: 'eq-1', question: 'Solve 7x + 4 = 39.', options: ['x = 5', 'x = 6', 'x = 35', 'x = 43'], correctOption: 0, explanation: 'Subtract 4 to get 7x = 35, then divide by 7, so x = 5.', marks: 2 },
      { id: 'eq-2', question: 'Solve 6x - 5 = 2x + 19.', options: ['x = 3', 'x = 4', 'x = 6', 'x = 12'], correctOption: 2, explanation: 'Subtract 2x, then add 5: 4x = 24, so x = 6.', marks: 3 },
      { id: 'eq-3', question: 'What are the solutions of x² - 7x + 12 = 0?', options: ['3 and 4', '-3 and -4', '2 and 6', '-2 and -6'], correctOption: 0, explanation: 'Factorise to (x - 3)(x - 4) = 0, giving x = 3 or x = 4.', marks: 3 },
    ],
    'maths-ratio-percentages': [
      { id: 'pct-1', question: 'Increase £240 by 12%.', options: ['£252.00', '£264.00', '£268.80', '£288.00'], correctOption: 2, explanation: 'An increase of 12% uses multiplier 1.12: 240 × 1.12 = £268.80.', marks: 2 },
      { id: 'pct-2', question: 'After a 20% increase, a price is £96. What was the original price?', options: ['£76.80', '£80', '£115.20', '£120'], correctOption: 1, explanation: '£96 represents 120%, so divide by 1.2: 96 ÷ 1.2 = £80.', marks: 2 },
      { id: 'pct-3', question: 'Which calculation gives a 6% decrease for two years?', options: ['amount × 0.94²', 'amount × 0.88', 'amount × 1.06²', 'amount ÷ 0.94'], correctOption: 0, explanation: 'Each year retains 94%, so the multiplier 0.94 is used twice.', marks: 2 },
    ],
    'maths-geometry-trig': [
      { id: 'trig-1', question: 'A right triangle has shorter sides 6 cm and 8 cm. What is its hypotenuse?', options: ['7 cm', '10 cm', '12 cm', '14 cm'], correctOption: 1, explanation: 'Pythagoras gives √(6² + 8²) = √100 = 10 cm.', marks: 2 },
      { id: 'trig-2', question: 'Which ratio links the opposite and adjacent sides?', options: ['sine', 'cosine', 'tangent', 'Pythagoras'], correctOption: 2, explanation: 'TOA means tan θ = opposite ÷ adjacent.', marks: 1 },
      { id: 'trig-3', question: 'Before a GCSE trigonometry calculation, which calculator mode should you check?', options: ['Radians', 'Degrees', 'Statistics', 'Fractions'], correctOption: 1, explanation: 'GCSE triangle angles are normally measured in degrees.', marks: 1 },
    ],
    'maths-probability-combined': [
      { id: 'prob-1', question: 'A fair coin is tossed twice. What is P(two heads)?', options: ['1/2', '1/3', '1/4', '3/4'], correctOption: 2, explanation: 'P(H then H) = 1/2 × 1/2 = 1/4.', marks: 2 },
      { id: 'prob-2', question: 'For mutually exclusive outcomes A and B, how is P(A or B) found?', options: ['Multiply', 'Add', 'Subtract from 1 twice', 'Divide'], correctOption: 1, explanation: 'Mutually exclusive outcomes cannot occur together, so their probabilities add.', marks: 1 },
      { id: 'prob-3', question: 'A bag contains 3 red and 7 blue counters. What is P(not red)?', options: ['3/10', '7/10', '3/7', '1/2'], correctOption: 1, explanation: 'Not red means blue: 7 of the 10 counters are blue.', marks: 1 },
    ],
    'elang-p1-reading': [
      { id: 'elang-1', question: 'Which assessment objective mainly rewards analysis of language and structure?', options: ['AO1', 'AO2', 'AO4', 'AO6'], correctOption: 1, explanation: 'AO2 assesses how writers use language and structure to achieve effects and influence readers.', marks: 1 },
      { id: 'elang-2', question: 'Which response is the strongest analytical sentence?', options: ['The writer uses a metaphor.', 'This is a good quote.', 'The metaphor “a cage” suggests restriction and loss of freedom.', 'The reader wants to continue.'], correctOption: 2, explanation: 'It selects precise evidence and explains the meaning created by the method.', marks: 1 },
      { id: 'elang-3', question: 'What should a Paper 1 evaluation answer do?', options: ['Retell the extract', 'Make a judgement and support it with methods and evidence', 'List punctuation', 'Compare two unseen texts'], correctOption: 1, explanation: 'Evaluation requires a supported critical judgement about the text.', marks: 2 },
    ],
    'science-b-cell': [
      { id: 'cell-1', question: 'Which structure is present in plant cells but not animal cells?', options: ['Cell membrane', 'Cytoplasm', 'Cellulose cell wall', 'Ribosome'], correctOption: 2, explanation: 'Plant cells have a cellulose cell wall outside the cell membrane.', marks: 1 },
      { id: 'cell-2', question: 'A cell image is 30 mm and its real size is 0.06 mm. What is the magnification?', options: ['×50', '×180', '×500', '×1800'], correctOption: 2, explanation: 'Magnification = image size ÷ real size = 30 ÷ 0.06 = ×500.', marks: 2 },
      { id: 'cell-3', question: 'Why does active transport require energy?', options: ['Particles move down a gradient', 'Particles move against a concentration gradient', 'Water crosses a membrane', 'Cells become larger'], correctOption: 1, explanation: 'Energy is needed to move substances from lower to higher concentration against the gradient.', marks: 2 },
    ],
    'business-finance-core': [
      { id: 'biz-1', question: 'A firm sells 450 units at £18. What is its revenue?', options: ['£432', '£8,100', '£8,550', '£25,000'], correctOption: 1, explanation: 'Revenue = selling price × quantity: 18 × 450 = £8,100.', marks: 2 },
      { id: 'biz-2', question: 'Revenue is £72,000 and total costs are £61,500. What is profit?', options: ['£10,500', '£11,500', '£61,500', '£133,500'], correctOption: 0, explanation: 'Profit = revenue - total costs = £10,500.', marks: 2 },
      { id: 'biz-3', question: 'Which formula calculates break-even output?', options: ['fixed costs ÷ contribution per unit', 'revenue ÷ fixed costs', 'price × quantity', 'total costs - revenue'], correctOption: 0, explanation: 'Break-even output is fixed costs divided by contribution per unit.', marks: 1 },
    ],
  }
  return tests[topicId] ?? []
}

function expectedLength(marks: number, subjectId: string): string {
  if (subjectId === 'subject-mathematics') {
    if (marks <= 1) return 'A final answer'
    if (marks <= 3) return 'A short calculation with working'
    return 'A complete solution with each key step shown'
  }
  if (marks <= 2) return 'One or two precise sentences'
  if (marks <= 4) return 'One developed paragraph'
  if (marks <= 8) return 'Two or three developed paragraphs'
  return 'A complete, structured response'
}

function markingPointsFor(subjectId: string): string[] {
  const points: Record<string, string[]> = {
    'subject-mathematics': ['Use an appropriate method', 'Show each important working step', 'Give the final answer with suitable units or accuracy'],
    'subject-english-language': ['Answer the exact focus of the question', 'Use precise evidence from the source', 'Analyse how the writer creates meaning and effects'],
    'subject-english-literature': ['Develop a clear interpretation', 'Use well-chosen textual references', 'Analyse language, form or structure', 'Connect relevant context to the argument'],
    'subject-combined-science': ['Use accurate scientific knowledge', 'Apply knowledge to the context given', 'Show a complete reasoning chain, calculation or method'],
    'subject-history': ['Use precise, relevant knowledge', 'Explain the link required by the command word', 'Reach a supported judgement where the question requires one'],
    'subject-geography': ['Use accurate geographical knowledge', 'Develop cause-and-effect links', 'Apply named or resource evidence where relevant'],
    'subject-business': ['Use the correct business concept', 'Apply every point to the business context', 'Develop the effect and give a supported judgement where required'],
    'subject-design-technology': ['Use accurate technical knowledge', 'Relate decisions to the user and specification', 'Justify choices using evidence or measurable testing'],
  }
  return points[subjectId] ?? ['Use accurate subject knowledge', 'Apply it directly to the question', 'Explain each point fully using evidence']
}

function exemplarAnnotationsFor(subjectId: string): Array<{ label: string; explanation: string }> {
  if (subjectId === 'subject-english-literature') return [
    { label: 'Clear interpretation', explanation: 'The response establishes an argument rather than retelling the plot.' },
    { label: 'Well-chosen quotation', explanation: 'Short textual references are embedded and used as evidence.' },
    { label: 'Detailed analysis', explanation: 'Language, form or structure is connected to meaning and the writer\'s purpose.' },
    { label: 'Relevant context', explanation: 'Context develops the interpretation instead of being added as an isolated fact.' },
  ]
  if (subjectId === 'subject-english-language') return [
    { label: 'Precise evidence', explanation: 'The response selects the most useful words from the source.' },
    { label: 'Developed effect', explanation: 'It explains how the writer\'s choices shape meaning rather than merely naming a technique.' },
  ]
  return markingPointsFor(subjectId).map((point) => ({ label: point, explanation: `The exemplar demonstrates: ${point.toLowerCase()}.` }))
}

function writtenQuestionsFor(topic: TopicRow, practiceQuestions: PracticeQuestion[], canUpdateMastery: boolean): WrittenQuestion[] {
  return practiceQuestions.map((practice, index) => ({
    id: `${topic.id}-written-${index + 1}`,
    question: practice.question,
    marks: practice.marks,
    suggestedMinutes: Math.max(3, Math.ceil(practice.marks * 1.5)),
    expectedLength: expectedLength(practice.marks, topic.subject_id),
    hint: practice.hint,
    markingPoints: markingPointsFor(topic.subject_id),
    exemplar: practice.answer,
    exemplarAnnotations: exemplarAnnotationsFor(topic.subject_id),
    canUpdateMastery: canUpdateMastery && practice.canUpdateMastery !== false,
    level: practice.level,
  }))
}

function curatedMathsLesson(topic: TopicRow): Omit<TopicRevision, 'resources'> | null {
  if (topic.id !== 'maths-geometry-angles') return null

  return completeRevision(topic, {
    topicId: topic.id,
    summary: 'Angles are found by combining a small set of facts: angles on a line and around a point, vertically opposite angles, angle sums in triangles and polygons, and the corresponding, alternate and co-interior rules for parallel lines. The important skill is to identify the fact that applies, calculate carefully, and state the reason for each step.',
    learningObjectives: [
      'Use angle facts at a point, on a straight line and in triangles and quadrilaterals',
      'Recognise corresponding, alternate and co-interior angles when lines are parallel',
      'Calculate interior and exterior angles of regular and irregular polygons',
      'Build a geometrical argument in which every conclusion has a valid reason',
    ],
    keyPoints: [
      'Angles on a straight line total 180°; angles around a point total 360°; vertically opposite angles are equal.',
      'Angles in a triangle total 180° and angles in a quadrilateral total 360°. An isosceles triangle has two equal base angles.',
      'When parallel lines are crossed by a transversal: corresponding angles are equal, alternate angles are equal, and co-interior angles total 180°.',
      'The interior-angle sum of an n-sided polygon is (n − 2) × 180° because it can be divided into n − 2 triangles.',
      'The exterior angles of any polygon make one full turn and therefore total 360°.',
      'For a regular polygon, each exterior angle is 360° ÷ n and each interior angle is 180° minus the exterior angle.',
      'Diagrams are not necessarily drawn to scale. Mark equal angles and parallel lines, then write the angle fact beside each calculation.',
    ],
    examTips: [
      'If the question says “give a reason”, name the exact fact, such as “alternate angles are equal—not just “angles on parallel lines”.',
      'For an algebraic angle question, form an equation from the angle fact first, solve it, then substitute back to find the requested angle.',
      'Check that the answer is sensible: an acute angle is below 90°, an obtuse angle is between 90° and 180°, and a reflex angle is above 180°.',
    ],
    workedExample: {
      title: 'Combine parallel-line and triangle facts',
      prompt: 'Two parallel lines are crossed by a transversal. An alternate angle inside a triangle is 64°. A second angle in the triangle is 47°. Find the third angle.',
      steps: [
        'The angle inside the triangle is 64° because alternate angles between parallel lines are equal.',
        'Angles in a triangle total 180°, so write 64 + 47 + x = 180.',
        '64 + 47 = 111, so x = 180 − 111.',
        'State the result and reason: x = 69° because angles in a triangle total 180°.',
      ],
      answer: '69°',
    },
    practiceQuestions: [
      { question: 'Angles (3x + 8)° and (5x − 20)° are alternate angles between parallel lines. Find x and the size of the angles.', hint: 'Alternate angles are equal, so set the two expressions equal.', answer: '3x + 8 = 5x − 20, so 28 = 2x and x = 14. Substitution gives 3(14) + 8 = 50°; both angles are 50°.', marks: 3 },
      { question: 'Find the sum of the interior angles of a decagon, then find each interior angle if the decagon is regular.', hint: 'Use (n − 2) × 180°, then divide by n for a regular polygon.', answer: 'The sum is (10 − 2) × 180° = 1440°. Each interior angle is 1440° ÷ 10 = 144°.', marks: 3 },
      { question: 'The exterior angle of a regular polygon is 24°. Find the number of sides and each interior angle. Show the angle facts you use.', hint: 'Exterior angles total 360°. An interior angle and its exterior angle lie on a straight line.', answer: 'Number of sides = 360 ÷ 24 = 15. Each interior angle is 180° − 24° = 156°.', marks: 3 },
    ],
    testQuestions: createAutoTest(topic.id),
    bespoke: true,
  }, true)
}

function completeRevision(
  topic: TopicRow,
  lesson: Omit<TopicRevision, 'resources' | 'writtenQuestions' | 'assessmentAvailable' | 'contentProvenance' | 'aiMarkingAllowed' | 'commonMistakes' | 'examUse'>,
  canUpdateWrittenMastery: boolean,
  provenance?: Partial<TopicRevision['contentProvenance']>,
): Omit<TopicRevision, 'resources'> {
  const guidance = contentGuidanceFor(topic)
  const objectives = [...lesson.learningObjectives]
  for (const objective of learningObjectives(topic)) {
    if (objectives.length >= 3) break
    if (!objectives.includes(objective)) objectives.push(objective)
  }
  const steps = [...lesson.workedExample.steps]
  const checkingSteps = ['Match each step to the command word and available marks.', 'Check the final answer against the evidence and question.']
  for (const step of checkingSteps) {
    if (steps.length >= 4) break
    steps.push(step)
  }
  const coreKeyPoints = [...new Set([...guidance.coreNotes, ...(lesson.bespoke ? lesson.keyPoints : [])])].slice(0, 10)
  const suppliedPractice = lesson.practiceQuestions.map((question, index) => ({
    ...question,
    level: question.level ?? (lesson.practiceQuestions.length >= 3
      ? index === 0 ? 'retrieval' as const : index === lesson.practiceQuestions.length - 1 ? 'challenge' as const : 'standard' as const
      : 'standard' as const),
  }))
  const support = supportingPractice(topic, coreKeyPoints, guidance.examUse)
  const practiceQuestions = suppliedPractice.length >= 3
    ? suppliedPractice
    : suppliedPractice.length === 2
      ? [support[0]!, ...suppliedPractice]
      : suppliedPractice.length === 1
        ? [support[0]!, support[1]!, suppliedPractice[0]!]
        : support
  const normalized = {
    ...lesson,
    learningObjectives: objectives,
    keyPoints: coreKeyPoints.length >= 3 ? coreKeyPoints : knowledgePoints(topic, coreKeyPoints),
    commonMistakes: guidance.commonMistakes,
    examUse: guidance.examUse,
    practiceQuestions,
    workedExample: { ...lesson.workedExample, steps },
  }
  const writtenQuestions = writtenQuestionsFor(topic, normalized.practiceQuestions, canUpdateWrittenMastery)
  return {
    ...normalized,
    writtenQuestions,
    assessmentAvailable: lesson.testQuestions.length > 0 || writtenQuestions.some((question) => question.canUpdateMastery),
    aiMarkingAllowed: false,
    contentProvenance: {
      version: provenance?.version ?? '2.0',
      author: provenance?.author ?? 'Original GCSE Revision app practice',
      reviewer: provenance?.reviewer ?? null,
      reviewStatus: provenance?.reviewStatus ?? (canUpdateWrittenMastery ? 'editorial_checked' : 'draft'),
      reviewedAt: provenance?.reviewedAt ?? (canUpdateWrittenMastery ? '2026-10-01' : null),
      sourceUrl: provenance?.sourceUrl ?? topic.source_reference ?? null,
    },
  }
}

function supportingPractice(topic: TopicRow, keyPoints: string[], examUse: string[]): PracticeQuestion[] {
  const recallAnswer = keyPoints.slice(0, 4).join(' ')
  const challengePrompts: Record<string, { question: string; hint: string; answer: string }> = {
    'subject-mathematics': {
      question: `Create a short worked example for ${topic.name}, then identify the first decision a learner must make and one check on the final answer.`,
      hint: 'Use different values from the worked example and show every mark-bearing step.',
      answer: 'A useful example states the relevant rule or formula, shows a valid sequence of working, gives a final answer with suitable units or accuracy and checks it by estimation, substitution or the original context.',
    },
    'subject-english-language': {
      question: `Plan one precise paragraph for ${topic.name}. Identify the evidence, method, inference and effect before writing it.`,
      hint: 'Use a short quotation and make the inference specific to the wording and question focus.',
      answer: 'A strong plan contains a direct interpretation, a short embedded quotation, close analysis of a word or structural choice, and an explanation of how that choice shapes meaning for the reader.',
    },
    'subject-english-literature': {
      question: `Plan a second paragraph on ${topic.name} that offers a different but compatible interpretation.`,
      hint: 'Choose a flexible quotation and connect the method to the writer\'s wider idea.',
      answer: 'A strong plan advances the argument rather than repeating it, embeds a precise textual reference, analyses language, form or structure and integrates only context that deepens the interpretation.',
    },
    'subject-combined-science': {
      question: `Turn one idea from ${topic.name} into a complete cause → mechanism → outcome explanation, then name one variable or unit that could be assessed.`,
      hint: 'Do not jump from cause to outcome; state the scientific process in between.',
      answer: 'The response should use precise scientific vocabulary, make every causal link explicit, and identify a relevant measurable quantity, variable or unit from the topic.',
    },
    'subject-history': {
      question: `Plan one paragraph about ${topic.name} using a precise fact and an explained link to the command word.`,
      hint: 'Select evidence from the correct period, then explain why it proves the point.',
      answer: 'A strong plan makes a direct claim, supports it with precise and relevant knowledge, explains causation, consequence, change, similarity or significance as required, and returns to the question.',
    },
    'subject-geography': {
      question: `Build one cause → process → effect chain for ${topic.name}, adding named or numerical evidence where the course requires it.`,
      hint: 'Use because and therefore to make each link visible.',
      answer: 'A strong chain accurately names the geographical process, explains how the cause produces the effect, and applies relevant place, fieldwork or resource evidence rather than adding an unrelated statistic.',
    },
    'subject-business': {
      question: `Apply ${topic.name} to a small business with limited cash and develop the likely effect on one objective.`,
      hint: 'Use the size and cash constraint throughout the chain, then state what the decision depends on.',
      answer: 'A strong response applies the correct concept to the stated business, develops a chain to cost, revenue, profit, growth or another objective, and gives a conditional judgement based on the most important contextual factor.',
    },
    'subject-design-technology': {
      question: `Use ${topic.name} to justify one design decision for a school product and specify a measurable test.`,
      hint: 'Link the technical choice to a user need and include a realistic pass criterion.',
      answer: 'A strong response links a material, process or design feature to the product function and user, identifies a trade-off and proposes a measurable test with conditions and a pass criterion.',
    },
  }
  const challenge = challengePrompts[topic.subject_id] ?? {
    question: `Plan an exam response that applies ${topic.name} to a new context.`,
    hint: 'Select accurate knowledge, apply it and justify the conclusion.',
    answer: examUse.join(' '),
  }
  return [
    {
      question: `Without notes, write four precise facts, rules or ideas you must know for ${topic.name}.`,
      hint: 'Recall first; then compare your list with the core notes and correct anything vague.',
      answer: recallAnswer,
      marks: 4,
      level: 'retrieval',
      canUpdateMastery: false,
    },
    { ...challenge, marks: 6, level: 'challenge', canUpdateMastery: false },
  ]
}

function knowledgePoints(topic: TopicRow, subjectMethod: string[]): string[] {
  const content = topic.description
    .split(/;|\.(?:\s|$)/)
    .map((point) => point.trim())
    .filter((point) => point.length > 2)
    .slice(0, 6)
  return [...new Set([...content, ...subjectMethod])]
}

function learningObjectives(topic: TopicRow): string[] {
  const content = topic.description
    .split(/;|\.(?:\s|$)/)
    .map((point) => point.trim())
    .filter((point) => point.length > 2)
  return [
    `Recall and explain the required knowledge for ${topic.name}`,
    content.length > 1 ? `Connect ${content[0]} with ${content[1]}` : `Apply the key ideas in ${topic.name} to an unfamiliar context`,
    `Complete and check an exam-style ${topic.name} response`,
  ]
}

const poetryComparisons: Record<string, { other: string; focus: string; answer: string }> = {
  'english-lit-poem-ozymandias': { other: 'London', focus: 'the abuse of power', answer: 'Shelley and Blake both present human power as oppressive, but Shelley emphasises its eventual collapse whereas Blake exposes its continuing effect on ordinary people. In Ozymandias, the command to “Look on my Works” is undermined by the “lone and level sands”, placing the ruler’s boast beside evidence that time has erased his empire. By contrast, Blake’s repeated “charter’d” suggests that institutional power still controls even the streets and river of London. Both poets challenge authority, although Shelley makes tyranny temporary while Blake presents a system that remains active.' },
  'english-lit-poem-london': { other: 'Ozymandias', focus: 'the abuse of power', answer: 'Blake and Shelley both challenge oppressive power, but Blake shows it operating throughout a living city while Shelley looks back on a ruined ruler. Blake’s repeated “charter’d” suggests that institutions control both people and nature, and the “mind-forg’d manacles” show that this oppression has become psychological. In Ozymandias, however, the king’s “sneer of cold command” survives only on a broken statue. Blake therefore stresses power’s immediate suffering, whereas Shelley exposes its ultimate fragility.' },
  'english-lit-poem-prelude': { other: 'Storm on the Island', focus: 'the power of nature', answer: 'Wordsworth and Heaney both present nature as overwhelming human confidence. In The Prelude, the “huge peak, black and huge” repeats “huge” and interrupts the speaker’s pleasure with an imposing presence, reducing him to fear. Heaney similarly turns the storm into an attacker that “pummels” the house, yet the communal voice tries to sound prepared. Both poets show that human certainty collapses before nature, although Wordsworth focuses on lasting individual transformation while Heaney presents a community enduring repeated threat.' },
  'english-lit-poem-storm': { other: 'Extract from The Prelude', focus: 'the power of nature', answer: 'Heaney and Wordsworth both show nature defeating human confidence. The islanders initially claim that they are “prepared”, but the violent verb “pummels” turns the storm into a relentless attacker and exposes the limits of their defences. In The Prelude, the “huge peak, black and huge” similarly interrupts the speaker’s control and fills his thoughts with fear. Heaney uses a communal voice while Wordsworth records a private memory, but both present nature as psychologically as well as physically powerful.' },
  'english-lit-poem-duchess': { other: 'Ozymandias', focus: 'pride and control', answer: 'Browning and Shelley present powerful men whose pride reveals moral weakness. The Duke’s possessive phrase “my last Duchess” reduces his former wife to an object, while his dramatic monologue lets his controlling voice expose itself without challenge. Ozymandias’s imperative “Look on my Works” is equally arrogant, but the surrounding “lone and level sands” mock his claim. Both poets criticise domination; Browning makes control disturbingly present, while Shelley shows that time will finally destroy it.' },
  'english-lit-poem-charge': { other: 'Bayonet Charge', focus: 'the reality of conflict', answer: 'Tennyson and Hughes both present soldiers moving into extreme danger, but they treat patriotic duty differently. Tennyson’s repeated “Theirs not to reason why” creates a disciplined collective rhythm and celebrates obedience even while admitting a blunder. Hughes begins with “Suddenly he awoke and was running”, throwing one confused soldier into action without preparation. Tennyson memorialises collective sacrifice, whereas Hughes strips away ceremony to expose instinctive terror.' },
  'english-lit-poem-bayonet': { other: 'The Charge of the Light Brigade', focus: 'soldiers in conflict', answer: 'Hughes and Tennyson both present soldiers advancing under pressure, but Hughes questions patriotic ideals more sharply. In Bayonet Charge, the “patriotic tear” becomes a fragile object that “sweating like molten iron” can dissolve, suggesting that abstract beliefs fail during combat. Tennyson’s repeated “Theirs not to reason why” instead creates a collective, disciplined rhythm that honours obedience. Hughes centres private panic, while Tennyson turns sacrifice into public remembrance.' },
  'english-lit-poem-exposure': { other: 'Storm on the Island', focus: 'nature as a threat', answer: 'Owen and Heaney both make an invisible natural force feel like an enemy. Owen’s “merciless iced east winds that knive us” personifies the weather as a deliberate attacker, while the recurring “But nothing happens” makes suffering seem endless and futile. Heaney likewise says the islanders are “bombarded by the empty air”, borrowing military language for a storm they cannot see. Both poets blur weather and warfare, though Owen uses this to condemn the prolonged suffering of soldiers.' },
  'english-lit-poem-remains': { other: 'War Photographer', focus: 'the lasting effects of conflict', answer: 'Armitage and Duffy show that conflict continues after the immediate violence ends. In Remains, the uncertain phrase “probably armed, possibly not” repeats in the speaker’s memory, and its imbalance reveals guilt that cannot be resolved. Duffy’s photographer instead handles “spools of suffering set out in ordered rows”, trying to impose professional order on traumatic images. Both speakers are haunted witnesses, but Armitage presents an uncontrolled personal memory while Duffy explores controlled work and public indifference.' },
  'english-lit-poem-war-photographer': { other: 'Remains', focus: 'the lasting effects of conflict', answer: 'Duffy and Armitage present memory as a burden carried away from war. The photographer’s “spools of suffering set out in ordered rows” suggest an attempt to organise horror, yet the metaphor compresses many lives into images. In Remains, “probably armed, possibly not” cannot be ordered or settled, so the repeated doubt exposes the soldier’s guilt. Both poems show conflict invading civilian life, although Duffy also criticises an audience that briefly looks and then forgets.' },
  'english-lit-poem-poppies': { other: 'Kamikaze', focus: 'family loss caused by conflict', answer: 'Weir and Garland present conflict through families who lose someone even without witnessing a battlefield death. In Poppies, the mother “released a song bird from its cage”, a tender metaphor that combines her son’s freedom with her own painful loss of control. In Kamikaze, the returned pilot becomes socially absent until his children wonder “which had been the better way to die”. Both poems show private grief, but Weir focuses on loving separation whereas Garland exposes punishment imposed by family and national expectations.' },
  'english-lit-poem-kamikaze': { other: 'Poppies', focus: 'family loss caused by conflict', answer: 'Garland and Weir show conflict damaging families far from direct combat. In Kamikaze, the pilot’s family treats him as though he “no longer existed”, making survival resemble a social death enforced by shame. In Poppies, the mother “released a song bird from its cage”, suggesting that love requires her to let her son leave despite the pain. Both poems present lasting absence, but Garland stresses communal rejection while Weir explores an individual parent’s tender grief.' },
  'english-lit-poem-tissue': { other: 'Ozymandias', focus: 'the fragility of human power', answer: 'Dharker and Shelley both question attempts to make human power permanent. Tissue values “paper that lets the light shine through”, using light to suggest truth and presenting fragility as openness rather than weakness. Ozymandias instead leaves a “colossal wreck”, an oxymoronic image in which the scale of ambition survives only as ruin. Both poets make material power temporary, but Dharker imagines a more flexible alternative while Shelley concentrates on pride’s destruction.' },
  'english-lit-poem-emigree': { other: 'Checking Out Me History', focus: 'identity and memory', answer: 'Rumens and Agard present identity as something the speaker protects from external control. In The Emigrée, the repeated “sunlight” idealises the remembered city and keeps it vivid despite accusations and distance. Agard’s assertive “I carving out me identity” uses a continuous verb to make self-definition active resistance against an imposed education. Both speakers reclaim the past, although Rumens creates a private, luminous memory while Agard publicly challenges institutional history.' },
  'english-lit-poem-history': { other: 'The Emigrée', focus: 'identity and memory', answer: 'Agard and Rumens show speakers using memory to resist identities imposed by others. Agard declares “I carving out me identity”, with the active verb suggesting difficult but deliberate self-creation after a restrictive education. In The Emigrée, the recurring “sunlight” preserves an idealised homeland despite political hostility and exile. Both value a personal relationship with the past, but Agard’s voice is openly confrontational while Rumens’s resistance is intimate and imaginative.' },
}

function englishLiteraturePractice(topic: TopicRow): PracticeQuestion {
  if (topic.id.includes('carol')) return {
    question: 'How does Dickens present Scrooge as capable of change in A Christmas Carol? Write one developed analytical paragraph.',
    hint: 'Begin with a clear interpretation, embed a short quotation and explore more than one implication of Dickens’s language.',
    answer: 'Dickens initially presents Scrooge as someone who has deliberately separated himself from human relationships. The simile “solitary as an oyster” suggests that he is emotionally closed and protected by a hard exterior. However, an oyster may contain something valuable, subtly anticipating the generosity that emerges after his encounters with the Ghosts. Dickens therefore makes Scrooge’s isolation appear reversible rather than natural. By transforming him, Dickens challenges wealthy Victorian readers to reject selfishness and accept their responsibility towards people living in poverty.',
    marks: 8,
  }
  if (topic.id.includes('macbeth')) return {
    question: 'How does Shakespeare present ambition as destructive in Macbeth? Write one developed analytical paragraph.',
    hint: 'Use a short quotation, analyse its imagery and connect Macbeth’s choice to the shape of the tragedy.',
    answer: 'Shakespeare presents Macbeth as understanding that his ambition is dangerous even before he murders Duncan. He admits that he has only “vaulting ambition”, a metaphor which makes his desire for power resemble a rider leaping too far and losing control. “Only” exposes the absence of any honourable motive, while “vaulting” anticipates the collapse caused by his attempt to rise beyond his rightful position. Macbeth is therefore not destroyed by fate alone: Shakespeare makes his tragedy the consequence of a conscious moral choice, warning a Jacobean audience about disrupting legitimate kingship.',
    marks: 8,
  }
  if (topic.id.includes('inspector')) return {
    question: 'How does Priestley present responsibility in An Inspector Calls? Write one developed analytical paragraph.',
    hint: 'Make an argument, embed a quotation and connect the dramatic method to Priestley’s social message.',
    answer: 'Priestley uses the Inspector to present social responsibility as essential rather than optional. His warning that people are “members of one body” uses a collective metaphor to erase the divisions of class defended by Mr Birling. The noun “members” suggests that every person has both a place and an obligation within society, while the Inspector’s authoritative final speech gives this socialist message the force of a moral judgement. By placing the warning before the cyclical final telephone call, Priestley shows his post-war audience that refusing responsibility will cause suffering to repeat.',
    marks: 8,
  }
  if (topic.id === 'english-lit-unseen') return {
    question: 'Read this original miniature poem: “At dawn, the cranes / lift yesterday’s steel; / below, one window / keeps the dark.” How does the poet present change? Write one developed analytical paragraph.',
    hint: 'Start with an interpretation, then analyse two connected details and consider the contrast across the poem.',
    answer: 'The poet presents change as energetic but incomplete. The verb “lift” makes the cranes seem purposeful, as though the new day can physically remove the past, while “yesterday’s steel” connects urban construction with time moving forward. However, the isolated “one window” that “keeps the dark” resists this progress. “Keeps” suggests deliberate possession, and the final monosyllable “dark” leaves the poem with a stubborn image of what has not changed. The contrast between rising machinery and the window below therefore makes renewal appear uneven rather than automatic.',
    marks: 8,
  }
  const poetry = poetryComparisons[topic.id]
  if (poetry) return {
    question: `Compare how poets present ${poetry.focus} in ${topic.name} and ${poetry.other}. Write one developed comparison paragraph.`,
    hint: 'Compare both ideas and methods throughout the paragraph, using a precise quotation from each poem.',
    answer: poetry.answer,
    marks: 8,
  }
  return {
    question: 'Compare how poets present the abuse of power in Ozymandias and one other Power and Conflict poem. Write one developed comparison paragraph.',
    hint: 'Compare both ideas and methods throughout the paragraph rather than writing about each poem separately.',
    answer: 'Shelley and Blake both present human power as oppressive, but Shelley emphasises its eventual collapse whereas Blake exposes its continuing effect on ordinary people. In Ozymandias, the command to “Look on my Works” is undermined by the “lone and level sands”, structurally placing the ruler’s boast beside evidence that time and nature have erased his empire. By contrast, Blake’s repeated adjective “charter’d” suggests that institutional power still controls even the streets and river of London. Both poets challenge authority, although Shelley offers the consoling perspective that tyranny is temporary while Blake traps his speakers within a system that remains active.',
    marks: 8,
  }
}

export async function getSubjectRevision(user: SessionUser, subjectId: string, env: Env): Promise<SubjectRevisionGuide | null> {
  const studentId = await studentIdFor(user, env)
  if (!studentId) return null
  const row = await env.DB.prepare(
    `SELECT g.subject_id, g.exam_summary, g.assessment_objectives_json, g.exam_tips_json,
            g.specification_url, g.assessment_resources_url, g.provisional, g.verified_at
     FROM subject_revision_guides g
     JOIN student_subjects ss ON ss.subject_id = g.subject_id
     WHERE ss.student_id = ? AND ss.active = 1 AND g.subject_id = ?`,
  ).bind(studentId, subjectId).first<GuideRow>()
  if (!row) return null
  return {
    subjectId: row.subject_id,
    examSummary: row.exam_summary,
    assessmentObjectives: parseJson(row.assessment_objectives_json, []),
    examTips: parseJson(row.exam_tips_json, []),
    specificationUrl: row.specification_url,
    assessmentResourcesUrl: row.assessment_resources_url,
    provisional: row.provisional === 1,
    verifiedAt: row.verified_at,
    resources: await resourcesFor(subjectId, null, env),
  }
}

export function createFallbackLesson(topic: TopicRow): Omit<TopicRevision, 'resources'> {
  const curatedMaths = curatedMathsLesson(topic)
  if (curatedMaths) return curatedMaths
  const reviewedPractice = topic.subject_id === 'subject-english-literature'
    ? englishLiteraturePractice(topic)
    : reviewedPracticeFor(topic.id)
  const base = {
    topicId: topic.id,
    summary: topic.description,
    learningObjectives: learningObjectives(topic),
    examTips: ['Underline the command word and key data', 'Make one relevant point for each available mark', 'Check the answer is specific to the scenario or evidence given'],
    bespoke: false,
    testQuestions: createAutoTest(topic.id),
  }
  if (topic.subject_id === 'subject-mathematics') return completeRevision(topic, { ...base,
    keyPoints: knowledgePoints(topic, ['Write the method clearly, one step at a time', 'Keep exact values until the final step', 'Estimate or substitute back to check the result']),
    workedExample: { title: 'A reliable exam method', prompt: `How should you approach an unfamiliar ${topic.name} question?`, steps: ['List the values and facts given', 'Choose a relevant rule, formula or representation', 'Show each substitution and calculation', 'Check units, accuracy and whether the result is sensible'], answer: 'A complete answer shows a valid method as well as the final result.' },
    practiceQuestions: reviewedPractice ? [reviewedPractice] : [
      { question: `Write down two rules, formulae or representations used in ${topic.name}, and explain when each is useful.`, hint: 'Use your notes or the linked specification to identify the exact knowledge.', answer: 'Award one mark for each correct rule or representation and one for each accurate explanation.', marks: 4 },
      { question: `Complete one ${topic.name} question from the materials your school provides. Then write the first line of your method and explain your final check.`, hint: 'Select a question whose marks match the time you have.', answer: 'Compare every working line with its mark scheme; record the exact first point where your method differs.', marks: 4 },
    ],
  }, Boolean(reviewedPractice))
  if (topic.subject_id === 'subject-english-language') return completeRevision(topic, { ...base,
    keyPoints: knowledgePoints(topic, ['Name a precise method, select a short quotation and explain its effect', 'Link interpretation to purpose, audience and form', 'Develop comparisons through both ideas and methods']),
    workedExample: { title: 'Language analysis', prompt: 'Analyse: “The street held its breath as the last light disappeared.”', steps: ['Select “held its breath”', 'Identify personification', 'Infer tense anticipation and unnatural stillness', 'Link the effect to the disappearing light and possible danger'], answer: 'The personification “held its breath” makes the street seem tense and watchful, creating suspense as darkness arrives.' },
    practiceQuestions: reviewedPractice ? [reviewedPractice] : [{ question: 'How does the writer use language in “Rain hammered the empty playground, swallowing every sound”?', hint: 'Analyse the verbs and their effects, not just their labels.', answer: 'A developed answer may explain that violent “hammered” makes the weather seem aggressive, while “swallowing” personifies it as consuming the setting and intensifies isolation.', marks: 4 }],
  }, Boolean(reviewedPractice))
  if (topic.subject_id === 'subject-combined-science') return completeRevision(topic, { ...base,
    keyPoints: knowledgePoints(topic, ['Use precise scientific vocabulary', 'For calculations, state the equation, substitute, calculate and include units', 'For practicals, identify variables, controls, measurements and improvements']),
    workedExample: { title: 'Explain using a scientific chain', prompt: `How do you build a strong explanation about ${topic.name}?`, steps: ['State the relevant scientific fact', 'Use because to give the mechanism', 'Use therefore to connect it to the outcome', 'Check each link is scientifically accurate'], answer: 'A strong explanation connects cause, scientific mechanism and observed result.' },
    practiceQuestions: reviewedPractice ? [reviewedPractice] : [{ question: `Describe one investigation relevant to ${topic.name}. Identify the independent variable, dependent variable and two controls.`, hint: 'Choose a required practical or classroom investigation from this topic.', answer: 'Award one mark for a workable method and one each for a correct independent variable, dependent variable and two valid control variables.', marks: 5 }],
  }, Boolean(reviewedPractice))
  const subjectPrompts: Record<string, { points: string[]; question: string; hint: string; answer: string; marks?: number }> = {
    'subject-english-literature': { points: ['Build a clear argument about the writer’s ideas', 'Use short, precise references', 'Connect language, form, structure and relevant context'], ...englishLiteraturePractice(topic) },
    'subject-history': { points: ['Use precise evidence from the correct period', 'Develop cause, consequence, change or significance', 'Evaluate sources and interpretations in context'], question: `Explain two ways an event or development in ${topic.name} was significant.`, hint: 'Use a different effect, group or timescale for each reason.', answer: 'Each reason needs specific supporting knowledge and a developed explanation of its importance.' },
    'subject-geography': { points: ['Use named evidence and geographical vocabulary', 'Develop cause-effect-response chains', 'Quote figures and units from resources'], question: `Explain one cause and one effect associated with ${topic.name}.`, hint: 'Develop each point using because and therefore.', answer: 'Award credit for accurate processes, a developed link to the effect and relevant place-specific evidence where appropriate.' },
    'subject-business': { points: ['Apply every point to the business context', 'Develop because-so-that chains', 'Finish evaluation with a supported, conditional judgement'], question: `A small bakery has limited cash but wants to grow. Explain one way knowledge of ${topic.name} could affect its decision.`, hint: 'Use the bakery’s size, cash position and objective.', answer: 'A strong answer applies an accurate business concept to limited cash, analyses its likely impact on growth and recognises a condition that could change the decision.' },
    'subject-design-technology': { points: ['Connect design choices to measurable user needs', 'Justify material and process decisions', 'Evaluate with testing evidence and wider impacts'], question: `Propose and justify one design decision related to ${topic.name} for a reusable school product.`, hint: 'Name the user need, chosen feature and measurable test.', answer: 'A strong answer identifies a suitable feature or material, links it to the school user and gives a valid measurable test or trade-off.' },
  }
  const prompt = subjectPrompts[topic.subject_id] ?? { points: ['Recall accurate subject knowledge', 'Apply it to the question', 'Justify the conclusion with evidence'], question: `Explain one important idea from ${topic.name}.`, hint: 'Use a definition, example and consequence.', answer: 'Check for accurate knowledge, an applied example and a developed explanation.' }
  return completeRevision(topic, { ...base, keyPoints: knowledgePoints(topic, prompt.points), workedExample: { title: 'Build a developed response', prompt: `How should you answer a longer question on ${topic.name}?`, steps: ['Make a direct point', 'Add precise supporting knowledge or evidence', 'Explain why the evidence matters', 'Return to the wording of the question'], answer: 'A developed response combines accurate knowledge, application and explicit reasoning.' }, practiceQuestions: reviewedPractice ? [reviewedPractice] : [{ question: prompt.question, hint: prompt.hint, answer: prompt.answer, marks: prompt.marks ?? 4 }] }, Boolean(reviewedPractice))
}

export async function getTopicRevision(user: SessionUser, topicId: string, env: Env): Promise<TopicRevision | null> {
  const studentId = await studentIdFor(user, env)
  if (!studentId) return null
  const topic = await env.DB.prepare(
    `SELECT t.id, t.name, t.description, t.component, t.subject_id, s.name AS subject_name, s.exam_board, t.source_reference
     FROM topics t JOIN subjects s ON s.id = t.subject_id
     JOIN student_subjects ss ON ss.subject_id = t.subject_id
     WHERE t.id = ? AND t.active = 1 AND ss.student_id = ? AND ss.active = 1
       AND (t.applicability = 'common'
         OR (t.subject_id = 'subject-geography' AND (
           t.id = json_extract(ss.options_json, '$.livingWorldOption')
           OR t.id = json_extract(ss.options_json, '$.resourceOption')
           OR instr(COALESCE(json_extract(ss.options_json, '$.ukLandscapeOptions'), ''), t.id) > 0
         ))
         OR (t.subject_id = 'subject-design-technology'
           AND COALESCE(json_extract(ss.options_json, '$.specialistMaterial'), 'TBC') <> 'TBC'))
       AND (t.tier = 'both' OR t.tier = ss.tier)
       AND NOT EXISTS (SELECT 1 FROM topics child WHERE child.parent_topic_id = t.id AND child.active = 1)`,
  ).bind(topicId, studentId).first<TopicRow>()
  if (!topic) return null
  const lesson = await env.DB.prepare(
    `SELECT summary, learning_objectives_json, key_points_json, exam_tips_json,
            worked_example_json, practice_questions_json, content_version, author, reviewer,
            review_status, reviewed_at FROM topic_lessons WHERE topic_id = ?`,
  ).bind(topicId).first<LessonRow>()
  const storedPractice = lesson ? parseJson<PracticeQuestion[]>(lesson.practice_questions_json, []) : []
  const reviewedPractice = topic.subject_id === 'subject-english-literature'
    ? englishLiteraturePractice(topic)
    : reviewedPracticeFor(topic.id)
  const practiceQuestions = reviewedPractice && !storedPractice.some((question) => question.question === reviewedPractice.question)
    ? [...storedPractice, reviewedPractice]
    : storedPractice
  const content = lesson ? completeRevision(topic, {
    topicId,
    summary: lesson.summary,
    learningObjectives: parseJson<string[]>(lesson.learning_objectives_json, []),
    keyPoints: parseJson<string[]>(lesson.key_points_json, []),
    examTips: parseJson<string[]>(lesson.exam_tips_json, []),
    workedExample: parseJson(lesson.worked_example_json, { title: '', prompt: '', steps: [], answer: '' }),
    practiceQuestions,
    testQuestions: createAutoTest(topic.id),
    bespoke: true,
  }, true, {
    version: lesson.content_version,
    author: lesson.author,
    reviewer: lesson.reviewer,
    reviewStatus: lesson.review_status,
    reviewedAt: lesson.reviewed_at,
    sourceUrl: topic.source_reference ?? null,
  }) : createFallbackLesson(topic)
  const resources = await resourcesFor(topic.subject_id, topicId, env)
  if (topic.source_reference && !resources.some((resource) => resource.url === topic.source_reference)) resources.push({ id: `official-${topic.id}`, title: `${topic.name}: official specification content`, provider: topic.exam_board ?? 'Exam board', resourceType: 'specification', description: 'The official course specification for this topic.', url: topic.source_reference, freeAccess: true })
  const bitesize = bitesizeResourceFor(topic)
  if (bitesize) resources.push(bitesize)
  const aiPreference = await env.DB.prepare('SELECT ai_marking_enabled FROM student_profiles WHERE user_id = ?')
    .bind(studentId).first<{ ai_marking_enabled: number }>()
  const aiMarkingAllowed = aiPreference?.ai_marking_enabled === 1
  return { ...content, aiMarkingAllowed, automaticMarkingAvailable: aiMarkingAllowed && Boolean(env.GEMINI_API_KEY), resources }
}
