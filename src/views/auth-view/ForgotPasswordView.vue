<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { ROUTE_NAMES } from '@/router/routes';
import { useAuthStore } from '@/stores/auth.store';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import { validateEmail } from '@/entities/user';
import { createAutofillHandler } from '@/views/auth-view/autofill';

/** «Забыли пароль»: почта → письмо со ссылкой. Ответ одинаковый, есть аккаунт или нет. */
const route = useRoute();
const authStore = useAuthStore();

const form = reactive({ email: typeof route.query.email === 'string' ? route.query.email : '' });
const emailError = ref('');
const formError = ref('');
const isSubmitting = ref(false);
const wasSubmitted = ref(false);
/** Куда отправили письмо — показываем вместо формы. */
const sentTo = ref('');

const handleAutofill = createAutofillHandler(form, { email: 'email' });

watch(
  () => form.email,
  () => {
    formError.value = '';
    if (wasSubmitted.value) emailError.value = validateEmail(form.email) ?? '';
  },
);

async function submit() {
  if (isSubmitting.value) return;
  wasSubmitted.value = true;
  emailError.value = validateEmail(form.email) ?? '';
  if (emailError.value) return;

  isSubmitting.value = true;
  try {
    await authStore.requestPasswordReset(form.email);
    sentTo.value = form.email.trim().toLowerCase();
  } catch (error) {
    if (isApiError(error) && error.fields.email) emailError.value = error.fields.email;
    else formError.value = isApiError(error) ? error.message : UNKNOWN_ERROR_MESSAGE;
  } finally {
    isSubmitting.value = false;
  }
}

function sendAgain() {
  sentTo.value = '';
}
</script>

<template>
  <div class="auth-view">
    <div class="auth-view__content">
      <h1 class="auth-view__title">Восстановление пароля</h1>

      <template v-if="sentTo">
        <v-alert type="success" variant="tonal" class="auth-view__note" role="status">
          Если аккаунт с почтой <b>{{ sentTo }}</b> есть, мы отправили на неё письмо со ссылкой для
          смены пароля. Ссылка действует 60 минут и сработает один раз.
        </v-alert>
        <p class="auth-view__subtitle auth-view__hint-block">
          Письма нет несколько минут — проверьте папку «Спам» или
          <a href="#" class="auth-view__link" @click.prevent="sendAgain">отправьте ещё раз</a>.
        </p>
      </template>

      <template v-else>
        <p class="auth-view__subtitle">
          Укажите почту, с которой регистрировались, — пришлём ссылку для нового пароля.
        </p>
        <form
          class="auth-view__form"
          novalidate
          @submit.prevent="submit"
          @animationstart="handleAutofill"
        >
          <v-text-field
            v-model="form.email"
            label="Email"
            type="email"
            name="email"
            autocomplete="username"
            inputmode="email"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            variant="outlined"
            density="comfortable"
            :error-messages="emailError || undefined"
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
            Отправить ссылку
          </v-btn>
        </form>
      </template>

      <p class="auth-view__switch">
        Вспомнили пароль?
        <router-link :to="{ name: ROUTE_NAMES.login }" replace class="auth-view__link">
          Войти
        </router-link>
      </p>
    </div>
  </div>
</template>

<style src="./auth-view.css"></style>
