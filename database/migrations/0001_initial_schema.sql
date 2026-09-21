PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email_or_username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'parent')),
  auth_identity TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  exam_year INTEGER NOT NULL,
  default_session_minutes INTEGER NOT NULL DEFAULT 35 CHECK (default_session_minutes BETWEEN 30 AND 40),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  exam_board TEXT NOT NULL,
  specification_code TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, exam_board)
);

CREATE TABLE student_subjects (
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'TBC',
  target_grade TEXT,
  current_grade TEXT,
  options_json TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, subject_id)
);

CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  parent_topic_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
  component TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  exam_board TEXT NOT NULL DEFAULT 'TBC',
  specification_code TEXT,
  tier TEXT NOT NULL DEFAULT 'both',
  estimated_effort REAL NOT NULL DEFAULT 1 CHECK (estimated_effort > 0),
  importance REAL NOT NULL DEFAULT 1 CHECK (importance >= 0),
  source_reference TEXT,
  specification_version TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE topic_progress (
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  mastery_score REAL CHECK (mastery_score BETWEEN 0 AND 100),
  confidence TEXT CHECK (confidence IN ('unknown', 'struggling', 'ok', 'confident')),
  rag_status TEXT NOT NULL DEFAULT 'grey' CHECK (rag_status IN ('grey', 'red', 'amber', 'green')),
  last_revised_at TEXT,
  total_sessions INTEGER NOT NULL DEFAULT 0 CHECK (total_sessions >= 0),
  total_minutes INTEGER NOT NULL DEFAULT 0 CHECK (total_minutes >= 0),
  next_review_at TEXT,
  priority_score REAL,
  manual_priority REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, topic_id)
);

CREATE TABLE revision_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  scheduled_at TEXT NOT NULL,
  planned_minutes INTEGER NOT NULL CHECK (planned_minutes > 0),
  actual_minutes INTEGER CHECK (actual_minutes >= 0),
  session_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'partially_completed', 'skipped', 'rescheduled', 'cancelled_unavailable', 'tutor')),
  confidence_after TEXT CHECK (confidence_after IN ('unknown', 'struggling', 'ok', 'confident')),
  planner_reason TEXT,
  source TEXT NOT NULL DEFAULT 'generated' CHECK (source IN ('generated', 'manual', 'tutor')),
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  score REAL NOT NULL CHECK (score >= 0),
  maximum_score REAL NOT NULL CHECK (maximum_score > 0),
  percentage REAL NOT NULL CHECK (percentage BETWEEN 0 AND 100),
  assessment_type TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE weekly_availability (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  available_minutes INTEGER NOT NULL CHECK (available_minutes >= 0),
  start_time TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, weekday)
);

CREATE TABLE availability_exceptions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  start_datetime TEXT NOT NULL,
  end_datetime TEXT NOT NULL,
  reason TEXT NOT NULL,
  available_minutes INTEGER CHECK (available_minutes >= 0),
  protect_streak INTEGER NOT NULL DEFAULT 0 CHECK (protect_streak IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_datetime > start_datetime)
);

CREATE TABLE tutor_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  recurrence_rule TEXT NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exams (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  component TEXT NOT NULL,
  exam_datetime TEXT NOT NULL,
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  exam_board TEXT NOT NULL,
  confirmed INTEGER NOT NULL DEFAULT 0 CHECK (confirmed IN (0, 1)),
  source TEXT,
  last_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mastery_history (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  score REAL NOT NULL CHECK (score BETWEEN 0 AND 100),
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason TEXT NOT NULL
);

CREATE TABLE xp_events (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  related_session_id TEXT REFERENCES revision_sessions(id) ON DELETE SET NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_topics_subject_active ON topics(subject_id, active);
CREATE INDEX idx_topics_parent ON topics(parent_topic_id);
CREATE INDEX idx_topic_progress_priority ON topic_progress(student_id, priority_score DESC);
CREATE INDEX idx_sessions_schedule ON revision_sessions(student_id, scheduled_at);
CREATE INDEX idx_sessions_status ON revision_sessions(student_id, status);
CREATE INDEX idx_assessments_topic_date ON assessments(student_id, topic_id, completed_at DESC);
CREATE INDEX idx_exceptions_dates ON availability_exceptions(student_id, start_datetime, end_datetime);
CREATE INDEX idx_tutors_student_day ON tutor_sessions(student_id, weekday, active);
CREATE INDEX idx_exams_subject_date ON exams(subject_id, exam_datetime);
CREATE INDEX idx_mastery_history_topic_date ON mastery_history(student_id, topic_id, recorded_at DESC);
CREATE INDEX idx_xp_events_student_date ON xp_events(student_id, created_at DESC);
