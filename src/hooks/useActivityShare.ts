import { computed, ref } from 'vue';
import type {
  ShareCardSettings,
  ShareColorPreset,
  ShareStatKey,
} from '@/entities/activity/model/activity-share/activity-share.types.ts';

const presets: ShareColorPreset[] = [
  {
    id: 'night',
    name: 'Ночной',
    background: '#111827',
    route: '#F9FAFB',
    text: '#FFFFFF',
  },
  {
    id: 'light',
    name: 'Светлый',
    background: '#F4F1EA',
    route: '#253B80',
    text: '#202938',
  },
  {
    id: 'forest',
    name: 'Лесной',
    background: '#DCE8D5',
    route: '#254B38',
    text: '#254B38',
  },
  {
    id: 'sunset',
    name: 'Закат',
    background: '#542B43',
    route: '#FFCA91',
    text: '#FFF5EA',
  },
  {
    id: 'mono',
    name: 'Монохром',
    background: '#000000',
    route: '#A3A3A3',
    text: '#FFFFFF',
  },
];

export function useActivityShare() {
  const settings = ref<ShareCardSettings>({
    backgroundColor: '#111827',
    routeColor: '#FFFFFF',
    textColor: '#FFFFFF',
    presetId: 'night',
    visibleStats: ['distance', 'duration', 'averagePace'],
  });

  const activePreset = computed(
    () => presets.find((preset) => preset.id === settings.value.presetId) ?? null,
  );

  function applyPreset(preset: ShareColorPreset) {
    settings.value = {
      ...settings.value,
      backgroundColor: preset.background,
      routeColor: preset.route,
      textColor: preset.text,
      presetId: preset.id,
    };
  }

  function setColor(key: 'backgroundColor' | 'routeColor' | 'textColor', value: string) {
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;

    settings.value = {
      ...settings.value,
      [key]: value,
      presetId: null,
    };

    const matchingPreset = presets.find(
      (preset) =>
        preset.background.toLowerCase() === settings.value.backgroundColor.toLowerCase() &&
        preset.route.toLowerCase() === settings.value.routeColor.toLowerCase() &&
        preset.text.toLowerCase() === settings.value.textColor.toLowerCase(),
    );

    if (matchingPreset) {
      settings.value.presetId = matchingPreset.id;
    }
  }

  function addStat(key: ShareStatKey) {
    if (settings.value.visibleStats.includes(key)) return;

    settings.value.visibleStats = [...settings.value.visibleStats, key];
  }

  function removeStat(key: ShareStatKey) {
    settings.value.visibleStats = settings.value.visibleStats.filter((item) => item !== key);
  }

  function moveStat(index: number, direction: -1 | 1) {
    const next = [...settings.value.visibleStats];
    const target = index + direction;

    if (target < 0 || target >= next.length) return;

    const current = next[index];
    if (!current) return;

    next.splice(index, 1);
    next.splice(target, 0, current);

    settings.value.visibleStats = next;
  }

  return {
    presets,
    settings,
    activePreset,
    applyPreset,
    setColor,
    addStat,
    removeStat,
    moveStat,
  };
}
