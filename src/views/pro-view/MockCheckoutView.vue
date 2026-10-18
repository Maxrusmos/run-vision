<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ROUTE_NAMES } from '@/router/routes';
import { useAuthStore } from '@/stores/auth.store';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import { billingApi, formatRubles, type Payment } from '@/entities/billing';

/**
 * Тестовая «страница оплаты» (`PAYMENT_PROVIDER=mock`) — вместо страницы платёжного сервиса.
 * Кнопки сообщают серверу итог (как вебхук сервиса), дальше — тот же экран возврата.
 */
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const paymentId = computed(() =>
  typeof route.query.payment === 'string' ? route.query.payment : '',
);
const payment = ref<Payment | null>(null);
const error = ref('');
const busy = ref<'succeeded' | 'canceled' | null>(null);

const title = computed(() =>
  payment.value?.period === 'year' ? 'RunVision Pro — год' : 'RunVision Pro — месяц',
);

onMounted(async () => {
  try {
    payment.value = await billingApi.fetchPayment(paymentId.value);
    // Уже оплачен или отменён — сразу к итогу.
    if (payment.value.status !== 'pending') await goToResult();
  } catch (loadError) {
    error.value = isApiError(loadError) ? loadError.message : UNKNOWN_ERROR_MESSAGE;
  }
});

function goToResult() {
  return router.replace({ name: ROUTE_NAMES.proReturn, query: { payment: paymentId.value } });
}

async function complete(result: 'succeeded' | 'canceled') {
  if (busy.value) return;
  busy.value = result;
  error.value = '';
  try {
    const response = await billingApi.completeMockPayment(paymentId.value, result);
    authStore.setUser(response.user);
    await goToResult();
  } catch (completeError) {
    error.value = isApiError(completeError) ? completeError.message : UNKNOWN_ERROR_MESSAGE;
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div class="mock-checkout">
    <div class="mock-checkout__card">
      <p class="mock-checkout__badge">
        <v-icon icon="mdi-flask-outline" size="16" />
        Тестовая оплата
      </p>

      <template v-if="payment">
        <p class="mock-checkout__title">{{ title }}</p>
        <p class="mock-checkout__amount">{{ formatRubles(payment.amountKopecks) }}</p>
        <p class="mock-checkout__text">
          Это имитация страницы платёжного сервиса: карта не нужна, деньги не списываются.
        </p>
      </template>
      <v-skeleton-loader v-else-if="!error" type="list-item-three-line" />

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="compact"
        class="mock-checkout__error"
      >
        {{ error }}
      </v-alert>

      <div class="mock-checkout__actions">
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          block
          :loading="busy === 'succeeded'"
          :disabled="!payment || busy !== null"
          @click="complete('succeeded')"
        >
          Оплатить
        </v-btn>
        <v-btn
          variant="tonal"
          size="large"
          block
          :loading="busy === 'canceled'"
          :disabled="!payment || busy !== null"
          @click="complete('canceled')"
        >
          Отменить оплату
        </v-btn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mock-checkout {
  display: flex;
  flex: 1 1 auto;
  justify-content: center;
  min-height: 0;
  padding: 24px 16px;
  overflow-y: auto;
}

.mock-checkout__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 400px;
  margin: auto 0;
  padding: 20px;
  border: 1px dashed var(--app-border);
  border-radius: 16px;
}

.mock-checkout__badge {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 6px;
  margin: 0 0 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, #f5a623 22%, transparent);
  color: #f5a623;
  font-size: 12px;
  font-weight: 600;
}

.mock-checkout__title {
  margin: 0;
  font-size: 15px;
}

.mock-checkout__amount {
  margin: 0;
  font-size: 34px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.mock-checkout__text {
  margin: 0 0 8px;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 13px;
  line-height: 1.5;
}

.mock-checkout__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}
</style>
