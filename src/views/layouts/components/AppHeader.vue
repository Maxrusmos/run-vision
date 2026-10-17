<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { ROUTE_NAMES } from '@/router/routes';
import UserMenu from '@/views/layouts/components/UserMenu.vue';
import { useAuthStore } from '@/stores/auth.store';

const route = useRoute();
const authStore = useAuthStore();

const isAuthPage = computed(
  () => route.name === ROUTE_NAMES.login || route.name === ROUTE_NAMES.register,
);

// После входа вернёмся на текущую страницу.
const loginLocation = computed(() => ({
  name: ROUTE_NAMES.login,
  query: route.path === '/' ? {} : { redirect: route.fullPath },
}));

// Сессия есть (или проверяется / сервер недоступен) — показываем меню аккаунта, не «Войти».
const hasSession = computed(() => authStore.isAuthenticated || authStore.token !== null);
</script>

<template>
  <v-app-bar flat border="bottom" class="app-bar">
    <v-app-bar-title class="app-title">
      <router-link :to="{ name: ROUTE_NAMES.share }" class="app-title__link">
        RunVision
      </router-link>
    </v-app-bar-title>

    <template #append>
      <UserMenu v-if="hasSession" />
      <v-btn
        v-else-if="!isAuthPage"
        :to="loginLocation"
        variant="tonal"
        size="small"
        class="app-bar__login"
        prepend-icon="mdi-login"
      >
        Войти
      </v-btn>
    </template>
  </v-app-bar>
</template>

<style scoped>
.app-title__link {
  color: inherit;
  text-decoration: none;
}

.app-bar__login {
  letter-spacing: 0;
  text-transform: none;
}

@media (max-width: 600px) {
  .app-bar {
    height: 48px !important;
  }

  .app-bar :deep(.v-toolbar__content) {
    height: 48px !important;
    min-height: 48px !important;
  }

  .app-bar :deep(.v-toolbar__append) {
    margin-inline-end: 8px;
  }

  .app-title {
    font-size: 16px;
  }
}
</style>
