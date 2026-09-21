-- Subjects with an old assumed board return to TBC until the school confirms them.
-- The character expression identifies the retired board without reintroducing it
-- into current course content. Historic topic and completed-session evidence stays.

DELETE FROM revision_sessions
WHERE status = 'planned' AND topic_id IN (
  SELECT id FROM topics WHERE subject_id IN (
    SELECT id FROM subjects WHERE exam_board = char(65, 81, 65) AND id <> 'subject-history'
  )
);

UPDATE topics SET active = 0, updated_at = CURRENT_TIMESTAMP
WHERE subject_id IN (SELECT id FROM subjects WHERE exam_board = char(65, 81, 65) AND id <> 'subject-history');

DELETE FROM topic_lessons
WHERE topic_id IN (SELECT id FROM topics WHERE subject_id IN (
  SELECT id FROM subjects WHERE exam_board = char(65, 81, 65) AND id <> 'subject-history'
));
DELETE FROM revision_resources WHERE subject_id IN (SELECT id FROM subjects WHERE exam_board = char(65, 81, 65) AND id <> 'subject-history');
DELETE FROM subject_revision_guides WHERE subject_id IN (SELECT id FROM subjects WHERE exam_board = char(65, 81, 65) AND id <> 'subject-history');
DELETE FROM course_components WHERE subject_id IN (SELECT id FROM subjects WHERE exam_board = char(65, 81, 65) AND id <> 'subject-history');

UPDATE student_subjects
SET options_json = json_remove(json_set(options_json, '$.configuration', 'TBC'), '$.entryCode'),
    updated_at = CURRENT_TIMESTAMP
WHERE subject_id IN (SELECT id FROM subjects WHERE exam_board = char(65, 81, 65) AND id <> 'subject-history');

UPDATE subjects SET exam_board = 'TBC', specification_code = NULL, updated_at = CURRENT_TIMESTAMP
WHERE exam_board = char(65, 81, 65) AND id <> 'subject-history';
