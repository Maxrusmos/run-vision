import type { ShareCardSettings } from '@/entities/activity/model/activity-share/activity-share.types';
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

  it('у фото и видео свои черновики; старые ключи без типа — фото', () => {
    const store = useShareDraftsStore();
    const card = (color: string) => ({ backgroundColor: color }) as ShareCardSettings;
    store.saveDraft('photo', 'minimal', card('#111111'));
    expect(store.getDraft('video', 'minimal')).toBeNull();
    store.saveDraft('video', 'minimal', card('#222222'));
    expect(store.getDraft('photo', 'minimal')?.backgroundColor).toBe('#111111');
    expect(store.peekDraft('video', 'minimal')?.backgroundColor).toBe('#222222');

    store.setDrafts({ topographic: card('#333333') });
    expect(store.getDraft('photo', 'topographic')?.backgroundColor).toBe('#333333');
    expect(store.getDraft('video', 'topographic')).toBeNull();
  });
});
