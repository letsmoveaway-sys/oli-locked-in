ALTER TABLE weekly_availability ADD COLUMN session_minutes INTEGER NOT NULL DEFAULT 35
  CHECK (session_minutes BETWEEN 5 AND 60);
