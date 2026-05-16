-- Adds the 'true_false' value to study_mode and question_kind enums.
alter type study_mode add value if not exists 'true_false';
alter type question_kind add value if not exists 'true_false';
