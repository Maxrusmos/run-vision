import type { AccessLevel } from '@/entities/user';

/**
 * Реестр платных/закрытых возможностей: фича → минимальный уровень доступа.
 * Пока ничего не закрыто. Пример на будущее:
 *
 *   export const FEATURES = {
 *     videoExport: 'pro',      // видео-режим — только по подписке
 *     savedCards: 'free',      // сохранение карточек — после входа
 *   } as const satisfies Record<string, AccessLevel>;
 *
 * Проверка в компоненте: `const { canUse } = useAccess(); canUse('videoExport')`.
 */
export const FEATURES = {} as const satisfies Record<string, AccessLevel>;

export type FeatureId = keyof typeof FEATURES;
