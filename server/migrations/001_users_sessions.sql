-- Пользователи и сессии входа.

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Email храним уже в нижнем регистре (приводит сервер), поэтому обычный UNIQUE достаточен.
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  -- Хэш scrypt вместе с солью и параметрами; сам пароль нигде не хранится.
  password_hash text NOT NULL,
  -- Тариф. Действующий тариф = 'pro', только если plan_expires_at ещё не наступил
  -- (null — бессрочно). Считает сервер, см. effectivePlan.
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  plan_expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at обновляется сам при любом UPDATE.
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- SHA-256 токена (hex). Сам токен знает только клиент.
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
