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
  { id: 'hud', name: 'HUD', background: '#0A1118', route: '#2EE6FF', text: '#DDF7FF' },
  // Яркие
  { id: 'fire', name: 'Огонь', background: '#FF4D00', route: '#FFF3B0', text: '#FFFFFF' },
  { id: 'electric', name: 'Электрик', background: '#1B4DFF', route: '#FFE600', text: '#FFFFFF' },
  { id: 'fuchsia', name: 'Фуксия', background: '#FF1F8E', route: '#FFFFFF', text: '#FFFFFF' },
  { id: 'lime', name: 'Лайм', background: '#C6FF00', route: '#111111', text: '#111111' },
  { id: 'sun', name: 'Солнце', background: '#FFD60A', route: '#E63946', text: '#1D1D1D' },
  { id: 'mint', name: 'Мята', background: '#00E0B0', route: '#0B3D3A', text: '#0B3D3A' },
  {
    id: 'ultraviolet',
    name: 'Ультрафиолет',
    background: '#6A00F4',
    route: '#00F5D4',
    text: '#FFFFFF',
  },
  { id: 'coral', name: 'Коралл', background: '#FF6B6B', route: '#FFF1D6', text: '#FFFFFF' },
];

/**
 * Pro-оформления: фон-градиент с узором (`activity-share-decor.ts`) и подобранные к нему
 * цвета трека и текста. `background` — основной цвет фона (углы кадра видео и т.п.).
 */
export const PRO_COLOR_PRESETS: readonly ShareColorPreset[] = [
  {
    id: 'pro-aurora',
    name: 'Аврора',
    background: '#0B1026',
    route: '#5EEAD4',
    text: '#F5F3FF',
    decor: 'aurora',
    pro: true,
  },
  {
    id: 'pro-synthwave',
    name: 'Синтвейв',
    background: '#2A0D45',
    route: '#22F3FF',
    text: '#FFFFFF',
    decor: 'synthwave',
    pro: true,
  },
  {
    id: 'pro-topo',
    name: 'Изолинии',
    background: '#11283A',
    route: '#E8C468',
    text: '#F7F1E1',
    decor: 'topo',
    pro: true,
  },
  {
    id: 'pro-peach',
    name: 'Персик',
    background: '#F7A79F',
    route: '#3B1E54',
    text: '#2B1638',
    decor: 'peach',
    pro: true,
  },
  {
    id: 'pro-emerald',
    name: 'Изумруд',
    background: '#064E3B',
    route: '#D9F99D',
    text: '#ECFDF5',
    decor: 'emerald',
    pro: true,
  },
  {
    id: 'pro-glacier',
    name: 'Ледник',
    background: '#BAE6FD',
    route: '#0C4A6E',
    text: '#082F49',
    decor: 'glacier',
    pro: true,
  },
  {
    id: 'pro-lava',
    name: 'Лава',
    background: '#8E1B5B',
    route: '#FFF1B8',
    text: '#FFFFFF',
    decor: 'lava',
    pro: true,
  },
  {
    id: 'pro-gold',
    name: 'Золото',
    background: '#1A1A1A',
    route: '#E3C35A',
    text: '#F5E6B8',
    decor: 'gold',
    pro: true,
  },
];

const ALL_PRESETS = [...PRO_COLOR_PRESETS, ...SHARE_COLOR_PRESETS];

export function findSharePreset(id: string | null): ShareColorPreset | undefined {
  return id ? ALL_PRESETS.find((preset) => preset.id === id) : undefined;
}

/** Пресет по цветам и фону-оформлению (после ручной смены цвета — тот же ли пресет). */
export function findSharePresetByColors(colors: {
  background: string;
  route: string;
  text: string;
  decor?: string | null;
}): ShareColorPreset | undefined {
  const isSame = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  return ALL_PRESETS.find(
    (preset) =>
      (preset.decor ?? null) === (colors.decor ?? null) &&
      isSame(preset.background, colors.background) &&
      isSame(preset.route, colors.route) &&
      isSame(preset.text, colors.text),
  );
}
