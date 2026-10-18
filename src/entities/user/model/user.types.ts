/** Тариф из контракта (`docs/api.md`). */
export type Plan = 'free' | 'pro';

export interface User {
  id: string;
  /** В нижнем регистре. */
  email: string;
  /** Действующий тариф: `pro`, только если подписка не истекла. */
  plan: Plan;
  /** Когда закончится подписка (null — бессрочно или подписки нет). */
  planExpiresAt: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

/** Уровень доступа: гость (без входа) < бесплатный < Pro. */
export type AccessLevel = 'guest' | Plan;

export const ACCESS_LEVEL_ORDER: Record<AccessLevel, number> = {
  guest: 0,
  free: 1,
  pro: 2,
};

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Бесплатный',
  pro: 'Pro',
};
