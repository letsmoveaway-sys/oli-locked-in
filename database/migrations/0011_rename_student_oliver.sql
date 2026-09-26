UPDATE users
SET email_or_username = 'oliver', display_name = 'Oliver', updated_at = CURRENT_TIMESTAMP
WHERE id = 'user-student-1' AND role = 'student';
