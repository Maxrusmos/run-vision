import type { PoolClient } from 'pg'
import { withTransaction, type Db } from '../../db.js'
import { errors } from '../../lib/errors.js'
import { toPublicUser, type PublicUser } from '../auth/service.js'
import { PRO_PLANS, findPlan, type PlanPeriod, type ProPlan } from './plans.js'
import type { PaymentProvider, PaymentProviderId } from './provider.js'

// Покупка Pro: платёж → страница оплаты сервиса → уведомление → продление срока.
// Платёж проводится ровно один раз: строка блокируется (FOR UPDATE), повтор уведомления
// с тем же итогом ничего не меняет.

export type PaymentStatus = 'pending' | 'succeeded' | 'canceled'

export interface PublicPayment {
  id: string
  period: PlanPeriod
  amountKopecks: number
  status: PaymentStatus
  createdAt: string
  paidAt: string | null
}

interface PaymentRow {
  id: string
  user_id: string
  period: PlanPeriod
  amount_kopecks: number
  status: PaymentStatus
  created_at: Date
  paid_at: Date | null
}

const PAYMENT_COLUMNS = 'id, user_id, period, amount_kopecks, status, created_at, paid_at'

function toPublicPayment(row: PaymentRow): PublicPayment {
  return {
    id: row.id,
    period: row.period,
    amountKopecks: row.amount_kopecks,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    paidAt: row.paid_at ? row.paid_at.toISOString() : null,
  }
}

export class BillingService {
  constructor(
    private readonly db: Db,
    private readonly provider: PaymentProvider | null,
    /** Адрес фронта со слэшем на конце — для возврата после оплаты. */
    private readonly appUrl: string,
  ) {}

  get providerId(): PaymentProviderId {
    return this.provider?.id ?? 'none'
  }

  plans(): readonly ProPlan[] {
    return PRO_PLANS
  }

  async checkout(userId: string, period: PlanPeriod) {
    if (!this.provider) throw errors.paymentsUnavailable()
    const plan = findPlan(period)
    const { rows } = await this.db.query<PaymentRow>(
      `INSERT INTO payments (user_id, provider, period, amount_kopecks)
       VALUES ($1, $2, $3, $4) RETURNING ${PAYMENT_COLUMNS}`,
      [userId, this.provider.id, plan.id, plan.priceKopecks],
    )
    const payment = rows[0]!
    try {
      const created = await this.provider.createPayment({
        paymentId: payment.id,
        amountKopecks: plan.priceKopecks,
        description: `RunVision Pro — ${plan.title.toLowerCase()}`,
        returnUrl: `${this.appUrl}#/pro/return?payment=${payment.id}`,
      })
      await this.db.query('UPDATE payments SET provider_payment_id = $2 WHERE id = $1', [
        payment.id,
        created.providerPaymentId,
      ])
      return { payment: toPublicPayment(payment), confirmationUrl: created.confirmationUrl }
    } catch (err) {
      // Сервис не создал платёж — наш черновик не нужен.
      await this.db.query(`UPDATE payments SET status = 'canceled' WHERE id = $1`, [payment.id])
      throw err
    }
  }

  async getPayment(userId: string, paymentId: string): Promise<PublicPayment> {
    const { rows } = await this.db.query<PaymentRow>(
      `SELECT ${PAYMENT_COLUMNS} FROM payments WHERE id = $1 AND user_id = $2`,
      [paymentId, userId],
    )
    if (!rows[0]) throw errors.notFound()
    return toPublicPayment(rows[0])
  }

  /**
   * Итог платежа от сервиса (вебхук; у тестового сервиса — кнопка на фронте). Успех
   * продлевает Pro: от текущего срока, если он ещё не кончился, иначе от сейчас.
   * Бессрочный Pro (выдан вручную, срок null) не трогаем. Уже проведённый платёж не меняется.
   */
  async completePayment(
    providerPaymentId: string,
    result: Exclude<PaymentStatus, 'pending'>,
  ): Promise<{ payment: PublicPayment; userId: string } | null> {
    return withTransaction(this.db, async (client) => {
      const { rows } = await client.query<PaymentRow>(
        `SELECT ${PAYMENT_COLUMNS} FROM payments WHERE provider_payment_id = $1 FOR UPDATE`,
        [providerPaymentId],
      )
      const payment = rows[0]
      if (!payment) return null
      if (payment.status !== 'pending') {
        return { payment: toPublicPayment(payment), userId: payment.user_id }
      }

      const updated = await client.query<PaymentRow>(
        `UPDATE payments SET status = $2, paid_at = CASE WHEN $2 = 'succeeded' THEN now() END
          WHERE id = $1 RETURNING ${PAYMENT_COLUMNS}`,
        [payment.id, result],
      )
      if (result === 'succeeded') await this.extendPro(client, payment.user_id, findPlan(payment.period).days)
      return { payment: toPublicPayment(updated.rows[0]!), userId: payment.user_id }
    })
  }

  private async extendPro(client: PoolClient, userId: string, days: number) {
    await client.query(
      `UPDATE users
          SET plan_expires_at = CASE
                WHEN plan = 'pro' AND plan_expires_at IS NULL THEN NULL
                ELSE greatest(now(), coalesce(plan_expires_at, now())) + make_interval(days => $2)
              END,
              plan = 'pro'
        WHERE id = $1`,
      [userId, days],
    )
  }

  /** Тестовый сервис: итог своего платежа (вместо вебхука). */
  async completeMockPayment(
    userId: string,
    paymentId: string,
    result: Exclude<PaymentStatus, 'pending'>,
  ): Promise<{ payment: PublicPayment; user: PublicUser }> {
    // Только свой платёж — чужой и несуществующий одинаково 404.
    await this.getPayment(userId, paymentId)
    const done = await this.completePayment(paymentId, result)
    if (!done) throw errors.notFound()
    // Пользователь с новым сроком — фронт сразу показывает «Pro до …».
    const { rows } = await this.db.query<Parameters<typeof toPublicUser>[0]>('SELECT * FROM users WHERE id = $1', [
      userId,
    ])
    return { payment: done.payment, user: toPublicUser(rows[0]!) }
  }
}
