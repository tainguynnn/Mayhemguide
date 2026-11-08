import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  GitCompare,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import type { MayhemBuild } from '../../types/build';
import type { AugmentTier } from '../../types/gameData';
import { cn, formatPercent, normalizeSearch, TIER_META, TIER_ORDER } from '../../utils/formatters';
import { GameIcon } from '../ui/GameIcon';
import { MetaTierBadge } from '../ui/MetaTierBadge';
import { TierGlyph } from '../ui/TierBadge';
import { BuildComparisonView } from './BuildComparisonView';
import { BuildSummaryCard } from './BuildSummaryCard';

interface ChampionBuildsViewProps {
  championId: number;
  onBack: () => void;
  onCreateBuild: (championId: number) => void;
  onEditBuild: (build: MayhemBuild) => void;
  onViewBuild: (build: MayhemBuild) => void;
  onRequestDelete: (build: MayhemBuild) => void;
}

export function ChampionBuildsView({
  championId,
  onBack,
  onCreateBuild,
  onEditBuild,
  onViewBuild,
  onRequestDelete,
}: ChampionBuildsViewProps) {
  const { gameData, metaStats, library, toggleFavoriteChampion, duplicateBuild } =
    useLibrary();
  const champion = gameData.championById.get(championId);
  const champStat = metaStats.championById.get(championId);

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | AugmentTier>('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const isFavoriteChamp = library.favoriteChampionIds.includes(championId);

  const championBuilds = useMemo(
    () =>
      library.builds
        .filter((b) => b.championId === championId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [library.builds, championId]
  );

  const filteredBuilds = useMemo(() => {
    const q = normalizeSearch(search.trim());
    return championBuilds.filter((build) => {
      if (onlyFavorites && !build.favorite) return false;
      if (tierFilter !== 'ALL') {
        const hasTier = build.augments.some(
          (entry) =>
            (gameData.augmentById.get(entry.augmentId)?.tier ?? entry.tier) ===
            tierFilter
        );
        if (!hasTier) return false;
      }
      if (q) {
        const nameMatch = normalizeSearch(build.name).includes(q);
        const augMatch = build.augments.some((entry) => {
          const aug = gameData.augmentById.get(entry.augmentId);
          return (
            aug &&
            (normalizeSearch(aug.name).includes(q) ||
              (aug.viName && normalizeSearch(aug.viName).includes(q)))
          );
        });
        if (!nameMatch && !augMatch) return false;
      }
      return true;
    });
  }, [championBuilds, onlyFavorites, tierFilter, search, gameData.augmentById]);

  const compareBuilds = useMemo(
    () => championBuilds.filter((b) => compareIds.includes(b.id)),
    [championBuilds, compareIds]
  );

  if (!champion) {
    return (
      <div className="liquid-glass rounded-3xl p-10 text-center space-y-4">
        <p className="text-sm text-white/65">Không tìm thấy thông tin tướng.</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl bg-white text-black px-4 py-2 text-xs font-semibold"
        >
          Quay lại Kho Tướng
        </button>
      </div>
    );
  }

  const toggleCompare = (buildId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(buildId)) return prev.filter((id) => id !== buildId);
      if (prev.length >= 4) return [...prev.slice(1), buildId];
      return [...prev, buildId];
    });
  };

  if (comparing && compareBuilds.length >= 2) {
    return (
      <BuildComparisonView
        champion={champion}
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

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Champion Splash Hero */}
      <section className="liquid-glass rounded-3xl overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={champion.splashUrl}
            alt=""
            className="h-full w-full object-cover object-top opacity-25 grayscale-[35%] scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050506]/95 via-[#07080a]/85 to-[#050506]/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 px-3 py-1.5 text-xs font-medium text-white/85 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kho Tướng</span>
            </button>

            <div className="flex items-center gap-4">
              <GameIcon
                src={champion.portraitUrl}
                fallbackSrc={champion.fallbackPortraitUrl}
                alt={champion.name}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border border-white/25 shadow-2xl"
              />
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-semibold text-white">
                    {champion.name}
                  </h1>
                  {champStat && <MetaTierBadge tier={champStat.tier} showPrefix />}
                  <button
                    type="button"
                    onClick={() => toggleFavoriteChampion(champion.id)}
                    className={cn(
                      'rounded-xl p-1.5 border transition-colors',
                      isFavoriteChamp
                        ? 'bg-white text-black border-white'
                        : 'bg-white/[0.06] text-white/60 border-white/12 hover:text-white'
                    )}
                    title={isFavoriteChamp ? 'Bỏ yêu thích tướng' : 'Đánh dấu tướng yêu thích'}
                  >
                    <Star className={cn('h-4 w-4', isFavoriteChamp && 'fill-current')} />
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-white/55 capitalize mt-0.5">
                  {champion.title}
                </p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {champion.roles.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-white/[0.07] border border-white/12 px-2.5 py-0.5 text-[11px] text-white/80"
                    >
                      {t.roles[r]}
                    </span>
                  ))}
                  {champStat && (
                    <span className="rounded-full bg-white/[0.06] border border-white/12 px-2.5 py-0.5 font-mono-num text-[11px] text-white/80">
                      Thắng {formatPercent(champStat.winRate, 1)} · Chọn{' '}
                      {formatPercent(champStat.pickRate, 1)}
                    </span>
                  )}
                  <span className="rounded-full bg-white/[0.04] border border-white/10 px-2.5 py-0.5 font-mono-num text-[11px] text-white/60">
                    {championBuilds.length} bộ build đã lưu
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {compareIds.length >= 2 && (
              <button
                type="button"
                onClick={() => setComparing(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/[0.12] hover:bg-white/[0.18] border border-white/30 px-4 py-2.5 text-xs font-semibold text-white transition-colors"
              >
                <GitCompare className="h-4 w-4" />
                <span>So sánh ({compareIds.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onCreateBuild(champion.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-black hover:bg-white/90 px-4 py-2.5 text-xs font-semibold transition-colors shadow-[0_6px_24px_rgba(255,255,255,0.16)]"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo Build cho {champion.name}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="liquid-glass rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên bộ build hoặc tên Lõi Công Nghệ..."
            className="liquid-input w-full rounded-xl pl-10 pr-9 py-2 text-sm"
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
        </div>
      </section>

      {/* Compare Floating Banner */}
      {compareIds.length > 0 && (
        <div className="liquid-glass-elevated rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-white/85">
            <GitCompare className="h-4 w-4 text-white" />
            <span>
              Đã chọn <strong className="font-mono-num">{compareIds.length}</strong> bộ build để so sánh
              {compareIds.length < 2 && ' (chọn thêm ít nhất 1 bộ build nữa)'}.
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

      {/* Builds List */}
      {filteredBuilds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBuilds.map((build) => (
            <BuildSummaryCard
              key={build.id}
              build={build}
              compareSelected={compareIds.includes(build.id)}
              onToggleCompare={toggleCompare}
              onViewDetail={onViewBuild}
              onEdit={onEditBuild}
              onDuplicate={(b) => duplicateBuild(b.id)}
              onDelete={onRequestDelete}
            />
          ))}
        </div>
      ) : (
        <div className="liquid-glass rounded-3xl p-12 text-center space-y-3">
          <p className="text-sm text-white/65">
            {championBuilds.length === 0
              ? `${champion.name} chưa có bộ build ARAM: Mayhem nào được lưu.`
              : 'Không có bộ build nào khớp với bộ lọc hiện tại.'}
          </p>
          {championBuilds.length === 0 ? (
            <button
              type="button"
              onClick={() => onCreateBuild(champion.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tạo bộ build đầu tiên cho {champion.name}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setTierFilter('ALL');
                setOnlyFavorites(false);
              }}
              className="rounded-xl bg-white/[0.08] border border-white/15 px-4 py-2 text-xs font-medium text-white"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      )}
    </div>
  );
}
