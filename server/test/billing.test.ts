import { describe, expect, it } from 'vitest'
import { useTestApp } from './helpers.js'

const DAY = 24 * 60 * 60 * 1000

describe('покупка Pro — тестовый сервис (PAYMENT_PROVIDER=mock)', () => {
  const ctx = useTestApp({ paymentProvider: 'mock' })

  async function register(email = 'runner@example.com') {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: 'password123', consent: true },
    })
    return res.json().token as string
  }

  const call = (token: string, method: 'GET' | 'POST', url: string, payload?: object) =>
    ctx.app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, payload })

  const checkout = (token: string, period = 'month') => call(token, 'POST', '/api/billing/checkout', { period })
  const complete = (token: string, id: string, result = 'succeeded') =>
    call(token, 'POST', `/api/billing/mock/payments/${id}/complete`, { result })

  it('тарифы и провайдер — без входа', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/billing/plans' })
    expect(res.json()).toEqual({
      provider: 'mock',
      plans: [
        { id: 'month', title: 'Месяц', priceKopecks: 14900, days: 30 },
        { id: 'year', title: 'Год', priceKopecks: 99000, days: 365 },
      ],
    })
  })

  it('оплата месяца: платёж pending → succeeded, Pro на 30 дней', async () => {
    const token = await register()
    const res = await checkout(token)
    expect(res.statusCode).toBe(201)
    const { payment, confirmationUrl } = res.json()
    expect(payment).toMatchObject({ period: 'month', amountKopecks: 14900, status: 'pending', paidAt: null })
    expect(confirmationUrl).toBe(`http://localhost:5173/run-vision/#/pro/mock-checkout?payment=${payment.id}`)

    const done = await complete(token, payment.id)
    expect(done.statusCode).toBe(200)
    const body = done.json()
    expect(body.payment.status).toBe('succeeded')
    expect(body.payment.paidAt).toEqual(expect.any(String))
    expect(body.user.plan).toBe('pro')
    const left = new Date(body.user.planExpiresAt).getTime() - Date.now()
    expect(left).toBeGreaterThan(29.9 * DAY)
    expect(left).toBeLessThan(30.1 * DAY)

    const me = await call(token, 'GET', '/api/auth/me')
    expect(me.json().user.plan).toBe('pro')
  })

  it('вторая покупка продлевает от текущего срока, а не от сегодня', async () => {
    const token = await register()
    await complete(token, (await checkout(token)).json().payment.id)
    const { user } = (await complete(token, (await checkout(token, 'year')).json().payment.id)).json()
    const left = new Date(user.planExpiresAt).getTime() - Date.now()
    expect(left).toBeGreaterThan(394.9 * DAY)
    expect(left).toBeLessThan(395.1 * DAY)
  })

  it('истёкший Pro продлевается от сегодня; бессрочный не трогается', async () => {
    const token = await register()
    await ctx.db.query(`UPDATE users SET plan = 'pro', plan_expires_at = now() - interval '100 days'`)
    const renewed = (await complete(token, (await checkout(token)).json().payment.id)).json().user
    expect(new Date(renewed.planExpiresAt).getTime() - Date.now()).toBeGreaterThan(29.9 * DAY)

    await ctx.db.query(`UPDATE users SET plan = 'pro', plan_expires_at = NULL`)
    const forever = (await complete(token, (await checkout(token)).json().payment.id)).json().user
    expect(forever).toMatchObject({ plan: 'pro', planExpiresAt: null })
  })

  it('платёж проводится один раз: повтор и отмена после оплаты ничего не меняют', async () => {
    const token = await register()
    const id = (await checkout(token)).json().payment.id
    const first = (await complete(token, id)).json().user.planExpiresAt
    const again = await complete(token, id)
    expect(again.json().user.planExpiresAt).toBe(first)
    const cancel = await complete(token, id, 'canceled')
    expect(cancel.json().payment.status).toBe('succeeded')
  })

  it('одновременные уведомления об одном платеже — Pro продлён один раз', async () => {
    const token = await register()
    const id = (await checkout(token)).json().payment.id
    const results = await Promise.all([complete(token, id), complete(token, id), complete(token, id)])
    const ends = new Set(results.map((res) => res.json().user.planExpiresAt))
    expect(ends.size).toBe(1)
    expect(new Date([...ends][0] as string).getTime() - Date.now()).toBeLessThan(30.1 * DAY)
  })

  it('отмена: платёж canceled, тариф прежний', async () => {
    const token = await register()
    const id = (await checkout(token)).json().payment.id
    const res = (await complete(token, id, 'canceled')).json()
    expect(res.payment.status).toBe('canceled')
    expect(res.user.plan).toBe('free')
  })

  it('чужой платёж — 404 и для просмотра, и для оплаты; гость — 401', async () => {
    const owner = await register('owner@example.com')
    const stranger = await register('stranger@example.com')
    const id = (await checkout(owner)).json().payment.id
    expect((await call(stranger, 'GET', `/api/billing/payments/${id}`)).statusCode).toBe(404)
    expect((await complete(stranger, id)).statusCode).toBe(404)
    expect((await call(owner, 'GET', `/api/billing/payments/${id}`)).json().payment.status).toBe('pending')
    expect((await call(owner, 'GET', '/api/billing/payments/not-a-uuid')).statusCode).toBe(404)
    const guest = await ctx.app.inject({ method: 'POST', url: '/api/billing/checkout', payload: { period: 'month' } })
    expect(guest.statusCode).toBe(401)
  })

  it('неверный период и итог → 400', async () => {
    const token = await register()
    expect((await checkout(token, 'week')).json().error.fields).toHaveProperty('period')
    const id = (await checkout(token)).json().payment.id
    expect((await complete(token, id, 'maybe')).json().error.fields).toHaveProperty('result')
  })
})

describe('оплата выключена (PAYMENT_PROVIDER=none, по умолчанию)', () => {
  const ctx = useTestApp()

  it('checkout → 503 PAYMENTS_UNAVAILABLE, тестовой оплаты нет', async () => {
    const reg = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'runner@example.com', password: 'password123', consent: true },
    })
    const token = reg.json().token as string
    const headers = { authorization: `Bearer ${token}` }
    expect((await ctx.app.inject({ method: 'GET', url: '/api/billing/plans' })).json().provider).toBe('none')
    const res = await ctx.app.inject({ method: 'POST', url: '/api/billing/checkout', headers, payload: { period: 'month' } })
    expect(res.statusCode).toBe(503)
    expect(res.json().error.code).toBe('PAYMENTS_UNAVAILABLE')
    const mock = await ctx.app.inject({
      method: 'POST',
      url: '/api/billing/mock/payments/00000000-0000-0000-0000-000000000000/complete',
      headers,
      payload: { result: 'succeeded' },
    })
    expect(mock.statusCode).toBe(404)
  })
})
