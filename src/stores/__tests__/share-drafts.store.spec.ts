import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useShareDraftsStore } from '../share-drafts.store';

beforeEach(() => setActivePinia(createPinia()));

describe('share-drafts.store: связи с сохранёнными шаблонами', () => {
  it('у фото и видео — свои связи при общем черновике', () => {
    const store = useShareDraftsStore();
    store.setLink('photo', 'minimal', 'photo-template');
    store.setLink('video', 'minimal', 'video-template');
    expect(store.getLink('photo', 'minimal')).toBe('photo-template');
    expect(store.getLink('video', 'minimal')).toBe('video-template');

    store.setLink('video', 'minimal', null);
    expect(store.getLink('video', 'minimal')).toBeNull();
    expect(store.getLink('photo', 'minimal')).toBe('photo-template');
  });

  it('связи из сессии до видео-шаблонов (без типа) — фото', () => {
    const store = useShareDraftsStore();
    store.setDrafts({}, { topographic: 'old', 'video:telemetry': 'new' });
    expect(store.getLink('photo', 'topographic')).toBe('old');
    expect(store.getLink('video', 'topographic')).toBeNull();
    expect(store.getLink('video', 'telemetry')).toBe('new');
  });
});
