PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO users (id, email_or_username, display_name, role, auth_identity)
VALUES
  ('user-student-1', 'student', 'Student', 'student', 'local:student'),
  ('user-parent-1', 'parent', 'Parent', 'parent', 'local:parent');

INSERT OR IGNORE INTO student_profiles (user_id, exam_year, default_session_minutes)
VALUES ('user-student-1', 2027, 35);

INSERT OR IGNORE INTO subjects (id, name, exam_board, specification_code)
VALUES
  ('subject-mathematics', 'Mathematics', 'TBC', NULL),
  ('subject-english-language', 'English Language', 'TBC', NULL),
  ('subject-english-literature', 'English Literature', 'TBC', NULL),
  ('subject-combined-science', 'Combined Science', 'TBC', NULL),
  ('subject-history', 'History', 'Edexcel', '1HI0'),
  ('subject-geography', 'Geography', 'TBC', NULL),
  ('subject-business', 'Business', 'TBC', NULL),
  ('subject-design-technology', 'Design and Technology', 'TBC', NULL);

INSERT OR IGNORE INTO student_subjects (student_id, subject_id, tier, options_json)
SELECT 'user-student-1', id,
  CASE WHEN id = 'subject-history' THEN 'not_applicable' ELSE 'TBC' END,
  CASE WHEN id = 'subject-history' THEN '{"configuration":"confirmed"}' ELSE '{"configuration":"TBC"}' END
FROM subjects;

INSERT OR IGNORE INTO settings (key, value_json, description)
VALUES
  ('rag_thresholds', '{"redMax":49,"amberMax":74,"greenMax":100}', 'Configurable mastery RAG thresholds'),
  ('planner_defaults', '{"sessionMinutes":35,"horizonDays":14}', 'Default planning window and session length'),
  ('xp_awards', '{"plannedSession":10,"quiz":5,"redToAmber":20,"amberToGreen":30,"weeklyTarget":50}', 'Default XP awards');
