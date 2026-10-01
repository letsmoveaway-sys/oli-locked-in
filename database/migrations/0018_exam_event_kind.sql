ALTER TABLE exams ADD COLUMN event_kind TEXT NOT NULL DEFAULT 'final'
  CHECK (event_kind IN ('final', 'mock', 'school_assessment'));

CREATE INDEX IF NOT EXISTS idx_exams_subject_datetime
  ON exams(subject_id, exam_datetime);
