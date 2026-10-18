-- Вход по логину вместо email: email не собираем и не храним (персональные данные).
-- Уже зарегистрированным логин делается из части email до «@»: только разрешённые символы,
-- при совпадении — с номером (anna, anna2, …). Сам email после этого удаляется.

ALTER TABLE users ADD COLUMN login text;

DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, email FROM users ORDER BY created_at, id LOOP
    base := regexp_replace(lower(split_part(r.email, '@', 1)), '[^a-z0-9._-]', '', 'g');
    base := left(regexp_replace(base, '^[._-]+', ''), 28);
    IF length(base) < 3 THEN
      base := 'runner' || base;
    END IF;
    candidate := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM users WHERE login = candidate) LOOP
      n := n + 1;
      candidate := base || n;
    END LOOP;
    UPDATE users SET login = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE users ALTER COLUMN login SET NOT NULL;
-- Логин хранится уже в нижнем регистре (приводит сервер), поэтому обычный UNIQUE не пустит
-- и «Anna», и «anna».
ALTER TABLE users ADD CONSTRAINT users_login_key UNIQUE (login);
ALTER TABLE users ADD CONSTRAINT users_login_check
  CHECK (login = lower(login) AND login ~ '^[a-z0-9][a-z0-9._-]{2,31}$');

ALTER TABLE users DROP COLUMN email;
