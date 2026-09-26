import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createFallbackLesson } from '../worker/services/revision'

interface ParsedTopic {
  id: string
  subjectId: string
  parentId: string | null
}

const confirmedSubjects = new Set([
  'subject-mathematics',
  'subject-english-language',
  'subject-english-literature',
  'subject-combined-science',
  'subject-history',
])

function topicsFromMigration(path: string): ParsedTopic[] {
  const sql = readFileSync(new URL(path, import.meta.url), 'utf8')
  const inserts = sql.match(/INSERT(?: OR IGNORE)? INTO topics\b[\s\S]*?(?=\r?\n(?:INSERT|UPDATE|DELETE)\b|$)/g) ?? []
  return inserts.flatMap((insert) => Array.from(insert.matchAll(/\('([^']+)',\s*'(subject-[^']+)',\s*(NULL|'[^']+')/g), (match) => {
    const parent = match[3]!
    return {
      id: match[1]!,
      subjectId: match[2]!,
      parentId: parent === 'NULL' ? null : parent.slice(1, -1),
    }
  }))
}

describe('reviewed practice coverage', () => {
  it('has scoreable, topic-specific practice for every confirmed syllabus leaf', () => {
    const topics = [
      ...topicsFromMigration('../database/migrations/0012_aqa_core_courses.sql'),
      ...topicsFromMigration('../database/migrations/0007_edexcel_history.sql'),
    ]
    const parentIds = new Set(topics.flatMap((topic) => topic.parentId ? [topic.parentId] : []))
    const leaves = topics.filter((topic) => confirmedSubjects.has(topic.subjectId) && !parentIds.has(topic.id))

    expect(leaves.length).toBeGreaterThan(100)
    for (const topic of leaves) {
      const lesson = createFallbackLesson({
        id: topic.id,
        name: topic.id,
        description: `Reviewed coverage for ${topic.id}`,
        component: null,
        subject_id: topic.subjectId,
        subject_name: topic.subjectId,
      })
      expect.soft(lesson.writtenQuestions.some((question) => question.canUpdateMastery), topic.id).toBe(true)
      expect.soft(lesson.practiceQuestions[0]?.question, topic.id).not.toMatch(/Which description most accurately|revision method best checks|important idea from/)
    }
  })
})
