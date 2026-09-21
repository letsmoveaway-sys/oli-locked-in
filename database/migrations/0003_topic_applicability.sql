ALTER TABLE topics ADD COLUMN applicability TEXT NOT NULL DEFAULT 'common'
  CHECK (applicability IN ('common', 'option_required', 'provisional_course'));

CREATE INDEX idx_topics_applicability ON topics(subject_id, applicability, active);
