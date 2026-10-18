import { describe, expect, it } from 'vitest';
import {
  formatPlanUntil,
  formatRubles,
  getMonthlyEquivalentKopecks,
  getYearSavingPercent,
} from '../billing-format';
import type { ProPlan } from '../billing.types';

const PLANS: ProPlan[] = [
  { id: 'month', title: 'Месяц', priceKopecks: 14900, days: 30 },
  { id: 'year', title: 'Год', priceKopecks: 99000, days: 365 },
];

describe('billing-format', () => {
  it('рубли: без копеек, если их нет; пробел-разделитель тысяч', () => {
    expect(formatRubles(14900)).toBe('149 ₽');
    expect(formatRubles(149050).replace(/\s/g, ' ')).toBe('1 490,50 ₽');
  });

  it('выгода года и цена в месяц', () => {
    // 149 ₽ × 365/30 ≈ 1813 ₽ → 990 ₽ дешевле на 45 %.
    expect(getYearSavingPercent(PLANS)).toBe(45);
    expect(getYearSavingPercent([PLANS[0]!])).toBe(0);
    expect(formatRubles(getMonthlyEquivalentKopecks(PLANS[1]!))).toBe('81 ₽');
  });

  it('срок Pro', () => {
    expect(formatPlanUntil(null)).toBe('бессрочно');
    expect(formatPlanUntil('2026-11-18T12:00:00.000Z')).toBe('до 18 ноября 2026');
  });
});
