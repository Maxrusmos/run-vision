import { onScopeDispose, ref } from 'vue';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import type {
  ShareCardSettings,
  ShareColorKey,
  ShareColorPreset,
  ShareRoutePosition,
  ShareStatKey,
  ShareStatPosition,
  ShareStatStyle,
  ShareStatWidth,
} from '@/entities/activity/model/activity-share/activity-share.types';
import {
  DEFAULT_SHARE_PRESET_ID,
  findSharePreset,
  findSharePresetByColors,
} from '@/entities/activity/model/activity-share/activity-share-presets';
import { DEFAULT_ROUTE_SCALE } from '@/entities/activity/model/activity-share/activity-share-route';
import { DEFAULT_STAT_STYLE } from '@/entities/activity/model/activity-share/activity-share-stat-styles';
import { DEFAULT_VISIBLE_SHARE_STATS } from '@/entities/activity/model/activity-share/activity-share-stat-options';

export const STAT_SPACING_MIN = 0;
export const STAT_SPACING_MAX = 24;

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function createSettings(preset: ShareColorPreset): ShareCardSettings {
  return {
    title: null,
    titleVisible: true,
    backgroundColor: preset.background,
    routeColor: preset.route,
    textColor: preset.text,
    presetId: preset.id,
    visibleStats: [...DEFAULT_VISIBLE_SHARE_STATS],
    statWidths: {},
    statPositions: {},
    transparentBackground: false,
    showStatBorders: true,
    statStyle: DEFAULT_STAT_STYLE,
    backgroundImage: null,
    backgroundImageFit: 'cover',
    backgroundImagePosition: 'center',
    statSpacing: 12,
    routeVisible: true,
    routeScale: DEFAULT_ROUTE_SCALE,
    routePosition: null,
  };
}

/**
 * Состояние редактора карточки. Object URL фонового фото освобождается
 * только при уничтожении области видимости: старое фото может понадобиться при отмене.
 */
export function useShareCardSettings(initialPresetId: string = DEFAULT_SHARE_PRESET_ID) {
  const initialPreset =
    findSharePreset(initialPresetId) ?? findSharePreset(DEFAULT_SHARE_PRESET_ID)!;

  const settings = ref<ShareCardSettings>(createSettings(initialPreset));
  const history = useUndoRedo(settings, { limit: 10 });

  // Object URL всех загруженных фото: отмена может вернуть любое из них.
  const backgroundImageUrls = new Set<string>();

  function removeBackgroundImage() {
    settings.value.backgroundImage = null;
  }

  onScopeDispose(() => {
    backgroundImageUrls.forEach((url) => URL.revokeObjectURL(url));
    backgroundImageUrls.clear();
  });

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

  /** Цвет фона из меню; выбор цвета выключает прозрачность. */
  function setBackgroundColor(value: string) {
    setColor('backgroundColor', value);
    settings.value.transparentBackground = false;
  }

  function addStat(key: ShareStatKey) {
    if (settings.value.visibleStats.includes(key)) return;
    settings.value.visibleStats.push(key);
  }

  function removeStat(key: ShareStatKey) {
    settings.value.visibleStats = settings.value.visibleStats.filter((item) => item !== key);
    delete settings.value.statPositions[key];
  }

  function setStatPositions(positions: Partial<Record<ShareStatKey, ShareStatPosition>>) {
    settings.value.statPositions = { ...positions };
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

  function setStatStyle(style: ShareStatStyle) {
    settings.value.statStyle = style;
  }

  /**
   * Сетка «N в ряд»: все показатели получают одну ширину и заново
   * раскладываются по порядку — сохраняется текущий порядок на карточке.
   */
  function setStatColumns(width: ShareStatWidth) {
    const { visibleStats, statPositions } = settings.value;
    const order = (key: ShareStatKey) => {
      const position = statPositions[key];
      return position ? position.row * 100 + position.col : Infinity;
    };

    // Infinity у показателей без позиции: они остаются в конце в прежнем порядке.
    settings.value.visibleStats = [...visibleStats].sort((a, b) =>
      order(a) === order(b) ? 0 : order(a) < order(b) ? -1 : 1,
    );
    settings.value.statWidths = Object.fromEntries(visibleStats.map((key) => [key, width]));
    settings.value.statPositions = {};
  }

  function setTransparentBackground(value: boolean) {
    // Прозрачный фон недоступен, пока загружено фоновое фото.
    settings.value.transparentBackground = value && !settings.value.backgroundImage;
  }

  function setBackgroundImage(file: File) {
    if (!file.type.startsWith('image/')) return;

    const url = URL.createObjectURL(file);
    backgroundImageUrls.add(url);
    settings.value.backgroundImage = url;
    settings.value.transparentBackground = false;
  }

  function setRouteVisible(value: boolean) {
    settings.value.routeVisible = value;
  }

  function setRouteScale(scale: number) {
    settings.value.routeScale = scale;
  }

  function setRoutePosition(position: ShareRoutePosition) {
    settings.value.routePosition = position;
  }

  function setTitleVisible(value: boolean) {
    settings.value.titleVisible = value;
  }

  function setTitle(value: string) {
    const title = value.trim();
    // Пустое название возвращает исходное из GPX.
    settings.value.title = title || null;
  }

  /** Возвращает карточку к исходному виду выбранного шаблона. */
  function resetSettings() {
    settings.value = createSettings(initialPreset);
  }

  return {
    settings,
    setRouteVisible,
    setRouteScale,
    setRoutePosition,
    setTitle,
    setTitleVisible,
    resetSettings,
    applyPresetById,
    setColor,
    setBackgroundColor,
    addStat,
    removeStat,
    setStatPositions,
    setStatWidth,
    setStatSpacing,
    setShowStatBorders,
    setStatStyle,
    setStatColumns,
    setTransparentBackground,
    setBackgroundImage,
    removeBackgroundImage,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };
}
