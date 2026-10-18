import type { ProPlan } from './billing.types';

/** «149 ₽», «1 490,50 ₽» — копейки показываем, только если они есть. */
export function formatRubles(kopecks: number): string {
  const rubles = kopecks / 100;
  return `${rubles.toLocaleString('ru-RU', {
    minimumFractionDigits: Number.isInteger(rubles) ? 0 : 2,
    maximumFractionDigits: 2,
  })} ₽`;
}

/**
 * Насколько годовой тариф дешевле помесячной оплаты, в процентах (округлено вниз);
 * 0 — выгоды нет или тарифов не хватает.
 */
export function getYearSavingPercent(plans: readonly ProPlan[]): number {
  const month = plans.find((plan) => plan.id === 'month');
  const year = plans.find((plan) => plan.id === 'year');
  if (!month || !year) return 0;
  const monthly = (month.priceKopecks / month.days) * year.days;
  if (!(monthly > year.priceKopecks)) return 0;
  return Math.floor((1 - year.priceKopecks / monthly) * 100);
}

/** Цена года в пересчёте на месяц (30 дней) — «82 ₽ в месяц». */
export function getMonthlyEquivalentKopecks(plan: ProPlan): number {
  return Math.round(((plan.priceKopecks / plan.days) * 30) / 100) * 100;
}

/** «до 18 ноября 2026» по сроку Pro; null — бессрочно. */
export function formatPlanUntil(planExpiresAt: string | null): string {
  if (!planExpiresAt) return 'бессрочно';
  const date = new Date(planExpiresAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `до ${date.replace(/\s*г\.$/, '')}`;
}
