ALTER TABLE student_profiles ADD COLUMN ai_marking_enabled INTEGER NOT NULL DEFAULT 0
  CHECK (ai_marking_enabled IN (0, 1));
