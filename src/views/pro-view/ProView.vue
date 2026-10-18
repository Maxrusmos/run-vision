<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import StepPage from '@/shared/ui/StepPage.vue';
import PageTopRow from '@/views/account-view/components/PageTopRow.vue';
import { ROUTE_NAMES } from '@/router/routes';
import { useAuthStore } from '@/stores/auth.store';
import { isApiError, UNKNOWN_ERROR_MESSAGE } from '@/shared/api';
import {
  billingApi,
  formatPlanUntil,
  formatRubles,
  getMonthlyEquivalentKopecks,
  getYearSavingPercent,
  type PaymentProviderId,
  type PlanPeriod,
  type ProPlan,
} from '@/entities/billing';

/**
 * «RunVision Pro»: статус, тарифы «месяц / год» и оплата. Оплата — на странице платёжного
 * сервиса (сейчас тестового, без денег), после неё — `#/pro/return`.
 */
const router = useRouter();
const authStore = useAuthStore();

const plans = ref<ProPlan[]>([]);
const provider = ref<PaymentProviderId>('none');
const selected = ref<PlanPeriod>('year');
const loadError = ref('');
const payError = ref('');
const isLoading = ref(true);
const isPaying = ref(false);

const user = computed(() => authStore.user);
const isPro = computed(() => user.value?.plan === 'pro');
const selectedPlan = computed(() => plans.value.find((plan) => plan.id === selected.value));
const yearSaving = computed(() => getYearSavingPercent(plans.value));

const statusText = computed(() => {
  if (!user.value) return 'Войдите, чтобы подключить Pro.';
  if (isPro.value) return `Pro ${formatPlanUntil(user.value.planExpiresAt)}.`;
  return 'Сейчас — бесплатный тариф.';
});

const payLabel = computed(() => {
  const price = selectedPlan.value ? formatRubles(selectedPlan.value.priceKopecks) : '';
  if (!user.value) return 'Войти и купить';
  return `${isPro.value ? 'Продлить' : 'Оплатить'} ${price}`.trim();
});

async function load() {
  isLoading.value = true;
  loadError.value = '';
  try {
    const result = await billingApi.fetchPlans();
    plans.value = result.plans;
    provider.value = result.provider;
  } catch (error) {
    loadError.value = isApiError(error) ? error.message : UNKNOWN_ERROR_MESSAGE;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void load();
  // Срок Pro мог измениться на другом устройстве.
  void authStore.refreshUser();
});

function goBack() {
  if (typeof window.history.state?.back === 'string') router.back();
  else void router.replace('/');
}

async function pay() {
  if (isPaying.value || !selectedPlan.value) return;
  if (!user.value) {
    void router.push({ name: ROUTE_NAMES.login, query: { redirect: '/pro' } });
    return;
  }
  isPaying.value = true;
  payError.value = '';
  try {
    const { confirmationUrl } = await billingApi.checkout(selected.value);
    // Страница оплаты сервиса (у тестового — наш же экран).
    window.location.assign(confirmationUrl);
  } catch (error) {
    payError.value = isApiError(error) ? error.message : UNKNOWN_ERROR_MESSAGE;
    isPaying.value = false;
  }
}
</script>

<template>
  <StepPage max-width="520px">
    <PageTopRow back-label="Назад" @back="goBack">
      <h1 class="pro-view__title">RunVision Pro</h1>
      <p class="pro-view__status">{{ statusText }}</p>
    </PageTopRow>

    <v-alert
      v-if="provider === 'mock'"
      type="info"
      variant="tonal"
      density="compact"
      icon="mdi-flask-outline"
      class="pro-view__note"
    >
      Тестовый режим: вместо платёжного сервиса — страница-имитация, деньги не списываются.
    </v-alert>

    <section class="pro-view__features">
      <h2 class="pro-view__heading">Что даёт Pro</h2>
      <p class="pro-view__text">
        Pro-возможности появятся в ближайших обновлениях — оплаченный срок начнёт работать на них
        сразу.
      </p>
    </section>

    <div v-if="isLoading" class="pro-view__plans" aria-busy="true">
      <v-skeleton-loader v-for="index in 2" :key="index" type="list-item-two-line" />
    </div>

    <v-alert v-else-if="loadError" type="error" variant="tonal">
      {{ loadError }}
      <template #append>
        <v-btn variant="text" @click="load">Повторить</v-btn>
      </template>
    </v-alert>

    <div v-else class="pro-view__plans" role="radiogroup" aria-label="Период подписки">
      <button
        v-for="plan in plans"
        :key="plan.id"
        type="button"
        role="radio"
        class="pro-view__plan"
        :class="{ 'pro-view__plan--active': selected === plan.id }"
        :aria-checked="selected === plan.id"
        @click="selected = plan.id"
      >
        <span class="pro-view__plan-head">
          <span class="pro-view__plan-title">{{ plan.title }}</span>
          <span v-if="plan.id === 'year' && yearSaving" class="pro-view__badge">
            −{{ yearSaving }}%
          </span>
        </span>
        <span class="pro-view__plan-price">{{ formatRubles(plan.priceKopecks) }}</span>
        <span class="pro-view__plan-hint">
          {{
            plan.id === 'year'
              ? `${formatRubles(getMonthlyEquivalentKopecks(plan))} в месяц`
              : `на ${plan.days} дней`
          }}
        </span>
      </button>
    </div>

    <p class="pro-view__fine">
      Разовый платёж без автопродления: срок Pro прибавится к текущему. Продлить можно в любой
      момент.
    </p>

    <template #footer>
      <v-alert
        v-if="payError || provider === 'none'"
        type="warning"
        variant="tonal"
        density="compact"
        class="pro-view__pay-error"
      >
        {{ payError || 'Оплата пока недоступна' }}
      </v-alert>
      <v-btn
        color="primary"
        variant="flat"
        size="large"
        :loading="isPaying"
        :disabled="isLoading || !!loadError || provider === 'none' || !selectedPlan"
        @click="pay"
      >
        {{ payLabel }}
      </v-btn>
    </template>
  </StepPage>
</template>

<style scoped>
.pro-view__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
}

.pro-view__status {
  margin: 2px 0 0;
  color: color-mix(in srgb, var(--app-on-surface) 60%, transparent);
  font-size: 13px;
}

.pro-view__note {
  font-size: 13px;
  line-height: 1.45;
}

.pro-view__heading {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
}

.pro-view__text,
.pro-view__fine {
  margin: 0;
  color: color-mix(in srgb, var(--app-on-surface) 70%, transparent);
  font-size: 14px;
  line-height: 1.5;
}

.pro-view__fine {
  font-size: 12px;
}

.pro-view__plans {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.pro-view__plan {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px;
  color: var(--app-on-surface);
  text-align: left;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.pro-view__plan--active {
  border-color: var(--app-primary);
  outline: 1px solid var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
}

.pro-view__plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  align-self: stretch;
}

.pro-view__plan-title {
  font-size: 14px;
  font-weight: 600;
}

.pro-view__badge {
  padding: 1px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 22%, transparent);
  color: var(--app-primary);
  font-size: 11px;
  font-weight: 700;
}

.pro-view__plan-price {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.pro-view__plan-hint {
  color: color-mix(in srgb, var(--app-on-surface) 60%, transparent);
  font-size: 12px;
}

/* Кнопка — во всю ширину подвала, предупреждение — над ней. */
.pro-view__pay-error {
  flex: 1 1 100%;
}

:deep(.step-page__footer) {
  flex-wrap: wrap;
}
</style>
