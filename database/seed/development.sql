PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO users (id, email_or_username, display_name, role, auth_identity)
VALUES
  ('user-student-1', 'oliver', 'Oliver', 'student', 'local:student'),
  ('user-parent-1', 'parent', 'Parent', 'parent', 'local:parent');

INSERT OR IGNORE INTO student_profiles (user_id, exam_year, default_session_minutes, ai_marking_enabled)
VALUES ('user-student-1', 2027, 35, 1);

-- Development and browser-test data deliberately enables the optional route so it can be exercised.
-- Production profiles retain the migration default of off until a Parent opts in.
UPDATE student_profiles SET ai_marking_enabled = 1 WHERE user_id = 'user-student-1';

INSERT OR IGNORE INTO subjects (id, name, exam_board, specification_code)
VALUES
  ('subject-mathematics', 'Mathematics', 'AQA', '8300'),
  ('subject-english-language', 'English Language', 'AQA', '8700'),
  ('subject-english-literature', 'English Literature', 'AQA', '8702'),
  ('subject-combined-science', 'Combined Science', 'AQA', '8464'),
  ('subject-history', 'History', 'Edexcel', '1HI0'),
  ('subject-geography', 'Geography', 'TBC', NULL),
  ('subject-business', 'Business', 'TBC', NULL),
  ('subject-design-technology', 'Design and Technology', 'TBC', NULL);

INSERT OR IGNORE INTO student_subjects (student_id, subject_id, tier, options_json)
SELECT 'user-student-1', id,
  CASE
    WHEN id IN ('subject-mathematics', 'subject-combined-science') THEN 'higher'
    WHEN id IN ('subject-english-language', 'subject-english-literature', 'subject-history', 'subject-geography', 'subject-business', 'subject-design-technology') THEN 'not_applicable'
    ELSE 'TBC'
  END,
  CASE
    WHEN id = 'subject-mathematics' THEN '{"configuration":"confirmed"}'
    WHEN id = 'subject-english-language' THEN '{"configuration":"confirmed"}'
    WHEN id = 'subject-english-literature' THEN '{"configuration":"confirmed","shakespeare":"Macbeth","nineteenthCenturyNovel":"A Christmas Carol","modernText":"An Inspector Calls","poetryCluster":"Power and Conflict"}'
    WHEN id = 'subject-combined-science' THEN '{"configuration":"confirmed","course":"Trilogy","courseStatus":"working assumption"}'
    WHEN id = 'subject-history' THEN '{"configuration":"confirmed"}'
    WHEN id = 'subject-geography' THEN '{"configuration":"confirmed","livingWorldOption":"TBC","ukLandscapeOptions":"TBC","resourceOption":"TBC","caseStudies":"TBC"}'
    WHEN id = 'subject-business' THEN '{"configuration":"confirmed"}'
    WHEN id = 'subject-design-technology' THEN '{"configuration":"confirmed","specialistMaterial":"TBC"}'
    ELSE '{"configuration":"TBC"}'
  END
FROM subjects;

INSERT OR IGNORE INTO settings (key, value_json, description)
VALUES
  ('rag_thresholds', '{"redMax":49,"amberMax":74,"greenMax":100}', 'Configurable mastery RAG thresholds'),
  ('planner_defaults', '{"sessionMinutes":35,"horizonDays":14}', 'Default planning window and session length'),
  ('xp_awards', '{"plannedSession":10,"quiz":5,"redToAmber":20,"amberToGreen":30,"weeklyTarget":50}', 'Default XP awards');
