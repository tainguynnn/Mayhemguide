import { useMemo, useState } from 'react';
import {
  Bookmark,
  Database,
  GitCompare,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Star,
  X,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import type { MayhemBuild } from '../../types/build';
import type { AugmentTier } from '../../types/gameData';
import { cn, normalizeSearch, TIER_META, TIER_ORDER } from '../../utils/formatters';
import { GameIcon } from '../ui/GameIcon';
import { TierGlyph } from '../ui/TierBadge';
import { BuildComparisonView } from './BuildComparisonView';
import { BuildSummaryCard } from './BuildSummaryCard';

interface MyBuildsViewProps {
  onOpenChampionBuilds: (championId: number) => void;
  onCreateBuild: (championId?: number) => void;
  onEditBuild: (build: MayhemBuild) => void;
  onViewBuild: (build: MayhemBuild) => void;
  onRequestDelete: (build: MayhemBuild) => void;
  onOpenDataManager: () => void;
}

type BuildSortBy = 'recent' | 'name' | 'champion';

export function MyBuildsView({
  onOpenChampionBuilds,
  onCreateBuild,
  onEditBuild,
  onViewBuild,
  onRequestDelete,
  onOpenDataManager,
}: MyBuildsViewProps) {
  const { gameData, library, duplicateBuild, restoreSampleBuilds, notify } = useLibrary();

  const [search, setSearch] = useState('');
  const [championFilter, setChampionFilter] = useState<number | 'ALL'>('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | AugmentTier>('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<BuildSortBy>('recent');

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const championsWithBuilds = useMemo(() => {
    const countMap = new Map<number, number>();
    for (const b of library.builds) {
      countMap.set(b.championId, (countMap.get(b.championId) || 0) + 1);
    }
    return [...countMap.entries()]
      .map(([champId, count]) => ({
        champ: gameData.championById.get(champId),
        count,
      }))
      .filter(
        (x): x is { champ: NonNullable<typeof x.champ>; count: number } =>
          Boolean(x.champ)
      )
      .sort((a, b) => b.count - a.count || a.champ.name.localeCompare(b.champ.name));
  }, [library.builds, gameData.championById]);

  const filteredBuilds = useMemo(() => {
    const q = normalizeSearch(search.trim());

    const list = library.builds.filter((b) => {
      if (championFilter !== 'ALL' && b.championId !== championFilter) return false;
      if (onlyFavorites && !b.favorite) return false;
      if (tierFilter !== 'ALL') {
        const hasTier = b.augments.some(
          (entry) =>
            (gameData.augmentById.get(entry.augmentId)?.tier ?? entry.tier) ===
            tierFilter
        );
        if (!hasTier) return false;
      }
      if (q) {
        const champ = gameData.championById.get(b.championId);
        const matchAug = b.augments.some((entry) => {
          const aug = gameData.augmentById.get(entry.augmentId);
          return (
            aug &&
            (normalizeSearch(aug.name).includes(q) ||
              (aug.viName && normalizeSearch(aug.viName).includes(q)))
          );
        });
        const matchName = normalizeSearch(b.name).includes(q);
        const matchChamp = champ ? normalizeSearch(champ.name).includes(q) : false;
        if (!matchName && !matchChamp && !matchAug) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'champion') {
        const ca = gameData.championById.get(a.championId)?.name || '';
        const cb = gameData.championById.get(b.championId)?.name || '';
        return ca.localeCompare(cb) || b.updatedAt.localeCompare(a.updatedAt);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return list;
  }, [
    library.builds,
    championFilter,
    onlyFavorites,
    tierFilter,
    search,
    sortBy,
    gameData.augmentById,
    gameData.championById,
  ]);

  const compareBuilds = useMemo(
    () => library.builds.filter((b) => compareIds.includes(b.id)),
    [library.builds, compareIds]
  );

  const compareChampion =
    compareBuilds.length > 0
      ? gameData.championById.get(compareBuilds[0].championId) ?? null
      : null;

  const toggleCompare = (buildId: string) => {
    const target = library.builds.find((b) => b.id === buildId);
    if (!target) return;

    setCompareIds((prev) => {
      if (prev.includes(buildId)) return prev.filter((id) => id !== buildId);
      if (prev.length > 0) {
        const first = library.builds.find((b) => b.id === prev[0]);
        if (first && first.championId !== target.championId) {
          const champName =
            gameData.championById.get(target.championId)?.name || 'tướng này';
          notify(
            `Đã chuyển sang so sánh các bộ build của ${champName} (chỉ so sánh cùng tướng).`
          );
          return [buildId];
        }
      }
      if (prev.length >= 4) return [...prev.slice(1), buildId];
      return [...prev, buildId];
    });
  };

  if (comparing && compareBuilds.length >= 2 && compareChampion) {
    return (
      <BuildComparisonView
        champion={compareChampion}
        builds={compareBuilds}
        onClose={() => setComparing(false)}
        onRemoveBuild={(id) => {
          const next = compareIds.filter((x) => x !== id);
          setCompareIds(next);
          if (next.length < 2) setComparing(false);
        }}
      />
    );
  }

  const favoriteBuildsCount = library.builds.filter((b) => b.favorite).length;

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Header & KPI Bar */}
      <section className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/12 px-2.5 py-0.5 text-[11px] font-medium text-white/80">
              <Bookmark className="h-3 w-3" />
              <span>Bộ Sưu Tập Build Cá Nhân</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white">
              Bộ Build Của Tôi
            </h1>
            <p className="text-xs sm:text-sm text-white/55">
              Quản lý, tìm kiếm, chỉnh sửa và so sánh toàn bộ các bộ build ARAM: Mayhem bạn đã lưu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenDataManager}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 px-3.5 py-2.5 text-xs font-medium text-white transition-colors"
            >
              <Database className="h-3.5 w-3.5" />
              <span>Sao lưu / Import JSON</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onCreateBuild(championFilter !== 'ALL' ? championFilter : undefined)
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black hover:bg-white/90 px-4 py-2.5 text-xs font-semibold transition-colors shadow-[0_6px_24px_rgba(255,255,255,0.16)]"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo Build mới</span>
            </button>
          </div>
        </div>

        {/* Summary Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="liquid-glass-subtle rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-white/45">Tổng số bộ build đã lưu</div>
              <div className="font-mono-num text-xl font-semibold text-white mt-0.5">
                {library.builds.length}
              </div>
            </div>
            <Layers className="h-5 w-5 text-white/35" />
          </div>

          <div className="liquid-glass-subtle rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-white/45">Số tướng đã có build</div>
              <div className="font-mono-num text-xl font-semibold text-white mt-0.5">
                {championsWithBuilds.length}
              </div>
            </div>
            <Bookmark className="h-5 w-5 text-white/35" />
          </div>

          <div className="liquid-glass-subtle rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-white/45">Bộ build đánh dấu yêu thích</div>
              <div className="font-mono-num text-xl font-semibold text-white mt-0.5">
                {favoriteBuildsCount}
              </div>
            </div>
            <Star className="h-5 w-5 text-white/35" />
          </div>
        </div>

        {/* Champion Quick Filter Strip (if user has builds) */}
        {championsWithBuilds.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setChampionFilter('ALL')}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-medium border shrink-0 transition-colors',
                championFilter === 'ALL'
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-white/[0.04] text-white/65 border-white/10 hover:bg-white/[0.09]'
              )}
            >
              Tất cả tướng ({library.builds.length})
            </button>
            {championsWithBuilds.map(({ champ, count }) => {
              const active = championFilter === champ.id;
              return (
                <button
                  key={champ.id}
                  type="button"
                  onClick={() =>
                    setChampionFilter((prev) => (prev === champ.id ? 'ALL' : champ.id))
                  }
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-2.5 py-1 text-xs font-medium border shrink-0 transition-colors',
                    active
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-white/[0.04] text-white/75 border-white/10 hover:bg-white/[0.09]'
                  )}
                >
                  <GameIcon
                    src={champ.portraitUrl}
                    fallbackSrc={champ.fallbackPortraitUrl}
                    alt={champ.name}
                    className="h-5 w-5 rounded-md"
                  />
                  <span>{champ.name}</span>
                  <span className="font-mono-num text-[10px] opacity-65">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search, Tier Filter, Favorite & Sort Controls */}
        <div className="flex flex-col lg:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên bộ build, tên tướng hoặc tên Lõi Công Nghệ..."
              className="liquid-input w-full rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTierFilter('ALL')}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                tierFilter === 'ALL'
                  ? 'bg-white text-black border-white'
                  : 'bg-white/[0.04] text-white/65 border-white/10 hover:bg-white/[0.09]'
              )}
            >
              Mọi cấp lõi
            </button>

            {TIER_ORDER.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTierFilter((prev) => (prev === r ? 'ALL' : r))}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all',
                  tierFilter === r
                    ? `${TIER_META[r].badgeClass} ring-2 ring-white/40`
                    : 'bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.09]'
                )}
              >
                <TierGlyph tier={r} className="h-3 w-3" />
                <span>{t.augmentTiers[r].vi}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setOnlyFavorites((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                onlyFavorites
                  ? 'bg-white text-black border-white'
                  : 'bg-white/[0.04] text-white/65 border-white/10 hover:bg-white/[0.09]'
              )}
            >
              <Star className={cn('h-3 w-3', onlyFavorites && 'fill-current')} />
              <span>Yêu thích</span>
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as BuildSortBy)}
              aria-label="Sắp xếp bộ build"
              className="liquid-input rounded-xl px-3 py-1.5 text-xs text-white/85 bg-[#121318] cursor-pointer"
            >
              <option value="recent">Mới cập nhật</option>
              <option value="champion">Theo tên tướng</option>
              <option value="name">Theo tên build (A–Z)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Compare Banner */}
      {compareIds.length > 0 && (
        <div className="liquid-glass-elevated rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-white/85">
            <GitCompare className="h-4 w-4 text-white" />
            <span>
              Đang chọn <strong className="font-mono-num">{compareIds.length}</strong> bộ build của{' '}
              <strong>{compareChampion?.name}</strong> để so sánh
              {compareIds.length < 2 && ' (chọn thêm ít nhất 1 bộ build cùng tướng)'}.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="rounded-xl px-3 py-1.5 text-xs text-white/65 hover:text-white bg-white/[0.05] border border-white/10"
            >
              Bỏ chọn
            </button>
            <button
              type="button"
              disabled={compareIds.length < 2}
              onClick={() => setComparing(true)}
              className={cn(
                'rounded-xl px-4 py-1.5 text-xs font-semibold transition-colors',
                compareIds.length >= 2
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-white/15 text-white/40 cursor-not-allowed'
              )}
            >
              So sánh ngay
            </button>
          </div>
        </div>
      )}

      {/* Builds Grid */}
      {filteredBuilds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBuilds.map((build) => (
            <BuildSummaryCard
              key={build.id}
              build={build}
              showChampion
              compareSelected={compareIds.includes(build.id)}
              onToggleCompare={toggleCompare}
              onOpenChampion={onOpenChampionBuilds}
              onViewDetail={onViewBuild}
              onEdit={onEditBuild}
              onDuplicate={(b) => duplicateBuild(b.id)}
              onDelete={onRequestDelete}
            />
          ))}
        </div>
      ) : (
        <div className="liquid-glass rounded-3xl p-12 text-center space-y-4">
          <p className="text-sm text-white/65">
            {library.builds.length === 0
              ? 'Bạn chưa có bộ build ARAM: Mayhem nào trong thư viện.'
              : 'Không có bộ build nào khớp với bộ lọc hiện tại.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {library.builds.length === 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => onCreateBuild()}
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tạo bộ build đầu tiên</span>
                </button>
                <button
                  type="button"
                  onClick={restoreSampleBuilds}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] border border-white/15 px-4 py-2 text-xs font-medium text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Khôi phục bộ build mẫu</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setChampionFilter('ALL');
                  setTierFilter('ALL');
                  setOnlyFavorites(false);
                }}
                className="rounded-xl bg-white/[0.08] border border-white/15 px-4 py-2 text-xs font-medium text-white"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

