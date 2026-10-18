import { describe, expect, it } from 'vitest'
import { useTestApp } from './helpers.js'

const ctx = useTestApp()

const EMAIL = 'runner@example.com'
const PASSWORD = 'correct horse'

async function register(email = EMAIL, password = PASSWORD) {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password, consent: true },
  })
  return res.json() as { token: string; user: { id: string } }
}

const login = (password = PASSWORD) =>
  ctx.app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: EMAIL, password } })

const forgot = (email = EMAIL) =>
  ctx.app.inject({ method: 'POST', url: '/api/auth/password/forgot', payload: { email } })

const reset = (token: string, password = 'new password 1') =>
  ctx.app.inject({ method: 'POST', url: '/api/auth/password/reset', payload: { token, password } })

const me = (token: string) =>
  ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: `Bearer ${token}` } })

/** Токен из ссылки в последнем письме. */
function tokenFromMail(): string {
  const mail = ctx.mailer.sent.at(-1)
  const match = /#\/reset-password\?token=([^\s"&]+)/.exec(mail?.text ?? '')
  if (!match) throw new Error('В письме нет ссылки сброса')
  return decodeURIComponent(match[1]!)
}

describe('согласие на обработку персональных данных', () => {
  it('без согласия (или не true) регистрации нет — 400 с fields.consent', async () => {
    for (const consent of [undefined, false, 'true', 1]) {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: EMAIL, password: PASSWORD, consent },
      })
      expect(res.statusCode, String(consent)).toBe(400)
      expect(res.json().error.fields).toHaveProperty('consent')
    }
  })

  it('момент и версия согласия сохраняются', async () => {
    await register()
    const { rows } = await ctx.db.query('SELECT consent_at, consent_version FROM users')
    expect(rows[0].consent_at).toBeInstanceOf(Date)
    expect(rows[0].consent_version).toEqual(expect.any(String))
  })
})

describe('восстановление пароля', () => {
  it('письмо со ссылкой → новый пароль: старые сессии закрыты, вход с новым паролем', async () => {
    const { token: oldSession } = await register()
    expect((await forgot('  Runner@Example.com ')).statusCode).toBe(204)

    expect(ctx.mailer.sent).toHaveLength(1)
    expect(ctx.mailer.sent[0]!.to).toBe(EMAIL)
    expect(ctx.mailer.sent[0]!.text).toContain('http://localhost:5173/run-vision/#/reset-password?token=')
    // В БД — не сам токен.
    const token = tokenFromMail()
    const { rows } = await ctx.db.query('SELECT token_hash FROM password_resets')
    expect(rows[0].token_hash).not.toBe(token)

    const res = await reset(token)
    expect(res.statusCode).toBe(200)
    expect((await me(res.json().token)).statusCode).toBe(200)
    expect((await me(oldSession)).statusCode).toBe(401)
    expect((await login()).statusCode).toBe(401)
    expect((await login('new password 1')).statusCode).toBe(200)
  })

  it('неизвестный email — тот же 204, но письма нет', async () => {
    const res = await forgot('ghost@example.com')
    expect(res.statusCode).toBe(204)
    expect(ctx.mailer.sent).toHaveLength(0)
  })

  it('ссылка одноразовая', async () => {
    await register()
    await forgot()
    const token = tokenFromMail()
    expect((await reset(token)).statusCode).toBe(200)
    const again = await reset(token, 'another pass 2')
    expect(again.statusCode).toBe(400)
    expect(again.json().error.code).toBe('RESET_TOKEN_INVALID')
  })

  it('новая просьба отменяет прежнюю ссылку', async () => {
    await register()
    await forgot()
    const first = tokenFromMail()
    await forgot()
    const second = tokenFromMail()
    expect((await reset(first)).json().error.code).toBe('RESET_TOKEN_INVALID')
    expect((await reset(second)).statusCode).toBe(200)
  })

  it('просроченная и выдуманная ссылки → RESET_TOKEN_INVALID', async () => {
    await register()
    await forgot()
    const token = tokenFromMail()
    await ctx.db.query(`UPDATE password_resets SET expires_at = now() - interval '1 minute'`)
    expect((await reset(token)).json().error.code).toBe('RESET_TOKEN_INVALID')
    expect((await reset('made-up-token')).json().error.code).toBe('RESET_TOKEN_INVALID')
  })

  it('слабый новый пароль → 400 VALIDATION_ERROR, ссылка не сгорает', async () => {
    await register()
    await forgot()
    const token = tokenFromMail()
    const weak = await reset(token, 'short')
    expect(weak.json().error.fields).toHaveProperty('password')
    expect((await reset(token)).statusCode).toBe(200)
  })
})

describe('удаление аккаунта', () => {
  const remove = (token: string, password: string) =>
    ctx.app.inject({
      method: 'DELETE',
      url: '/api/auth/account',
      headers: { authorization: `Bearer ${token}` },
      payload: { password },
    })

  it('с верным паролем удаляет пользователя, сессии и шаблоны', async () => {
    const { token } = await register()
    await ctx.app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Мой', baseTemplate: 'minimal', settings: {} },
    })
    expect((await remove(token, PASSWORD)).statusCode).toBe(204)
    expect((await me(token)).statusCode).toBe(401)
    for (const table of ['users', 'sessions', 'templates']) {
      const { rows } = await ctx.db.query(`SELECT count(*)::int AS n FROM ${table}`)
      expect(rows[0].n, table).toBe(0)
    }
    // Email снова свободен.
    expect((await register()).token).toEqual(expect.any(String))
  })

  it('неверный пароль → 401 INVALID_CREDENTIALS, аккаунт на месте; без входа → 401', async () => {
    const { token } = await register()
    const res = await remove(token, 'wrong password')
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS')
    expect((await me(token)).statusCode).toBe(200)
    expect((await remove('nope', PASSWORD)).json().error.code).toBe('UNAUTHORIZED')
  })
})
