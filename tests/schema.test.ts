// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('initial migration', () => {
  it('defines every foundational V1 entity', () => {
    const migration = readFileSync('database/migrations/0001_initial_schema.sql', 'utf8')
    const tables = [
      'users', 'student_profiles', 'subjects', 'student_subjects', 'topics', 'topic_progress',
      'revision_sessions', 'assessments', 'weekly_availability', 'availability_exceptions',
      'tutor_sessions', 'exams', 'mastery_history', 'xp_events', 'settings',
    ]
    for (const table of tables) expect(migration).toContain(`CREATE TABLE ${table}`)
  })

  it('adds versioned course-component support for Phase 2', () => {
    const migration = readFileSync('database/migrations/0002_curriculum_and_course_setup.sql', 'utf8')
    expect(migration).toContain('CREATE TABLE course_components')
    expect(migration).toContain('calculator_allowed')
  })

  it('tracks provisional and option-dependent curriculum safely', () => {
    const migration = readFileSync('database/migrations/0003_topic_applicability.sql', 'utf8')
    expect(migration).toContain("'option_required'")
    expect(migration).toContain("'provisional_course'")
  })

  it('versions the configurable mastery model', () => {
    const migration = readFileSync('database/migrations/0004_mastery_settings.sql', 'utf8')
    expect(migration).toContain('mastery_weights')
    expect(migration).toContain('confidence_scores')
  })

  it('adds persistent weekly goals and configurable XP for Phase 7', () => {
    const migration = readFileSync('database/migrations/0005_analytics_and_gamification.sql', 'utf8')
    expect(migration).toContain('weekly_goal_minutes')
    expect(migration).toContain('xp_awards')
    expect(migration).toContain('idx_xp_events_unique_session_type')
  })

  it('adds revision guides, trusted resources and topic lessons', () => {
    const migration = readFileSync('database/migrations/0006_revision_content.sql', 'utf8')
    expect(migration).toContain('CREATE TABLE subject_revision_guides')
    expect(migration).toContain('CREATE TABLE revision_resources')
    expect(migration).toContain('CREATE TABLE topic_lessons')
  })

  it('configures the confirmed AQA core courses and Trilogy working assumption', () => {
    const migration = readFileSync('database/migrations/0012_aqa_core_courses.sql', 'utf8')
    expect(migration).toContain("specification_code = '8300'")
    expect(migration).toContain("specification_code = '8700'")
    expect(migration).toContain("specification_code = '8702'")
    expect(migration).toContain("specification_code = '8464'")
    expect(migration).toContain("'$.poetryCluster', 'Power and Conflict'")
    expect(migration).toContain("'$.courseStatus', 'working assumption'")
    expect(migration).toContain("'science-8464-b1h'")
    expect(migration).toContain("'english-lit-poem-kamikaze'")
  })

  it('stores mixed-session spaced retrieval agendas', () => {
    const migration = readFileSync('database/migrations/0013_spaced_review_sessions.sql', 'utf8')
    expect(migration).toContain('review_items_json')
    expect(migration).toContain('spaced_review_policy')
  })
})
