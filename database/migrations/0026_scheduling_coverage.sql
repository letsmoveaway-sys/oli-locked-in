-- Scheduling-only planning: revision capacity is counted in slots and students
-- record the curriculum coverage points completed in each slot.
ALTER TABLE weekly_availability ADD COLUMN available_slots INTEGER NOT NULL DEFAULT 0
  CHECK (available_slots BETWEEN 0 AND 12);

UPDATE weekly_availability
SET available_slots = CASE
  WHEN available_minutes <= 0 THEN 0
  ELSE MAX(1, CAST(available_minutes / MAX(session_minutes, 1) AS INTEGER))
END;

ALTER TABLE availability_exceptions ADD COLUMN available_slots INTEGER
  CHECK (available_slots BETWEEN 0 AND 12);

CREATE TABLE topic_schedule_targets (
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  target_sessions INTEGER NOT NULL DEFAULT 1 CHECK (target_sessions BETWEEN 0 AND 100),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, topic_id)
);

CREATE TABLE topic_coverage_progress (
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  coverage_item_id TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  session_id TEXT REFERENCES revision_sessions(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, topic_id, coverage_item_id)
);

CREATE INDEX idx_topic_coverage_student_topic
  ON topic_coverage_progress(student_id, topic_id);
