CREATE TABLE session_completion_attempts (
  session_id TEXT PRIMARY KEY REFERENCES revision_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  owner_token TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'evidence_saved', 'applied')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE mastery_history ADD COLUMN operation_key TEXT;

CREATE UNIQUE INDEX idx_mastery_history_operation
  ON mastery_history(student_id, topic_id, operation_key)
  WHERE operation_key IS NOT NULL;
