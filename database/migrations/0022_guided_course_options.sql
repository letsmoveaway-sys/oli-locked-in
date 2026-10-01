UPDATE student_subjects
SET options_json = json_set(
  json_set(
    json_set(
      json_set(options_json, '$.thematicStudy', 'Medicine in Britain and the British sector of the Western Front'),
      '$.periodStudy', 'The American West, c1835-c1895'),
    '$.britishDepthStudy', 'Early Elizabethan England, 1558-88'),
  '$.modernDepthStudy', 'Weimar and Nazi Germany, 1918-39'),
  updated_at = CURRENT_TIMESTAMP
WHERE subject_id = 'subject-history';

UPDATE student_subjects
SET options_json = json_set(options_json, '$.neaStage', COALESCE(json_extract(options_json, '$.neaStage'), 'TBC')),
    updated_at = CURRENT_TIMESTAMP
WHERE subject_id = 'subject-design-technology';
