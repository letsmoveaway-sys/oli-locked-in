ALTER TABLE revision_sessions ADD COLUMN started_at TEXT;

CREATE INDEX IF NOT EXISTS idx_revision_sessions_student_started
  ON revision_sessions(student_id, started_at DESC);
