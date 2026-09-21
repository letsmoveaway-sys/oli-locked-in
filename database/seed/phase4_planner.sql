PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO weekly_availability (id, student_id, weekday, available_minutes, start_time)
VALUES
  ('availability-mon', 'user-student-1', 1, 70, '17:00'),
  ('availability-tue', 'user-student-1', 2, 105, '17:00'),
  ('availability-wed', 'user-student-1', 3, 70, '17:00'),
  ('availability-thu', 'user-student-1', 4, 70, '17:00'),
  ('availability-fri', 'user-student-1', 5, 35, '17:00'),
  ('availability-sat', 'user-student-1', 6, 105, '10:00'),
  ('availability-sun', 'user-student-1', 7, 70, '10:00');

INSERT OR IGNORE INTO tutor_sessions
  (id, student_id, subject_id, recurrence_rule, weekday, start_date, start_time, duration_minutes, notes)
VALUES
  ('tutor-science-week-a', 'user-student-1', 'subject-combined-science', 'FREQ=WEEKLY;INTERVAL=2', 2, '2026-09-15', '18:00', 60, 'Tuesday Week A Science tutor'),
  ('tutor-maths-week-b', 'user-student-1', 'subject-mathematics', 'FREQ=WEEKLY;INTERVAL=2', 2, '2026-09-22', '18:00', 60, 'Tuesday Week B Mathematics tutor');
