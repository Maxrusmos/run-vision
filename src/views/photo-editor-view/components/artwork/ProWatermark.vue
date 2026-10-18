<script setup lang="ts">
/**
 * Водяные знаки поверх карточки, пока на ней Pro-оформление, а подписки нет: посмотреть
 * можно, а скриншот или запись экрана выйдут с «RunVision Pro» по всей карточке.
 * Сохранить такую карточку редактор не даст. Поверх всех слоёв, касания пропускает.
 */
/** Одна надпись по центру плитки 200×110 (повёрнутая целиком помещается — не обрезается). */
const TILE = (() => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="110">` +
    `<text x="100" y="60" text-anchor="middle" transform="rotate(-24 100 55)" ` +
    `font-family="Inter,Arial,sans-serif" font-size="14" font-weight="800" letter-spacing="1" ` +
    `fill="#fff" fill-opacity="0.5" stroke="#000" stroke-opacity="0.35" stroke-width="0.8" ` +
    `paint-order="stroke">RunVision PRO</text></svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  // Второй слой со сдвигом на полплитки — надписи в шахматном порядке, без пустых полос.
  return { backgroundImage: `${url}, ${url}`, backgroundPosition: '0 0, 100px 55px' };
})();
</script>

<template>
  <div class="pro-watermark" :style="TILE" aria-hidden="true">
    <span class="pro-watermark__badge">
      <v-icon icon="mdi-crown" size="14" />
      Pro-оформление · сохранить можно с Pro
    </span>
  </div>
</template>

<style scoped>
.pro-watermark {
  position: absolute;
  inset: 0;
  z-index: 15;
  display: flex;
  /* Плашка внизу — название карточки сверху не закрывает. */
  align-items: flex-end;
  justify-content: center;
  border-radius: inherit;
  background-repeat: repeat;
  background-size: 200px 110px;
  pointer-events: none;
}

.pro-watermark__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgb(0 0 0 / 55%);
  color: #ffd76a;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
