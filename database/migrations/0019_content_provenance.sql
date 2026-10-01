ALTER TABLE topic_lessons ADD COLUMN content_version TEXT NOT NULL DEFAULT '1.0';
ALTER TABLE topic_lessons ADD COLUMN author TEXT NOT NULL DEFAULT 'GCSE Revision app';
ALTER TABLE topic_lessons ADD COLUMN reviewer TEXT;
ALTER TABLE topic_lessons ADD COLUMN review_status TEXT NOT NULL DEFAULT 'editorial_checked'
  CHECK (review_status IN ('draft', 'editorial_checked', 'subject_expert_checked'));
ALTER TABLE topic_lessons ADD COLUMN reviewed_at TEXT;

UPDATE topic_lessons
SET author = 'Original app content adapted from the cited specification or school revision guide',
    review_status = 'editorial_checked',
    reviewed_at = '2026-09-30',
    content_version = '1.0';
