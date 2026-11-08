export type AugmentTier = 'Silver' | 'Gold' | 'Prismatic';

export type ChampionRole = 'Top' | 'Jungle' | 'Mid' | 'ADC' | 'Support';

export type StatShardSlot = 'Offensive' | 'Flex' | 'Defensive';

export interface GameChampion {
  id: number;
  slug: string;
  name: string;
  title: string;
  roles: ChampionRole[];
  classes: string[];
  portraitUrl: string;
  fallbackPortraitUrl: string;
  splashUrl: string;
}

export interface GameAugment {
  id: number;
  apiName: string;
  name: string;
  viName?: string;
  tier: AugmentTier;
  description: string;
  notes?: string;
  iconUrl: string;
  fallbackIconUrl?: string;
  modeStatus: 'active' | 'rotated';
}

export interface GameItem {
  id: number;
  name: string;
  plainDescription: string;
  statsSummary: string[];
  priceTotal: number;
  inStore: boolean;
  isStarter: boolean;
  isBoots: boolean;
  isMayhemExclusive: boolean;
  isCompleted: boolean;
  categories: string[];
  iconUrl: string;
  fallbackIconUrl: string;
}

export interface GameSummonerSpell {
  id: number;
  name: string;
  viName?: string;
  description: string;
  viDescription?: string;
  cooldown: number;
  iconUrl: string;
  fallbackIconUrl: string;
}

export interface GameStatShard {
  id: number;
  name: string;
  viName?: string;
  shortDesc: string;
  viShortDesc?: string;
  slot: StatShardSlot;
  iconUrl: string;
}

export interface GameDataSourceInfo {
  name: string;
  url: string;
}

export interface GameDataManifest {
  version: string;
  mode: string;
  updatedAt: string;
  sources: GameDataSourceInfo[];
  counts: {
    champions: number;
    augments: number;
    items: number;
    summonerSpells: number;
    statShards: number;
  };
}

export interface GameDataBundle {
  manifest: GameDataManifest;
  champions: GameChampion[];
  augments: GameAugment[];
  items: GameItem[];
  summonerSpells: GameSummonerSpell[];
  statShards: GameStatShard[];
}

