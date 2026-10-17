import { computed } from 'vue';

import { useAuthStore } from '@/stores/auth.store';
import { FEATURES, type FeatureId } from '@/shared/config/features';
import { ACCESS_LEVEL_ORDER, type AccessLevel } from '@/entities/user';

/** Хватает ли уровня `current` для `required` (guest < free < pro). */
export function isAccessSufficient(current: AccessLevel, required: AccessLevel): boolean {
  return ACCESS_LEVEL_ORDER[current] >= ACCESS_LEVEL_ORDER[required];
}

/** Уровень доступа текущего пользователя и проверки по нему. */
export function useAccess() {
  const authStore = useAuthStore();

  const accessLevel = computed(() => authStore.accessLevel);
  const isGuest = computed(() => accessLevel.value === 'guest');
  const isAuthenticated = computed(() => !isGuest.value);
  const isPro = computed(() => accessLevel.value === 'pro');

  function hasAccess(required: AccessLevel): boolean {
    return isAccessSufficient(accessLevel.value, required);
  }

  function canUse(feature: FeatureId): boolean {
    return hasAccess(FEATURES[feature]);
  }

  return { accessLevel, isGuest, isAuthenticated, isPro, hasAccess, canUse };
}
