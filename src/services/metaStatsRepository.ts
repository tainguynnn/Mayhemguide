import rawMetaStats from '../data/meta/metaStats.json';
import type {
  AugmentMetaStat,
  ChampionAugmentMatrixFile,
  ChampionAugmentStat,
  ChampionAugmentTuple,
  ChampionMetaStat,
  MetaStatsBundle,
  MetaTier,
  SynergyTuple,
} from '../types/meta';

const META_OVERRIDE_KEY = 'aram_mayhem_meta_stats_override_v1';

export const META_TIER_RANK: Record<MetaTier, number> = {
  S: 0,
  A: 1,
  B: 2,
  C: 3,
  D: 4,
};

export interface MetaStatsIndex {
  bundle: MetaStatsBundle;
  isCustomOverride: boolean;
  championById: Map<number, ChampionMetaStat>;
  augmentById: Map<number, AugmentMetaStat>;
  synergyByAugmentId: Map<number, SynergyTuple[]>;
}

const DEFAULT_META_BUNDLE = rawMetaStats as unknown as MetaStatsBundle;

export function isValidMetaStatsBundle(data: unknown): data is MetaStatsBundle {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Partial<MetaStatsBundle>;
  return (
    typeof obj.patch === 'string' &&
    typeof obj.dataDate === 'string' &&
    Boolean(obj.source && typeof obj.source.name === 'string') &&
    Array.isArray(obj.champions) &&
    Array.isArray(obj.augments)
  );
}

export function loadStoredMetaOverride(): MetaStatsBundle | null {
  try {
    const raw = localStorage.getItem(META_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidMetaStatsBundle(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveMetaOverride(bundle: MetaStatsBundle): void {
  localStorage.setItem(META_OVERRIDE_KEY, JSON.stringify(bundle));
}

export function clearMetaOverride(): void {
  localStorage.removeItem(META_OVERRIDE_KEY);
}

export function getDefaultMetaStatsBundle(): MetaStatsBundle {
  return DEFAULT_META_BUNDLE;
}

export function buildMetaStatsIndex(customBundle?: MetaStatsBundle | null): MetaStatsIndex {
  const stored = customBundle ?? loadStoredMetaOverride();
  const isCustomOverride = Boolean(stored);
  const bundle: MetaStatsBundle = stored
    ? { ...stored, dataKind: stored.dataKind || 'manual' }
    : DEFAULT_META_BUNDLE;

  const championById = new Map<number, ChampionMetaStat>();
  for (const c of bundle.champions) championById.set(c.championId, c);

  const augmentById = new Map<number, AugmentMetaStat>();
  for (const a of bundle.augments) augmentById.set(a.augmentId, a);

  const synergyByAugmentId = new Map<number, SynergyTuple[]>();
  for (const [k, rows] of Object.entries(bundle.augmentSynergy ?? {})) {
    synergyByAugmentId.set(Number(k), rows);
  }

  return {
    bundle,
    isCustomOverride,
    championById,
    augmentById,
    synergyByAugmentId,
  };
}

let cachedMatrixPromise: Promise<Record<string, ChampionAugmentTuple[]>> | null = null;

/**
 * Lazy-loads the 173×~120 per-champion augment matrix so it only downloads when
 * the user filters the Augment Tier List by champion.
 */
export async function loadChampionAugmentMatrix(
  customBundle?: MetaStatsBundle | null
): Promise<Map<number, Map<number, ChampionAugmentStat>>> {
  const inline = customBundle?.championAugments;
  const raw =
    inline ??
    (await (cachedMatrixPromise ??= import('../data/meta/championAugments.json').then(
      (m) => (m.default as unknown as ChampionAugmentMatrixFile).champions
    )));

  const out = new Map<number, Map<number, ChampionAugmentStat>>();
  for (const [champId, list] of Object.entries(raw)) {
    const inner = new Map<number, ChampionAugmentStat>();
    for (const [augmentId, winRate, pickRate, matches, lift] of list) {
      inner.set(augmentId, { augmentId, winRate, pickRate, matches, lift });
    }
    out.set(Number(champId), inner);
  }
  return out;
}

