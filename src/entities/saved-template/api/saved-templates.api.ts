import { apiRequest } from '@/shared/api';
import type { SavedTemplate, SavedTemplateInput } from '../model/saved-template.types';

/** Сервер до видео-шаблонов не отдавал `shareType` — такие шаблоны фото. */
function withShareType(template: SavedTemplate): SavedTemplate {
  return template.shareType ? template : { ...template, shareType: 'photo' };
}

export async function list(): Promise<SavedTemplate[]> {
  const { templates } = await apiRequest<{ templates: SavedTemplate[] }>('/api/templates', {
    auth: true,
  });
  return templates.map(withShareType);
}

export async function get(id: string): Promise<SavedTemplate> {
  const { template } = await apiRequest<{ template: SavedTemplate }>(
    `/api/templates/${encodeURIComponent(id)}`,
    { auth: true },
  );
  return withShareType(template);
}

export async function create(input: SavedTemplateInput): Promise<SavedTemplate> {
  const { template } = await apiRequest<{ template: SavedTemplate }>('/api/templates', {
    method: 'POST',
    auth: true,
    body: input,
  });
  return withShareType(template);
}

export async function update(
  id: string,
  patch: Partial<Pick<SavedTemplateInput, 'name' | 'settings'>>,
): Promise<SavedTemplate> {
  const { template } = await apiRequest<{ template: SavedTemplate }>(
    `/api/templates/${encodeURIComponent(id)}`,
    { method: 'PATCH', auth: true, body: patch },
  );
  return withShareType(template);
}

export async function remove(id: string): Promise<void> {
  await apiRequest<void>(`/api/templates/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    auth: true,
  });
}
