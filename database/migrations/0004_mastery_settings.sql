INSERT OR IGNORE INTO settings (key, value_json, description)
VALUES
  ('mastery_weights', '{"assessment":0.40,"confidence":0.25,"session":0.20,"recency":0.15}', 'Evidence weights; available inputs are redistributed proportionally'),
  ('confidence_scores', '{"unknown":10,"struggling":30,"ok":60,"confident":85}', 'Approximate initial mastery signals from student confidence'),
  ('review_intervals', '{"redDays":2,"amberDays":5,"greenDays":14}', 'Default next-review intervals by RAG state');
