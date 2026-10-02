<script setup lang="ts">
type ViewMode = '2d' | '3d';
type MapStyle = 'map' | 'satellite';

defineProps<{
  viewMode: ViewMode;
  mapStyle: MapStyle;
  followCamera: boolean;
}>();

const emit = defineEmits<{
  'update:viewMode': [value: ViewMode];
  'update:mapStyle': [value: MapStyle];
  'update:followCamera': [value: boolean];
}>();
</script>

<template>
  <div class="map-controls">
    <v-btn
      :color="followCamera ? 'primary' : undefined"
      icon="mdi-crosshairs-gps"
      variant="tonal"
      @click="emit('update:followCamera', !followCamera)"
      size="small"
    />

    <v-btn
      :color="viewMode === '2d' ? 'primary' : undefined"
      icon="mdi-map-outline"
      variant="tonal"
      @click="emit('update:viewMode', '2d')"
      size="small"
    />

    <v-btn
      :color="viewMode === '3d' ? 'primary' : undefined"
      icon="mdi-axis-z-rotate-clockwise"
      variant="tonal"
      @click="emit('update:viewMode', '3d')"
      size="small"
    />

    <v-btn-toggle
      :model-value="mapStyle"
      mandatory
      density="comfortable"
      divided
      variant="tonal"
      selected-class="text-primary"
      @update:model-value="emit('update:mapStyle', $event as MapStyle)"
    >
      <v-btn value="map" size="small"> Схема </v-btn>
      <v-btn value="satellite" size="small"> Спутник </v-btn>
    </v-btn-toggle>
  </div>
</template>

<style scoped>
.map-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
@media (max-width: 600px) {
  .map-controls {
    width: 100%;
    gap: 6px;
  }
  .map-controls > .v-btn {
    flex: 0 0 32px;
    width: 32px;
    height: 32px;
  }
  .map-controls :deep(.v-btn-toggle) {
    flex: 1;
    min-width: 0;
    height: 32px;
  }
  .map-controls :deep(.v-btn-toggle .v-btn) {
    flex: 1;
    min-width: 0;
    height: 32px;
  }
}
</style>
