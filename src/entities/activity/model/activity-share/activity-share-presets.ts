import type { ShareColorPreset } from './activity-share.types';

export const DEFAULT_SHARE_PRESET_ID = 'night';

export const SHARE_COLOR_PRESETS: readonly ShareColorPreset[] = [
  { id: 'night', name: 'Ночной', background: '#111827', route: '#F9FAFB', text: '#FFFFFF' },
  { id: 'light', name: 'Светлый', background: '#F4F1EA', route: '#253B80', text: '#202938' },
  { id: 'forest', name: 'Лесной', background: '#DCE8D5', route: '#254B38', text: '#254B38' },
  { id: 'sunset', name: 'Закат', background: '#542B43', route: '#FFCA91', text: '#FFF5EA' },
  { id: 'mono', name: 'Монохром', background: '#000000', route: '#A3A3A3', text: '#FFFFFF' },
  { id: 'ocean', name: 'Океан', background: '#153B50', route: '#5DE0E6', text: '#F0FDFF' },
  { id: 'sand', name: 'Песочный', background: '#E8D5B7', route: '#A64B2A', text: '#493323' },
  { id: 'neon', name: 'Неон', background: '#19152E', route: '#C6FF00', text: '#FFFFFF' },
  { id: 'sakura', name: 'Сакура', background: '#FCE7F3', route: '#DB2777', text: '#831843' },
  { id: 'graphite', name: 'Графитовый', background: '#27272A', route: '#A1A1AA', text: '#FFFFFF' },
];

export function findSharePreset(id: string | null): ShareColorPreset | undefined {
  return id ? SHARE_COLOR_PRESETS.find((preset) => preset.id === id) : undefined;
}

export function findSharePresetByColors(colors: {
  background: string;
  route: string;
  text: string;
}): ShareColorPreset | undefined {
  const isSame = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  return SHARE_COLOR_PRESETS.find(
    (preset) =>
      isSame(preset.background, colors.background) &&
      isSame(preset.route, colors.route) &&
      isSame(preset.text, colors.text),
  );
}
