-- Store the retrieval-practice portion of a mixed revision session.
-- JSON keeps the generated agenda attached to historical sessions even if a
-- topic name or planner rule changes later.
ALTER TABLE revision_sessions ADD COLUMN review_items_json TEXT NOT NULL DEFAULT '[]';

INSERT OR REPLACE INTO settings (key, value_json, description, updated_at)
VALUES
  ('spaced_review_policy', '{"reviewMinutes":8,"equalCoverageWeight":0.5,"workloadWeight":0.5,"maxReviewItems":1}', 'Mixed-session retrieval and fortnight subject-balancing defaults', CURRENT_TIMESTAMP);
