import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownUp,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  ExternalLink,
  Filter,
  FlaskConical,
  Plus,
  Search,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import {
  loadChampionAugmentMatrix,
  META_TIER_RANK,
} from '../../services/metaStatsRepository';
import type { AugmentTier, ChampionRole } from '../../types/gameData';
import type { ChampionAugmentStat, MetaTier } from '../../types/meta';
import {
  cn,
  formatCompactNumber,
  formatDateVi,
  formatPercent,
  normalizeSearch,
  TIER_META,
} from '../../utils/formatters';
import { GameIcon } from '../ui/GameIcon';
import { MetaTierBadge } from '../ui/MetaTierBadge';
import { TierBadge, TierGlyph } from '../ui/TierBadge';
import { AugmentDetailModal } from '../augments/AugmentDetailModal';

interface TierListViewProps {
  onSelectChampion: (championId: number) => void;
  onCreateBuild: (championId?: number, augmentId?: number) => void;
  onOpenAugmentLibrary: (augmentId?: number) => void;
  onOpenDataManager: () => void;
}

export type TierSortField = 'tier' | 'winRate' | 'pickRate';
export type SortDirection = 'desc' | 'asc';

const ROLE_OPTIONS: Array<'ALL' | ChampionRole> = [
  'ALL',
  'Top',
  'Jungle',
  'Mid',
  'ADC',
  'Support',
];

const META_TIER_FILTERS: Array<'ALL' | MetaTier> = ['ALL', 'S', 'A', 'B', 'C', 'D'];
const AUGMENT_RARITY_FILTERS: Array<'ALL' | AugmentTier> = [
  'ALL',
  'Prismatic',
  'Gold',
  'Silver',
];

const DEFAULT_TOP_COUNT = 8;
const STEP_EXPAND_COUNT = 24;

function deriveChampionAugmentTier(winRate: number, lift: number): MetaTier {
  if (lift >= 4.5 || winRate >= 58) return 'S';
  if (lift >= 1.8 || winRate >= 54.5) return 'A';
  if (lift >= -1.0 || winRate >= 50.5) return 'B';
  if (lift >= -3.5 || winRate >= 47.5) return 'C';
  return 'D';
}

export function TierListView({
  onSelectChampion,
  onCreateBuild,
  onOpenAugmentLibrary,
  onOpenDataManager,
}: TierListViewProps) {
  const { gameData, metaStats, library } = useLibrary();

  // Shared sorting & filtering state
  const [sortBy, setSortBy] = useState<TierSortField>('tier');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [rarityFilter, setRarityFilter] = useState<'ALL' | AugmentTier>('ALL');
  const [metaTierFilter, setMetaTierFilter] = useState<'ALL' | MetaTier>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | ChampionRole>('ALL');
  const [selectedChampionId, setSelectedChampionId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Champion selector dropdown state
  const [champDropdownOpen, setChampDropdownOpen] = useState(false);
  const [champDropdownSearch, setChampDropdownSearch] = useState('');
  const champDropdownRef = useRef<HTMLDivElement>(null);

  // Per-section expansion limits (default 8)
  const [champLimit, setChampLimit] = useState<number>(DEFAULT_TOP_COUNT);
  const [augLimit, setAugLimit] = useState<number>(DEFAULT_TOP_COUNT);
  const [detailModalAugmentId, setDetailModalAugmentId] = useState<number | null>(null);

  // Lazy-loaded per-champion augment matrix
  const [champAugMatrix, setChampAugMatrix] = useState<
    Map<number, Map<number, ChampionAugmentStat>> | null
  >(null);
  const [matrixLoading, setMatrixLoading] = useState(false);

  useEffect(() => {
    if (selectedChampionId != null && !champAugMatrix && !matrixLoading) {
      setMatrixLoading(true);
      loadChampionAugmentMatrix(
        metaStats.isCustomOverride ? metaStats.bundle : null
      )
        .then((m) => setChampAugMatrix(m))
        .catch(() => setChampAugMatrix(new Map()))
        .finally(() => setMatrixLoading(false));
    }
  }, [selectedChampionId, champAugMatrix, matrixLoading, metaStats]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        champDropdownRef.current &&
        !champDropdownRef.current.contains(e.target as Node)
      ) {
        setChampDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const buildCountByChamp = useMemo(() => {
    const map = new Map<number, number>();
    for (const b of library.builds) {
      map.set(b.championId, (map.get(b.championId) || 0) + 1);
    }
    return map;
  }, [library.builds]);

  const selectedChampion =
    selectedChampionId != null
      ? gameData.championById.get(selectedChampionId) ?? null
      : null;

  const selectedChampionStat =
    selectedChampionId != null
      ? metaStats.championById.get(selectedChampionId) ?? null
      : null;

  const dropdownChampions = useMemo(() => {
    const q = normalizeSearch(champDropdownSearch.trim());
    return [...gameData.bundle.champions]
      .filter((c) => !q || normalizeSearch(c.name).includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [gameData.bundle.champions, champDropdownSearch]);

  // 1. Champion Tier List rows
  const championRows = useMemo(() => {
    const q = normalizeSearch(searchQuery.trim());
    const dirMultiplier = sortDir === 'desc' ? 1 : -1;

    const list = metaStats.bundle.champions
      .map((stat) => {
        const champ = gameData.championById.get(stat.championId);
        if (!champ) return null;
        return { champ, stat };
      })
      .filter((row): row is NonNullable<typeof row> => {
        if (!row) return false;
        if (selectedChampionId != null && row.champ.id !== selectedChampionId) {
          return false;
        }
        if (roleFilter !== 'ALL' && !row.champ.roles.includes(roleFilter)) {
          return false;
        }
        if (metaTierFilter !== 'ALL' && row.stat.tier !== metaTierFilter) {
          return false;
        }
        if (q && !normalizeSearch(row.champ.name).includes(q)) {
          return false;
        }
        return true;
      });

    list.sort((a, b) => {
      if (sortBy === 'winRate') {
        return (b.stat.winRate - a.stat.winRate) * dirMultiplier;
      }
      if (sortBy === 'pickRate') {
        return (b.stat.pickRate - a.stat.pickRate) * dirMultiplier;
      }
      // Sort by Tier (S -> D, then rank 1 -> 173 for 'desc'; reversed for 'asc')
      const tierDiff = META_TIER_RANK[a.stat.tier] - META_TIER_RANK[b.stat.tier];
      const rankDiff = a.stat.rank - b.stat.rank;
      return (tierDiff || rankDiff) * dirMultiplier;
    });

    return list;
  }, [
    metaStats.bundle.champions,
    gameData.championById,
    selectedChampionId,
    roleFilter,
    metaTierFilter,
    searchQuery,
    sortBy,
    sortDir,
  ]);

  // 2. Augment Tier List rows (global OR filtered by selected champion)
  const augmentRows = useMemo(() => {
    const q = normalizeSearch(searchQuery.trim());
    const dirMultiplier = sortDir === 'desc' ? 1 : -1;
    const champAugMap =
      selectedChampionId != null && champAugMatrix
        ? champAugMatrix.get(selectedChampionId)
        : null;

    const rows: Array<{
      aug: NonNullable<ReturnType<typeof gameData.augmentById.get>>;
      tier: MetaTier;
      rank: number;
      winRate: number;
      pickRate: number;
      matches: number;
      lift?: number;
    }> = [];

    if (selectedChampionId != null && champAugMap) {
      const entries = [...champAugMap.values()].sort(
        (a, b) => b.lift - a.lift || b.winRate - a.winRate
      );
      entries.forEach((cStat, idx) => {
        const aug = gameData.augmentById.get(cStat.augmentId);
        if (!aug) return;
        const derivedTier = deriveChampionAugmentTier(cStat.winRate, cStat.lift);
        rows.push({
          aug,
          tier: derivedTier,
          rank: idx + 1,
          winRate: cStat.winRate,
          pickRate: cStat.pickRate,
          matches: cStat.matches,
          lift: cStat.lift,
        });
      });
    } else {
      for (const stat of metaStats.bundle.augments) {
        const aug = gameData.augmentById.get(stat.augmentId);
        if (!aug) continue;
        rows.push({
          aug,
          tier: stat.tier,
          rank: stat.rank,
          winRate: stat.winRate,
          pickRate: stat.pickRate,
          matches: stat.matches,
        });
      }
    }

    const filtered = rows.filter((row) => {
      if (rarityFilter !== 'ALL' && row.aug.tier !== rarityFilter) return false;
      if (metaTierFilter !== 'ALL' && row.tier !== metaTierFilter) return false;
      if (q) {
        const matchName =
          normalizeSearch(row.aug.name).includes(q) ||
          (row.aug.viName && normalizeSearch(row.aug.viName).includes(q));
        if (!matchName) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'winRate') {
        return (b.winRate - a.winRate) * dirMultiplier;
      }
      if (sortBy === 'pickRate') {
        return (b.pickRate - a.pickRate) * dirMultiplier;
      }
      const tierDiff = META_TIER_RANK[a.tier] - META_TIER_RANK[b.tier];
      const rankDiff = a.rank - b.rank;
      return (tierDiff || rankDiff) * dirMultiplier;
    });

    return filtered;
  }, [
    metaStats.bundle.augments,
    gameData.augmentById,
    selectedChampionId,
    champAugMatrix,
    rarityFilter,
    metaTierFilter,
    searchQuery,
    sortBy,
    sortDir,
  ]);

  const visibleChampions = championRows.slice(0, champLimit);
  const visibleAugments = augmentRows.slice(0, augLimit);

  const dataKindMeta = t.dataKind[metaStats.bundle.dataKind || 'real'];
  const hasActiveFilters =
    rarityFilter !== 'ALL' ||
    metaTierFilter !== 'ALL' ||
    roleFilter !== 'ALL' ||
    selectedChampionId !== null ||
    Boolean(searchQuery.trim());

  const resetAllFilters = () => {
    setRarityFilter('ALL');
    setMetaTierFilter('ALL');
    setRoleFilter('ALL');
    setSelectedChampionId(null);
    setSearchQuery('');
    setSortBy('tier');
    setSortDir('desc');
    setChampLimit(DEFAULT_TOP_COUNT);
    setAugLimit(DEFAULT_TOP_COUNT);
  };

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Hero & Data Provenance Header */}
      <section className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-black px-2.5 py-0.5 text-[11px] font-semibold">
                <Trophy className="h-3 w-3" />
                <span>ARAM: Mayhem Meta</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/15 px-2.5 py-0.5 font-mono-num text-[11px] text-white/85">
                Phiên bản {metaStats.bundle.patch}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/10 px-2.5 py-0.5 text-[11px] text-white/65">
                Cập nhật: {formatDateVi(metaStats.bundle.dataDate)}
              </span>

              {metaStats.bundle.totalMatches && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] border border-white/10 px-2.5 py-0.5 font-mono-num text-[11px] text-white/65">
                  {formatCompactNumber(metaStats.bundle.totalMatches)} trận
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white tracking-tight">
              Bảng Xếp Hạng Meta ARAM: Mayhem
            </h1>
            <p className="text-xs sm:text-sm text-white/55 max-w-3xl">
              Theo dõi những vị tướng và Lõi Công Nghệ (Augments) có hiệu suất thực chiến cao nhất trong chế độ ARAM: Mayhem.
            </p>
          </div>

          {/* Data Accuracy & Source Attribution Card */}
          <div className="liquid-glass-subtle rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2 lg:max-w-sm shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border',
                  metaStats.bundle.dataKind === 'real'
                    ? 'bg-white/12 text-white border-white/25'
                    : 'bg-white/[0.06] text-white/75 border-white/15'
                )}
              >
                {metaStats.bundle.dataKind === 'real' ? (
                  <CheckCircle2 className="h-3 w-3 text-white" />
                ) : (
                  <FlaskConical className="h-3 w-3 text-white/70" />
                )}
                <span>{dataKindMeta.badge}</span>
              </span>

              <button
                type="button"
                onClick={onOpenDataManager}
                className="inline-flex items-center gap-1 text-[11px] text-white/55 hover:text-white transition-colors"
                title="Kiểm tra hoặc cập nhật gói dữ liệu thống kê"
              >
                <Database className="h-3 w-3" />
                <span>Dữ liệu</span>
              </button>
            </div>

            <p className="text-[11px] text-white/55 leading-relaxed">
              Nguồn:{' '}
              <a
                href={metaStats.bundle.source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-white/85 hover:text-white underline underline-offset-2"
              >
                <span>{metaStats.bundle.source.name}</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>{' '}
              — Chỉ tính thống kê chế độ ARAM: Mayhem (loại trừ mẫu dưới{' '}
              {metaStats.bundle.minSampleSize ?? 200} trận).
            </p>
          </div>
        </div>

        {/* Unified Sorting & Filtering Bar */}
        <div className="pt-3 border-t border-white/[0.08] space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            {/* Search input */}
            <div className="md:col-span-4 relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh tên tướng hoặc tên lõi công nghệ..."
                className="liquid-input w-full rounded-xl pl-9 pr-8 py-2 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Xóa từ khóa"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Champion Filter Dropdown */}
            <div ref={champDropdownRef} className="md:col-span-4 relative">
              <button
                type="button"
                onClick={() => setChampDropdownOpen((o) => !o)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs border transition-colors',
                  selectedChampion
                    ? 'bg-white/[0.12] border-white/35 text-white'
                    : 'liquid-input text-white/75 hover:border-white/25'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {selectedChampion ? (
                    <>
                      <GameIcon
                        src={selectedChampion.portraitUrl}
                        fallbackSrc={selectedChampion.fallbackPortraitUrl}
                        alt={selectedChampion.name}
                        className="h-5 w-5 rounded-md"
                      />
                      <span className="font-medium text-white truncate">
                        Lọc theo tướng: {selectedChampion.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Filter className="h-3.5 w-3.5 text-white/45 shrink-0" />
                      <span className="truncate">Lọc theo tướng (Tất cả tướng)</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {selectedChampion && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChampionId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          setSelectedChampionId(null);
                        }
                      }}
                      title="Bỏ lọc tướng"
                      className="rounded p-0.5 hover:bg-white/15 text-white/60 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-white/45" />
                </div>
              </button>

              {champDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1.5 z-30 liquid-glass-elevated rounded-2xl p-2.5 space-y-2 shadow-2xl">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
                    <input
                      value={champDropdownSearch}
                      onChange={(e) => setChampDropdownSearch(e.target.value)}
                      placeholder="Nhập tên tướng để lọc..."
                      autoFocus
                      className="liquid-input w-full rounded-lg pl-8 pr-3 py-1.5 text-xs"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChampionId(null);
                        setChampDropdownOpen(false);
                        setChampDropdownSearch('');
                      }}
                      className={cn(
                        'w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors',
                        selectedChampionId === null
                          ? 'bg-white text-black font-semibold'
                          : 'text-white/75 hover:bg-white/[0.08]'
                      )}
                    >
                      <span>Tất cả tướng (Toàn bộ Meta)</span>
                      <span className="font-mono-num text-[10px] opacity-65">
                        {gameData.bundle.champions.length}
                      </span>
                    </button>
                    {dropdownChampions.map((c) => {
                      const active = selectedChampionId === c.id;
                      const st = metaStats.championById.get(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedChampionId(c.id);
                            setChampDropdownOpen(false);
                            setChampDropdownSearch('');
                          }}
                          className={cn(
                            'w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-left transition-colors',
                            active
                              ? 'bg-white text-black font-semibold'
                              : 'text-white/85 hover:bg-white/[0.08]'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <GameIcon
                              src={c.portraitUrl}
                              fallbackSrc={c.fallbackPortraitUrl}
                              alt={c.name}
                              className="h-6 w-6 rounded-md"
                            />
                            <span className="truncate">{c.name}</span>
                          </div>
                          {st && (
                            <span className="font-mono-num text-[10px] opacity-70 shrink-0">
                              {st.tier} · {formatPercent(st.winRate, 1)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sort By + Sort Direction */}
            <div className="md:col-span-4 flex items-center gap-2">
              <div className="flex-1 flex items-center rounded-xl bg-black/35 p-1 border border-white/[0.08]">
                {(
                  [
                    ['tier', 'Hạng Tier'],
                    ['winRate', 'Tỷ lệ thắng'],
                    ['pickRate', 'Tỷ lệ chọn'],
                  ] as const
                ).map(([field, label]) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => setSortBy(field)}
                    className={cn(
                      'flex-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors',
                      sortBy === field
                        ? 'bg-white text-black font-semibold'
                        : 'text-white/60 hover:text-white'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                title={
                  sortDir === 'desc'
                    ? 'Đang sắp xếp: Cao xuống thấp (Nhấn để đảo ngược)'
                    : 'Đang sắp xếp: Thấp lên cao (Nhấn để đảo ngược)'
                }
                className="inline-flex items-center gap-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 px-3 py-2 text-xs font-medium text-white/85 transition-colors shrink-0"
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
                <span>{sortDir === 'desc' ? 'Giảm dần' : 'Tăng dần'}</span>
              </button>
            </div>
          </div>

          {/* Secondary Filter Pills: Augment Rarity + Champion Role + Meta Tier */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            {/* Augment Rarity Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-white/45 mr-1">Cấp độ lõi:</span>
              {AUGMENT_RARITY_FILTERS.map((r) => {
                const active = rarityFilter === r;
                if (r === 'ALL') {
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRarityFilter('ALL')}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                        active
                          ? 'bg-white text-black border-white'
                          : 'bg-white/[0.04] text-white/65 border-white/10 hover:bg-white/[0.09]'
                      )}
                    >
                      Tất cả cấp độ
                    </button>
                  );
                }
                const info = t.augmentTiers[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRarityFilter(r)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all',
                      active
                        ? `${TIER_META[r].badgeClass} ring-2 ring-white/40`
                        : 'bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.08]'
                    )}
                  >
                    <TierGlyph tier={r} className="h-3 w-3" />
                    <span>
                      {info.en} · {info.vi}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Meta Tier & Role Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-white/45 mr-1">Hạng:</span>
                {META_TIER_FILTERS.map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setMetaTierFilter(mt)}
                    className={cn(
                      'rounded-lg px-2 py-1 text-[11px] font-mono-num font-medium border transition-colors',
                      metaTierFilter === mt
                        ? 'bg-white text-black border-white font-semibold'
                        : 'bg-white/[0.03] text-white/60 border-white/10 hover:bg-white/[0.08]'
                    )}
                  >
                    {mt === 'ALL' ? 'Tất cả' : mt}
                  </button>
                ))}
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'ALL' | ChampionRole)}
                aria-label="Lọc vai trò tướng"
                className="liquid-input rounded-xl px-2.5 py-1 text-xs text-white/85 bg-[#111217] cursor-pointer"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {t.roles[r]}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 px-2.5 py-1 text-xs text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Active Champion Spotlight Banner when filtered by a champion */}
      {selectedChampion && (
        <section className="liquid-glass-elevated rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-white/25">
          <div className="flex items-center gap-3.5">
            <GameIcon
              src={selectedChampion.portraitUrl}
              fallbackSrc={selectedChampion.fallbackPortraitUrl}
              alt={selectedChampion.name}
              className="h-14 w-14 rounded-2xl border border-white/20"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-semibold text-white">
                  Đang lọc thống kê theo tướng: {selectedChampion.name}
                </span>
                {selectedChampionStat && (
                  <MetaTierBadge tier={selectedChampionStat.tier} showPrefix />
                )}
              </div>
              {selectedChampionStat && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/65 mt-1 font-mono-num">
                  <span>
                    Hạng #{selectedChampionStat.rank} toàn chế độ
                  </span>
                  <span>·</span>
                  <span>
                    Tỷ lệ thắng: <strong className="text-white">{formatPercent(selectedChampionStat.winRate, 2)}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Tỷ lệ chọn: <strong className="text-white">{formatPercent(selectedChampionStat.pickRate, 2)}</strong>
                  </span>
                  {selectedChampionStat.optimalWinRate != null && (
                    <>
                      <span>·</span>
                      <span>
                        Tỷ lệ thắng tối ưu: <strong className="text-white">{formatPercent(selectedChampionStat.optimalWinRate, 1)}</strong>
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectChampion(selectedChampion.id)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 px-3.5 py-2 text-xs font-medium text-white transition-colors"
            >
              <span>Mở thư viện {selectedChampion.name}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onCreateBuild(selectedChampion.id)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black hover:bg-white/90 px-3.5 py-2 text-xs font-semibold transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tạo Build</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedChampionId(null)}
              className="rounded-xl p-2 text-white/55 hover:bg-white/10 hover:text-white"
              title="Bỏ lọc theo tướng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* Balanced 2-Column Tier List Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (6 cols): A. CHAMPION TIER LIST */}
        <section className="xl:col-span-6 liquid-glass rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-white/80" />
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Champion Tier List · Tướng Mạnh Nhất
                </h2>
              </div>
              <p className="text-xs text-white/50">
                Hiển thị {visibleChampions.length} / {championRows.length} tướng nổi bật theo dữ liệu thực chiến. Nhấn vào tướng để mở bộ build hoặc lọc lõi.
              </p>
            </div>
            <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 font-mono-num text-[11px] text-white/70 shrink-0">
              Top {visibleChampions.length}
            </span>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40 border-b border-white/[0.07]">
            <div className="col-span-6">Tướng</div>
            <div className="col-span-2 text-center">Tier</div>
            <div className="col-span-2 text-right">Tỷ lệ chọn</div>
            <div className="col-span-2 text-right">Tỷ lệ thắng</div>
          </div>

          {/* Champion Rows */}
          {visibleChampions.length > 0 ? (
            <div className="space-y-2">
              {visibleChampions.map(({ champ, stat }) => {
                const savedCount = buildCountByChamp.get(champ.id) || 0;
                const isFilteredChamp = selectedChampionId === champ.id;
                const winBarWidth = Math.min(
                  100,
                  Math.max(12, ((stat.winRate - 42) / 22) * 100)
                );
                const pickBarWidth = Math.min(
                  100,
                  Math.max(8, (stat.pickRate / 14) * 100)
                );

                return (
                  <div
                    key={champ.id}
                    onClick={() => onSelectChampion(champ.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectChampion(champ.id);
                      }
                    }}
                    className={cn(
                      'group rounded-2xl p-3 border transition-all cursor-pointer grid grid-cols-12 gap-2 items-center',
                      isFilteredChamp
                        ? 'bg-white/[0.11] border-white/35'
                        : 'bg-white/[0.025] hover:bg-white/[0.065] border-white/[0.07] hover:border-white/20'
                    )}
                  >
                    {/* Champion Info */}
                    <div className="col-span-6 flex items-center gap-3 min-w-0">
                      <span className="font-mono-num text-xs text-white/40 w-6 shrink-0">
                        #{stat.rank}
                      </span>
                      <GameIcon
                        src={champ.portraitUrl}
                        fallbackSrc={champ.fallbackPortraitUrl}
                        alt={champ.name}
                        className="h-11 w-11 rounded-xl border border-white/15 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-white truncate">
                            {champ.name}
                          </span>
                          {savedCount > 0 && (
                            <span className="rounded-full bg-white/12 border border-white/20 px-1.5 py-0.2 font-mono-num text-[10px] text-white/85">
                              {savedCount} build
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {champ.roles.slice(0, 2).map((r) => (
                            <span key={r} className="text-[10px] text-white/45">
                              {t.roles[r]}
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChampionId((prev) =>
                                prev === champ.id ? null : champ.id
                              );
                            }}
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-[10px] border transition-colors',
                              isFilteredChamp
                                ? 'bg-white text-black border-white font-semibold'
                                : 'bg-white/[0.04] text-white/55 border-white/10 opacity-0 group-hover:opacity-100 hover:text-white'
                            )}
                            title={`Xem những lõi mạnh nhất cho ${champ.name}`}
                          >
                            {isFilteredChamp ? 'Đang lọc lõi' : 'Lọc lõi theo tướng'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tier */}
                    <div className="col-span-2 flex justify-center">
                      <MetaTierBadge tier={stat.tier} />
                    </div>

                    {/* Pick Rate */}
                    <div className="col-span-2 text-right space-y-1">
                      <div className="font-mono-num text-xs font-medium text-white/80">
                        {formatPercent(stat.pickRate, 1)}
                      </div>
                      <div className="h-1 w-full rounded-full bg-white/[0.07] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-white/45"
                          style={{ width: `${pickBarWidth}%` }}
                        />
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className="col-span-2 text-right space-y-1">
                      <div
                        className={cn(
                          'font-mono-num text-xs font-semibold',
                          stat.winRate >= 54 ? 'text-white' : 'text-white/80'
                        )}
                      >
                        {formatPercent(stat.winRate, 1)}
                      </div>
                      <div className="h-1 w-full rounded-full bg-white/[0.07] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-white/85"
                          style={{ width: `${winBarWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-xs text-white/45">
              Không có tướng nào khớp với bộ lọc hiện tại.
            </div>
          )}

          {/* Expand / Collapse Controls */}
          {championRows.length > DEFAULT_TOP_COUNT && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07]">
              <span className="text-[11px] text-white/45">
                Đang hiển thị {visibleChampions.length} trên tổng số {championRows.length} tướng
              </span>
              <div className="flex items-center gap-2">
                {champLimit < championRows.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setChampLimit((prev) =>
                        prev === DEFAULT_TOP_COUNT
                          ? STEP_EXPAND_COUNT
                          : championRows.length
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span>
                      {champLimit === DEFAULT_TOP_COUNT
                        ? `Xem thêm (${Math.min(STEP_EXPAND_COUNT, championRows.length)} tướng)`
                        : `Xem toàn bộ (${championRows.length})`}
                    </span>
                  </button>
                )}
                {champLimit > DEFAULT_TOP_COUNT && (
                  <button
                    type="button"
                    onClick={() => setChampLimit(DEFAULT_TOP_COUNT)}
                    className="inline-flex items-center gap-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white transition-colors"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                    <span>Thu gọn về Top {DEFAULT_TOP_COUNT}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN (6 cols): B. AUGMENT TIER LIST */}
        <section className="xl:col-span-6 liquid-glass rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-white/80" />
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  {selectedChampion
                    ? `Augment Tier List · Lõi Mạnh Nhất Cho ${selectedChampion.name}`
                    : 'Augment Tier List · Lõi Công Nghệ Mạnh Nhất'}
                </h2>
              </div>
              <p className="text-xs text-white/50">
                {selectedChampion
                  ? `Xếp hạng hiệu suất lõi công nghệ thực tế khi chơi ${selectedChampion.name}.`
                  : `Hiển thị ${visibleAugments.length} / ${augmentRows.length} lõi công nghệ có hiệu suất cao nhất.`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenAugmentLibrary()}
              className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 px-3 py-1 text-[11px] font-medium text-white/85 transition-colors shrink-0"
            >
              <span>Mở Kho Lõi</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40 border-b border-white/[0.07]">
            <div className="col-span-6">Lõi Công Nghệ &amp; Cấp Độ</div>
            <div className="col-span-2 text-center">Tier</div>
            <div className="col-span-2 text-right">Tỷ lệ chọn</div>
            <div className="col-span-2 text-right">Tỷ lệ thắng</div>
          </div>

          {/* Augment Rows */}
          {matrixLoading ? (
            <div className="py-12 text-center text-xs text-white/55">
              Đang tải thống kê lõi công nghệ của {selectedChampion?.name}...
            </div>
          ) : visibleAugments.length > 0 ? (
            <div className="space-y-2">
              {visibleAugments.map((row) => {
                const { aug, tier, rank, winRate, pickRate, lift } = row;
                const winBarWidth = Math.min(
                  100,
                  Math.max(12, ((winRate - 44) / 20) * 100)
                );
                const pickBarWidth = Math.min(
                  100,
                  Math.max(8, (pickRate / (selectedChampion ? 18 : 6)) * 100)
                );

                return (
                  <div
                    key={aug.id}
                    onClick={() => setDetailModalAugmentId(aug.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDetailModalAugmentId(aug.id);
                      }
                    }}
                    className="group rounded-2xl p-3 bg-white/[0.025] hover:bg-white/[0.065] border border-white/[0.07] hover:border-white/20 transition-all cursor-pointer grid grid-cols-12 gap-2 items-center"
                  >
                    {/* Augment Icon + Name + Rarity */}
                    <div className="col-span-6 flex items-center gap-3 min-w-0">
                      <span className="font-mono-num text-xs text-white/40 w-6 shrink-0">
                        #{rank}
                      </span>
                      <GameIcon
                        src={aug.iconUrl}
                        fallbackSrc={aug.fallbackIconUrl}
                        alt={aug.name}
                        className={cn(
                          'h-11 w-11 rounded-xl shrink-0',
                          TIER_META[aug.tier].ringClass
                        )}
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-white truncate">
                            {aug.name}
                          </span>
                          {aug.viName && (
                            <span className="text-[11px] text-white/45 truncate">
                              ({aug.viName})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <TierBadge tier={aug.tier} compact showVi />
                        </div>
                      </div>
                    </div>

                    {/* Meta Tier */}
                    <div className="col-span-2 flex justify-center">
                      <MetaTierBadge tier={tier} />
                    </div>

                    {/* Pick Rate */}
                    <div className="col-span-2 text-right space-y-1">
                      <div className="font-mono-num text-xs font-medium text-white/80">
                        {formatPercent(pickRate, 2)}
                      </div>
                      <div className="h-1 w-full rounded-full bg-white/[0.07] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-white/45"
                          style={{ width: `${pickBarWidth}%` }}
                        />
                      </div>
                    </div>

                    {/* Win Rate (+ Lift if champion filtered) */}
                    <div className="col-span-2 text-right space-y-1">
                      <div className="font-mono-num text-xs font-semibold text-white">
                        {formatPercent(winRate, 2)}
                      </div>
                      {typeof lift === 'number' ? (
                        <div className="font-mono-num text-[10px] text-white/60">
                          {lift >= 0 ? `+${lift.toFixed(1)}%` : `${lift.toFixed(1)}%`} hiệu suất
                        </div>
                      ) : (
                        <div className="h-1 w-full rounded-full bg-white/[0.07] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-white/85"
                            style={{ width: `${winBarWidth}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-xs text-white/45">
              Không có Lõi Công Nghệ nào khớp với bộ lọc hiện tại.
            </div>
          )}

          {/* Expand / Collapse Controls */}
          {augmentRows.length > DEFAULT_TOP_COUNT && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07]">
              <span className="text-[11px] text-white/45">
                Đang hiển thị {visibleAugments.length} trên tổng số {augmentRows.length} lõi
              </span>
              <div className="flex items-center gap-2">
                {augLimit < augmentRows.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setAugLimit((prev) =>
                        prev === DEFAULT_TOP_COUNT
                          ? STEP_EXPAND_COUNT
                          : augmentRows.length
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span>
                      {augLimit === DEFAULT_TOP_COUNT
                        ? `Xem thêm (${Math.min(STEP_EXPAND_COUNT, augmentRows.length)} lõi)`
                        : `Xem toàn bộ (${augmentRows.length})`}
                    </span>
                  </button>
                )}
                {augLimit > DEFAULT_TOP_COUNT && (
                  <button
                    type="button"
                    onClick={() => setAugLimit(DEFAULT_TOP_COUNT)}
                    className="inline-flex items-center gap-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white transition-colors"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                    <span>Thu gọn về Top {DEFAULT_TOP_COUNT}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Quick Guide Legend for Augment Tiers vs Meta Tiers */}
      <section className="liquid-glass rounded-3xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['Prismatic', 'Gold', 'Silver'] as const).map((tierKey) => {
          const info = t.augmentTiers[tierKey];
          return (
            <div
              key={tierKey}
              className={cn(
                'liquid-glass-subtle rounded-2xl p-3.5 flex items-start gap-3',
                TIER_META[tierKey].accentClass
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl shrink-0',
                  TIER_META[tierKey].badgeClass
                )}
              >
                <TierGlyph tier={tierKey} className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-bold tracking-wide', TIER_META[tierKey].textClass)}>
                    {info.fullHeader}
                  </span>
                </div>
                <p className="text-[11px] text-white/55 mt-0.5 leading-relaxed">
                  {info.desc}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Augment Detail Modal (Opens instantly when clicking any augment in tier list) */}
      <AugmentDetailModal
        augmentId={detailModalAugmentId}
        open={detailModalAugmentId !== null}
        onClose={() => setDetailModalAugmentId(null)}
        onCreateBuild={(augId, champId) =>
          onCreateBuild(champId ?? selectedChampionId ?? undefined, augId)
        }
      />
    </div>
  );
}
