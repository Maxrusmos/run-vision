import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';

import { idbDelete, idbGet, idbSet } from '../idb-store';

describe('idb-store', () => {
  it('сохраняет, читает и удаляет значение', async () => {
    expect(await idbGet('key')).toBeUndefined();

    await idbSet('key', { a: 1, list: [1, 2] });
    expect(await idbGet('key')).toEqual({ a: 1, list: [1, 2] });

    await idbSet('key', { a: 2 });
    expect(await idbGet('key')).toEqual({ a: 2 });

    await idbDelete('key');
    expect(await idbGet('key')).toBeUndefined();
  });

  it('не бросает, если значение нельзя сохранить', async () => {
    await expect(idbSet('bad', { fn: () => 1 })).resolves.toBeUndefined();
    expect(await idbGet('bad')).toBeUndefined();
  });
});
