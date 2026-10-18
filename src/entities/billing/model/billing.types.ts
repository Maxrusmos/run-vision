/** Покупка Pro — типы из контракта (`docs/api.md`, «Покупка Pro»). */
export type PlanPeriod = 'month' | 'year';

export interface ProPlan {
  id: PlanPeriod;
  title: string;
  /** Цену задаёт сервер. */
  priceKopecks: number;
  days: number;
}

/** `mock` — тестовая оплата без денег; `none` — оплата не подключена. */
export type PaymentProviderId = 'none' | 'mock';

export type PaymentStatus = 'pending' | 'succeeded' | 'canceled';

export interface Payment {
  id: string;
  period: PlanPeriod;
  amountKopecks: number;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
}
