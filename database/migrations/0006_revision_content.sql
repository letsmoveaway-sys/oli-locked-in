CREATE TABLE subject_revision_guides (
  subject_id TEXT PRIMARY KEY REFERENCES subjects(id) ON DELETE CASCADE,
  exam_summary TEXT NOT NULL,
  assessment_objectives_json TEXT NOT NULL DEFAULT '[]',
  exam_tips_json TEXT NOT NULL DEFAULT '[]',
  specification_url TEXT NOT NULL,
  assessment_resources_url TEXT NOT NULL,
  provisional INTEGER NOT NULL DEFAULT 1 CHECK (provisional IN (0, 1)),
  verified_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE revision_resources (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  provider TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('specification', 'past_papers', 'lesson', 'video', 'questions', 'reference')),
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  free_access INTEGER NOT NULL DEFAULT 1 CHECK (free_access IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  verified_at TEXT NOT NULL
);

CREATE TABLE topic_lessons (
  topic_id TEXT PRIMARY KEY REFERENCES topics(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  learning_objectives_json TEXT NOT NULL DEFAULT '[]',
  key_points_json TEXT NOT NULL DEFAULT '[]',
  exam_tips_json TEXT NOT NULL DEFAULT '[]',
  worked_example_json TEXT NOT NULL DEFAULT '{}',
  practice_questions_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_revision_resources_subject ON revision_resources(subject_id, sort_order);
CREATE INDEX idx_revision_resources_topic ON revision_resources(topic_id, sort_order);
