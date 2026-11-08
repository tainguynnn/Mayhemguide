import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Cpu,
  Info,
  Search,
  X,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import { META_TIER_RANK } from '../../services/metaStatsRepository';
import type { AugmentTier } from '../../types/gameData';
import type { MetaTier } from '../../types/meta';
import {
  cn,
  formatPercent,
  normalizeSearch,
  TIER_META,
  TIER_ORDER,
} from '../../utils/formatters';
import { GameIcon } from '../ui/GameIcon';
import { MetaTierBadge } from '../ui/MetaTierBadge';
import { TierBadge, TierGlyph } from '../ui/TierBadge';
import { AugmentDetailModal } from './AugmentDetailModal';

interface AugmentLibraryViewProps {
  initialAugmentId?: number;
  onSelectChampion?: (championId: number) => void;
  onCreateBuildWithAugment: (augmentId: number, championId?: number) => void;
}

type AugmentSortKey = 'tier' | 'winRate' | 'pickRate' | 'name';

const META_TIER_PILLS: Array<'ALL' | MetaTier> = ['ALL', 'S', 'A', 'B', 'C', 'D'];

export function AugmentLibraryView({
  initialAugmentId,
  onSelectChampion: _onSelectChampion,
  onCreateBuildWithAugment,
}: AugmentLibraryViewProps) {
  const { gameData, metaStats } = useLibrary();

  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState<'ALL' | AugmentTier>('ALL');
  const [metaTierFilter, setMetaTierFilter] = useState<'ALL' | MetaTier>('ALL');
  const [includeRotated, setIncludeRotated] = useState(false);
  const [sortBy, setSortBy] = useState<AugmentSortKey>('tier');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [selectedAugmentId, setSelectedAugmentId] = useState<number | null>(
    initialAugmentId ?? null
  );

  useEffect(() => {
    if (initialAugmentId != null) {
      setSelectedAugmentId(initialAugmentId);
    }
  }, [initialAugmentId]);

  const countsByRarity = useMemo(() => {
    const counts: Record<AugmentTier, number> = {
      Prismatic: 0,
      Gold: 0,
      Silver: 0,
    };
    for (const aug of gameData.bundle.augments) {
      if (!includeRotated && aug.modeStatus === 'rotated') continue;
      counts[aug.tier]++;
    }
    return counts;
  }, [gameData.bundle.augments, includeRotated]);

  const filteredAugments = useMemo(() => {
    const q = normalizeSearch(search.trim());
    const dir = sortDir === 'desc' ? 1 : -1;

    const list = gameData.bundle.augments.filter((aug) => {
      if (!includeRotated && aug.modeStatus === 'rotated') return false;
      if (rarityFilter !== 'ALL' && aug.tier !== rarityFilter) return false;
      const stat = metaStats.augmentById.get(aug.id);
      if (metaTierFilter !== 'ALL' && stat?.tier !== metaTierFilter) return false;

      if (q) {
        const hay = normalizeSearch(
          `${aug.name} ${aug.viName || ''} ${aug.description}`
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * (sortDir === 'asc' ? 1 : -1);
      }

      const statA = metaStats.augmentById.get(a.id);
      const statB = metaStats.augmentById.get(b.id);

      // Always keep augments with verified stats ahead of unranked ones
      if (statA && !statB) return -1;
      if (!statA && statB) return 1;
      if (!statA && !statB) {
        return a.name.localeCompare(b.name);
      }

      if (sortBy === 'winRate') {
        return (statB!.winRate - statA!.winRate) * dir;
      }
      if (sortBy === 'pickRate') {
        return (statB!.pickRate - statA!.pickRate) * dir;
      }
      const tierDiff = META_TIER_RANK[statA!.tier] - META_TIER_RANK[statB!.tier];
      const rankDiff = statA!.rank - statB!.rank;
      return (tierDiff || rankDiff) * dir;
    });

    return list;
  }, [
    gameData.bundle.augments,
    metaStats.augmentById,
    includeRotated,
    rarityFilter,
    metaTierFilter,
    search,
    sortBy,
    sortDir,
  ]);

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Header & Rarity Summary Cards */}
      <section className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/12 px-2.5 py-0.5 text-[11px] font-medium text-white/80">
              <Cpu className="h-3 w-3" />
              <span>Thư viện Lõi ARAM: Mayhem</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white">
              Kho Lõi Công Nghệ (Augment Library)
            </h1>
            <p className="text-xs sm:text-sm text-white/55">
              Tra cứu toàn bộ {gameData.bundle.augments.length} Lõi Công Nghệ ARAM: Mayhem cùng hiệu suất thực chiến và các tướng kết hợp tốt nhất.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-white/55 font-mono-num">
            <span>
              Hiển thị <strong className="text-white">{filteredAugments.length}</strong> /{' '}
              {gameData.bundle.augments.length} lõi
            </span>
          </div>
        </div>

        {/* 3 Tier Filter Cards (Prismatic, Gold, Silver) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TIER_ORDER.map((tierKey) => {
            const info = t.augmentTiers[tierKey];
            const active = rarityFilter === tierKey;
            return (
              <button
                key={tierKey}
                type="button"
                onClick={() =>
                  setRarityFilter((prev) => (prev === tierKey ? 'ALL' : tierKey))
                }
                className={cn(
                  'rounded-2xl p-3.5 text-left transition-all border flex items-center justify-between gap-3',
                  TIER_META[tierKey].accentClass,
                  active
                    ? 'bg-white/[0.11] border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
                    : 'liquid-glass-subtle hover:bg-white/[0.06] hover:border-white/20'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
                      TIER_META[tierKey].badgeClass
                    )}
                  >
                    <TierGlyph tier={tierKey} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        'text-xs font-bold tracking-wide truncate',
                        TIER_META[tierKey].textClass
                      )}
                    >
                      {info.fullHeader}
                    </div>
                    <div className="text-[11px] text-white/50 truncate">
                      {active ? 'Đang lọc cấp độ này (Nhấn để bỏ)' : 'Nhấn để lọc cấp độ này'}
                    </div>
                  </div>
                </div>
                <span className="font-mono-num text-sm font-semibold text-white/85 shrink-0">
                  {countsByRarity[tierKey]} lõi
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Meta Tier & Sort Controls */}
        <div className="flex flex-col lg:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm lõi theo tên tiếng Anh, tiếng Việt hoặc mô tả hiệu ứng (VD: Draw Your Sword, Eureka, Hồi máu...)"
              className="liquid-input w-full rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/45 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Meta Tier Filter */}
            <div className="flex items-center gap-1 rounded-xl bg-black/30 p-1 border border-white/[0.08]">
              {META_TIER_PILLS.map((mt) => (
                <button
                  key={mt}
                  type="button"
                  onClick={() => setMetaTierFilter(mt)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                    metaTierFilter === mt
                      ? 'bg-white text-black font-semibold'
                      : 'text-white/60 hover:text-white'
                  )}
                >
                  {mt === 'ALL' ? 'Mọi Hạng' : `Hạng ${mt}`}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as AugmentSortKey)}
              aria-label="Sắp xếp lõi công nghệ"
              className="liquid-input rounded-xl px-3 py-2 text-xs text-white/85 bg-[#121318] cursor-pointer"
            >
              <option value="tier">Sắp xếp: Hạng Meta (Tier)</option>
              <option value="winRate">Sắp xếp: Tỷ lệ thắng (Win Rate)</option>
              <option value="pickRate">Sắp xếp: Tỷ lệ chọn (Pick Rate)</option>
              <option value="name">Sắp xếp: Tên A–Z</option>
            </select>

            <button
              type="button"
              onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 px-3 py-2 text-xs font-medium text-white/85 transition-colors"
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              <span>{sortDir === 'desc' ? 'Giảm dần' : 'Tăng dần'}</span>
            </button>

            <label className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-xs text-white/65 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeRotated}
                onChange={(e) => setIncludeRotated(e.target.checked)}
                className="accent-white rounded"
              />
              <span>Hiện lõi đã xoay vòng</span>
            </label>
          </div>
        </div>
      </section>

      {/* Augment Cards Grid */}
      {filteredAugments.length > 0 ? (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAugments.map((aug) => {
            const stat = metaStats.augmentById.get(aug.id);
            const synergies = metaStats.synergyByAugmentId.get(aug.id) ?? [];
            const topSynergies = synergies.slice(0, 4);

            return (
              <article
                key={aug.id}
                onClick={() => setSelectedAugmentId(aug.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedAugmentId(aug.id);
                  }
                }}
                className={cn(
                  'group cv-auto liquid-glass liquid-card-interactive rounded-2xl p-4 flex flex-col justify-between gap-3.5 cursor-pointer border hover:border-white/30 transition-all',
                  TIER_META[aug.tier].accentClass
                )}
              >
                <div className="space-y-3">
                  {/* Top Row: Icon + Name + Rarity + Meta Tier */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <GameIcon
                        src={aug.iconUrl}
                        fallbackSrc={aug.fallbackIconUrl}
                        alt={aug.name}
                        loading="lazy"
                        className={cn(
                          'h-12 w-12 rounded-xl shrink-0 group-hover:scale-105 transition-transform',
                          TIER_META[aug.tier].ringClass
                        )}
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h2 className="text-sm font-semibold text-white truncate group-hover:text-white">
                            {aug.name}
                          </h2>
                          {aug.viName && (
                            <span className="text-xs text-white/45 truncate">
                              ({aug.viName})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <TierBadge tier={aug.tier} compact showVi />
                          {aug.modeStatus === 'rotated' && (
                            <span className="rounded-full bg-white/[0.06] border border-white/15 px-2 py-0.5 text-[10px] text-white/55">
                              Đã xoay vòng
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {stat ? (
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <MetaTierBadge tier={stat.tier} showPrefix size="sm" />
                        <span className="font-mono-num text-[10px] text-white/40">
                          #{stat.rank}
                        </span>
                      </div>
                    ) : (
                      <span className="rounded-lg bg-white/[0.04] border border-white/10 px-2 py-0.5 text-[10px] text-white/40 shrink-0">
                        Ít mẫu
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-white/70 leading-relaxed line-clamp-3">
                    {aug.description}
                  </p>
                </div>

                {/* Bottom Footer: Stats + Top Synergy Champions + Clear Detail Button */}
                <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between gap-3">
                  {stat ? (
                    <div className="flex items-center gap-3 font-mono-num text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-white/40 block">
                          Tỷ lệ thắng
                        </span>
                        <span className="font-semibold text-white">
                          {formatPercent(stat.winRate, 2)}
                        </span>
                      </div>
                      <div className="h-6 w-px bg-white/10" />
                      <div>
                        <span className="text-[10px] uppercase text-white/40 block">
                          Tỷ lệ chọn
                        </span>
                        <span className="font-medium text-white/80">
                          {formatPercent(stat.pickRate, 2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-white/40">
                      Chưa đủ 200 trận thống kê
                    </span>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Synergy Champions Strip */}
                    {topSynergies.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/40 hidden sm:inline">
                          Hợp:
                        </span>
                        <div className="flex -space-x-1.5">
                          {topSynergies.map(([champId, wr, lift]) => {
                            const c = gameData.championById.get(champId);
                            if (!c) return null;
                            return (
                              <div
                                key={champId}
                                title={`${c.name}: Thắng ${wr.toFixed(1)}% (${lift >= 0 ? '+' : ''}${lift.toFixed(1)}%)`}
                              >
                                <GameIcon
                                  src={c.portraitUrl}
                                  fallbackSrc={c.fallbackPortraitUrl}
                                  alt={c.name}
                                  loading="lazy"
                                  className="h-6 w-6 rounded-full border border-black ring-1 ring-white/25"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Unmistakable Chi Tiết button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAugmentId(aug.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/[0.08] hover:bg-white text-white/80 hover:text-black border border-white/15 hover:border-white px-2.5 py-1 text-[11px] font-medium transition-all shadow-sm"
                      title="Xem chi tiết Lõi Công Nghệ"
                    >
                      <Info className="h-3 w-3" />
                      <span>Chi tiết</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="liquid-glass rounded-3xl p-12 text-center space-y-3">
          <p className="text-sm text-white/65">
            Không tìm thấy Lõi Công Nghệ nào phù hợp với bộ lọc hiện tại.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setRarityFilter('ALL');
              setMetaTierFilter('ALL');
              setIncludeRotated(false);
            }}
            className="rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 px-4 py-2 text-xs font-medium text-white transition-colors"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      )}

      {/* Augment Detail Modal (Complete mechanics, stats, synergy) */}
      <AugmentDetailModal
        augmentId={selectedAugmentId}
        open={selectedAugmentId !== null}
        onClose={() => setSelectedAugmentId(null)}
        onCreateBuild={(augId, champId) => onCreateBuildWithAugment(augId, champId)}
      />
    </div>
  );
}
