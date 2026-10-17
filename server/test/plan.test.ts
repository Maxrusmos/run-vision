import { describe, expect, it } from 'vitest'
import { requirePlan } from '../src/modules/auth/authenticate.js'
import { effectivePlan } from '../src/modules/auth/service.js'
import { useTestApp } from './helpers.js'

describe('effectivePlan', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  it('free всегда free', () => expect(effectivePlan('free', null, now)).toBe('free'))
  it('pro без срока — pro', () => expect(effectivePlan('pro', null, now)).toBe('pro'))
  it('pro до срока — pro', () => expect(effectivePlan('pro', new Date('2026-02-01'), now)).toBe('pro'))
  it('pro после срока — free', () => expect(effectivePlan('pro', new Date('2025-12-01'), now)).toBe('free'))
})

describe('authenticate + requirePlan', () => {
  const ctx = useTestApp()

  it('закрытый эндпоинт: гость 401, free 403 PLAN_REQUIRED, pro 200', async () => {
    ctx.app.get('/api/test/pro', { preHandler: [ctx.app.authenticate, requirePlan('pro')] }, async () => ({ ok: 1 }))
    const { token } = (
      await ctx.app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'p@example.com', password: '12345678' },
      })
    ).json()
    const call = (auth?: string) =>
      ctx.app.inject({ method: 'GET', url: '/api/test/pro', headers: auth ? { authorization: `Bearer ${auth}` } : {} })

    expect((await call()).statusCode).toBe(401)
    const free = await call(token)
    expect(free.statusCode).toBe(403)
    expect(free.json().error.code).toBe('PLAN_REQUIRED')
    await ctx.db.query(`UPDATE users SET plan = 'pro'`)
    expect((await call(token)).statusCode).toBe(200)
  })
})

describe('конфиг', () => {
  it('без DATABASE_URL — понятная ошибка', async () => {
    const { loadConfig } = await import('../src/config.js')
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/)
  })
})
