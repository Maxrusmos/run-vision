// Платёжный сервис — за этим интерфейсом. Сейчас есть только тестовый (`mock`): его
// «страница оплаты» — экран фронта, а «уведомление» шлёт сам фронт кнопкой. Настоящий
// сервис (ЮKassa и т.п.) — ещё одна реализация + вебхук (см. docs/pro-payments.md).

export type PaymentProviderId = 'none' | 'mock'

export interface CreatedPayment {
  /** id платежа у сервиса — по нему придёт уведомление. */
  providerPaymentId: string
  /** Куда отправить пользователя оплачивать. */
  confirmationUrl: string
}

export interface PaymentProvider {
  id: Exclude<PaymentProviderId, 'none'>
  createPayment(input: {
    paymentId: string
    amountKopecks: number
    description: string
    /** Куда вернуть пользователя после оплаты. */
    returnUrl: string
  }): Promise<CreatedPayment>
}

/** Тестовый сервис: платёж «создаётся» сразу, оплата — на экране фронта без денег. */
export function createMockProvider(appUrl: string): PaymentProvider {
  return {
    id: 'mock',
    async createPayment({ paymentId }) {
      return {
        providerPaymentId: paymentId,
        confirmationUrl: `${appUrl}#/pro/mock-checkout?payment=${paymentId}`,
      }
    },
  }
}
