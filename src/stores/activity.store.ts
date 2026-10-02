import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { IActivity } from '@/entities/activity/model/activity.types';

export const useActivityStore = defineStore('activity', () => {
  const activity = ref<IActivity | null>(null);

  function setActivity(value: IActivity) {
    activity.value = value;
  }

  function clearActivity() {
    activity.value = null;
  }

  return {
    activity,
    setActivity,
    clearActivity,
  };
});
