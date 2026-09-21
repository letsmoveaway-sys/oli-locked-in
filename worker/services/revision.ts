import type { Env, SessionUser } from '../types'

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
}

export interface AutoMarkQuestion {
  id: string
  question: string
  options: string[]
  correctOption: number
  explanation: string
  marks: number
}

export interface TopicRevision {
  topicId: string
  summary: string
  learningObjectives: string[]
  keyPoints: string[]
  examTips: string[]
  workedExample: { title: string; prompt: string; steps: string[]; answer: string }
  practiceQuestions: PracticeQuestion[]
  testQuestions: AutoMarkQuestion[]
  resources: RevisionResource[]
  bespoke: boolean
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

export function createAutoTest(topicId: string, subjectId: string, topicName: string, topicDescription = ''): AutoMarkQuestion[] {
  const tests: Record<string, AutoMarkQuestion[]> = {
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
  return tests[topicId] ?? [
    { id: `${topicId}-1`, question: `Which description most accurately matches ${topicName}?`, options: [topicDescription || `The specified knowledge and skills for ${topicName}`, 'Only general exam timing, with no subject knowledge', 'A topic that is excluded from the qualification', 'Coursework presentation rules only'], correctOption: 0, explanation: topicDescription || `This is the course description for ${topicName}.`, marks: 1 },
    { id: `${topicId}-2`, question: `Which revision method best checks understanding of ${topicName}?`, options: ['Reread notes only', 'Copy the title repeatedly', 'Answer a closed-book question and check it against a mark scheme', 'Highlight every line'], correctOption: 2, explanation: 'Retrieval followed by feedback exposes gaps and shows exactly what to improve.', marks: 1 },
    { id: `${topicId}-3`, question: `What should you do after getting a ${subjectId === 'subject-mathematics' ? 'calculation' : 'practice'} question wrong?`, options: ['Hide the answer', 'Record the first incorrect step, review it, then retry', 'Change the score', 'Move on permanently'], correctOption: 1, explanation: 'Finding the first error and retrying turns feedback into learning.', marks: 1 },
  ]
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
  const base = {
    topicId: topic.id,
    summary: topic.description,
    learningObjectives: [`Explain the key ideas in ${topic.name}`, `Apply ${topic.name} to an exam-style task`, 'Check an answer against the command word and available marks'],
    examTips: ['Underline the command word and key data', 'Make one relevant point for each available mark', 'Check the answer is specific to the scenario or evidence given'],
    bespoke: false,
    testQuestions: createAutoTest(topic.id, topic.subject_id, topic.name, topic.description),
  }
  if (topic.subject_id === 'subject-mathematics') return { ...base,
    keyPoints: ['Write the method clearly, one step at a time', 'Keep exact values until the final step', 'Estimate or substitute back to check the result'],
    workedExample: { title: 'A reliable exam method', prompt: `How should you approach an unfamiliar ${topic.name} question?`, steps: ['List the values and facts given', 'Choose a relevant rule, formula or representation', 'Show each substitution and calculation', 'Check units, accuracy and whether the result is sensible'], answer: 'A complete answer shows a valid method as well as the final result.' },
    practiceQuestions: [
      { question: `Write down two rules, formulae or representations used in ${topic.name}, and explain when each is useful.`, hint: 'Use your notes or the linked specification to identify the exact knowledge.', answer: 'Award one mark for each correct rule or representation and one for each accurate explanation.', marks: 4 },
      { question: `Complete one ${topic.name} question from the materials your school provides. Then write the first line of your method and explain your final check.`, hint: 'Select a question whose marks match the time you have.', answer: 'Compare every working line with its mark scheme; record the exact first point where your method differs.', marks: 4 },
    ],
  }
  if (topic.subject_id === 'subject-english-language') return { ...base,
    keyPoints: ['Name a precise method, select a short quotation and explain its effect', 'Link interpretation to purpose, audience and form', 'Develop comparisons through both ideas and methods'],
    workedExample: { title: 'Language analysis', prompt: 'Analyse: “The street held its breath as the last light disappeared.”', steps: ['Select “held its breath”', 'Identify personification', 'Infer tense anticipation and unnatural stillness', 'Link the effect to the disappearing light and possible danger'], answer: 'The personification “held its breath” makes the street seem tense and watchful, creating suspense as darkness arrives.' },
    practiceQuestions: [{ question: 'How does the writer use language in “Rain hammered the empty playground, swallowing every sound”?', hint: 'Analyse the verbs and their effects, not just their labels.', answer: 'A developed answer may explain that violent “hammered” makes the weather seem aggressive, while “swallowing” personifies it as consuming the setting and intensifies isolation.', marks: 4 }],
  }
  if (topic.subject_id === 'subject-combined-science') return { ...base,
    keyPoints: ['Use precise scientific vocabulary', 'For calculations, state the equation, substitute, calculate and include units', 'For practicals, identify variables, controls, measurements and improvements'],
    workedExample: { title: 'Explain using a scientific chain', prompt: `How do you build a strong explanation about ${topic.name}?`, steps: ['State the relevant scientific fact', 'Use because to give the mechanism', 'Use therefore to connect it to the outcome', 'Check each link is scientifically accurate'], answer: 'A strong explanation connects cause, scientific mechanism and observed result.' },
    practiceQuestions: [{ question: `Describe one investigation relevant to ${topic.name}. Identify the independent variable, dependent variable and two controls.`, hint: 'Choose a required practical or classroom investigation from this topic.', answer: 'Award one mark for a workable method and one each for a correct independent variable, dependent variable and two valid control variables.', marks: 5 }],
  }
  const subjectPrompts: Record<string, { points: string[]; question: string; hint: string; answer: string }> = {
    'subject-english-literature': { points: ['Build a clear argument about the writer’s ideas', 'Use short, precise references', 'Connect language, form, structure and relevant context'], question: `Plan a response explaining how a writer presents one central idea in ${topic.name}.`, hint: 'Write a thesis and three paragraph claims, each with a reference.', answer: 'A strong plan has an arguable thesis, a logical sequence of claims, precise evidence, analysis of method and relevant contextual insight.' },
    'subject-history': { points: ['Use precise evidence from the correct period', 'Develop cause, consequence, change or significance', 'Evaluate sources and interpretations in context'], question: `Explain two ways an event or development in ${topic.name} was significant.`, hint: 'Use a different effect, group or timescale for each reason.', answer: 'Each reason needs specific supporting knowledge and a developed explanation of its importance.' },
    'subject-geography': { points: ['Use named evidence and geographical vocabulary', 'Develop cause-effect-response chains', 'Quote figures and units from resources'], question: `Explain one cause and one effect associated with ${topic.name}.`, hint: 'Develop each point using because and therefore.', answer: 'Award credit for accurate processes, a developed link to the effect and relevant place-specific evidence where appropriate.' },
    'subject-business': { points: ['Apply every point to the business context', 'Develop because-so-that chains', 'Finish evaluation with a supported, conditional judgement'], question: `A small bakery has limited cash but wants to grow. Explain one way knowledge of ${topic.name} could affect its decision.`, hint: 'Use the bakery’s size, cash position and objective.', answer: 'A strong answer applies an accurate business concept to limited cash, analyses its likely impact on growth and recognises a condition that could change the decision.' },
    'subject-design-technology': { points: ['Connect design choices to measurable user needs', 'Justify material and process decisions', 'Evaluate with testing evidence and wider impacts'], question: `Propose and justify one design decision related to ${topic.name} for a reusable school product.`, hint: 'Name the user need, chosen feature and measurable test.', answer: 'A strong answer identifies a suitable feature or material, links it to the school user and gives a valid measurable test or trade-off.' },
  }
  const prompt = subjectPrompts[topic.subject_id] ?? { points: ['Recall accurate subject knowledge', 'Apply it to the question', 'Justify the conclusion with evidence'], question: `Explain one important idea from ${topic.name}.`, hint: 'Use a definition, example and consequence.', answer: 'Check for accurate knowledge, an applied example and a developed explanation.' }
  return { ...base, keyPoints: prompt.points, workedExample: { title: 'Build a developed response', prompt: `How should you answer a longer question on ${topic.name}?`, steps: ['Make a direct point', 'Add precise supporting knowledge or evidence', 'Explain why the evidence matters', 'Return to the wording of the question'], answer: 'A developed response combines accurate knowledge, application and explicit reasoning.' }, practiceQuestions: [{ question: prompt.question, hint: prompt.hint, answer: prompt.answer, marks: 4 }] }
}

export async function getTopicRevision(user: SessionUser, topicId: string, env: Env): Promise<TopicRevision | null> {
  const studentId = await studentIdFor(user, env)
  if (!studentId) return null
  const topic = await env.DB.prepare(
    `SELECT t.id, t.name, t.description, t.component, t.subject_id, s.name AS subject_name, s.exam_board, t.source_reference
     FROM topics t JOIN subjects s ON s.id = t.subject_id
     JOIN student_subjects ss ON ss.subject_id = t.subject_id
     WHERE t.id = ? AND t.active = 1 AND ss.student_id = ? AND ss.active = 1
       AND t.applicability = 'common' AND (t.tier = 'both' OR t.tier = ss.tier)
       AND NOT EXISTS (SELECT 1 FROM topics child WHERE child.parent_topic_id = t.id AND child.active = 1)`,
  ).bind(topicId, studentId).first<TopicRow>()
  if (!topic) return null
  const lesson = await env.DB.prepare(
    `SELECT summary, learning_objectives_json, key_points_json, exam_tips_json,
            worked_example_json, practice_questions_json FROM topic_lessons WHERE topic_id = ?`,
  ).bind(topicId).first<LessonRow>()
  const content = lesson ? {
    topicId,
    summary: lesson.summary,
    learningObjectives: parseJson<string[]>(lesson.learning_objectives_json, []),
    keyPoints: parseJson<string[]>(lesson.key_points_json, []),
    examTips: parseJson<string[]>(lesson.exam_tips_json, []),
    workedExample: parseJson(lesson.worked_example_json, { title: '', prompt: '', steps: [], answer: '' }),
    practiceQuestions: parseJson<PracticeQuestion[]>(lesson.practice_questions_json, []),
    testQuestions: createAutoTest(topic.id, topic.subject_id, topic.name, topic.description),
    bespoke: true,
  } : createFallbackLesson(topic)
  const resources = await resourcesFor(topic.subject_id, topicId, env)
  if (topic.source_reference && !resources.some((resource) => resource.url === topic.source_reference)) resources.push({ id: `official-${topic.id}`, title: `${topic.name}: official specification content`, provider: topic.exam_board ?? 'Exam board', resourceType: 'specification', description: 'The official course specification for this topic.', url: topic.source_reference, freeAccess: true })
  return { ...content, resources }
}
