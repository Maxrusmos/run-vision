-- Сохранённые шаблоны оформления карточки («Избранное» в редакторе, «Мои шаблоны» в кабинете).
-- Только настройки карточки (JSON фронта), без тренировки и без фото фона.

CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  -- Шаблон приложения, от которого сделан сохранённый (от него зависят карта, виджеты и т.п.).
  base_template text NOT NULL CHECK (base_template IN ('minimal', 'topographic', 'telemetry')),
  -- ShareCardSettings фронта как есть: сервер его не разбирает.
  settings jsonb NOT NULL CHECK (jsonb_typeof(settings) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Список «мои шаблоны, новые изменения сверху».
CREATE INDEX templates_user_updated_idx ON templates (user_id, updated_at DESC);

CREATE TRIGGER templates_set_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
