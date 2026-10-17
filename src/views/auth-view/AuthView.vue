<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ROUTE_NAMES } from '@/router/routes';
import { getSafeRedirect } from '@/router/redirect';
import { useAuthStore } from '@/stores/auth.store';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import { validateEmail, validatePassword } from '@/entities/user';

type AuthMode = 'login' | 'register';
type FieldName = 'email' | 'password' | 'passwordConfirm';

const props = defineProps<{ mode: AuthMode }>();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isRegister = computed(() => props.mode === 'register');

const form = reactive({ email: '', password: '', passwordConfirm: '' });
const fieldErrors = reactive<Record<FieldName, string>>({
  email: '',
  password: '',
  passwordConfirm: '',
});
const formError = ref('');
const isSubmitting = ref(false);
const isPasswordVisible = ref(false);
// До первой отправки не ругаемся на недописанные поля.
const wasSubmitted = ref(false);

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
  const fields: FieldName[] = ['email', 'password', 'passwordConfirm'];
  for (const field of fields) fieldErrors[field] = validateField(field);
  return fields.every((field) => !fieldErrors[field]);
}

// После первой отправки ошибки обновляются на ходу (и снимаются серверные).
watch(
  () => [form.email, form.password, form.passwordConfirm],
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
    if (field === 'email' || field === 'password') {
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

// Автозаполнение (связка ключей iOS, Google) вставляет значение, иногда не сообщая о нём
// событием input: подпись оставалась внутри поля поверх текста. Ловим его по анимации
// из CSS (`rv-autofill`), забираем значение в форму — подпись уходит наверх.
const AUTOFILL_FIELDS: Record<string, FieldName> = {
  email: 'email',
  password: 'password',
  'password-confirm': 'passwordConfirm',
};

function handleAutofill(event: AnimationEvent) {
  if (!event.animationName.startsWith('rv-autofill')) return;
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const field = AUTOFILL_FIELDS[input.name];
  if (field && input.value && form[field] !== input.value) form[field] = input.value;
}

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
    if (isRegister.value) await authStore.register(credentials);
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

<style scoped>
.auth-view {
  display: flex;
  flex: 1 1 auto;
  justify-content: center;
  min-height: 0;
  padding: 24px 16px;
  overflow-y: auto;
}

.auth-view__content {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
  margin: auto 0;
}

.auth-view__title {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 600;
}

.auth-view__subtitle {
  margin: 0 0 20px;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 14px;
  line-height: 1.5;
}

.auth-view__form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* iOS приближает страницу, если шрифт поля меньше 16px. */
.auth-view__form :deep(input) {
  font-size: 16px;
}

/* Автозаполнение красит поле жёлтым (iOS Safari, Chrome), и заливка закрывала подпись
   на рамке. Заливку перекрываем цветом фона (тень внутрь — её Safari не игнорирует)
   и откладываем переходом «на вечность», текст — цвета темы; анимация rv-autofill
   сообщает скрипту, что поле заполнено (см. handleAutofill). */
.auth-view__form :deep(input:-webkit-autofill) {
  -webkit-text-fill-color: var(--app-on-surface);
  caret-color: var(--app-on-surface);
  -webkit-box-shadow: 0 0 0 1000px var(--app-background) inset;
  box-shadow: 0 0 0 1000px var(--app-background) inset;
  transition:
    background-color 600000s 0s,
    color 600000s 0s;
  animation: rv-autofill 1ms;
}

.auth-view__form :deep(input:autofill) {
  box-shadow: 0 0 0 1000px var(--app-background) inset;
  transition:
    background-color 600000s 0s,
    color 600000s 0s;
  animation: rv-autofill 1ms;
}

@keyframes rv-autofill {
  from {
    opacity: 1;
  }
  to {
    opacity: 1;
  }
}

/* Подпись на рамке — всегда поверх поля ввода. */
.auth-view__form :deep(.v-field__outline) {
  z-index: 1;
}

.auth-view__eye {
  color: color-mix(in srgb, var(--app-on-surface) 70%, transparent);
}

.auth-view__alert {
  margin-bottom: 12px;
}

.auth-view__submit {
  letter-spacing: 0;
  text-transform: none;
}

.auth-view__switch {
  margin: 20px 0 4px;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 14px;
  text-align: center;
}

.auth-view__link {
  color: var(--app-primary);
  font-weight: 600;
  text-decoration: none;
}

.auth-view__guest {
  align-self: center;
  color: color-mix(in srgb, var(--app-on-surface) 60%, transparent) !important;
  letter-spacing: 0;
  text-transform: none;
}
</style>
