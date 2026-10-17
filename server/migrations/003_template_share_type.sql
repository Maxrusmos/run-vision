-- Тип шаблона: фото-карточка или видео. Шаблоны, сохранённые до видео, — фото.
ALTER TABLE templates
  ADD COLUMN share_type text NOT NULL DEFAULT 'photo' CHECK (share_type IN ('photo', 'video'));
