import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { MayhemBuild, UserLibraryState } from '../types/build';
import type { GameDataBundle } from '../types/gameData';
import type { MetaStatsBundle } from '../types/meta';
import {
  buildGameDataIndex,
  clearGameDataOverride,
  saveGameDataOverride,
  type GameDataIndex,
} from '../services/gameDataRepository';
import {
  buildMetaStatsIndex,
  clearMetaOverride,
  saveMetaOverride,
  type MetaStatsIndex,
} from '../services/metaStatsRepository';
import {
  createEmptyState,
  generateId,
  loadLibraryState,
  saveLibraryState,
} from '../services/buildStorage';
import { createSeedBuilds } from '../services/seedBuilds';

export interface ToastMessage {
  id: string;
  text: string;
  tone?: 'default' | 'warning';
}

interface LibraryContextValue {
  gameData: GameDataIndex;
  metaStats: MetaStatsIndex;
  library: UserLibraryState;
  toasts: ToastMessage[];
  notify: (text: string, tone?: 'default' | 'warning') => void;
  toggleFavoriteChampion: (championId: number) => void;
  saveBuild: (build: MayhemBuild) => MayhemBuild;
  duplicateBuild: (buildId: string) => MayhemBuild | null;
  deleteBuild: (buildId: string) => void;
  toggleFavoriteBuild: (buildId: string) => void;
  importBackup: (
    builds: MayhemBuild[],
    favoriteChampionIds: number[],
    mode: 'merge' | 'replace'
  ) => void;
  restoreSampleBuilds: () => void;
  clearAllBuilds: () => void;
  updateGameDataBundle: (bundle: GameDataBundle) => void;
  resetGameDataBundle: () => void;
  updateMetaStatsBundle: (bundle: MetaStatsBundle) => void;
  resetMetaStatsBundle: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [gameData, setGameData] = useState<GameDataIndex>(() => buildGameDataIndex());
  const [metaStats, setMetaStats] = useState<MetaStatsIndex>(() => buildMetaStatsIndex());
  const [library, setLibrary] = useState<UserLibraryState>(() => loadLibraryState());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    saveLibraryState(library);
  }, [library]);

  const notify = useCallback((text: string, tone: 'default' | 'warning' = 'default') => {
    const id = generateId('toast');
    setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const toggleFavoriteChampion = useCallback((championId: number) => {
    setLibrary((prev) => {
      const exists = prev.favoriteChampionIds.includes(championId);
      return {
        ...prev,
        favoriteChampionIds: exists
          ? prev.favoriteChampionIds.filter((id) => id !== championId)
          : [...prev.favoriteChampionIds, championId],
      };
    });
  }, []);

  const saveBuild = useCallback((incoming: MayhemBuild): MayhemBuild => {
    const now = new Date().toISOString();
    let savedRecord: MayhemBuild = incoming;
    setLibrary((prev) => {
      const existsIdx = prev.builds.findIndex((b) => b.id === incoming.id);
      if (existsIdx >= 0) {
        savedRecord = {
          ...incoming,
          updatedAt: now,
        };
        const next = [...prev.builds];
        next[existsIdx] = savedRecord;
        return { ...prev, builds: next };
      }
      savedRecord = {
        ...incoming,
        id: incoming.id || generateId('build'),
        createdAt: incoming.createdAt || now,
        updatedAt: now,
      };
      return { ...prev, builds: [savedRecord, ...prev.builds] };
    });
    return savedRecord;
  }, []);

  const duplicateBuild = useCallback(
    (buildId: string): MayhemBuild | null => {
      const target = library.builds.find((b) => b.id === buildId);
      if (!target) return null;
      const now = new Date().toISOString();
      const copy: MayhemBuild = {
        ...target,
        id: generateId('build'),
        name: `${target.name} (Bản sao)`,
        favorite: false,
        augments: target.augments.map((a) => ({
          ...a,
          uid: generateId('aug'),
          alternativeAugmentIds: [...a.alternativeAugmentIds],
        })),
        items: {
          starting: [...target.items.starting],
          core: [...target.items.core],
          situational: [...target.items.situational],
          alternative: [...target.items.alternative],
        },
        summonerSpells: [...target.summonerSpells] as [number | null, number | null],
        statShards: { ...target.statShards },
        notes: { ...target.notes },
        createdAt: now,
        updatedAt: now,
      };
      setLibrary((prev) => ({
        ...prev,
        builds: [copy, ...prev.builds],
      }));
      notify(`Đã nhân bản build "${target.name}"`);
      return copy;
    },
    [library.builds, notify]
  );

  const deleteBuild = useCallback(
    (buildId: string) => {
      setLibrary((prev) => ({
        ...prev,
        builds: prev.builds.filter((b) => b.id !== buildId),
      }));
      notify('Đã xóa build');
    },
    [notify]
  );

  const toggleFavoriteBuild = useCallback((buildId: string) => {
    setLibrary((prev) => ({
      ...prev,
      builds: prev.builds.map((b) => (b.id === buildId ? { ...b, favorite: !b.favorite } : b)),
    }));
  }, []);

  const importBackup = useCallback(
    (builds: MayhemBuild[], favoriteChampionIds: number[], mode: 'merge' | 'replace') => {
      setLibrary((prev) => {
        if (mode === 'replace') {
          return {
            schemaVersion: 1,
            initialized: true,
            favoriteChampionIds: [...new Set(favoriteChampionIds)],
            builds,
          };
        }
        const existingMap = new Map(prev.builds.map((b) => [b.id, b]));
        for (const b of builds) {
          existingMap.set(b.id, b);
        }
        return {
          schemaVersion: 1,
          initialized: true,
          favoriteChampionIds: [...new Set([...prev.favoriteChampionIds, ...favoriteChampionIds])],
          builds: [...existingMap.values()],
        };
      });
      notify(
        mode === 'replace'
          ? `Đã khôi phục ${builds.length} build từ bản sao lưu`
          : `Đã gộp ${builds.length} build vào thư viện`
      );
    },
    [notify]
  );

  const restoreSampleBuilds = useCallback(() => {
    const samples = createSeedBuilds();
    setLibrary((prev) => {
      const existingIds = new Set(prev.builds.map((b) => b.id));
      const newOnes = samples.filter((s) => !existingIds.has(s.id));
      return {
        ...prev,
        favoriteChampionIds: [...new Set([...prev.favoriteChampionIds, 202, 103, 31])],
        builds: [...newOnes, ...prev.builds],
      };
    });
    notify('Đã nạp lại các bộ build mẫu ARAM: Mayhem');
  }, [notify]);

  const clearAllBuilds = useCallback(() => {
    setLibrary(createEmptyState(true));
    notify('Đã xóa toàn bộ build trong thư viện');
  }, [notify]);

  const updateGameDataBundle = useCallback(
    (bundle: GameDataBundle) => {
      saveGameDataOverride(bundle);
      setGameData(buildGameDataIndex(bundle));
      notify(`Đã cập nhật dữ liệu game lên phiên bản ${bundle.manifest.version}`);
    },
    [notify]
  );

  const resetGameDataBundle = useCallback(() => {
    clearGameDataOverride();
    setGameData(buildGameDataIndex(null));
    notify('Đã khôi phục dữ liệu game mặc định');
  }, [notify]);

  const updateMetaStatsBundle = useCallback(
    (bundle: MetaStatsBundle) => {
      saveMetaOverride(bundle);
      setMetaStats(buildMetaStatsIndex(bundle));
      notify(`Đã cập nhật dữ liệu thống kê Meta (Patch ${bundle.patch})`);
    },
    [notify]
  );

  const resetMetaStatsBundle = useCallback(() => {
    clearMetaOverride();
    setMetaStats(buildMetaStatsIndex(null));
    notify('Đã khôi phục thống kê Meta mặc định');
  }, [notify]);

  const value = useMemo<LibraryContextValue>(
    () => ({
      gameData,
      metaStats,
      library,
      toasts,
      notify,
      toggleFavoriteChampion,
      saveBuild,
      duplicateBuild,
      deleteBuild,
      toggleFavoriteBuild,
      importBackup,
      restoreSampleBuilds,
      clearAllBuilds,
      updateGameDataBundle,
      resetGameDataBundle,
      updateMetaStatsBundle,
      resetMetaStatsBundle,
    }),
    [
      gameData,
      metaStats,
      library,
      toasts,
      notify,
      toggleFavoriteChampion,
      saveBuild,
      duplicateBuild,
      deleteBuild,
      toggleFavoriteBuild,
      importBackup,
      restoreSampleBuilds,
      clearAllBuilds,
      updateGameDataBundle,
      resetGameDataBundle,
      updateMetaStatsBundle,
      resetMetaStatsBundle,
    ]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}

