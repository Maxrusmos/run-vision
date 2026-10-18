import type { ShareBackgroundDecor } from './activity-share.types';

/**
 * Фоны Pro-оформлений: градиенты и узоры (изолинии, волны, сетка, линии). Только
 * CSS-градиенты и SVG в data-URI — их html-to-image переносит в PNG и кадры видео
 * (как узоры «Телеметрии»). Слой рисует `CardDecor.vue` — на карточке и в плитках меню.
 */

export interface DecorLayer {
  image: string;
  /** background-size; по умолчанию — на всю карточку. */
  size?: string;
  position?: string;
}

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** SVG на всю карточку (растягивается без сохранения пропорций — линиям это не мешает). */
function fullSvg(body: string, viewBox = '0 0 400 520'): DecorLayer {
  return {
    image: svgUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="none">${body}</svg>`,
    ),
    size: '100% 100%',
  };
}

const round = (value: number) => Math.round(value * 10) / 10;

/** Изолинии: вложенные «кляксы» вокруг центров, как горизонтали на карте. */
function contourPaths(stroke: string): string {
  const centers = [
    { x: 310, y: 120, rings: 9, base: 18, step: 17, seed: 0.7 },
    { x: 70, y: 430, rings: 8, base: 16, step: 19, seed: 2.1 },
  ];
  const paths: string[] = [];
  for (const center of centers) {
    for (let ring = 0; ring < center.rings; ring++) {
      const radius = center.base + ring * center.step;
      const points: string[] = [];
      for (let step = 0; step <= 72; step++) {
        const angle = (step / 72) * Math.PI * 2;
        const wobble =
          1 +
          0.11 * Math.sin(3 * angle + center.seed + ring * 0.35) +
          0.06 * Math.sin(5 * angle - center.seed * 2 + ring * 0.2);
        const x = center.x + Math.cos(angle) * radius * wobble * 1.15;
        const y = center.y + Math.sin(angle) * radius * wobble;
        points.push(`${step ? 'L' : 'M'}${round(x)} ${round(y)}`);
      }
      const opacity = ring % 4 === 0 ? 0.55 : 0.28;
      paths.push(
        `<path d="${points.join('')}Z" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="1.1"/>`,
      );
    }
  }
  return paths.join('');
}

/** Волны: плавные синусоиды через всю карточку, сверху вниз всё плотнее. */
function wavePaths(stroke: string): string {
  const paths: string[] = [];
  for (let line = 0; line < 16; line++) {
    const y = 40 + line * 30;
    const amplitude = 8 + (line % 5) * 3;
    const phase = line * 0.6;
    const points: string[] = [];
    for (let x = 0; x <= 400; x += 10) {
      const yy = y + Math.sin(x / 48 + phase) * amplitude + Math.sin(x / 19 + phase * 2) * 2;
      points.push(`${x ? 'L' : 'M'}${x} ${round(yy)}`);
    }
    paths.push(
      `<path d="${points.join('')}" fill="none" stroke="${stroke}" stroke-opacity="${line % 3 ? 0.18 : 0.35}" stroke-width="1.2"/>`,
    );
  }
  return paths.join('');
}

/** «Синтвейв»: горизонт и сетка в перспективе в нижней части карточки. */
function synthwaveGrid(stroke: string): string {
  const horizon = 330;
  const lines: string[] = [];
  for (let index = 0; index < 11; index++) {
    // Горизонтальные — всё реже к зрителю.
    const y = horizon + 190 * Math.pow(index / 10, 1.9);
    lines.push(`<path d="M0 ${round(y)}H400" stroke="${stroke}" stroke-opacity="0.55"/>`);
  }
  for (let index = -10; index <= 10; index++) {
    const x = 200 + index * 60;
    lines.push(`<path d="M200 ${horizon}L${x} 520" stroke="${stroke}" stroke-opacity="0.45"/>`);
  }
  const sun =
    `<circle cx="200" cy="${horizon - 4}" r="74" fill="#FFB547" fill-opacity="0.28"/>` +
    `<circle cx="200" cy="${horizon - 4}" r="52" fill="#FFD27A" fill-opacity="0.25"/>`;
  return `${sun}<g stroke-width="1.3">${lines.join('')}</g>`;
}

export interface ShareDecorOption {
  id: ShareBackgroundDecor;
  /** Основной цвет (под скруглёнными углами кадра видео, под прозрачными слоями). */
  base: string;
  layers: DecorLayer[];
}

export const SHARE_BACKGROUND_DECORS: readonly ShareDecorOption[] = [
  {
    id: 'aurora',
    base: '#0B1026',
    layers: [
      { image: 'radial-gradient(circle at 18% 18%, rgb(45 212 191 / 55%), transparent 46%)' },
      { image: 'radial-gradient(circle at 88% 34%, rgb(168 85 247 / 60%), transparent 50%)' },
      { image: 'radial-gradient(ellipse at 50% 108%, rgb(236 72 153 / 55%), transparent 58%)' },
      { image: 'linear-gradient(160deg, #0B1026 0%, #1E1B4B 100%)' },
    ],
  },
  {
    id: 'synthwave',
    base: '#2A0D45',
    layers: [
      fullSvg(synthwaveGrid('#FF4FD8')),
      { image: 'linear-gradient(180deg, #12061F 0%, #3B0F5C 42%, #B5179E 64%, #FF7A3D 100%)' },
    ],
  },
  {
    id: 'topo',
    base: '#11283A',
    layers: [
      fullSvg(contourPaths('#E8C468')),
      { image: 'linear-gradient(140deg, #0E1E2C 0%, #17384A 60%, #1F4A55 100%)' },
    ],
  },
  {
    id: 'peach',
    base: '#F7A79F',
    layers: [
      {
        image:
          'repeating-linear-gradient(135deg, rgb(255 255 255 / 16%) 0 1px, transparent 1px 13px)',
      },
      { image: 'linear-gradient(165deg, #FFD9A8 0%, #FD9FA0 48%, #A779D9 100%)' },
    ],
  },
  {
    id: 'emerald',
    base: '#064E3B',
    layers: [
      fullSvg(wavePaths('#ECFDF5')),
      { image: 'linear-gradient(200deg, #022C22 0%, #065F46 55%, #0EA371 100%)' },
    ],
  },
  {
    id: 'glacier',
    base: '#BAE6FD',
    layers: [
      {
        image:
          'repeating-linear-gradient(60deg, rgb(255 255 255 / 40%) 0 1px, transparent 1px 22px)',
      },
      {
        image:
          'repeating-linear-gradient(-60deg, rgb(255 255 255 / 40%) 0 1px, transparent 1px 22px)',
      },
      { image: 'radial-gradient(circle at 25% 15%, rgb(255 255 255 / 75%), transparent 45%)' },
      { image: 'linear-gradient(180deg, #E0F2FE 0%, #A5DCF9 55%, #6CC4F0 100%)' },
    ],
  },
  {
    id: 'lava',
    base: '#8E1B5B',
    layers: [
      {
        image:
          'repeating-radial-gradient(circle at 85% 12%, rgb(255 255 255 / 13%) 0 1px, transparent 1px 16px)',
      },
      { image: 'radial-gradient(circle at 85% 12%, rgb(255 168 76 / 70%), transparent 45%)' },
      { image: 'linear-gradient(165deg, #FF512F 0%, #DD2476 45%, #7B1FA2 80%, #4A148C 100%)' },
    ],
  },
  {
    id: 'gold',
    base: '#1A1A1A',
    layers: [
      {
        image:
          'repeating-linear-gradient(45deg, rgb(212 175 55 / 22%) 0 1px, transparent 1px 11px)',
      },
      { image: 'radial-gradient(circle at 80% 0%, rgb(212 175 55 / 30%), transparent 55%)' },
      { image: 'linear-gradient(150deg, #101010 0%, #2A2622 100%)' },
    ],
  },
];

export function findShareDecor(id: ShareBackgroundDecor | null | undefined) {
  return id ? SHARE_BACKGROUND_DECORS.find((decor) => decor.id === id) : undefined;
}

/**
 * CSS слоя оформления. `scale` — для плиток меню: повторяющиеся узоры (полосы, кольца)
 * мельчают вместе с плиткой, растянутые SVG и градиенты подстраиваются сами.
 */
export function getDecorStyle(id: ShareBackgroundDecor, scale = 1): Record<string, string> {
  const decor = findShareDecor(id);
  if (!decor) return {};
  const scalePx = (image: string) =>
    scale === 1
      ? image
      : image.replace(/(\d+(?:\.\d+)?)px/g, (_, px) => `${round(Number(px) * scale)}px`);
  return {
    backgroundColor: decor.base,
    backgroundImage: decor.layers.map((layer) => scalePx(layer.image)).join(', '),
    backgroundSize: decor.layers.map((layer) => layer.size ?? '100% 100%').join(', '),
    backgroundPosition: decor.layers.map((layer) => layer.position ?? '0 0').join(', '),
    backgroundRepeat: decor.layers.map(() => 'no-repeat').join(', '),
  };
}
