export type EditorToolId = 'add' | 'background' | 'map' | 'presets' | 'track' | 'stats';

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

/** Шаблон с картой: фон — всегда карта, вместо «Фона» — её настройки. */
export const MAP_EDITOR_TOOLS: readonly EditorTool[] = EDITOR_TOOLS.map((tool) =>
  tool.id === 'background' ? { id: 'map', icon: 'mdi-map-outline', label: 'Карта' } : tool,
);
