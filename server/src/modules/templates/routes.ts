import type { FastifyInstance } from 'fastify'
import { currentUser } from '../auth/authenticate.js'
import { parseBody } from '../auth/schemas.js'
import { createTemplateSchema, updateTemplateSchema } from './schemas.js'
import type { TemplatesService } from './service.js'

// HTTP-маршруты /api/templates/* — только для вошедших. Логика — в TemplatesService.

export async function templateRoutes(app: FastifyInstance, opts: { service: TemplatesService }) {
  const { service } = opts
  app.addHook('preHandler', app.authenticate)

  app.get('/api/templates', async (request) => {
    return { templates: await service.list(currentUser(request).id) }
  })

  app.post('/api/templates', async (request, reply) => {
    const input = parseBody(createTemplateSchema, request.body)
    const template = await service.create(currentUser(request).id, input)
    return reply.code(201).send({ template })
  })

  app.get<{ Params: { id: string } }>('/api/templates/:id', async (request) => {
    return { template: await service.get(currentUser(request).id, request.params.id) }
  })

  app.patch<{ Params: { id: string } }>('/api/templates/:id', async (request) => {
    const input = parseBody(updateTemplateSchema, request.body)
    return { template: await service.update(currentUser(request).id, request.params.id, input) }
  })

  app.delete<{ Params: { id: string } }>('/api/templates/:id', async (request, reply) => {
    await service.remove(currentUser(request).id, request.params.id)
    return reply.code(204).send()
  })
}
