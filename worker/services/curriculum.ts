import type { Env, SessionUser } from '../types'

export type CourseTier = 'TBC' | 'foundation' | 'higher' | 'not_applicable'

export interface CourseConfigurationInput {
  subjectId: string
  active: boolean
  tier: CourseTier
  currentGrade: string | null
  targetGrade: string | null
  options: Record<string, string>
}

interface SubjectRow {
  id: string
  name: string
  exam_board: string
  specification_code: string | null
  course_active: number
  tier: string
  current_grade: string | null
  target_grade: string | null
  options_json: string
}

interface ComponentRow {
  id: string
  subject_id: string
  name: string
  component_code: string
  calculator_allowed: number
  duration_minutes: number
  maximum_marks: number
  weighting_percent: number
  tier: string
}

interface TopicRow {
  id: string
  subject_id: string
  parent_topic_id: string | null
  name: string
  description: string
  tier: string
  estimated_effort: number
  importance: number
  source_reference: string | null
  applicability: string
}

export interface CourseTopic {
  id: string
  name: string
  description: string
  tier: string
  estimatedEffort: number
  weightingPercent: number | null
  sourceReference: string | null
  applicability: string
  children: CourseTopic[]
}

export interface CourseOverview {
  id: string
  name: string
  examBoard: string
  specificationCode: string | null
  active: boolean
  tier: string
  currentGrade: string | null
  targetGrade: string | null
  options: Record<string, string>
  configurationComplete: boolean
  components: Array<{
    id: string
    name: string
    code: string
    calculatorAllowed: boolean
    durationMinutes: number
    maximumMarks: number
    weightingPercent: number
  }>
  topics: CourseTopic[]
}

function parseOptions(value: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    )
  } catch {
    return {}
  }
}

function shortText(value: unknown): string | null | undefined {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || value.trim().length > 20) return undefined
  return value.trim()
}

export function validateCourseConfiguration(value: unknown): CourseConfigurationInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  const tiers: CourseTier[] = ['TBC', 'foundation', 'higher', 'not_applicable']
  const currentGrade = shortText(body.currentGrade)
  const targetGrade = shortText(body.targetGrade)
  if (
    typeof body.subjectId !== 'string' ||
    !/^subject-[a-z-]+$/.test(body.subjectId) ||
    typeof body.active !== 'boolean' ||
    typeof body.tier !== 'string' ||
    !tiers.includes(body.tier as CourseTier) ||
    currentGrade === undefined ||
    targetGrade === undefined ||
    !body.options ||
    typeof body.options !== 'object' ||
    Array.isArray(body.options)
  ) return null

  const optionEntries = Object.entries(body.options as Record<string, unknown>)
  if (optionEntries.length > 20 || optionEntries.some(([key, option]) => (
    key.length > 50 || typeof option !== 'string' || option.length > 200
  ))) return null

  return {
    subjectId: body.subjectId,
    active: body.active,
    tier: body.tier as CourseTier,
    currentGrade,
    targetGrade,
    options: Object.fromEntries(optionEntries) as Record<string, string>,
  }
}

async function studentIdFor(user: SessionUser, env: Env): Promise<string | null> {
  if (user.role === 'student') return user.id
  const profile = await env.DB.prepare('SELECT user_id FROM student_profiles ORDER BY created_at LIMIT 1')
    .first<{ user_id: string }>()
  return profile?.user_id ?? null
}

export async function getCourseOverview(user: SessionUser, env: Env): Promise<CourseOverview[]> {
  const studentId = await studentIdFor(user, env)
  if (!studentId) return []

  const [subjectResult, componentResult, topicResult] = await Promise.all([
    env.DB.prepare(
      `SELECT s.id, s.name, s.exam_board, s.specification_code,
              ss.active AS course_active, ss.tier, ss.current_grade, ss.target_grade, ss.options_json
       FROM subjects s
       JOIN student_subjects ss ON ss.subject_id = s.id
       WHERE ss.student_id = ?
       ORDER BY s.name`,
    ).bind(studentId).all<SubjectRow>(),
    env.DB.prepare(
      `SELECT cc.id, cc.subject_id, cc.name, cc.component_code, cc.calculator_allowed,
              cc.duration_minutes, cc.maximum_marks, cc.weighting_percent, cc.tier
       FROM course_components cc
       JOIN student_subjects ss ON ss.subject_id = cc.subject_id
       WHERE ss.student_id = ? AND (cc.tier = 'both' OR cc.tier = ss.tier)
       ORDER BY cc.sort_order`,
    ).bind(studentId).all<ComponentRow>(),
    env.DB.prepare(
      `SELECT t.id, t.subject_id, t.parent_topic_id, t.name, t.description, t.tier,
              t.estimated_effort, t.importance, t.source_reference, t.applicability
       FROM topics t
       JOIN student_subjects ss ON ss.subject_id = t.subject_id
       WHERE ss.student_id = ? AND t.active = 1 AND (t.tier = 'both' OR t.tier = ss.tier)
         AND (t.applicability = 'common'
           OR (t.subject_id = 'subject-geography' AND (
             t.id = json_extract(ss.options_json, '$.livingWorldOption')
             OR t.id = json_extract(ss.options_json, '$.resourceOption')
             OR instr(COALESCE(json_extract(ss.options_json, '$.ukLandscapeOptions'), ''), t.id) > 0
           ))
           OR (t.subject_id = 'subject-design-technology' AND COALESCE(json_extract(ss.options_json, '$.specialistMaterial'), 'TBC') <> 'TBC'))
         ORDER BY t.subject_id, t.parent_topic_id, t.name`,
    ).bind(studentId).all<TopicRow>(),
  ])

  return subjectResult.results.map((subject) => {
    const topicRows = topicResult.results.filter((topic) => topic.subject_id === subject.id)
    const childrenByParent = new Map<string, TopicRow[]>()
    for (const topic of topicRows) {
      if (!topic.parent_topic_id) continue
      const children = childrenByParent.get(topic.parent_topic_id) ?? []
      children.push(topic)
      childrenByParent.set(topic.parent_topic_id, children)
    }
    const mapTopic = (topic: TopicRow): CourseTopic => ({
      id: topic.id,
      name: topic.name,
      description: topic.description,
      tier: topic.tier,
      estimatedEffort: topic.estimated_effort,
      weightingPercent: topic.parent_topic_id || topic.importance <= 0 ? null : Math.round(topic.importance * 100),
      sourceReference: topic.source_reference,
      applicability: topic.applicability,
      children: (childrenByParent.get(topic.id) ?? []).map(mapTopic),
    })
    const options = parseOptions(subject.options_json)
    const requiredKeys: Record<string, string[]> = {
      'subject-english-literature': ['shakespeare', 'nineteenthCenturyNovel', 'modernText', 'poetryCluster'],
      'subject-combined-science': ['course'],
      'subject-history': ['thematicStudy', 'periodStudy', 'britishDepthStudy', 'modernDepthStudy'],
      'subject-geography': ['livingWorldOption', 'ukLandscapeOptions', 'resourceOption', 'caseStudies'],
      'subject-design-technology': ['specialistMaterial', 'neaStage'],
    }
    const requiredOptionsComplete = (requiredKeys[subject.id] ?? []).every((key) => options[key] && options[key] !== 'TBC')
    return {
      id: subject.id,
      name: subject.name,
      examBoard: subject.exam_board,
      specificationCode: subject.specification_code,
      active: subject.course_active === 1,
      tier: subject.tier,
      currentGrade: subject.current_grade,
      targetGrade: subject.target_grade,
      options,
      configurationComplete: subject.exam_board !== 'TBC' && options.configuration === 'confirmed' && requiredOptionsComplete &&
        (!['subject-mathematics', 'subject-combined-science'].includes(subject.id) || subject.tier !== 'TBC'),
      components: componentResult.results
        .filter((component) => component.subject_id === subject.id)
        .map((component) => ({
          id: component.id,
          name: component.name,
          code: component.component_code,
          calculatorAllowed: component.calculator_allowed === 1,
          durationMinutes: component.duration_minutes,
          maximumMarks: component.maximum_marks,
          weightingPercent: component.weighting_percent,
        })),
      topics: topicRows.filter((topic) => topic.parent_topic_id === null).map(mapTopic),
    }
  })
}

export async function updateCourseConfiguration(
  user: SessionUser,
  input: CourseConfigurationInput,
  env: Env,
): Promise<boolean> {
  const studentId = await studentIdFor(user, env)
  if (!studentId) return false
  const result = await env.DB.prepare(
    `UPDATE student_subjects
     SET active = ?, tier = ?, current_grade = ?, target_grade = ?, options_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE student_id = ? AND subject_id = ?`,
  ).bind(
    input.active ? 1 : 0,
    input.tier,
    input.currentGrade,
    input.targetGrade,
    JSON.stringify(input.options),
    studentId,
    input.subjectId,
  ).run()
  return result.success && (result.meta.changes ?? 0) > 0
}
