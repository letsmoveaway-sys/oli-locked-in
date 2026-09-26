ALTER TABLE assessments ADD COLUMN marking_source TEXT NOT NULL DEFAULT 'auto_marked'
  CHECK (marking_source IN ('auto_marked', 'ai_estimated', 'self_reported', 'teacher_marked'));
ALTER TABLE assessments ADD COLUMN marking_confidence TEXT
  CHECK (marking_confidence IN ('low', 'medium', 'high'));
ALTER TABLE assessments ADD COLUMN feedback_json TEXT;

CREATE INDEX idx_assessments_evidence
  ON assessments(student_id, topic_id, marking_source, completed_at);
