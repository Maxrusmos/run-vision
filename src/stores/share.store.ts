import { defineStore } from 'pinia';
import { ref } from 'vue';

import type {
  PhotoTemplateId,
  ShareType,
} from '@/entities/activity/model/activity-share/activity-share.types';

export const useShareStore = defineStore('share', () => {
  const shareType = ref<ShareType>('photo');
  const photoTemplateId = ref<PhotoTemplateId>('minimal');

  function setShareType(value: ShareType) {
    shareType.value = value;
  }

  function setPhotoTemplate(value: PhotoTemplateId) {
    photoTemplateId.value = value;
  }

  return {
    shareType,
    photoTemplateId,
    setShareType,
    setPhotoTemplate,
  };
});
