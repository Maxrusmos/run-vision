import { describe, expect, it } from 'vitest'
import { MAX_TEMPLATES_PER_USER } from '../src/modules/templates/schemas.js'
import { useTestApp } from './helpers.js'

const SETTINGS = { presetId: 'sunset', routeColor: '#ffca91', backgroundImage: 'blob:x', statSpacing: 12 }

describe('/api/templates', () => {
  const ctx = useTestApp()

  async function register(email = 'runner@example.com') {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: 'password123', consent: true },
    })
    return response.json().token as string
  }

  function call(token: string | null, method: string, url: string, payload?: unknown) {
    return ctx.app.inject({
      method: method as 'GET',
      url,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      ...(payload === undefined ? {} : { payload: payload as object }),
    })
  }

  it('тип шаблона: по умолчанию фото, видео — по запросу, не меняется', async () => {
    const token = await register()
    const photo = (await call(token, 'POST', '/api/templates', { name: 'Фото', baseTemplate: 'minimal', settings: {} })).json()
    expect(photo.template.shareType).toBe('photo')

    const created = await call(token, 'POST', '/api/templates', {
      name: 'Ролик',
      baseTemplate: 'topographic',
      shareType: 'video',
      settings: {},
    })
    expect(created.statusCode).toBe(201)
    const video = created.json().template
    expect(video).toMatchObject({ name: 'Ролик', baseTemplate: 'topographic', shareType: 'video' })
    expect((await call(token, 'GET', `/api/templates/${video.id}`)).json().template.shareType).toBe('video')
    const types = (await call(token, 'GET', '/api/templates')).json().templates.map((item: { shareType: string }) => item.shareType)
    expect(types).toEqual(expect.arrayContaining(['photo', 'video']))

    // PATCH тип не меняет: лишнее поле молча отбрасывается, как и baseTemplate.
    const patched = await call(token, 'PATCH', `/api/templates/${video.id}`, { name: 'Ролик 2', shareType: 'photo' })
    expect(patched.json().template).toMatchObject({ name: 'Ролик 2', shareType: 'video' })

    const bad = await call(token, 'POST', '/api/templates', { name: 'Х', baseTemplate: 'minimal', shareType: 'gif', settings: {} })
    expect(bad.statusCode).toBe(400)
    expect(Object.keys(bad.json().error.fields)).toContain('shareType')
  })

  it('без входа — 401', async () => {
    expect((await call(null, 'GET', '/api/templates')).statusCode).toBe(401)
    expect((await call(null, 'POST', '/api/templates', {})).statusCode).toBe(401)
  })

  it('создание, список, чтение, изменение и удаление', async () => {
    const token = await register()
    const created = await call(token, 'POST', '/api/templates', {
      name: '  Утро  ',
      baseTemplate: 'minimal',
      settings: SETTINGS,
    })
    expect(created.statusCode).toBe(201)
    const template = created.json().template
    expect(template).toMatchObject({ name: 'Утро', baseTemplate: 'minimal' })
    // Фото фона не храним.
    expect(template.settings).toEqual({ ...SETTINGS, backgroundImage: null })

    const list = await call(token, 'GET', '/api/templates')
    expect(list.json().templates).toHaveLength(1)

    expect((await call(token, 'GET', `/api/templates/${template.id}`)).json().template.id).toBe(template.id)

    const renamed = await call(token, 'PATCH', `/api/templates/${template.id}`, { name: 'Вечер' })
    expect(renamed.statusCode).toBe(200)
    expect(renamed.json().template).toMatchObject({ name: 'Вечер', settings: template.settings })

    const updated = await call(token, 'PATCH', `/api/templates/${template.id}`, {
      settings: { ...SETTINGS, statSpacing: 4 },
    })
    expect(updated.json().template).toMatchObject({ name: 'Вечер', settings: { statSpacing: 4 } })
    expect(new Date(updated.json().template.updatedAt) >= new Date(template.updatedAt)).toBe(true)

    expect((await call(token, 'DELETE', `/api/templates/${template.id}`)).statusCode).toBe(204)
    expect((await call(token, 'GET', `/api/templates/${template.id}`)).statusCode).toBe(404)
    expect((await call(token, 'DELETE', `/api/templates/${template.id}`)).statusCode).toBe(404)
  })

  it('список — новые изменения сверху', async () => {
    const token = await register()
    const first = (await call(token, 'POST', '/api/templates', { name: 'A', baseTemplate: 'minimal', settings: {} })).json()
      .template
    await call(token, 'POST', '/api/templates', { name: 'B', baseTemplate: 'telemetry', settings: {} })
    await call(token, 'PATCH', `/api/templates/${first.id}`, { name: 'A2' })
    const names = (await call(token, 'GET', '/api/templates')).json().templates.map((t: { name: string }) => t.name)
    expect(names).toEqual(['A2', 'B'])
  })

  it('чужие шаблоны не видны и не меняются', async () => {
    const owner = await register('owner@example.com')
    const stranger = await register('stranger@example.com')
    const { template } = (
      await call(owner, 'POST', '/api/templates', { name: 'Мой', baseTemplate: 'topographic', settings: {} })
    ).json()

    expect((await call(stranger, 'GET', '/api/templates')).json().templates).toEqual([])
    expect((await call(stranger, 'GET', `/api/templates/${template.id}`)).statusCode).toBe(404)
    expect((await call(stranger, 'PATCH', `/api/templates/${template.id}`, { name: 'x' })).statusCode).toBe(404)
    expect((await call(stranger, 'DELETE', `/api/templates/${template.id}`)).statusCode).toBe(404)
    expect((await call(owner, 'GET', `/api/templates/${template.id}`)).json().template.name).toBe('Мой')
  })

  it('неверные данные — VALIDATION_ERROR с полями', async () => {
    const token = await register()
    const bad = await call(token, 'POST', '/api/templates', { name: '', baseTemplate: 'x', settings: [] })
    expect(bad.statusCode).toBe(400)
    expect(Object.keys(bad.json().error.fields)).toEqual(expect.arrayContaining(['name', 'baseTemplate', 'settings']))

    const long = await call(token, 'POST', '/api/templates', { name: 'a'.repeat(61), baseTemplate: 'minimal', settings: {} })
    expect(long.json().error.fields.name).toBeTruthy()

    const big = await call(token, 'POST', '/api/templates', {
      name: 'big',
      baseTemplate: 'minimal',
      settings: { blob: 'x'.repeat(40 * 1024) },
    })
    expect(big.statusCode).toBe(400)

    const empty = await call(token, 'PATCH', '/api/templates/00000000-0000-0000-0000-000000000000', {})
    expect(empty.statusCode).toBe(400)
  })

  it('кривой id — 404, а не 500', async () => {
    const token = await register()
    expect((await call(token, 'GET', '/api/templates/not-a-uuid')).statusCode).toBe(404)
  })

  it('лимит шаблонов — LIMIT_REACHED', async () => {
    const token = await register()
    const { rows } = await ctx.db.query<{ id: string }>('SELECT id FROM users LIMIT 1')
    await ctx.db.query(
      `INSERT INTO templates (user_id, name, base_template, settings)
       SELECT $1, 'T' || n, 'minimal', '{}'::jsonb FROM generate_series(1, $2) n`,
      [rows[0]!.id, MAX_TEMPLATES_PER_USER],
    )
    const response = await call(token, 'POST', '/api/templates', { name: 'Ещё', baseTemplate: 'minimal', settings: {} })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('LIMIT_REACHED')
  })

  it('CORS разрешает PATCH и DELETE', async () => {
    const response = await ctx.app.inject({
      method: 'OPTIONS',
      url: '/api/templates/x',
      headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'DELETE' },
    })
    expect(response.headers['access-control-allow-methods']).toContain('DELETE')
    expect(response.headers['access-control-allow-methods']).toContain('PATCH')
  })
})
