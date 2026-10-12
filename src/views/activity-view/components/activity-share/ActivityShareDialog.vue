<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDisplay } from 'vuetify';
import PhotoTemplateCarousel, {
  type PhotoTemplate,
} from '@/views/activity-view/components/activity-share/activity-photo-settings/PhotoTemplateCarousel.vue';
import type { IActivity } from '@/entities/activity/model/activity.types.ts';
import ActivitySharePreview from '@/views/activity-view/components/activity-share/activity-photo-settings/activity-share-preview/ActivitySharePreview.vue';
type ShareType = 'photo' | 'video';

export type ActivityShareSettings = {
  shareType: ShareType;
  photoTemplate: PhotoTemplate;
};

const props = defineProps<{
  modelValue: boolean;
  activity: IActivity;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [settings: ActivityShareSettings];
}>();

const { smAndDown } = useDisplay();

const shareType = ref<ShareType>('photo');
const photoTemplate = ref<PhotoTemplate>('minimal');

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const showPreview = ref(false);

function confirm() {
  showPreview.value = true;
  // emit('confirm', {
  //   shareType: shareType.value,
  //   photoTemplate: photoTemplate.value,
  // });
  //
  // isOpen.value = false;
}
</script>

<template>
  <v-dialog v-model="isOpen" :fullscreen="smAndDown" :max-width="720" scrollable>
    <v-card class="share-card">
      <header class="share-header">
        <div class="share-heading">
          <div class="share-icon">
            <v-icon icon="mdi-share-variant-outline" size="24" color="primary" />
          </div>

          <div>
            <h2 class="share-title">Поделиться тренировкой</h2>
            <p class="share-subtitle">Создай фото или видео маршрута</p>
          </div>
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          density="comfortable"
          aria-label="Закрыть"
          @click="isOpen = false"
        />
      </header>

      <v-divider />

      <div class="share-content">
        <section class="settings-section">
          <h3 class="section-title">Что создаём?</h3>
          <div class="content-type-options">
            <button
              type="button"
              class="content-type-option"
              :class="{
                'content-type-option--active': shareType === 'photo',
              }"
              :aria-pressed="shareType === 'photo'"
              @click="shareType = 'photo'"
            >
              <v-icon icon="mdi-image-outline" size="28" />
              <span class="content-type-title">Фото</span>
              <span class="content-type-hint"> Статичный кадр тренировки </span>
              <v-icon
                v-if="shareType === 'photo'"
                class="content-type-check"
                icon="mdi-check-circle"
                size="20"
              />
            </button>

            <button
              type="button"
              class="content-type-option"
              :class="{
                'content-type-option--active': shareType === 'video',
              }"
              :aria-pressed="shareType === 'video'"
              @click="shareType = 'video'"
            >
              <v-icon icon="mdi-movie-open-outline" size="28" />
              <span class="content-type-title">Видео</span>
              <span class="content-type-hint"> Анимация прохождения маршрута </span>
              <v-icon
                v-if="shareType === 'video'"
                class="content-type-check"
                icon="mdi-check-circle"
                size="20"
              />
            </button>
          </div>
        </section>
        <v-divider />
        <PhotoTemplateCarousel
          v-if="shareType === 'photo'"
          v-model="photoTemplate"
          :activity="props.activity"
        />
        <section v-else class="video-placeholder">
          <v-icon icon="mdi-movie-open-outline" size="40" color="primary" />
          <h3>Создание видео</h3>
          <p>Настройки видео добавим позже.</p>
        </section>
      </div>

      <v-divider />

      <footer class="share-footer">
        <v-btn variant="tonal" @click="isOpen = false"> Отмена </v-btn>
        <v-btn color="primary" variant="flat" class="continue-button" @click="confirm">
          Продолжить
        </v-btn>
      </footer>
    </v-card>
  </v-dialog>

  <ActivitySharePreview
    v-if="showPreview && shareType === 'photo'"
    :activity="props.activity"
    :template="photoTemplate"
    @back="showPreview = false"
  />
</template>

<style scoped>
.share-card {
  display: flex;
  flex-direction: column;
  max-height: min(760px, 90dvh);
  overflow: hidden;
  border-radius: 16px;
}

.share-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 18px;
}

.share-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.share-icon {
  display: grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 10px;
  background: var(--app-primary-bg);
  color: var(--app-primary);
}

.share-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.share-subtitle {
  margin: 0;
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 12px;
}

.share-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.content-type-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.content-type-option {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 104px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 7px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
  color: var(--app-on-surface);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.content-type-option:hover {
  background: var(--app-hover-bg);
}

.content-type-option--active {
  border: 2px solid var(--app-primary);
  background: var(--app-primary-bg);
  color: var(--app-primary);
}

.content-type-option--active .content-type-hint {
  color: color-mix(in srgb, var(--app-primary) 78%, var(--app-on-surface));
}

.content-type-title {
  font-size: 14px;
  font-weight: 600;
}

.content-type-hint {
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 12px;
  line-height: 1.4;
}

.content-type-check {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--app-primary);
}

.video-placeholder {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  text-align: center;
}

.video-placeholder h3 {
  font-size: 15px;
  font-weight: 600;
}

.video-placeholder p {
  color: color-mix(in srgb, var(--app-on-surface) 65%, transparent);
  font-size: 12px;
}

.share-footer {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 18px;
  background: var(--app-surface);
}

@media (max-width: 600px) {
  .share-card {
    width: 100%;
    height: 100%;
    max-height: 100dvh;
    border-radius: 0;
  }

  .share-header {
    padding: 10px 14px;
  }

  .share-title {
    font-size: 15px;
  }

  .settings-section {
    gap: 12px;
    padding: 12px;
  }

  .content-type-option {
    min-height: 100px;
    padding: 10px;
  }

  .share-footer {
    padding: 10px 14px max(10px, env(safe-area-inset-bottom));
  }

  .share-footer > .v-btn {
    flex: 1 1 0;
    min-width: 0;
  }
}
</style>
