<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { LEGAL_DOCUMENTS, type LegalDocumentId } from '@/shared/config/legal-documents';
import { LEGAL_HAS_PLACEHOLDERS } from '@/shared/config/legal';
import { ROUTE_NAMES } from '@/router/routes';
import PageTopRow from '@/views/account-view/components/PageTopRow.vue';

/** Политика обработки персональных данных и согласие — тексты из `legal-documents.ts`. */
const props = defineProps<{ document: LegalDocumentId }>();

const router = useRouter();
const content = computed(() => LEGAL_DOCUMENTS[props.document]);
// Разработчику — напоминание заполнить реквизиты; в собранном сайте плашки нет.
const showDraftNotice = import.meta.env.DEV && LEGAL_HAS_PLACEHOLDERS;

function goBack() {
  // Документ обычно открыт в новой вкладке со страницы регистрации — тогда истории нет.
  if (typeof window.history.state?.back === 'string') router.back();
  else void router.replace({ name: ROUTE_NAMES.register });
}
</script>

<template>
  <article class="legal-view">
    <PageTopRow back-label="Назад" @back="goBack">
      <h1 class="legal-view__title">{{ content.title }}</h1>
    </PageTopRow>
    <p class="legal-view__meta">{{ content.meta }}</p>

    <v-alert
      v-if="showDraftNotice"
      type="warning"
      variant="tonal"
      density="compact"
      class="legal-view__draft"
    >
      Черновик: реквизиты оператора — заглушки. Заполните их в
      <code>src/shared/config/legal.ts</code> перед запуском.
    </v-alert>

    <section v-for="(section, index) in content.sections" :key="index" class="legal-view__section">
      <h2 v-if="section.heading" class="legal-view__heading">{{ section.heading }}</h2>
      <p v-for="(paragraph, line) in section.paragraphs" :key="line" class="legal-view__text">
        {{ paragraph }}
      </p>
    </section>

    <p class="legal-view__other">
      <router-link
        v-if="document === 'privacy'"
        :to="{ name: ROUTE_NAMES.consent }"
        class="legal-view__link"
      >
        Согласие на обработку персональных данных
      </router-link>
      <router-link v-else :to="{ name: ROUTE_NAMES.privacy }" class="legal-view__link">
        Политика обработки персональных данных
      </router-link>
    </p>
  </article>
</template>

<style scoped>
.legal-view {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 16px 16px 32px;
  overflow-y: auto;
}

.legal-view__title {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  line-height: 1.3;
}

.legal-view__meta {
  margin: 8px 0 16px 50px;
  color: color-mix(in srgb, var(--app-on-surface) 60%, transparent);
  font-size: 13px;
}

.legal-view__draft {
  margin-bottom: 16px;
}

.legal-view__section + .legal-view__section {
  margin-top: 16px;
}

.legal-view__heading {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
}

.legal-view__text {
  margin: 0 0 8px;
  color: color-mix(in srgb, var(--app-on-surface) 85%, transparent);
  font-size: 14px;
  line-height: 1.55;
}

.legal-view__other {
  margin: 24px 0 0;
  font-size: 14px;
}

.legal-view__link {
  color: var(--app-primary);
}
</style>
