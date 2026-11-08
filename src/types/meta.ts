import type { AugmentTier } from './gameData';

/** Meta tier assigned by the statistics source (not the augment rarity). */
export type MetaTier = 'S' | 'A' | 'B' | 'C' | 'D';

/**
 * - real:   copied verbatim from a verified ARAM: Mayhem statistics source
 * - manual: entered/imported by the user (shown with a warning label)
 * - sample: illustrative placeholder data, never presented as real
 */
export type MetaDataKind = 'real' | 'manual' | 'sample';

export interface ChampionMetaStat {
  championId: number;
  tier: MetaTier;
  rank: number;
  winRate: number;
  pickRate: number;
  matches: number;
  /** Source-specific "optimal" win rate (used by the source to rank tiers). */
  optimalWinRate?: number | null;
}

export interface AugmentStageStat {
  winRate: number;
  pickRate: number;
  matches: number;
  tier?: MetaTier;
}

export interface AugmentMetaStat {
  augmentId: number;
  /** Rarity reported by the source — informational; the UI uses game data rarity. */
  rarity?: AugmentTier;
  tier: MetaTier;
  rank: number;
  winRate: number;
  pickRate: number;
  matches: number;
  /** Performance by augment pick (1–4) in ARAM: Mayhem. */
  stages?: Record<string, AugmentStageStat>;
}

/** [championId, winRateWithAugment, lift, pickRate, matches] */
export type SynergyTuple = [number, number, number, number, number];

/** [augmentId, winRate, pickRate, matches, lift] */
export type ChampionAugmentTuple = [number, number, number, number, number];

export interface MetaStatsBundle {
  schemaVersion: number;
  dataKind: MetaDataKind;
  mode: string;
  patch: string;
  dataDate: string;
  fetchedAt?: string;
  totalMatches?: number;
  minSampleSize?: number;
  source: { name: string; url: string; note?: string };
  synergyMethod?: { minMatches: number; topN: number; description: string };
  champions: ChampionMetaStat[];
  augments: AugmentMetaStat[];
  augmentSynergy?: Record<string, SynergyTuple[]>;
  /** Optional inline per-champion augment matrix (for manual/imported bundles). */
  championAugments?: Record<string, ChampionAugmentTuple[]>;
}

export interface ChampionAugmentMatrixFile {
  patch: string;
  dataDate: string;
  columns: string[];
  champions: Record<string, ChampionAugmentTuple[]>;
}

export interface ChampionAugmentStat {
  augmentId: number;
  winRate: number;
  pickRate: number;
  matches: number;
  lift: number;
}

