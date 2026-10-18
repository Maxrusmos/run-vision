-- Почта снова — логин (вход по логину без почты отменили: без почты не восстановить пароль).
-- Плюс согласие на обработку персональных данных и одноразовые ссылки сброса пароля.

-- Базы, где успела примениться отменённая миграция 004 (только у разработчиков, не в проде):
-- вернуть колонку email. Настоящей почты там уже нет — ставим заглушку из логина,
-- такой аккаунт нужно зарегистрировать заново.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text;
    EXECUTE $sql$UPDATE users SET email = login || '@restored.invalid'$sql$;
    ALTER TABLE users ALTER COLUMN email SET NOT NULL;
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
    ALTER TABLE users ADD CONSTRAINT users_email_check CHECK (email = lower(email));
  END IF;
END $$;
ALTER TABLE users DROP COLUMN IF EXISTS login;

-- Согласие на обработку персональных данных: когда дано и какая версия текста.
-- У зарегистрированных до этой миграции — null (согласия по новой форме не давали).
ALTER TABLE users ADD COLUMN consent_at timestamptz NULL;
ALTER TABLE users ADD COLUMN consent_version text NULL;

-- Ссылки сброса пароля: одноразовые, с коротким сроком; в БД только SHA-256 токена.
CREATE TABLE password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL
);

CREATE INDEX password_resets_user_id_idx ON password_resets (user_id);
