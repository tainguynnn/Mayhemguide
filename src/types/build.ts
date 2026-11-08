import type { AugmentTier } from './gameData';

export interface BuildAugmentEntry {
  uid: string;
  augmentId: number;
  priority: number;
  /** Tier group of this priority augment ('Prismatic' | 'Gold' | 'Silver'). */
  tier?: AugmentTier;
  /** Fixed slot position within its tier group (0..3 for the 4 priority slots). */
  slotIndex?: number;
  synergyNote: string;
  alternativeAugmentIds: number[];
}

export type ItemCategoryKey = 'starting' | 'core' | 'situational' | 'alternative';

export interface BuildItems {
  starting: number[];
  core: number[];
  situational: number[];
  alternative: number[];
}

export interface BuildStatShards {
  offensive: number | null;
  flex: number | null;
  defensive: number | null;
}

export interface BuildNotes {
  gameplay: string;
  synergy: string;
  conditions: string;
  alternatives: string;
  matchups: string;
}

export interface MayhemBuild {
  id: string;
  championId: number;
  name: string;
  favorite: boolean;
  augments: BuildAugmentEntry[];
  items: BuildItems;
  summonerSpells: [number | null, number | null];
  statShards: BuildStatShards;
  notes: BuildNotes;
  createdAt: string;
  updatedAt: string;
}

export interface UserLibraryState {
  schemaVersion: number;
  initialized: boolean;
  favoriteChampionIds: number[];
  builds: MayhemBuild[];
}

export interface LibraryBackupPayload {
  app: 'aram-mayhem-build-library';
  schemaVersion: number;
  exportedAt: string;
  favoriteChampionIds: number[];
  builds: MayhemBuild[];
}

