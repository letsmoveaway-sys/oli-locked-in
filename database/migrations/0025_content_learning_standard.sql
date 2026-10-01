-- Version the cross-subject learning upgrade. Content remains editorially checked
-- until an independent subject teacher records a later review.
UPDATE topic_lessons
SET content_version = '2.0',
    author = 'Original app content aligned to the cited exam-board specification or school revision guide',
    review_status = CASE WHEN review_status = 'subject_expert_checked' THEN review_status ELSE 'editorial_checked' END,
    reviewed_at = CASE WHEN review_status = 'subject_expert_checked' THEN reviewed_at ELSE '2026-10-01' END,
    updated_at = CURRENT_TIMESTAMP;
