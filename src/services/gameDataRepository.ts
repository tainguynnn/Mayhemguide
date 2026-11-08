import rawManifest from '../data/manifest.json';
import rawChampions from '../data/champions.json';
import rawAugments from '../data/augments.json';
import rawItems from '../data/items.json';
import rawSpells from '../data/spells.json';
import rawStatShards from '../data/statShards.json';
import type {
  GameAugment,
  GameChampion,
  GameDataBundle,
  GameDataManifest,
  GameItem,
  GameStatShard,
  GameSummonerSpell,
  StatShardSlot,
} from '../types/gameData';

const GAME_DATA_OVERRIDE_KEY = 'aram_mayhem_game_data_override_v1';

export interface GameDataIndex {
  bundle: GameDataBundle;
  isCustomOverride: boolean;
  championById: Map<number, GameChampion>;
  augmentById: Map<number, GameAugment>;
  itemById: Map<number, GameItem>;
  spellById: Map<number, GameSummonerSpell>;
  shardBySlotAndId: Map<string, GameStatShard>;
  shardsBySlot: Record<StatShardSlot, GameStatShard[]>;
}

const DEFAULT_BUNDLE: GameDataBundle = {
  manifest: rawManifest as GameDataManifest,
  champions: rawChampions as GameChampion[],
  augments: rawAugments as GameAugment[],
  items: rawItems as GameItem[],
  summonerSpells: rawSpells as GameSummonerSpell[],
  statShards: rawStatShards as GameStatShard[],
};

export function isValidGameDataBundle(data: unknown): data is GameDataBundle {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Partial<GameDataBundle>;
  return (
    Boolean(obj.manifest && typeof obj.manifest.version === 'string') &&
    Array.isArray(obj.champions) &&
    Array.isArray(obj.augments) &&
    Array.isArray(obj.items) &&
    Array.isArray(obj.summonerSpells) &&
    Array.isArray(obj.statShards)
  );
}

export function loadStoredGameDataOverride(): GameDataBundle | null {
  try {
    const raw = localStorage.getItem(GAME_DATA_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isValidGameDataBundle(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveGameDataOverride(bundle: GameDataBundle): void {
  localStorage.setItem(GAME_DATA_OVERRIDE_KEY, JSON.stringify(bundle));
}

export function clearGameDataOverride(): void {
  localStorage.removeItem(GAME_DATA_OVERRIDE_KEY);
}

export function getDefaultGameDataBundle(): GameDataBundle {
  return DEFAULT_BUNDLE;
}

export function buildGameDataIndex(customBundle?: GameDataBundle | null): GameDataIndex {
  const stored = customBundle ?? loadStoredGameDataOverride();
  const isCustomOverride = Boolean(stored);
  const bundle = stored ?? DEFAULT_BUNDLE;

  const championById = new Map<number, GameChampion>();
  for (const c of bundle.champions) championById.set(c.id, c);

  const augmentById = new Map<number, GameAugment>();
  for (const a of bundle.augments) augmentById.set(a.id, a);

  const itemById = new Map<number, GameItem>();
  for (const i of bundle.items) itemById.set(i.id, i);

  const spellById = new Map<number, GameSummonerSpell>();
  for (const s of bundle.summonerSpells) spellById.set(s.id, s);

  const shardBySlotAndId = new Map<string, GameStatShard>();
  const shardsBySlot: Record<StatShardSlot, GameStatShard[]> = {
    Offensive: [],
    Flex: [],
    Defensive: [],
  };
  for (const shard of bundle.statShards) {
    shardBySlotAndId.set(`${shard.slot}:${shard.id}`, shard);
    if (shardsBySlot[shard.slot]) {
      shardsBySlot[shard.slot].push(shard);
    }
  }

  return {
    bundle,
    isCustomOverride,
    championById,
    augmentById,
    itemById,
    spellById,
    shardBySlotAndId,
    shardsBySlot,
  };
}

