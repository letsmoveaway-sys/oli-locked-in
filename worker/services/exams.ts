import type { Env, SessionUser } from '../types'

export type ExamEventKind = 'final' | 'mock' | 'school_assessment'

export interface ExamInput {
  id?: string
  subjectId: string
  component: string
  examDatetime: string
  durationMinutes: number
  eventKind: ExamEventKind
  confirmed: boolean
  source: string
}

export async function saveExam(user: SessionUser, input: ExamInput, env: Env): Promise<boolean> {
  if (user.role !== 'parent') return false
  const subject = await env.DB.prepare(
    `SELECT s.exam_board FROM subjects s
     JOIN student_subjects ss ON ss.subject_id = s.id
     WHERE s.id = ? AND ss.active = 1
     LIMIT 1`,
  ).bind(input.subjectId).first<{ exam_board: string }>()
  if (!subject) return false

  const id = input.id ?? crypto.randomUUID()
  const result = await env.DB.prepare(
    `INSERT INTO exams
      (id, subject_id, component, exam_datetime, duration_minutes, exam_board, confirmed, source,
       last_verified_at, event_kind, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       subject_id = excluded.subject_id,
       component = excluded.component,
       exam_datetime = excluded.exam_datetime,
       duration_minutes = excluded.duration_minutes,
       exam_board = excluded.exam_board,
       confirmed = excluded.confirmed,
       source = excluded.source,
       last_verified_at = CURRENT_TIMESTAMP,
       event_kind = excluded.event_kind,
       updated_at = CURRENT_TIMESTAMP`,
  ).bind(
    id,
    input.subjectId,
    input.component,
    input.examDatetime,
    input.durationMinutes,
    subject.exam_board,
    input.confirmed ? 1 : 0,
    input.source,
    input.eventKind,
  ).run()
  return result.success
}
