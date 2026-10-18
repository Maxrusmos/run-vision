<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Удаление аккаунта — с подтверждением паролем. Вместе с ним удаляются почта, сессии и
 * «Мои шаблоны» (это же — отзыв согласия на обработку персональных данных).
 */
const isOpen = defineModel<boolean>({ required: true });

const authStore = useAuthStore();
const router = useRouter();
const password = ref('');
const error = ref('');
const isDeleting = ref(false);

watch(isOpen, () => {
  password.value = '';
  error.value = '';
});

async function remove() {
  if (isDeleting.value) return;
  if (!password.value) {
    error.value = 'Введите пароль';
    return;
  }
  isDeleting.value = true;
  error.value = '';
  try {
    await authStore.deleteAccount(password.value);
    isOpen.value = false;
    await router.replace('/');
  } catch (removeError) {
    error.value =
      isApiError(removeError) && removeError.code === 'INVALID_CREDENTIALS'
        ? 'Неверный пароль'
        : isApiError(removeError)
          ? removeError.message
          : UNKNOWN_ERROR_MESSAGE;
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="380" :persistent="isDeleting">
    <v-card class="delete-account-dialog">
      <div class="delete-account-dialog__title">Удалить аккаунт?</div>
      <div class="delete-account-dialog__text">
        Удалятся почта, «Мои шаблоны» и все входы на других устройствах. Вернуть это будет нельзя.
        Картинки и видео, которые вы уже сохранили, останутся у вас.
      </div>
      <form @submit.prevent="remove">
        <v-text-field
          v-model="password"
          label="Пароль для подтверждения"
          type="password"
          name="password"
          autocomplete="current-password"
          variant="outlined"
          density="comfortable"
          :error-messages="error || undefined"
          :disabled="isDeleting"
          class="delete-account-dialog__field"
        />
        <div class="delete-account-dialog__actions">
          <v-btn variant="tonal" :disabled="isDeleting" @click="isOpen = false">Отмена</v-btn>
          <v-btn type="submit" color="error" variant="flat" :loading="isDeleting">
            Удалить навсегда
          </v-btn>
        </div>
      </form>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.delete-account-dialog {
  padding: 20px;
}

.delete-account-dialog__title {
  font-size: 17px;
  font-weight: 600;
}

.delete-account-dialog__text {
  margin: 8px 0 16px;
  color: color-mix(in srgb, var(--app-on-surface) 75%, transparent);
  font-size: 14px;
  line-height: 1.5;
}

/* iOS приближает страницу, если шрифт поля меньше 16px. */
.delete-account-dialog__field :deep(input) {
  font-size: 16px;
}

.delete-account-dialog__actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

/* Как в диалоге удаления шаблона: кнопки поровну, без капса. */
.delete-account-dialog__actions > .v-btn {
  flex: 1 1 0;
  letter-spacing: 0;
  text-transform: none;
}
</style>
