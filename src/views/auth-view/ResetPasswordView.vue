<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ROUTE_NAMES } from '@/router/routes';
import { useAuthStore } from '@/stores/auth.store';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import { validatePassword } from '@/entities/user';
import { createAutofillHandler } from '@/views/auth-view/autofill';

/**
 * Новый пароль по ссылке из письма (`#/reset-password?token=…`). После смены — вход с новой
 * сессией, прежние сессии на сервере закрыты.
 */
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));

const form = reactive({ password: '', passwordConfirm: '' });
const fieldErrors = reactive({ password: '', passwordConfirm: '' });
const formError = ref('');
/** Ссылка недействительна (использована, устарела или обрезана) — форма не нужна. */
const isLinkInvalid = ref(false);
const isSubmitting = ref(false);
const isPasswordVisible = ref(false);
const wasSubmitted = ref(false);

const handleAutofill = createAutofillHandler(form, {
  password: 'password',
  'password-confirm': 'passwordConfirm',
});

function validateAll(): boolean {
  fieldErrors.password = validatePassword(form.password) ?? '';
  fieldErrors.passwordConfirm = !form.passwordConfirm
    ? 'Повторите пароль'
    : form.passwordConfirm === form.password
      ? ''
      : 'Пароли не совпадают';
  return !fieldErrors.password && !fieldErrors.passwordConfirm;
}

watch(
  () => [form.password, form.passwordConfirm],
  () => {
    formError.value = '';
    if (wasSubmitted.value) validateAll();
  },
);

async function submit() {
  if (isSubmitting.value) return;
  wasSubmitted.value = true;
  if (!validateAll()) return;

  isSubmitting.value = true;
  try {
    await authStore.resetPassword(token.value, form.password);
    await router.replace('/');
  } catch (error) {
    if (isApiError(error) && error.code === 'RESET_TOKEN_INVALID') isLinkInvalid.value = true;
    else if (isApiError(error) && error.fields.password)
      fieldErrors.password = error.fields.password;
    else formError.value = isApiError(error) ? error.message : UNKNOWN_ERROR_MESSAGE;
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="auth-view">
    <div class="auth-view__content">
      <h1 class="auth-view__title">Новый пароль</h1>

      <template v-if="!token || isLinkInvalid">
        <v-alert type="warning" variant="tonal" class="auth-view__note" role="alert">
          Ссылка недействительна: она уже использована, устарела (живёт 60 минут) или скопирована не
          целиком.
        </v-alert>
        <v-btn
          color="primary"
          size="large"
          block
          class="auth-view__submit"
          :to="{ name: ROUTE_NAMES.forgotPassword }"
          replace
        >
          Запросить новую ссылку
        </v-btn>
      </template>

      <template v-else>
        <p class="auth-view__subtitle">
          Придумайте новый пароль. Все входы на других устройствах после смены закроются.
        </p>
        <form
          class="auth-view__form"
          novalidate
          @submit.prevent="submit"
          @animationstart="handleAutofill"
        >
          <v-text-field
            v-model="form.password"
            label="Новый пароль"
            :type="isPasswordVisible ? 'text' : 'password'"
            name="password"
            autocomplete="new-password"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            variant="outlined"
            density="comfortable"
            hint="От 8 до 128 символов"
            :error-messages="fieldErrors.password || undefined"
            :disabled="isSubmitting"
          >
            <template #append-inner>
              <v-btn
                :icon="isPasswordVisible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                :aria-label="isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'"
                :aria-pressed="isPasswordVisible"
                variant="text"
                size="small"
                density="comfortable"
                class="auth-view__eye"
                @click="isPasswordVisible = !isPasswordVisible"
              />
            </template>
          </v-text-field>
          <v-text-field
            v-model="form.passwordConfirm"
            label="Повторите пароль"
            :type="isPasswordVisible ? 'text' : 'password'"
            name="password-confirm"
            autocomplete="new-password"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            variant="outlined"
            density="comfortable"
            :error-messages="fieldErrors.passwordConfirm || undefined"
            :disabled="isSubmitting"
          />
          <v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            density="compact"
            class="auth-view__alert"
            role="alert"
          >
            {{ formError }}
          </v-alert>
          <v-btn
            type="submit"
            color="primary"
            size="large"
            block
            :loading="isSubmitting"
            class="auth-view__submit"
          >
            Сохранить и войти
          </v-btn>
        </form>
      </template>
    </div>
  </div>
</template>

<style src="./auth-view.css"></style>
