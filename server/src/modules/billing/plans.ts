// Тарифы Pro. Цены задаёт только сервер: фронт их показывает, но сумму платежа берём отсюда.

export type PlanPeriod = 'month' | 'year'

export interface ProPlan {
  id: PlanPeriod
  title: string
  priceKopecks: number
  /** На сколько дней продлевает Pro. */
  days: number
}

export const PRO_PLANS: readonly ProPlan[] = [
  { id: 'month', title: 'Месяц', priceKopecks: 149_00, days: 30 },
  { id: 'year', title: 'Год', priceKopecks: 990_00, days: 365 },
]

export function findPlan(period: PlanPeriod): ProPlan {
  return PRO_PLANS.find((plan) => plan.id === period)!
}
