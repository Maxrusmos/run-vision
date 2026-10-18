<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { PLAN_LABELS } from '@/entities/user';
import { ROUTE_NAMES } from '@/router/routes';
import DeleteAccountDialog from '@/views/layouts/components/DeleteAccountDialog.vue';

const authStore = useAuthStore();
const isOpen = ref(false);
const isDeleteOpen = ref(false);

const user = computed(() => authStore.user);
const initial = computed(() => user.value?.email.charAt(0).toUpperCase() ?? '');
const isChecking = computed(() => !user.value && authStore.status !== 'offline');
const isOffline = computed(() => !user.value && authStore.status === 'offline');
const planLabel = computed(() => (user.value ? PLAN_LABELS[user.value.plan] : ''));

function retry() {
  void authStore.init();
}

function openDelete() {
  isOpen.value = false;
  isDeleteOpen.value = true;
}

async function logout() {
  isOpen.value = false;
  await authStore.logout();
}
</script>

<template>
  <v-menu v-model="isOpen" location="bottom end" offset="6" :disabled="isChecking">
    <template #activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        icon
        variant="text"
        class="user-menu__button"
        :aria-label="user ? `Аккаунт ${user.email}` : 'Аккаунт'"
      >
        <v-progress-circular v-if="isChecking" indeterminate size="20" width="2" />
        <v-icon v-else-if="isOffline" icon="mdi-account-alert-outline" />
        <v-avatar v-else color="primary" size="38" class="user-menu__avatar">
          {{ initial }}
        </v-avatar>
      </v-btn>
    </template>

    <v-list density="comfortable" class="user-menu__list" nav>
      <template v-if="user">
        <v-list-item class="user-menu__account">
          <v-list-item-title class="user-menu__email" :title="user.email">
            {{ user.email }}
          </v-list-item-title>
          <v-list-item-subtitle>
            Тариф: <span class="user-menu__plan">{{ planLabel }}</span>
          </v-list-item-subtitle>
        </v-list-item>
      </template>

      <template v-else>
        <v-list-item>
          <v-list-item-title>Нет связи с сервером</v-list-item-title>
          <v-list-item-subtitle>Аккаунт проверим позже</v-list-item-subtitle>
        </v-list-item>
        <v-list-item prepend-icon="mdi-refresh" title="Повторить" @click="retry" />
      </template>

      <v-divider class="my-1" />
      <v-list-item
        prepend-icon="mdi-star-outline"
        title="Мои шаблоны"
        :to="{ name: ROUTE_NAMES.account }"
        @click="isOpen = false"
      />
      <v-list-item prepend-icon="mdi-logout" title="Выйти" @click="logout" />
      <template v-if="user">
        <v-divider class="my-1" />
        <v-list-item
          prepend-icon="mdi-shield-account-outline"
          title="Персональные данные"
          :to="{ name: ROUTE_NAMES.privacy }"
          @click="isOpen = false"
        />
        <v-list-item
          prepend-icon="mdi-account-remove-outline"
          title="Удалить аккаунт"
          class="user-menu__danger"
          @click="openDelete"
        />
      </template>
    </v-list>
  </v-menu>
  <DeleteAccountDialog v-model="isDeleteOpen" />
</template>

<style scoped>
.user-menu__avatar {
  font-size: 17px;
  font-weight: 600;
}

/* Меню не шире экрана: на 320px длинный email обрезается многоточием. */
.user-menu__list {
  width: min(300px, calc(100vw - 16px));
}

.user-menu__email {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu__danger {
  color: rgb(var(--v-theme-error));
}

.user-menu__plan {
  color: var(--app-on-surface);
}
</style>
