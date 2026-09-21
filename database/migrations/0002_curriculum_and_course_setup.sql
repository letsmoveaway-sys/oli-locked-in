PRAGMA foreign_keys = ON;

CREATE TABLE course_components (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  component_code TEXT NOT NULL,
  calculator_allowed INTEGER NOT NULL CHECK (calculator_allowed IN (0, 1)),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  maximum_marks INTEGER NOT NULL CHECK (maximum_marks > 0),
  weighting_percent REAL NOT NULL CHECK (weighting_percent > 0 AND weighting_percent <= 100),
  tier TEXT NOT NULL DEFAULT 'both' CHECK (tier IN ('foundation', 'higher', 'both')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_reference TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(subject_id, component_code, tier)
);

CREATE INDEX idx_course_components_subject ON course_components(subject_id, tier, sort_order);
