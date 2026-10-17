<script setup lang="ts">
import { computed } from 'vue';
import type { RoutePoint } from '@/entities/activity/lib/route-projection';
import {
  ROUTE_FLAG,
  getFinishFlagShape,
  getFlagPopTransform,
  getKmFlagShape,
} from '@/entities/activity/model/activity-share/route-flags';

/**
 * Флажки на треке (SVG-фрагмент): отметки километров, кольцо старта и клетчатый
 * флажок финиша. Размеры — в единицах слоя трека (ширина карточки = 1000),
 * `unit` — пикселей в единице. Флажки «стоят» в экранных координатах —
 * при наклоне карты они остаются вертикальными. Геометрия — общая с кадрами видео
 * (`route-flags.ts`).
 */
const props = defineProps<{
  kmPoints: (RoutePoint & { km: number })[];
  start: RoutePoint | null;
  finish: RoutePoint | null;
  startFinish: boolean;
  textColor: string;
  backgroundColor: string;
  unit: number;
  /**
   * Видео: масштаб флажка (километр или финиш) — 0, пока точка не дошла, потом
   * «выпрыгивает». Без него (фото) флажки видны все.
   */
  flagScale?: ((flag: number | 'finish') => number) | null;
}>();

function scaleOf(flag: number | 'finish'): number {
  return props.flagScale ? props.flagScale(flag) : 1;
}

/** Флажок с масштабом от основания древка (1 — без преобразования). */
function popTransform(point: RoutePoint, scale: number): string | undefined {
  return scale === 1 ? undefined : getFlagPopTransform(point, scale);
}

// Видео: флажок, до которого точка ещё не дошла (масштаб 0), не рисуется.
const kmFlags = computed(() =>
  props.kmPoints.flatMap((point) => {
    const scale = scaleOf(point.km);
    if (scale <= 0) return [];
    return [
      {
        km: point.km,
        shape: getKmFlagShape(point, String(point.km), props.unit),
        transform: popTransform(point, scale),
      },
    ];
  }),
);

const finishFlag = computed(() => {
  const finish = props.finish;
  const scale = scaleOf('finish');
  if (!finish || scale <= 0) return null;
  return { shape: getFinishFlagShape(finish, props.unit), transform: popTransform(finish, scale) };
});
</script>

<template>
  <g>
    <g v-for="{ km, shape, transform } in kmFlags" :key="km" :transform="transform">
      <line
        :x1="shape.pole.x1"
        :y1="shape.pole.y1"
        :x2="shape.pole.x2"
        :y2="shape.pole.y2"
        :stroke="textColor"
        :stroke-width="ROUTE_FLAG.poleWidth * unit"
        opacity="0.75"
      />
      <rect
        :x="shape.banner.x"
        :y="shape.banner.y"
        :width="shape.banner.width"
        :height="shape.banner.height"
        :rx="shape.banner.radius"
        :fill="textColor"
        opacity="0.88"
      />
      <text
        :x="shape.text.x"
        :y="shape.text.y"
        :font-size="shape.text.size"
        font-weight="700"
        text-anchor="middle"
        :fill="backgroundColor"
      >
        {{ shape.text.label }}
      </text>
    </g>

    <template v-if="startFinish">
      <circle
        v-if="start"
        :cx="start.x"
        :cy="start.y"
        :r="ROUTE_FLAG.startRing * unit"
        fill="none"
        :stroke="textColor"
        :stroke-width="ROUTE_FLAG.startRingWidth * unit"
      />
      <g v-if="finishFlag" :transform="finishFlag.transform">
        <line
          :x1="finishFlag.shape.pole.x1"
          :y1="finishFlag.shape.pole.y1"
          :x2="finishFlag.shape.pole.x2"
          :y2="finishFlag.shape.pole.y2"
          :stroke="textColor"
          :stroke-width="ROUTE_FLAG.poleWidth * unit"
        />
        <rect
          :x="finishFlag.shape.frame.x"
          :y="finishFlag.shape.frame.y"
          :width="finishFlag.shape.frame.width"
          :height="finishFlag.shape.frame.height"
          fill="none"
          :stroke="textColor"
          :stroke-width="ROUTE_FLAG.frameWidth * unit"
        />
        <rect
          v-for="(cell, index) in finishFlag.shape.cells"
          :key="index"
          :x="cell.x"
          :y="cell.y"
          :width="cell.width"
          :height="cell.height"
          :fill="cell.dark ? textColor : backgroundColor"
        />
      </g>
    </template>
  </g>
</template>
