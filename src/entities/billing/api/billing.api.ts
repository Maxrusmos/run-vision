import { apiRequest } from '@/shared/api';
import type { User } from '@/entities/user';
import type { Payment, PaymentProviderId, PlanPeriod, ProPlan } from '../model/billing.types';

export function fetchPlans(): Promise<{ plans: ProPlan[]; provider: PaymentProviderId }> {
  return apiRequest('/api/billing/plans');
}

/** Создать платёж; `confirmationUrl` — страница оплаты. */
export function checkout(
  period: PlanPeriod,
): Promise<{ payment: Payment; confirmationUrl: string }> {
  return apiRequest('/api/billing/checkout', { method: 'POST', auth: true, body: { period } });
}

export async function fetchPayment(id: string): Promise<Payment> {
  const { payment } = await apiRequest<{ payment: Payment }>(
    `/api/billing/payments/${encodeURIComponent(id)}`,
    { auth: true },
  );
  return payment;
}

/** Тестовая оплата: итог вместо уведомления платёжного сервиса. */
export function completeMockPayment(
  id: string,
  result: 'succeeded' | 'canceled',
): Promise<{ payment: Payment; user: User }> {
  return apiRequest(`/api/billing/mock/payments/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    auth: true,
    body: { result },
  });
}

/** Тестовая оплата: снять Pro сразу (в настоящей оплате такой кнопки нет). */
export async function cancelMockSubscription(): Promise<User> {
  const { user } = await apiRequest<{ user: User }>('/api/billing/mock/subscription/cancel', {
    method: 'POST',
    auth: true,
  });
  return user;
}
