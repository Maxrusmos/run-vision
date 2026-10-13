import { computed, onScopeDispose, ref } from 'vue';
import type {
  ShareCardSettings,
  ShareColorPreset,
  ShareStatKey,
  ShareStatWidth,
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
  {
    id: 'ocean',
    name: 'Океан',
    background: '#153B50',
    route: '#5DE0E6',
    text: '#F0FDFF',
  },
  {
    id: 'sand',
    name: 'Песочный',
    background: '#E8D5B7',
    route: '#A64B2A',
    text: '#493323',
  },
  {
    id: 'neon',
    name: 'Неон',
    background: '#19152E',
    route: '#C6FF00',
    text: '#FFFFFF',
  },
  {
    id: 'sakura',
    name: 'Сакура',
    background: '#FCE7F3',
    route: '#DB2777',
    text: '#831843',
  },
  {
    id: 'graphite',
    name: 'Графитовый',
    background: '#27272A',
    route: '#A1A1AA',
    text: '#FFFFFF',
  },
];

export function useActivityShare() {
  const settings = ref<ShareCardSettings>({
    backgroundColor: '#111827',
    routeColor: '#FFFFFF',
    textColor: '#FFFFFF',
    presetId: 'night',
    visibleStats: ['distance', 'duration', 'averagePace', 'averageHeartRate'],
    statWidths: {},
    transparentBackground: false,
    showStatBorders: true,
    backgroundImage: null,
    backgroundImageFit: 'cover',
    backgroundImagePosition: 'center',
    statSpacing: 12,
  });

  let backgroundImageObjectUrl: string | null = null;

  function setStatSpacing(value: number) {
    settings.value.statSpacing = Math.min(24, Math.max(4, value));
  }

  function setShowStatBorders(value: boolean) {
    settings.value.showStatBorders = value;
  }

  function setBackgroundImage(file: File) {
    if (!file.type.startsWith('image/')) return;

    if (backgroundImageObjectUrl) {
      URL.revokeObjectURL(backgroundImageObjectUrl);
    }

    backgroundImageObjectUrl = URL.createObjectURL(file);
    settings.value.backgroundImage = backgroundImageObjectUrl;
  }

  function removeBackgroundImage() {
    if (backgroundImageObjectUrl) {
      URL.revokeObjectURL(backgroundImageObjectUrl);
      backgroundImageObjectUrl = null;
    }

    settings.value.backgroundImage = null;
  }

  onScopeDispose(() => {
    if (backgroundImageObjectUrl) {
      URL.revokeObjectURL(backgroundImageObjectUrl);
      backgroundImageObjectUrl = null;
    }
  });

  const activePreset = computed(
    () => presets.find((preset) => preset.id === settings.value.presetId) ?? null,
  );

  function setStatWidth(key: ShareStatKey, width: ShareStatWidth) {
    settings.value = {
      ...settings.value,
      statWidths: {
        ...settings.value.statWidths,
        [key]: width,
      },
    };
  }

  function applyPreset(preset: ShareColorPreset) {
    settings.value.routeColor = preset.route;
    settings.value.textColor = preset.text;
    settings.value.presetId = preset.id;

    if (!settings.value.transparentBackground) {
      settings.value.backgroundColor = preset.background;
    }
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

  function setTransparentBackground(value: boolean) {
    settings.value.transparentBackground = value;

    if (!value) {
      const preset = presets.find((item) => item.id === settings.value.presetId);

      if (preset) {
        settings.value.backgroundColor = preset.background;
      }
    }
  }

  return {
    presets,
    settings,
    activePreset,
    applyPreset,
    setColor,
    addStat,
    removeStat,
    setStatWidth,
    setTransparentBackground,
    setShowStatBorders,
    setBackgroundImage,
    removeBackgroundImage,
    setStatSpacing,
  };
}
