-- Платежи за Pro: разовые «месяц / год». Ни карт, ни контактов не храним — только то, что
-- нужно, чтобы провести платёж один раз и показать историю.

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- 'mock' — тестовый сервис; потом 'yookassa' и т.п.
  provider text NOT NULL,
  -- id платежа у сервиса: по нему приходит уведомление. У тестового сервиса — наш id.
  provider_payment_id text NULL UNIQUE,
  period text NOT NULL CHECK (period IN ('month', 'year')),
  amount_kopecks int NOT NULL CHECK (amount_kopecks > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz NULL
);

CREATE INDEX payments_user_id_idx ON payments (user_id, created_at DESC);
