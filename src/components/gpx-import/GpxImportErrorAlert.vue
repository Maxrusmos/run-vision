<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useActivityStore } from '@/stores/activity.store';

const activityStore = useActivityStore();
const { importError } = storeToRefs(activityStore);
</script>

<template>
  <v-alert
    v-if="importError"
    type="error"
    variant="tonal"
    closable
    @click:close="activityStore.clearImportError()"
  >
    {{ importError }}
  </v-alert>
</template>
