ALTER TABLE student_profiles ADD COLUMN weekly_goal_minutes INTEGER NOT NULL DEFAULT 180 CHECK (weekly_goal_minutes BETWEEN 30 AND 1200);

INSERT OR IGNORE INTO settings (key, value_json, description)
VALUES
  ('xp_awards', '{"plannedSession":10,"practiceQuiz":5,"redToAmber":20,"amberToGreen":30,"weeklyGoal":50}', 'Configurable XP awards'),
  ('level_size', '100', 'XP required for each level');

CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_events_unique_session_type
  ON xp_events(student_id, event_type, related_session_id)
  WHERE related_session_id IS NOT NULL;
