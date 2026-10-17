import { apiRequest } from '@/shared/api';
import type { SavedTemplate, SavedTemplateInput } from '../model/saved-template.types';

export async function list(): Promise<SavedTemplate[]> {
  const { templates } = await apiRequest<{ templates: SavedTemplate[] }>('/api/templates', {
    auth: true,
  });
  return templates;
}

export async function get(id: string): Promise<SavedTemplate> {
  const { template } = await apiRequest<{ template: SavedTemplate }>(
    `/api/templates/${encodeURIComponent(id)}`,
    { auth: true },
  );
  return template;
}

export async function create(input: SavedTemplateInput): Promise<SavedTemplate> {
  const { template } = await apiRequest<{ template: SavedTemplate }>('/api/templates', {
    method: 'POST',
    auth: true,
    body: input,
  });
  return template;
}

export async function update(
  id: string,
  patch: Partial<Pick<SavedTemplateInput, 'name' | 'settings'>>,
): Promise<SavedTemplate> {
  const { template } = await apiRequest<{ template: SavedTemplate }>(
    `/api/templates/${encodeURIComponent(id)}`,
    { method: 'PATCH', auth: true, body: patch },
  );
  return template;
}

export async function remove(id: string): Promise<void> {
  await apiRequest<void>(`/api/templates/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    auth: true,
  });
}
