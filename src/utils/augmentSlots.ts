import type { BuildAugmentEntry } from '../types/build';
import type { AugmentTier, GameAugment } from '../types/gameData';
import { TIER_ORDER } from './formatters';

export const SLOTS_PER_TIER = 4;

export type TierSlotGrid = Record<AugmentTier, Array<BuildAugmentEntry | null>>;

export function createEmptyTierSlotGrid(): TierSlotGrid {
  return {
    Prismatic: [null, null, null, null],
    Gold: [null, null, null, null],
    Silver: [null, null, null, null],
  };
}

/**
 * Convert a build's flat `augments` array into the 3×4 Priority Augment grid
 * (4 Prismatic, 4 Gold, 4 Silver) without mixing tiers or auto-filling empty slots.
 */
export function buildTierSlotGrid(
  entries: BuildAugmentEntry[],
  augmentById: Map<number, GameAugment>
): TierSlotGrid {
  const grid = createEmptyTierSlotGrid();
  const sorted = [...entries].sort((a, b) => a.priority - b.priority);
  const overflowByTier: Record<AugmentTier, BuildAugmentEntry[]> = {
    Prismatic: [],
    Gold: [],
    Silver: [],
  };

  for (const entry of sorted) {
    const aug = augmentById.get(entry.augmentId);
    const tier: AugmentTier | undefined = aug?.tier ?? entry.tier;
    if (!tier) continue;

    const normalized: BuildAugmentEntry = {
      ...entry,
      tier,
    };

    if (
      typeof entry.slotIndex === 'number' &&
      entry.slotIndex >= 0 &&
      entry.slotIndex < SLOTS_PER_TIER &&
      grid[tier][entry.slotIndex] === null
    ) {
      grid[tier][entry.slotIndex] = { ...normalized, slotIndex: entry.slotIndex };
    } else {
      overflowByTier[tier].push(normalized);
    }
  }

  for (const tier of TIER_ORDER) {
    for (const entry of overflowByTier[tier]) {
      const emptyIdx = grid[tier].findIndex((s) => s === null);
      if (emptyIdx !== -1) {
        grid[tier][emptyIdx] = { ...entry, slotIndex: emptyIdx };
      }
    }
  }

  return grid;
}

/**
 * Flatten a 3×4 Priority Augment grid back into `BuildAugmentEntry[]` for storage,
 * preserving exact `tier` and `slotIndex` (0..3) so empty slots stay empty.
 */
export function flattenTierSlotGrid(grid: TierSlotGrid): BuildAugmentEntry[] {
  const result: BuildAugmentEntry[] = [];
  let priority = 1;
  for (const tier of TIER_ORDER) {
    const row = grid[tier];
    for (let slotIndex = 0; slotIndex < SLOTS_PER_TIER; slotIndex++) {
      const entry = row[slotIndex];
      if (entry) {
        result.push({
          ...entry,
          tier,
          slotIndex,
          priority: priority++,
        });
      }
    }
  }
  return result;
}

