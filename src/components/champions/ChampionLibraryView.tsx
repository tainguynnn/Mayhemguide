import { useEffect, useMemo, useState } from 'react';
import { Layers, Search, Star, Users, X } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import type { ChampionRole } from '../../types/gameData';
import { cn, formatPercent, normalizeSearch } from '../../utils/formatters';
import { GameIcon } from '../ui/GameIcon';
import { MetaTierBadge } from '../ui/MetaTierBadge';

interface ChampionLibraryViewProps {
  initialSearch?: string;
  onSelectChampion: (championId: number) => void;
}

const ROLE_FILTERS: Array<'ALL' | ChampionRole> = [
  'ALL',
  'Top',
  'Jungle',
  'Mid',
  'ADC',
  'Support',
];

type SortMode = 'builds' | 'meta' | 'favorites' | 'name';

export function ChampionLibraryView({
  initialSearch = '',
  onSelectChampion,
}: ChampionLibraryViewProps) {
  const { gameData, metaStats, library, toggleFavoriteChampion } = useLibrary();
  const [search, setSearch] = useState(initialSearch);
  const [role, setRole] = useState<'ALL' | ChampionRole>('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyWithBuilds, setOnlyWithBuilds] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>('builds');

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const buildCountByChamp = useMemo(() => {
    const map = new Map<number, number>();
    for (const b of library.builds) {
      map.set(b.championId, (map.get(b.championId) || 0) + 1);
    }
    return map;
  }, [library.builds]);

  const favoriteChampSet = useMemo(
    () => new Set(library.favoriteChampionIds),
    [library.favoriteChampionIds]
  );

  const filteredChampions = useMemo(() => {
    const q = normalizeSearch(search.trim());
    const list = gameData.bundle.champions.filter((champ) => {
      if (
        q &&
        !normalizeSearch(champ.name).includes(q) &&
        !normalizeSearch(champ.slug).includes(q)
      ) {
        return false;
      }
      if (role !== 'ALL' && !champ.roles.includes(role)) {
        return false;
      }
      if (onlyFavorites && !favoriteChampSet.has(champ.id)) {
        return false;
      }
      if (onlyWithBuilds && (buildCountByChamp.get(champ.id) || 0) === 0) {
        return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      const cntA = buildCountByChamp.get(a.id) || 0;
      const cntB = buildCountByChamp.get(b.id) || 0;
      const favA = favoriteChampSet.has(a.id) ? 1 : 0;
      const favB = favoriteChampSet.has(b.id) ? 1 : 0;

      if (sortBy === 'meta') {
        const rankA = metaStats.championById.get(a.id)?.rank ?? 999;
        const rankB = metaStats.championById.get(b.id)?.rank ?? 999;
        return rankA - rankB || a.name.localeCompare(b.name);
      }
      if (sortBy === 'builds') {
        return cntB - cntA || favB - favA || a.name.localeCompare(b.name);
      }
      if (sortBy === 'favorites') {
        return favB - favA || cntB - cntA || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [
    gameData.bundle.champions,
    metaStats.championById,
    search,
    role,
    onlyFavorites,
    onlyWithBuilds,
    sortBy,
    favoriteChampSet,
    buildCountByChamp,
  ]);

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Header + Controls */}
      <section className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/12 px-2.5 py-0.5 text-[11px] font-medium text-white/80">
              <Users className="h-3 w-3" />
              <span>Danh sách Tướng ARAM: Mayhem</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white">
              Kho Tướng (Champion Library)
            </h1>
            <p className="text-xs sm:text-sm text-white/55">
              Chọn tướng để mở thư viện bộ build ARAM: Mayhem riêng biệt và xem thống kê hiệu suất.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/50 font-mono-num">
            <span>
              {filteredChampions.length} / {gameData.bundle.champions.length} tướng
            </span>
            <span>·</span>
            <span>{library.favoriteChampionIds.length} yêu thích</span>
          </div>
        </div>

        {/* Search + Sort + Quick Filters */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tướng theo tên (VD: Ahri, Jhin, Cho'Gath, Yasuo...)"
              className="liquid-input w-full rounded-xl pl-10 pr-9 py-2.5 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/45 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyFavorites((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium border transition-colors',
                onlyFavorites
                  ? 'bg-white text-black border-white'
                  : 'bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.09]'
              )}
            >
              <Star className={cn('h-3.5 w-3.5', onlyFavorites && 'fill-current')} />
              <span>Yêu thích</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyWithBuilds((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium border transition-colors',
                onlyWithBuilds
                  ? 'bg-white text-black border-white'
                  : 'bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.09]'
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Đã có build</span>
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortMode)}
              className="liquid-input rounded-xl px-3 py-2 text-xs text-white/85 bg-[#121318] cursor-pointer"
              aria-label="Sắp xếp tướng"
            >
              <option value="builds">Sắp xếp: Nhiều build nhất</option>
              <option value="meta">Sắp xếp: Thứ hạng Meta</option>
              <option value="favorites">Sắp xếp: Yêu thích trước</option>
              <option value="name">Sắp xếp: Tên A–Z</option>
            </select>
          </div>
        </div>

        {/* Role Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {ROLE_FILTERS.map((rf) => (
            <button
              key={rf}
              type="button"
              onClick={() => setRole(rf)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all duration-200',
                role === rf
                  ? 'bg-white text-black border-white shadow-[0_2px_12px_rgba(255,255,255,0.16)]'
                  : 'bg-white/[0.04] text-white/65 border-white/10 hover:bg-white/[0.09] hover:text-white'
              )}
            >
              {t.roles[rf]}
            </button>
          ))}
        </div>
      </section>

      {/* Champion Grid */}
      {filteredChampions.length > 0 ? (
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
          {filteredChampions.map((champ) => {
            const buildCount = buildCountByChamp.get(champ.id) || 0;
            const isFav = favoriteChampSet.has(champ.id);
            const stat = metaStats.championById.get(champ.id);
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
                className="cv-auto group liquid-glass liquid-card-interactive rounded-2xl p-3 cursor-pointer flex flex-col gap-2.5 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {/* Portrait Container */}
                <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-black/50">
                  <GameIcon
                    src={champ.portraitUrl}
                    fallbackSrc={champ.fallbackPortraitUrl}
                    alt={champ.name}
                    loading="lazy"
                    className="h-full w-full"
                    imgClassName="group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

                  {/* Meta Tier Badge (Top Left) */}
                  {stat && (
                    <div className="absolute top-2 left-2">
                      <MetaTierBadge tier={stat.tier} size="sm" />
                    </div>
                  )}

                  {/* Favorite Star (Top Right) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteChampion(champ.id);
                    }}
                    className={cn(
                      'absolute top-2 right-2 rounded-lg p-1.5 backdrop-blur-md border transition-all',
                      isFav
                        ? 'bg-white/90 text-black border-white'
                        : 'bg-black/50 text-white/65 border-white/15 opacity-80 group-hover:opacity-100 hover:bg-black/75 hover:text-white'
                    )}
                    title={isFav ? 'Bỏ yêu thích tướng' : 'Đánh dấu tướng yêu thích'}
                  >
                    <Star className={cn('h-3.5 w-3.5', isFav && 'fill-current')} />
                  </button>

                  {/* Build Count Badge */}
                  <div
                    className={cn(
                      'absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono-num text-[10px] font-medium backdrop-blur-md border',
                      buildCount > 0
                        ? 'bg-white/90 text-black border-white'
                        : 'bg-black/60 text-white/60 border-white/15'
                    )}
                  >
                    <Layers className="h-2.5 w-2.5" />
                    <span>{buildCount} build</span>
                  </div>

                  {/* Win Rate Pill */}
                  {stat && (
                    <div className="absolute bottom-2 right-2 rounded-full bg-black/65 border border-white/15 px-1.5 py-0.5 font-mono-num text-[10px] text-white/80 backdrop-blur-md">
                      {formatPercent(stat.winRate, 1)}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-semibold text-white truncate">{champ.name}</div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {champ.roles.slice(0, 2).map((r) => (
                      <span
                        key={r}
                        className="rounded-md bg-white/[0.05] border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-white/60"
                      >
                        {t.roles[r]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <div className="liquid-glass rounded-3xl p-12 text-center space-y-3">
          <p className="text-sm text-white/65">Không tìm thấy tướng phù hợp với bộ lọc.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setRole('ALL');
              setOnlyFavorites(false);
              setOnlyWithBuilds(false);
            }}
            className="rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 px-4 py-2 text-xs font-medium text-white transition-colors"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
