<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { PLAN_LABELS } from '@/entities/user';
import { formatPlanUntil } from '@/entities/billing';
import { ROUTE_NAMES } from '@/router/routes';
import DeleteAccountDialog from '@/views/layouts/components/DeleteAccountDialog.vue';

const authStore = useAuthStore();
const route = useRoute();
const isOpen = ref(false);
const isDeleteOpen = ref(false);

const user = computed(() => authStore.user);
const initial = computed(() => user.value?.email.charAt(0).toUpperCase() ?? '');
const isChecking = computed(() => !user.value && authStore.status !== 'offline');
const isOffline = computed(() => !user.value && authStore.status === 'offline');
const planLabel = computed(() => (user.value ? PLAN_LABELS[user.value.plan] : ''));
const proSubtitle = computed(() =>
  user.value?.plan === 'pro' ? formatPlanUntil(user.value.planExpiresAt) : 'Подключить',
);

/**
 * «RunVision Pro» — с путём текущей страницы: после оплаты вернём туда же (к выбору стиля,
 * к шаблонам и т.п.), а не на загрузку GPX.
 */
const proLink = computed(() =>
  route.path.startsWith('/pro')
    ? { name: ROUTE_NAMES.pro }
    : { name: ROUTE_NAMES.pro, query: { redirect: route.fullPath } },
);

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
        :aria-label="
          user ? `Аккаунт ${user.email}${user.plan === 'pro' ? ', Pro' : ''}` : 'Аккаунт'
        "
      >
        <v-progress-circular v-if="isChecking" indeterminate size="20" width="2" />
        <v-icon v-else-if="isOffline" icon="mdi-account-alert-outline" />
        <span v-else class="user-menu__avatar-wrap">
          <v-avatar color="primary" size="38" class="user-menu__avatar">
            {{ initial }}
          </v-avatar>
          <!-- Активный Pro — корона, чуть наклонена, на краю аватара. -->
          <v-icon
            v-if="user?.plan === 'pro'"
            icon="mdi-crown"
            size="15"
            class="user-menu__crown"
            aria-hidden="true"
          />
        </span>
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
        prepend-icon="mdi-crown-outline"
        title="RunVision Pro"
        :subtitle="proSubtitle"
        :to="proLink"
        @click="isOpen = false"
      />
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
/* Кнопка обрезает содержимое по кругу — корона на краю аватара должна выходить за него. */
.user-menu__button {
  overflow: visible;
}

.user-menu__avatar-wrap {
  position: relative;
  display: inline-flex;
}

.user-menu__crown {
  position: absolute;
  top: -7px;
  right: -1px;
  color: #ffd24a;
  transform: rotate(28deg);
  /* Тёмная обводка — корону видно и на светлом, и на синем аватаре. */
  filter: drop-shadow(0 0 1px rgb(0 0 0 / 85%)) drop-shadow(0 1px 1px rgb(0 0 0 / 40%));
  pointer-events: none;
}

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
