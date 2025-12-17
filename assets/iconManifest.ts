import { EnemyType, TowerType } from '../types';

type IconCategory = 'tower' | 'enemy' | 'ui';

export interface IconAssetSpec {
  /** File name relative to public/assets/icons */
  fileName: string;
  /** Absolute path to request at runtime */
  publicPath: string;
  /** Recommended prompt for the AI generator */
  prompt: string;
  /** Extra styling instructions */
  styleNotes: string;
  /** Where this icon will be used inside the UI */
  usage: string;
  category: IconCategory;
  size: { width: number; height: number };
}

const ASSET_BASE = '/assets/icons';

const buildIconSpec = (fileName: string, prompt: string, styleNotes: string, usage: string, category: IconCategory): IconAssetSpec => ({
  fileName,
  publicPath: `${ASSET_BASE}/${fileName}`,
  prompt,
  styleNotes,
  usage,
  category,
  size: { width: 256, height: 256 },
});

const pandaLightingNotes = 'soft rim lighting, gentle ambient occlusion, painterly shading, kawaii panda police theme, transparent background';

export const pandaTowerIconSpecs: Record<TowerType, IconAssetSpec> = {
  [TowerType.AUXILIARY]: buildIconSpec(
    'tower-auxiliary.png',
    'chibi panda auxiliary police officer blowing a whistle, blue reflective vest, confident stance, simple circular sticker design',
    pandaLightingNotes,
    'Auxiliary unit token, tower portrait, menu button',
    'tower'
  ),
  [TowerType.TRAFFIC]: buildIconSpec(
    'tower-traffic.png',
    'chibi panda traffic cop holding a glowing stop sign, yellow vest, friendly smile, icon style',
    pandaLightingNotes,
    'Traffic slow-down unit token and action button art',
    'tower'
  ),
  [TowerType.PATROL]: buildIconSpec(
    'tower-patrol.png',
    'chibi panda riot patrol on a futuristic bike, blue siren lights, dynamic pose, circular badge layout',
    pandaLightingNotes,
    'Iron Patrol splash damage unit icon',
    'tower'
  ),
  [TowerType.SWAT]: buildIconSpec(
    'tower-swat.png',
    'chibi panda SWAT officer with tactical shield, navy armor, heroic pose, cute but powerful',
    pandaLightingNotes,
    'SWAT sniper unit icon and upgrade menu art',
    'tower'
  ),
};

export const pandaEnemyIconSpecs: Record<EnemyType, IconAssetSpec> = {
  [EnemyType.SCOOTER]: buildIconSpec(
    'enemy-scooter.png',
    'mischievous panda biker without helmet on a neon scooter, chibi style, looks fast, sticker icon',
    pandaLightingNotes,
    'Scooter enemy token and health indicator',
    'enemy'
  ),
  [EnemyType.DELIVERY]: buildIconSpec(
    'enemy-delivery.png',
    'panda courier carrying oversized delivery boxes on motorcycle, determined face, chibi icon',
    pandaLightingNotes,
    'Delivery enemy token',
    'enemy'
  ),
  [EnemyType.RACER]: buildIconSpec(
    'enemy-racer.png',
    'panda street racer in sleek purple suit on modified bike, motion streaks, cute but rebellious',
    pandaLightingNotes,
    'Racer enemy token',
    'enemy'
  ),
  [EnemyType.MODIFIED]: buildIconSpec(
    'enemy-modified.png',
    'boss panda biker with heavy armor and glowing engine mods, intimidating but adorable, circular icon',
    pandaLightingNotes,
    'Boss enemy token and HUD warning icon',
    'enemy'
  ),
};

export const pandaUiIconSpecs: IconAssetSpec[] = [
  buildIconSpec(
    'ui-budget.png',
    'minimal panda coin pouch icon, gold coins spilling, chibi interface badge',
    pandaLightingNotes,
    'Budget indicator and currency icon',
    'ui'
  ),
  buildIconSpec(
    'ui-safety.png',
    'heart-shaped traffic badge with tiny panda face, glowing blue aura, kawaii style',
    pandaLightingNotes,
    'Safety / lives indicator',
    'ui'
  ),
  buildIconSpec(
    'ui-wave.png',
    'alert siren styled as panda ears, red glow, circular sticker',
    pandaLightingNotes,
    'Wave status indicator',
    'ui'
  ),
];

export const pandaIconSpecList: IconAssetSpec[] = [
  ...Object.values(pandaTowerIconSpecs),
  ...Object.values(pandaEnemyIconSpecs),
  ...pandaUiIconSpecs,
];

export const PANDA_ICON_STYLE_GUIDE = `
Style keywords: kawaii panda characters, soft gradients, chunky outlines, traffic enforcement theme.
Color palette: midnight blue (#0f172a), neon accents (#22d3ee, #fbbf24, #f472b6), neutral grays for armor.
Lighting: soft rim light + diffuse bounce, keep highlights gentle to avoid harsh glare on mobile screens.
Background: fully transparent PNG (alpha), no drop shadows baked in.
`;