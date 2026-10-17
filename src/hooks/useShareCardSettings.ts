import { onScopeDispose, ref } from 'vue';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import type {
  PhotoTemplateId,
  ShareCardSettings,
  ShareColorKey,
  ShareColorPreset,
  ShareElevationSettings,
  ShareTelemetrySettings,
  ShareWidgetKind,
  ShareWidget,
  ShareWidgetSide,
  ShareMapLayout,
  ShareRoutePitch,
  ShareMapStyle,
  ShareRoutePosition,
  ShareRouteStyle,
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
import { DEFAULT_ROUTE_STYLE } from '@/entities/activity/model/activity-share/activity-share-route-styles';
import { DEFAULT_STAT_STYLE } from '@/entities/activity/model/activity-share/activity-share-stat-styles';
import {
  createShareMapSettings,
  normalizeMapBearing,
} from '@/entities/activity/model/activity-share/activity-share-map';
import { createShareElevationSettings } from '@/entities/activity/model/activity-share/activity-share-elevation';
import {
  WIDGET_END_ROW,
  createShareTelemetrySettings,
  resolveWidgetSide,
} from '@/entities/activity/model/activity-share/activity-share-widgets';
import {
  DEFAULT_SHARE_STAT_WIDTH,
  getDefaultVisibleStats,
} from '@/entities/activity/model/activity-share/activity-share-stat-options';

export const STAT_SPACING_MIN = 0;
export const STAT_SPACING_MAX = 24;

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

type ShareCardSettingsOptions = {
  /** Шаблон карточки: от него зависят карта, виджеты и стили по умолчанию. */
  template?: PhotoTemplateId;
  /** В GPX есть пульс — от этого зависят виджеты по умолчанию. */
  hasHeartRate?: boolean;
  /** В GPX есть высота — иначе график высоты не ставится. */
  hasElevation?: boolean;
  /** Есть ли данные для показателя: пустые не ставятся на новую карточку. */
  isStatAvailable?: (key: ShareStatKey) => boolean;
  /** Сохранённая карточка (черновик): редактор продолжает с неё, а не с шаблона. */
  initialSettings?: ShareCardSettings | null;
};

/** Стили трека и показателей по умолчанию у каждого шаблона. */
const TEMPLATE_STYLES: Record<PhotoTemplateId, { route: ShareRouteStyle; stat: ShareStatStyle }> = {
  minimal: { route: 'shadow', stat: 'speed' },
  topographic: { route: DEFAULT_ROUTE_STYLE, stat: 'tile' },
  // «Телеметрия»: уголки-прицелы и светящийся трек — как на приборной панели.
  telemetry: { route: 'glow', stat: 'brackets' },
};

function createSettings(
  preset: ShareColorPreset,
  options: ShareCardSettingsOptions,
): ShareCardSettings {
  const withMap = options.template === 'topographic';
  const withTelemetry = options.template === 'telemetry';
  const styles = options.template
    ? TEMPLATE_STYLES[options.template]
    : { route: DEFAULT_ROUTE_STYLE, stat: DEFAULT_STAT_STYLE };

  return {
    title: null,
    titleVisible: true,
    backgroundColor: preset.background,
    routeColor: preset.route,
    textColor: preset.text,
    presetId: preset.id,
    visibleStats: getDefaultVisibleStats(options.isStatAvailable),
    statWidths: {},
    statPositions: {},
    transparentBackground: false,
    statStyle: styles.stat,
    backgroundImage: null,
    backgroundImageFit: 'cover',
    backgroundImagePosition: 'center',
    statSpacing: 12,
    routeVisible: true,
    routeScale: DEFAULT_ROUTE_SCALE,
    routeStyle: styles.route,
    routePosition: null,
    routeBearing: 0,
    // «Топография»: карта с наклоном 60° и флажками на треке.
    routePitch: withMap ? 60 : 0,
    routeKmMarkers: withMap,
    routeStartFinish: withMap,
    // «Топография»: карта во весь фон «в тон», график-силуэт.
    map: withMap ? { ...createShareMapSettings(), layout: 'full', style: 'tinted' } : null,
    // Без высоты в GPX график был бы пустым — не ставим его (можно добавить вручную).
    elevation: withMap
      ? {
          ...createShareElevationSettings(),
          style: 'silhouette',
          visible: options.hasElevation ?? true,
        }
      : null,
    telemetry: withTelemetry ? createShareTelemetrySettings(options.hasHeartRate ?? false) : null,
  };
}

/**
 * Состояние редактора карточки. Object URL фонового фото освобождается
 * только при уничтожении области видимости: старое фото может понадобиться при отмене.
 * Текущее остаётся жить — оно в черновике карточки.
 */
export function useShareCardSettings(
  initialPresetId: string = DEFAULT_SHARE_PRESET_ID,
  options: ShareCardSettingsOptions = {},
) {
  const initialPreset =
    findSharePreset(initialPresetId) ?? findSharePreset(DEFAULT_SHARE_PRESET_ID)!;

  const settings = ref<ShareCardSettings>(
    options.initialSettings ?? createSettings(initialPreset, options),
  );
  const history = useUndoRedo(settings, { limit: 10 });

  /** Карточка не отличается от шаблона по умолчанию (черновик хранить незачем). */
  function isDefault() {
    return (
      JSON.stringify(settings.value) === JSON.stringify(createSettings(initialPreset, options))
    );
  }

  // Object URL всех загруженных фото: отмена может вернуть любое из них.
  const backgroundImageUrls = new Set<string>();
  if (settings.value.backgroundImage) backgroundImageUrls.add(settings.value.backgroundImage);

  function removeBackgroundImage() {
    settings.value.backgroundImage = null;
  }

  // Текущее фото не освобождаем — его забирает черновик карточки.
  onScopeDispose(() => {
    backgroundImageUrls.forEach((url) => {
      if (url !== settings.value.backgroundImage) URL.revokeObjectURL(url);
    });
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

  /**
   * Новый показатель получает ширину текущей сетки: если все показатели одной
   * ширины (выбрана сетка «N в ряд»), он встаёт таким же, а не по умолчанию — ½.
   */
  function addStat(key: ShareStatKey) {
    const { visibleStats, statWidths } = settings.value;
    if (visibleStats.includes(key)) return;

    const widths = new Set(
      visibleStats.map((stat) => statWidths[stat] ?? DEFAULT_SHARE_STAT_WIDTH),
    );
    const [gridWidth] = widths;
    if (widths.size === 1 && gridWidth) statWidths[key] = gridWidth;
    else delete statWidths[key];

    visibleStats.push(key);
  }

  /** Добавляет сразу несколько показателей (каждый — шириной текущей сетки). */
  function addStats(keys: readonly ShareStatKey[]) {
    keys.forEach(addStat);
  }

  /** Убирает все показатели с карточки. */
  function removeAllStats() {
    settings.value.visibleStats = [];
    settings.value.statPositions = {};
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

  function setRouteStyle(style: ShareRouteStyle) {
    settings.value.routeStyle = style;
  }

  function setRouteScale(scale: number) {
    settings.value.routeScale = scale;
  }

  function setRoutePosition(position: ShareRoutePosition) {
    settings.value.routePosition = position;
  }

  function setRouteBearing(bearing: number) {
    settings.value.routeBearing = normalizeMapBearing(bearing);
  }

  function setRoutePitch(pitch: ShareRoutePitch) {
    settings.value.routePitch = pitch;
  }

  function setRouteKmMarkers(value: boolean) {
    settings.value.routeKmMarkers = value;
  }

  function setRouteStartFinish(value: boolean) {
    settings.value.routeStartFinish = value;
  }

  function setTitleVisible(value: boolean) {
    settings.value.titleVisible = value;
  }

  function setTitle(value: string) {
    const title = value.trim();
    // Пустое название возвращает исходное из GPX.
    settings.value.title = title || null;
  }

  function updateMap(patch: Partial<NonNullable<ShareCardSettings['map']>>) {
    if (!settings.value.map) return;
    settings.value.map = { ...settings.value.map, ...patch };
  }

  function setMapLayout(layout: ShareMapLayout) {
    updateMap({ layout });
  }

  function setMapStyle(style: ShareMapStyle) {
    updateMap({ style });
  }

  function updateElevation(patch: Partial<ShareElevationSettings>) {
    if (!settings.value.elevation) return;
    settings.value.elevation = { ...settings.value.elevation, ...patch };
  }

  function setElevationVisible(visible: boolean) {
    updateElevation({ visible });
  }

  function setElevationStyle(style: ShareElevationSettings['style']) {
    updateElevation({ style });
  }

  function setElevationSize(size: ShareElevationSettings['size']) {
    updateElevation({ size });
  }

  function setElevationLabels(labels: boolean) {
    updateElevation({ labels });
  }

  /** Строка графика в сетке показателей. */
  function setElevationRow(row: number) {
    updateElevation({ row });
  }

  /** null — цвет трека. */
  function setElevationColor(color: string | null) {
    if (color !== null && !HEX_COLOR_PATTERN.test(color)) return;
    updateElevation({ color });
  }

  function updateTelemetry(patch: Partial<ShareTelemetrySettings>) {
    if (!settings.value.telemetry) return;
    settings.value.telemetry = { ...settings.value.telemetry, ...patch };
  }

  /** Добавленный виджет встаёт в конец — после всех показателей и виджетов. */
  function setWidgetVisible(kind: ShareWidgetKind, visible: boolean) {
    const telemetry = settings.value.telemetry;
    if (!telemetry) return;
    const widgets = telemetry.widgets.filter((widget) => widget.kind !== kind);
    // Не MAX_SAFE_INTEGER: при совпадении строк раскладка прибавляет 1, а 2^53 + 1 === 2^53.
    if (visible) widgets.push({ kind, row: WIDGET_END_ROW + widgets.length, side: null });
    updateTelemetry({ widgets });
  }

  /** Виджет у края области трека (вертикально) или строкой на всю ширину. */
  function setWidgetSide(kind: ShareWidgetKind, requested: ShareWidgetSide | null) {
    const telemetry = settings.value.telemetry;
    if (!telemetry) return;
    const side = resolveWidgetSide(telemetry.widgets, kind, requested);
    updateTelemetry({
      widgets: telemetry.widgets.map((widget) =>
        widget.kind === kind
          ? { ...widget, side, row: side ? widget.row : WIDGET_END_ROW }
          : widget,
      ),
    });
  }

  /**
   * Раскладка полос после переноса: строки горизонтальных и порядок вертикальных
   * в боковых колонках (порядок виджетов в списке задаёт порядок в колонке).
   */
  function setBandPlacement(
    rows: Record<string, number>,
    sides: Record<ShareWidgetSide, string[]>,
  ) {
    if (settings.value.elevation && rows.elevation !== undefined) {
      updateElevation({ row: rows.elevation });
    }
    const telemetry = settings.value.telemetry;
    if (!telemetry) return;

    const sideOf = (key: string): ShareWidgetSide | null =>
      sides.left.includes(key) ? 'left' : sides.right.includes(key) ? 'right' : null;
    const placed = telemetry.widgets.map((widget) => {
      const key = `widget-${widget.kind}`;
      return { ...widget, side: sideOf(key), row: rows[key] ?? widget.row };
    });
    const sideOrder = (widget: ShareWidget) => {
      const key = `widget-${widget.kind}`;
      return widget.side ? sides[widget.side].indexOf(key) : -1;
    };
    updateTelemetry({
      widgets: [
        ...placed.filter((widget) => !widget.side),
        ...placed
          .filter((widget) => widget.side === 'left')
          .sort((a, b) => sideOrder(a) - sideOrder(b)),
        ...placed
          .filter((widget) => widget.side === 'right')
          .sort((a, b) => sideOrder(a) - sideOrder(b)),
      ],
    });
  }

  /** Строки полос сетки (график высоты, виджеты) после переноса. */
  function setBandRows(rows: Record<string, number>) {
    if (settings.value.elevation && rows.elevation !== undefined) {
      updateElevation({ row: rows.elevation });
    }
    const telemetry = settings.value.telemetry;
    if (telemetry) {
      updateTelemetry({
        widgets: telemetry.widgets.map((widget) => ({
          ...widget,
          row: rows[`widget-${widget.kind}`] ?? widget.row,
        })),
      });
    }
  }

  function setTelemetrySize(size: ShareTelemetrySettings['size']) {
    updateTelemetry({ size });
  }

  function setTelemetryChartStyle(chartStyle: ShareTelemetrySettings['chartStyle']) {
    updateTelemetry({ chartStyle });
  }

  /** null — цвет трека. */
  function setTelemetryColor(color: string | null) {
    if (color !== null && !HEX_COLOR_PATTERN.test(color)) return;
    updateTelemetry({ color });
  }

  function setTelemetryLabels(labels: boolean) {
    updateTelemetry({ labels });
  }

  function setTelemetryGrid(grid: boolean) {
    updateTelemetry({ grid });
  }

  /** Возвращает карточку к исходному виду выбранного шаблона. */
  function resetSettings() {
    settings.value = createSettings(initialPreset, options);
  }

  return {
    settings,
    isDefault,
    setRouteVisible,
    setRouteScale,
    setRouteBearing,
    setRoutePitch,
    setRouteKmMarkers,
    setRouteStartFinish,
    setRouteStyle,
    setRoutePosition,
    setTitle,
    setTitleVisible,
    resetSettings,
    setMapLayout,
    setMapStyle,
    setElevationVisible,
    setElevationStyle,
    setElevationSize,
    setElevationLabels,
    setElevationColor,
    setElevationRow,
    setWidgetVisible,
    setWidgetSide,
    setBandRows,
    setBandPlacement,
    setTelemetrySize,
    setTelemetryChartStyle,
    setTelemetryColor,
    setTelemetryLabels,
    setTelemetryGrid,
    applyPresetById,
    setColor,
    setBackgroundColor,
    addStat,
    addStats,
    removeStat,
    removeAllStats,
    setStatPositions,
    setStatWidth,
    setStatSpacing,
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
