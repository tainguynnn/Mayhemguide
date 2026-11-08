import type { LibraryBackupPayload, MayhemBuild, UserLibraryState } from '../types/build';
import { createSeedBuilds } from './seedBuilds';

const STORAGE_KEY = 'aram_mayhem_build_library_v1';

export function createEmptyState(initialized = true): UserLibraryState {
  return {
    schemaVersion: 1,
    initialized,
    favoriteChampionIds: [],
    builds: [],
  };
}

export function loadLibraryState(): UserLibraryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded: UserLibraryState = {
        schemaVersion: 1,
        initialized: true,
        favoriteChampionIds: [202, 103, 31],
        builds: createSeedBuilds(),
      };
      saveLibraryState(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as Partial<UserLibraryState>;
    if (!parsed || !Array.isArray(parsed.builds)) {
      return createEmptyState(true);
    }
    return {
      schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1,
      initialized: true,
      favoriteChampionIds: Array.isArray(parsed.favoriteChampionIds)
        ? parsed.favoriteChampionIds.filter((id): id is number => typeof id === 'number')
        : [],
      builds: parsed.builds.map(normalizeBuild),
    };
  } catch {
    return createEmptyState(true);
  }
}

export function saveLibraryState(state: UserLibraryState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function normalizeBuild(raw: Partial<MayhemBuild>): MayhemBuild {
  const now = new Date().toISOString();
  const spells = Array.isArray(raw.summonerSpells) ? raw.summonerSpells : [4, 32];
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : generateId(),
    championId: typeof raw.championId === 'number' ? raw.championId : 1,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Bộ build chưa đặt tên',
    favorite: Boolean(raw.favorite),
    augments: Array.isArray(raw.augments)
      ? raw.augments.map((a, idx) => ({
          uid: typeof a.uid === 'string' ? a.uid : `aug-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          augmentId: Number(a.augmentId),
          priority: typeof a.priority === 'number' ? a.priority : idx + 1,
          tier:
            a.tier === 'Prismatic' || a.tier === 'Gold' || a.tier === 'Silver'
              ? a.tier
              : undefined,
          slotIndex:
            typeof a.slotIndex === 'number' && a.slotIndex >= 0 && a.slotIndex < 4
              ? a.slotIndex
              : undefined,
          synergyNote: typeof a.synergyNote === 'string' ? a.synergyNote : '',
          alternativeAugmentIds: Array.isArray(a.alternativeAugmentIds)
            ? a.alternativeAugmentIds.filter((id): id is number => typeof id === 'number')
            : [],
        }))
      : [],
    items: {
      starting: Array.isArray(raw.items?.starting) ? raw.items.starting.map(Number) : [],
      core: Array.isArray(raw.items?.core) ? raw.items.core.map(Number) : [],
      situational: Array.isArray(raw.items?.situational) ? raw.items.situational.map(Number) : [],
      alternative: Array.isArray(raw.items?.alternative) ? raw.items.alternative.map(Number) : [],
    },
    summonerSpells: [
      typeof spells[0] === 'number' ? spells[0] : null,
      typeof spells[1] === 'number' ? spells[1] : null,
    ],
    statShards: {
      offensive: typeof raw.statShards?.offensive === 'number' ? raw.statShards.offensive : null,
      flex: typeof raw.statShards?.flex === 'number' ? raw.statShards.flex : null,
      defensive: typeof raw.statShards?.defensive === 'number' ? raw.statShards.defensive : null,
    },
    notes: {
      gameplay: typeof raw.notes?.gameplay === 'string' ? raw.notes.gameplay : '',
      synergy: typeof raw.notes?.synergy === 'string' ? raw.notes.synergy : '',
      conditions: typeof raw.notes?.conditions === 'string' ? raw.notes.conditions : '',
      alternatives: typeof raw.notes?.alternatives === 'string' ? raw.notes.alternatives : '',
      matchups: typeof raw.notes?.matchups === 'string' ? raw.notes.matchups : '',
    },
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
  };
}

export function generateId(prefix = 'build'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createBackupPayload(state: UserLibraryState): LibraryBackupPayload {
  return {
    app: 'aram-mayhem-build-library',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    favoriteChampionIds: state.favoriteChampionIds,
    builds: state.builds,
  };
}

export function parseBackupPayload(jsonText: string): {
  ok: true;
  favoriteChampionIds: number[];
  builds: MayhemBuild[];
} | {
  ok: false;
  error: string;
} {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'File JSON không đúng cấu trúc đối tượng.' };
    }
    if (!Array.isArray(parsed.builds)) {
      return { ok: false, error: 'Không tìm thấy mảng "builds" trong file JSON.' };
    }
    const builds = parsed.builds
      .filter((b: unknown) => Boolean(b && typeof b === 'object'))
      .map((b: Partial<MayhemBuild>) => normalizeBuild(b));
    const favoriteChampionIds = Array.isArray(parsed.favoriteChampionIds)
      ? parsed.favoriteChampionIds.filter((id: unknown): id is number => typeof id === 'number')
      : [];

    return { ok: true, favoriteChampionIds, builds };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Không thể phân tích cú pháp JSON.',
    };
  }
}

