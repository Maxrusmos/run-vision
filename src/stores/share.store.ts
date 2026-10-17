import { defineStore } from 'pinia';
import { ref } from 'vue';

import type {
  PhotoTemplateId,
  ShareType,
} from '@/entities/activity/model/activity-share/activity-share.types';
import { isVideoTemplateAvailable } from '@/entities/activity/model/activity-share/photo-templates';

export const useShareStore = defineStore('share', () => {
  const shareType = ref<ShareType>('photo');
  const photoTemplateId = ref<PhotoTemplateId>('minimal');
  /** Стиль видео — свой: не все стили фото уже есть в видео. */
  const videoTemplateId = ref<PhotoTemplateId>('minimal');

  function setShareType(value: ShareType) {
    shareType.value = value;
  }

  function setPhotoTemplate(value: PhotoTemplateId) {
    photoTemplateId.value = value;
  }

  function setVideoTemplate(value: PhotoTemplateId) {
    if (isVideoTemplateAvailable(value)) videoTemplateId.value = value;
  }

  return {
    shareType,
    photoTemplateId,
    videoTemplateId,
    setShareType,
    setPhotoTemplate,
    setVideoTemplate,
  };
});
