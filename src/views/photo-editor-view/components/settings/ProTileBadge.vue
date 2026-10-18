<script setup lang="ts">
/** Корона на превью плитки: вариант из Pro (оформление, стиль трека). */
</script>

<template>
  <span class="pro-tile-badge" title="Pro">
    <v-icon icon="mdi-crown" size="11" />
  </span>
</template>

<style scoped>
.pro-tile-badge {
  position: absolute;
  z-index: 1;
  top: 4px;
  left: 4px;
  display: grid;
  width: 17px;
  height: 17px;
  place-items: center;
  color: #ffd76a;
  border-radius: 50%;
  background: rgb(0 0 0 / 55%);
  pointer-events: none;
}
</style>
