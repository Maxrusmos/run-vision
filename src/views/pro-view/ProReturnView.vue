<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { ROUTE_NAMES } from '@/router/routes';
import { useAuthStore } from '@/stores/auth.store';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import { billingApi, formatPlanUntil, type Payment } from '@/entities/billing';

/**
 * Возврат после оплаты (`#/pro/return?payment=…`). Уведомление сервиса может прийти чуть
 * позже возврата — опрашиваем платёж, пока он `pending`, потом обновляем тариф.
 */
const POLL_MS = 1500;
const POLL_LIMIT_MS = 60_000;

const route = useRoute();
const authStore = useAuthStore();

const paymentId = computed(() =>
  typeof route.query.payment === 'string' ? route.query.payment : '',
);
const payment = ref<Payment | null>(null);
const error = ref('');
const isTimedOut = ref(false);
let timer: number | undefined;
const startedAt = Date.now();

const until = computed(() =>
  authStore.user?.plan === 'pro' ? formatPlanUntil(authStore.user.planExpiresAt) : '',
);

async function poll() {
  try {
    payment.value = await billingApi.fetchPayment(paymentId.value);
  } catch (loadError) {
    error.value = isApiError(loadError) ? loadError.message : UNKNOWN_ERROR_MESSAGE;
    return;
  }
  if (payment.value.status === 'succeeded') {
    await authStore.refreshUser();
    return;
  }
  if (payment.value.status === 'pending') {
    if (Date.now() - startedAt > POLL_LIMIT_MS) isTimedOut.value = true;
    else timer = window.setTimeout(poll, POLL_MS);
  }
}

onMounted(() => void poll());
onBeforeUnmount(() => window.clearTimeout(timer));
</script>

<template>
  <div class="pro-return">
    <div class="pro-return__content">
      <template v-if="error">
        <v-icon icon="mdi-alert-circle-outline" size="48" class="pro-return__icon" />
        <h1 class="pro-return__title">Не удалось проверить оплату</h1>
        <p class="pro-return__text">{{ error }}</p>
      </template>

      <template v-else-if="payment?.status === 'succeeded'">
        <v-icon icon="mdi-check-circle" size="56" color="success" class="pro-return__icon" />
        <h1 class="pro-return__title">Pro подключён</h1>
        <p class="pro-return__text">Спасибо! Pro действует {{ until || 'с этого момента' }}.</p>
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          block
          :to="{ name: ROUTE_NAMES.import }"
          replace
        >
          Создать карточку
        </v-btn>
      </template>

      <template v-else-if="payment?.status === 'canceled'">
        <v-icon icon="mdi-close-circle-outline" size="56" class="pro-return__icon" />
        <h1 class="pro-return__title">Оплата отменена</h1>
        <p class="pro-return__text">Деньги не списаны. Можно попробовать ещё раз.</p>
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          block
          :to="{ name: ROUTE_NAMES.pro }"
          replace
        >
          Вернуться к тарифам
        </v-btn>
      </template>

      <template v-else>
        <v-progress-circular v-if="!isTimedOut" indeterminate size="44" class="pro-return__icon" />
        <h1 class="pro-return__title">Проверяем оплату…</h1>
        <p class="pro-return__text">
          {{
            isTimedOut
              ? 'Платёжный сервис ещё не подтвердил оплату. Если деньги списались, Pro включится сам — загляните позже.'
              : 'Обычно это занимает несколько секунд.'
          }}
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pro-return {
  display: flex;
  flex: 1 1 auto;
  justify-content: center;
  min-height: 0;
  padding: 24px 16px;
  overflow-y: auto;
}

.pro-return__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
  margin: auto 0;
  text-align: center;
}

.pro-return__icon {
  margin-bottom: 12px;
}

.pro-return__title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 600;
}

.pro-return__text {
  margin: 0 0 20px;
  color: color-mix(in srgb, var(--app-on-surface) 70%, transparent);
  font-size: 14px;
  line-height: 1.5;
}
</style>
