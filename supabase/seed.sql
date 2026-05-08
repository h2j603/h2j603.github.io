-- ========================================
-- seed.sql
-- Initial 8 works, editable from admin panel.
-- ========================================

insert into works (slug, title_kr, title_en, description_kr, description_en, categories, order_index, published) values
  ('formal-home', '혁의집', 'HyukHome', '', '', array['W'], 1, true),
  ('manual-for-enduring', '버텨매뉴얼', 'EnduringMan', '', '', array['W','E'], 2, true),
  ('conespiracy-2', '콘스피러시2', 'Conespira2', '', '', array['W','I'], 3, true),
  ('conespiracy', '콘스피러시', 'Conespiracy', '', '', array['W','I'], 4, true),
  ('nonatae-talk', '노나태위해', 'NonataeTalk', '', '', array['W'], 5, true),
  ('halftone', '하프톤생성', 'Halftone', '', '', array['W','T'], 6, true),
  ('weekly-log', '위클리로그', 'WeeklyLog', '', '', array['W'], 7, true),
  ('memodummy', '메모더미', 'Memodummy', '', '', array['W'], 8, true);
