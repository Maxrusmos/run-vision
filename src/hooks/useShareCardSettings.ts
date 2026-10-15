import { onScopeDispose, ref } from 'vue';
import type {
  ShareCardSettings,
  ShareColorKey,
  ShareColorPreset,
  ShareStatKey,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  DEFAULT_SHARE_PRESET_ID,
  findSharePreset,
  findSharePresetByColors,
} from '@/entities/activity/model/activity-share/activity-share-presets';
import { DEFAULT_VISIBLE_SHARE_STATS } from '@/entities/activity/model/activity-share/activity-share-stat-options';

export const STAT_SPACING_MIN = 4;
export const STAT_SPACING_MAX = 24;

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function createSettings(preset: ShareColorPreset): ShareCardSettings {
  return {
    backgroundColor: preset.background,
    routeColor: preset.route,
    textColor: preset.text,
    presetId: preset.id,
    visibleStats: [...DEFAULT_VISIBLE_SHARE_STATS],
    statWidths: {},
    transparentBackground: false,
    showStatBorders: true,
    backgroundImage: null,
    backgroundImageFit: 'cover',
    backgroundImagePosition: 'center',
    statSpacing: 12,
  };
}

/**
 * Состояние редактора карточки. Object URL фонового фото освобождается
 * при замене, удалении и уничтожении области видимости.
 */
export function useShareCardSettings(initialPresetId: string = DEFAULT_SHARE_PRESET_ID) {
  const initialPreset =
    findSharePreset(initialPresetId) ?? findSharePreset(DEFAULT_SHARE_PRESET_ID)!;

  const settings = ref<ShareCardSettings>(createSettings(initialPreset));

  function releaseBackgroundImage() {
    if (settings.value.backgroundImage) {
      URL.revokeObjectURL(settings.value.backgroundImage);
      settings.value.backgroundImage = null;
    }
  }

  onScopeDispose(releaseBackgroundImage);

  function applyPreset(preset: ShareColorPreset) {
    settings.value.routeColor = preset.route;
    settings.value.textColor = preset.text;
    settings.value.backgroundColor = preset.background;
    settings.value.presetId = preset.id;
  }

  function applyPresetById(id: string) {
    const preset = findSharePreset(id);

    if (preset) {
      applyPreset(preset);
    }
  }

  function setColor(key: ShareColorKey, value: string) {
    if (!HEX_COLOR_PATTERN.test(value)) return;

    settings.value[key] = value;
    settings.value.presetId =
      findSharePresetByColors({
        background: settings.value.backgroundColor,
        route: settings.value.routeColor,
        text: settings.value.textColor,
      })?.id ?? null;
  }

  function addStat(key: ShareStatKey) {
    if (settings.value.visibleStats.includes(key)) return;
    settings.value.visibleStats.push(key);
  }

  function removeStat(key: ShareStatKey) {
    settings.value.visibleStats = settings.value.visibleStats.filter((item) => item !== key);
  }

  function reorderStats(keys: ShareStatKey[]) {
    settings.value.visibleStats = keys;
  }

  function setStatWidth(key: ShareStatKey, width: ShareStatWidth) {
    settings.value.statWidths[key] = width;
  }

  function setStatSpacing(value: number) {
    settings.value.statSpacing = Math.min(STAT_SPACING_MAX, Math.max(STAT_SPACING_MIN, value));
  }

  function setShowStatBorders(value: boolean) {
    settings.value.showStatBorders = value;
  }

  function setTransparentBackground(value: boolean) {
    // Прозрачный фон недоступен, пока загружено фоновое фото.
    settings.value.transparentBackground = value && !settings.value.backgroundImage;
  }

  function setBackgroundImage(file: File) {
    if (!file.type.startsWith('image/')) return;

    releaseBackgroundImage();
    settings.value.backgroundImage = URL.createObjectURL(file);
    settings.value.transparentBackground = false;
  }

  return {
    settings,
    applyPresetById,
    setColor,
    addStat,
    removeStat,
    reorderStats,
    setStatWidth,
    setStatSpacing,
    setShowStatBorders,
    setTransparentBackground,
    setBackgroundImage,
    removeBackgroundImage: releaseBackgroundImage,
  };
}
