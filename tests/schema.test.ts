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

  it('records how assessment evidence was marked', () => {
    const migration = readFileSync('database/migrations/0014_assessment_evidence.sql', 'utf8')
    expect(migration).toContain('marking_source')
    expect(migration).toContain('marking_confidence')
    expect(migration).toContain('feedback_json')
  })

  it('configures Geography, Business and Design and Technology without inventing school options', () => {
    const migration = readFileSync('database/migrations/0015_confirm_geography_business_dt.sql', 'utf8')
    expect(migration).toContain("specification_code = '8035'")
    expect(migration).toContain("specification_code = '1BS0'")
    expect(migration).toContain("specification_code = '8552'")
    expect(migration).toContain("'res-geo-bbc'")
    expect(migration).toContain("'res-geo-internet-geography'")
    expect(migration).toContain("'option_required'")
    expect(migration).toContain("'$.specialistMaterial', 'TBC'")
  })

  it('stores sourced calendar events and content review provenance', () => {
    const exams = readFileSync('database/migrations/0018_exam_event_kind.sql', 'utf8')
    const content = readFileSync('database/migrations/0019_content_provenance.sql', 'utf8')
    expect(exams).toContain("'school_assessment'")
    expect(content).toContain('content_version')
    expect(content).toContain('subject_expert_checked')
    expect(content).toContain('reviewed_at')
  })

  it('makes AI marking Parent-controlled and session completion recoverable', () => {
    const ai = readFileSync('database/migrations/0020_parent_ai_control.sql', 'utf8')
    const completion = readFileSync('database/migrations/0021_idempotent_completion.sql', 'utf8')
    expect(ai).toContain('ai_marking_enabled')
    expect(completion).toContain('session_completion_attempts')
    expect(completion).toContain('idx_mastery_history_operation')
  })

  it('stores guided course choices, daily study blocks and AI audit fields', () => {
    const courses = readFileSync('database/migrations/0022_guided_course_options.sql', 'utf8')
    const studyBlocks = readFileSync('database/migrations/0023_daily_session_lengths.sql', 'utf8')
    const audit = readFileSync('database/migrations/0024_ai_marking_audit.sql', 'utf8')
    expect(courses).toContain('thematicStudy')
    expect(courses).toContain('modernDepthStudy')
    expect(courses).toContain('neaStage')
    expect(studyBlocks).toContain('session_minutes')
    expect(audit).toContain('marking_model')
    expect(audit).toContain('rubric_version')
  })

  it('versions the cross-subject content learning standard without claiming teacher approval', () => {
    const content = readFileSync('database/migrations/0025_content_learning_standard.sql', 'utf8')
    expect(content).toContain("content_version = '2.0'")
    expect(content).toContain("review_status = CASE WHEN review_status = 'subject_expert_checked'")
    expect(content).toContain("'editorial_checked'")
  })
})
