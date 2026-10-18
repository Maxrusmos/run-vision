<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ROUTE_NAMES } from '@/router/routes';
import { getSafeRedirect } from '@/router/redirect';
import { useAuthStore } from '@/stores/auth.store';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import { validateEmail, validatePassword } from '@/entities/user';
import { createAutofillHandler } from '@/views/auth-view/autofill';

type AuthMode = 'login' | 'register';
type FieldName = 'email' | 'password' | 'passwordConfirm' | 'consent';

const props = defineProps<{ mode: AuthMode }>();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isRegister = computed(() => props.mode === 'register');

const form = reactive({ email: '', password: '', passwordConfirm: '', consent: false });
const fieldErrors = reactive<Record<FieldName, string>>({
  email: '',
  password: '',
  passwordConfirm: '',
  consent: '',
});
const formError = ref('');
const isSubmitting = ref(false);
const isPasswordVisible = ref(false);
// До первой отправки не ругаемся на недописанные поля.
const wasSubmitted = ref(false);

// Документы открываются в новой вкладке — ссылкой на hash-маршрут этого же сайта.
const consentHref = router.resolve({ name: ROUTE_NAMES.consent }).href;
const privacyHref = router.resolve({ name: ROUTE_NAMES.privacy }).href;

const redirectTarget = computed(() => getSafeRedirect(route.query.redirect));
// Ссылка на соседнюю форму сохраняет, куда вернуться.
const switchLocation = computed(() => ({
  name: isRegister.value ? ROUTE_NAMES.login : ROUTE_NAMES.register,
  query: redirectTarget.value ? { redirect: redirectTarget.value } : {},
}));

const texts = computed(() =>
  isRegister.value
    ? {
        title: 'Регистрация',
        subtitle: 'Аккаунт пригодится, чтобы сохранять карточки и настройки.',
        submit: 'Зарегистрироваться',
        switchQuestion: 'Уже есть аккаунт?',
        switchAction: 'Войти',
      }
    : {
        title: 'Вход',
        subtitle: 'Войдите, чтобы пользоваться аккаунтом RunVision.',
        submit: 'Войти',
        switchQuestion: 'Нет аккаунта?',
        switchAction: 'Зарегистрироваться',
      },
);

function validateField(field: FieldName): string {
  if (field === 'consent') {
    return !isRegister.value || form.consent ? '' : 'Без согласия зарегистрироваться нельзя';
  }
  if (field === 'email') return validateEmail(form.email) ?? '';
  if (field === 'password') {
    // При входе длину не проверяем: пусть сервер скажет «неверный пароль», а не правила.
    if (!isRegister.value) return form.password ? '' : 'Введите пароль';
    return validatePassword(form.password) ?? '';
  }
  if (!isRegister.value) return '';
  if (!form.passwordConfirm) return 'Повторите пароль';
  return form.passwordConfirm === form.password ? '' : 'Пароли не совпадают';
}

function validateAll(): boolean {
  const fields: FieldName[] = ['email', 'password', 'passwordConfirm', 'consent'];
  for (const field of fields) fieldErrors[field] = validateField(field);
  return fields.every((field) => !fieldErrors[field]);
}

// После первой отправки ошибки обновляются на ходу (и снимаются серверные).
watch(
  () => [form.email, form.password, form.passwordConfirm, form.consent],
  () => {
    formError.value = '';
    if (wasSubmitted.value) validateAll();
  },
);

function applyServerError(error: unknown) {
  if (!isApiError(error)) {
    formError.value = UNKNOWN_ERROR_MESSAGE;
    return;
  }

  let hasFieldError = false;
  for (const [field, message] of Object.entries(error.fields)) {
    if (field === 'email' || field === 'password' || field === 'consent') {
      fieldErrors[field] = message;
      hasFieldError = true;
    }
  }
  if (error.code === 'EMAIL_TAKEN') {
    fieldErrors.email = error.message;
    hasFieldError = true;
  }

  if (!hasFieldError) formError.value = error.message;
}

const handleAutofill = createAutofillHandler(form, {
  email: 'email',
  password: 'password',
  'password-confirm': 'passwordConfirm',
});

function goBack(fallback: string) {
  // В истории роутера есть предыдущая страница приложения — туда и возвращаемся.
  if (typeof window.history.state?.back === 'string') router.back();
  else void router.replace(fallback);
}

async function submit() {
  if (isSubmitting.value) return;

  wasSubmitted.value = true;
  formError.value = '';
  if (!validateAll()) return;

  isSubmitting.value = true;
  try {
    const credentials = { email: form.email, password: form.password };
    if (isRegister.value) await authStore.register({ ...credentials, consent: true });
    else await authStore.login(credentials);

    await router.replace(redirectTarget.value ?? '/');
  } catch (error) {
    applyServerError(error);
  } finally {
    isSubmitting.value = false;
  }
}

function continueAsGuest() {
  if (redirectTarget.value) void router.replace(redirectTarget.value);
  else goBack('/');
}

// Сессия подтвердилась, пока страница открыта (проверка токена на старте) — здесь делать нечего.
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated && !isSubmitting.value) void router.replace('/');
  },
  { immediate: true },
);
</script>

<template>
  <div class="auth-view">
    <div class="auth-view__content">
      <h1 class="auth-view__title">{{ texts.title }}</h1>
      <p class="auth-view__subtitle">{{ texts.subtitle }}</p>

      <form
        class="auth-view__form"
        novalidate
        @submit.prevent="submit"
        @animationstart="handleAutofill"
      >
        <!-- Зачем почта — до того, как её попросили. -->
        <v-alert
          v-if="isRegister"
          variant="tonal"
          density="compact"
          icon="mdi-email-lock-outline"
          class="auth-view__note"
        >
          Почта нужна только для входа и восстановления пароля. Рассылок нет, третьим лицам для
          рекламы не передаём.
        </v-alert>

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
          :error-messages="fieldErrors.email || undefined"
          :disabled="isSubmitting"
        />

        <v-text-field
          v-model="form.password"
          label="Пароль"
          :type="isPasswordVisible ? 'text' : 'password'"
          name="password"
          :autocomplete="isRegister ? 'new-password' : 'current-password'"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          variant="outlined"
          density="comfortable"
          :hint="isRegister ? 'От 8 до 128 символов' : undefined"
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

        <router-link
          v-if="!isRegister"
          :to="{ name: ROUTE_NAMES.forgotPassword, query: form.email ? { email: form.email } : {} }"
          class="auth-view__link auth-view__forgot"
        >
          Забыли пароль?
        </router-link>

        <v-text-field
          v-if="isRegister"
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

        <!-- Согласие — отдельной галочкой, по умолчанию не отмечено; тексты — в новой
             вкладке, чтобы не потерять заполненную форму. -->
        <div v-if="isRegister" class="auth-view__consent">
          <v-checkbox
            v-model="form.consent"
            density="compact"
            color="primary"
            hide-details="auto"
            :error-messages="fieldErrors.consent || undefined"
            :disabled="isSubmitting"
          >
            <template #label>
              <span class="auth-view__consent-label">
                Даю
                <a
                  :href="consentHref"
                  target="_blank"
                  rel="noopener"
                  class="auth-view__link"
                  @click.stop
                >
                  согласие на обработку персональных данных</a
                >
                и принимаю
                <a
                  :href="privacyHref"
                  target="_blank"
                  rel="noopener"
                  class="auth-view__link"
                  @click.stop
                >
                  политику их обработки</a
                >
              </span>
            </template>
          </v-checkbox>
        </div>

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
          {{ texts.submit }}
        </v-btn>
      </form>

      <p class="auth-view__switch">
        {{ texts.switchQuestion }}
        <router-link :to="switchLocation" replace class="auth-view__link">
          {{ texts.switchAction }}
        </router-link>
      </p>

      <v-btn variant="text" size="small" class="auth-view__guest" @click="continueAsGuest">
        Продолжить без входа
      </v-btn>
    </div>
  </div>
</template>

<style src="./auth-view.css"></style>
