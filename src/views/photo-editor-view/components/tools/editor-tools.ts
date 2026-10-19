export type EditorToolId =
  'add' | 'background' | 'map' | 'elevation' | 'widgets' | 'presets' | 'track' | 'stats';

export type EditorTool = {
  id: EditorToolId;
  icon: string;
  label: string;
};

/** Инструменты нижней панели редактора. Новые инструменты добавляются сюда. */
export const EDITOR_TOOLS: readonly EditorTool[] = [
  { id: 'add', icon: 'mdi-plus-circle-outline', label: 'Добавить' },
  { id: 'background', icon: 'mdi-image-outline', label: 'Фон' },
  { id: 'presets', icon: 'mdi-palette-outline', label: 'Оформление' },
  { id: 'track', icon: 'mdi-map-marker-path', label: 'Трек' },
  { id: 'stats', icon: 'mdi-view-grid-outline', label: 'Показатели' },
];

/**
 * Шаблон с картой: фон — всегда карта, вместо «Фона» — её настройки;
 * после «Трека» — график высоты (пункт «Виджеты» со значком, как в «Телеметрии»).
 */
export const MAP_EDITOR_TOOLS: readonly EditorTool[] = EDITOR_TOOLS.flatMap(
  (tool): EditorTool[] => {
    if (tool.id === 'background') return [{ id: 'map', icon: 'mdi-map-outline', label: 'Карта' }];
    if (tool.id === 'track') {
      return [tool, { id: 'elevation', icon: 'mdi-view-dashboard-outline', label: 'Виджеты' }];
    }
    return [tool];
  },
);

/** «Телеметрия»: перед «Показателями» — виджеты (сплиты, зоны, графики). */
export const TELEMETRY_EDITOR_TOOLS: readonly EditorTool[] = EDITOR_TOOLS.flatMap(
  (tool): EditorTool[] =>
    tool.id === 'stats'
      ? [{ id: 'widgets', icon: 'mdi-view-dashboard-outline', label: 'Виджеты' }, tool]
      : [tool],
);
