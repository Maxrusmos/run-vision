import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
import type { SavedTemplate } from '@/entities/saved-template';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/entities/saved-template/api/saved-templates.api', () => api);

const { useSavedTemplatesStore } = await import('../saved-templates.store');
const { useAuthStore } = await import('../auth.store');

function template(id: string, updatedAt: string, name = id): SavedTemplate {
  return {
    id,
    name,
    baseTemplate: 'minimal',
    settings: { routeColor: '#fff' } as unknown as ShareCardSettings,
    createdAt: updatedAt,
    updatedAt,
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
  Object.values(api).forEach((fn) => fn.mockReset());
});

describe('saved-templates.store', () => {
  it('загружает список, новые изменения сверху', async () => {
    api.list.mockResolvedValue([template('a', '2026-10-01'), template('b', '2026-10-05')]);
    const store = useSavedTemplatesStore();
    await store.load();
    expect(store.status).toBe('ready');
    expect(store.templates.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('создание и обновление поднимают шаблон наверх; без фото и названия', async () => {
    api.list.mockResolvedValue([template('a', '2026-10-01')]);
    const store = useSavedTemplatesStore();
    await store.load();

    api.create.mockResolvedValue(template('new', '2026-10-10'));
    const settings = { title: 'Бег', backgroundImage: 'blob:x' } as unknown as ShareCardSettings;
    await store.create('Новый', 'minimal', settings);
    expect(api.create.mock.lastCall?.[0].settings).toMatchObject({
      title: null,
      backgroundImage: null,
    });
    expect(store.templates.map((item) => item.id)).toEqual(['new', 'a']);

    api.update.mockResolvedValue(template('a', '2026-10-11', 'A2'));
    await store.update('a', { name: 'A2' });
    expect(store.templates.map((item) => item.name)).toEqual(['A2', 'new']);
  });

  it('удаление убирает из списка; ошибка загрузки — статус error', async () => {
    api.list.mockRejectedValueOnce(new Error('сеть'));
    const store = useSavedTemplatesStore();
    await store.load();
    expect(store.status).toBe('error');

    api.list.mockResolvedValue([template('a', '2026-10-01')]);
    await store.ensureLoaded();
    api.remove.mockResolvedValue(undefined);
    await store.remove('a');
    expect(store.templates).toEqual([]);
  });

  it('смена пользователя очищает чужие шаблоны', async () => {
    api.list.mockResolvedValue([template('a', '2026-10-01')]);
    const store = useSavedTemplatesStore();
    const auth = useAuthStore();
    auth.user = { id: 'u1', email: 'a@b.c', plan: 'free', planExpiresAt: null, createdAt: '' };
    await nextTick();
    await store.load();
    expect(store.templates).toHaveLength(1);

    auth.user = null;
    await nextTick();
    expect(store.templates).toEqual([]);
    expect(store.status).toBe('idle');
  });
});
