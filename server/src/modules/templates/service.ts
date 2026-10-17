import { withTransaction, type Db } from '../../db.js'
import { errors } from '../../lib/errors.js'
import {
  MAX_TEMPLATES_PER_USER,
  type CreateTemplateInput,
  type PhotoTemplateId,
  type ShareType,
  type UpdateTemplateInput,
} from './schemas.js'

// Сохранённые шаблоны оформления. Каждый запрос ограничен user_id — чужие шаблоны
// не видны и не изменяются (для них, как и для несуществующих, — NOT_FOUND).

/** Шаблон в том виде, в каком его отдаёт API (SavedTemplate в docs/api.md). */
export interface PublicTemplate {
  id: string
  name: string
  baseTemplate: PhotoTemplateId
  shareType: ShareType
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

interface TemplateRow {
  id: string
  name: string
  base_template: PhotoTemplateId
  share_type: ShareType
  settings: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

const COLUMNS = 'id, name, base_template, share_type, settings, created_at, updated_at'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toPublic(row: TemplateRow): PublicTemplate {
  return {
    id: row.id,
    name: row.name,
    baseTemplate: row.base_template,
    shareType: row.share_type,
    settings: row.settings,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

/** Кривой id в адресе — тоже «не найдено» (иначе PostgreSQL ругнётся на формат uuid). */
function assertId(id: string) {
  if (!UUID_PATTERN.test(id)) throw errors.notFound()
}

export class TemplatesService {
  constructor(private readonly db: Db) {}

  async list(userId: string): Promise<PublicTemplate[]> {
    const { rows } = await this.db.query<TemplateRow>(
      `SELECT ${COLUMNS} FROM templates WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId],
    )
    return rows.map(toPublic)
  }

  async get(userId: string, id: string): Promise<PublicTemplate> {
    assertId(id)
    const { rows } = await this.db.query<TemplateRow>(
      `SELECT ${COLUMNS} FROM templates WHERE id = $1 AND user_id = $2`,
      [id, userId],
    )
    if (!rows[0]) throw errors.notFound()
    return toPublic(rows[0])
  }

  async create(userId: string, input: CreateTemplateInput): Promise<PublicTemplate> {
    return withTransaction(this.db, async (client) => {
      // Блокировка на пользователя: два одновременных сохранения не проскочат лимит.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId])
      const { rows: count } = await client.query<{ count: string }>(
        'SELECT count(*) FROM templates WHERE user_id = $1',
        [userId],
      )
      if (Number(count[0]?.count ?? 0) >= MAX_TEMPLATES_PER_USER) throw errors.limitReached()

      const { rows } = await client.query<TemplateRow>(
        `INSERT INTO templates (user_id, name, base_template, share_type, settings)
         VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUMNS}`,
        [userId, input.name, input.baseTemplate, input.shareType, JSON.stringify(input.settings)],
      )
      return toPublic(rows[0]!)
    })
  }

  async update(userId: string, id: string, input: UpdateTemplateInput): Promise<PublicTemplate> {
    assertId(id)
    const { rows } = await this.db.query<TemplateRow>(
      `UPDATE templates
         SET name = COALESCE($3, name), settings = COALESCE($4::jsonb, settings)
       WHERE id = $1 AND user_id = $2
       RETURNING ${COLUMNS}`,
      [id, userId, input.name ?? null, input.settings ? JSON.stringify(input.settings) : null],
    )
    if (!rows[0]) throw errors.notFound()
    return toPublic(rows[0])
  }

  async remove(userId: string, id: string): Promise<void> {
    assertId(id)
    const { rowCount } = await this.db.query('DELETE FROM templates WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ])
    if (!rowCount) throw errors.notFound()
  }
}
