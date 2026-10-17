import { describe, expect, it } from 'vitest'
import { useTestApp } from './helpers.js'

const ctx = useTestApp()

const EMAIL = 'runner@example.com'
const PASSWORD = 'correct horse'

function register(email = EMAIL, password = PASSWORD) {
  return ctx.app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password } })
}

function login(email = EMAIL, password = PASSWORD) {
  return ctx.app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } })
}

function me(token?: string) {
  return ctx.app.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  })
}

describe('health и общее', () => {
  it('GET /api/health → ok', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
  })

  it('неизвестный путь → 404 NOT_FOUND', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/nope' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NOT_FOUND')
  })

  it('битый JSON → 400 VALIDATION_ERROR', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{"email":',
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('CORS: разрешённый источник и заголовок Authorization', async () => {
    const res = await ctx.app.inject({
      method: 'OPTIONS',
      url: '/api/auth/me',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
      },
    })
    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(String(res.headers['access-control-allow-headers'])).toMatch(/Authorization/)
  })
})

describe('регистрация', () => {
  it('успешная: 201, токен и пользователь free', async () => {
    const res = await register()
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.token).toEqual(expect.any(String))
    expect(body.user).toEqual({
      id: expect.any(String),
      email: EMAIL,
      plan: 'free',
      planExpiresAt: null,
      createdAt: expect.any(String),
    })
    // Сразу можно ходить с токеном.
    expect((await me(body.token)).statusCode).toBe(200)
    // В БД — не пароль и не токен, а их хэши.
    const { rows } = await ctx.db.query('SELECT password_hash FROM users')
    expect(rows[0].password_hash).not.toContain(PASSWORD)
    const sessions = await ctx.db.query('SELECT token_hash FROM sessions')
    expect(sessions.rows[0].token_hash).not.toBe(body.token)
  })

  it('повторный email → 409 EMAIL_TAKEN (и в другом регистре)', async () => {
    await register()
    const res = await register('  Runner@Example.COM ')
    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({ error: { code: 'EMAIL_TAKEN', message: expect.any(String) } })
  })

  it('одновременная регистрация одного email: один 201, остальные 409', async () => {
    const results = await Promise.all([register(), register(), register()])
    const codes = results.map((r) => r.statusCode).sort()
    expect(codes).toEqual([201, 409, 409])
  })

  it('невалидные поля → 400 VALIDATION_ERROR с fields', async () => {
    const res = await register('not-an-email', 'short')
    expect(res.statusCode).toBe(400)
    const { error } = res.json()
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(Object.keys(error.fields).sort()).toEqual(['email', 'password'])
  })

  it('пустое тело и слишком длинные значения → 400', async () => {
    const empty = await ctx.app.inject({ method: 'POST', url: '/api/auth/register' })
    expect(empty.statusCode).toBe(400)
    expect(empty.json().error.fields).toHaveProperty('email')

    const longEmail = await register(`${'a'.repeat(250)}@x.ru`)
    expect(longEmail.json().error.fields).toHaveProperty('email')
    const longPassword = await register(EMAIL, 'p'.repeat(129))
    expect(longPassword.json().error.fields).toHaveProperty('password')
  })

  it('email приводится к нижнему регистру, пароль — без обрезки пробелов', async () => {
    const res = await register('  MiXeD@Example.com ', '  spaced pass  ')
    expect(res.json().user.email).toBe('mixed@example.com')
    expect((await login('mixed@EXAMPLE.com', '  spaced pass  ')).statusCode).toBe(200)
    expect((await login('mixed@example.com', 'spaced pass')).statusCode).toBe(401)
  })
})

describe('вход', () => {
  it('верный пароль → 200 и новый рабочий токен', async () => {
    const reg = (await register()).json()
    const res = await login()
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.user.id).toBe(reg.user.id)
    expect(body.token).not.toBe(reg.token)
    expect((await me(body.token)).statusCode).toBe(200)
  })

  it('неверный пароль → 401 INVALID_CREDENTIALS', async () => {
    await register()
    const res = await login(EMAIL, 'wrong password')
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS')
  })

  it('неизвестный email → тот же 401 INVALID_CREDENTIALS', async () => {
    const res = await login('ghost@example.com')
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS')
  })

  it('вход удаляет просроченные сессии пользователя', async () => {
    await register()
    await ctx.db.query(`UPDATE sessions SET expires_at = now() - interval '1 day'`)
    await login()
    const { rows } = await ctx.db.query('SELECT expires_at FROM sessions')
    expect(rows).toHaveLength(1)
    expect(rows[0].expires_at.getTime()).toBeGreaterThan(Date.now())
  })
})

describe('me', () => {
  it('с токеном → 200 { user }', async () => {
    const { token, user } = (await register()).json()
    const res = await me(token)
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ user })
  })

  it('без токена, с мусорным и с кривым заголовком → 401 UNAUTHORIZED', async () => {
    for (const res of [
      await me(),
      await me('garbage'),
      await ctx.app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: 'Basic abc' } }),
    ]) {
      expect(res.statusCode).toBe(401)
      expect(res.json().error.code).toBe('UNAUTHORIZED')
    }
  })

  it('с истёкшей сессией → 401', async () => {
    const { token } = (await register()).json()
    await ctx.db.query(`UPDATE sessions SET expires_at = now() - interval '1 second'`)
    expect((await me(token)).statusCode).toBe(401)
  })

  it('тариф pro действует только до plan_expires_at', async () => {
    const { token } = (await register()).json()
    await ctx.db.query(`UPDATE users SET plan = 'pro', plan_expires_at = now() + interval '10 days'`)
    expect((await me(token)).json().user.plan).toBe('pro')
    await ctx.db.query(`UPDATE users SET plan_expires_at = NULL`)
    expect((await me(token)).json().user).toMatchObject({ plan: 'pro', planExpiresAt: null })
    await ctx.db.query(`UPDATE users SET plan_expires_at = now() - interval '1 day'`)
    expect((await me(token)).json().user.plan).toBe('free')
  })
})

describe('logout', () => {
  it('204, после него me → 401, повторный logout → тоже 204', async () => {
    const { token } = (await register()).json()
    const out = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    })
    expect(out.statusCode).toBe(204)
    expect((await me(token)).statusCode).toBe(401)
    const again = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(again.statusCode).toBe(204)
  })

  it('выходит только из текущей сессии', async () => {
    const first = (await register()).json().token
    const second = (await login()).json().token
    await ctx.app.inject({ method: 'POST', url: '/api/auth/logout', headers: { authorization: `Bearer ${first}` } })
    expect((await me(first)).statusCode).toBe(401)
    expect((await me(second)).statusCode).toBe(200)
  })
})

describe('лимит попыток', () => {
  it('11-я попытка входа за минуту → 429 RATE_LIMITED', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await login('ghost@example.com')).statusCode).toBe(401)
    }
    const res = await login('ghost@example.com')
    expect(res.statusCode).toBe(429)
    expect(res.json()).toEqual({ error: { code: 'RATE_LIMITED', message: expect.any(String) } })
  })

  it('лимит считается по IP', async () => {
    for (let i = 0; i < 10; i++) await register('bad', 'x')
    expect((await register('bad', 'x')).statusCode).toBe(429)
    const other = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      remoteAddress: '10.0.0.2',
      payload: { email: EMAIL, password: PASSWORD },
    })
    expect(other.statusCode).toBe(201)
  })
})
