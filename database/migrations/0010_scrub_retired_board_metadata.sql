-- Remove retired board metadata from historical rows while retaining evidence IDs.
DELETE FROM revision_sessions
WHERE status = 'planned' AND topic_id IN (
  SELECT id FROM topics WHERE exam_board = char(65, 81, 65)
);

DELETE FROM topic_lessons
WHERE topic_id IN (SELECT id FROM topics WHERE exam_board = char(65, 81, 65));

DELETE FROM revision_resources
WHERE provider = char(65, 81, 65)
   OR topic_id IN (SELECT id FROM topics WHERE exam_board = char(65, 81, 65));

UPDATE topics
SET exam_board = 'TBC', specification_code = NULL, source_reference = NULL,
    specification_version = NULL, active = 0, updated_at = CURRENT_TIMESTAMP
WHERE exam_board = char(65, 81, 65);

UPDATE exams
SET exam_board = 'TBC', confirmed = 0, updated_at = CURRENT_TIMESTAMP
WHERE exam_board = char(65, 81, 65);
