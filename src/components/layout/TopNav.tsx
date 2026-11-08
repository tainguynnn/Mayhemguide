import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Cpu,
  Database,
  Plus,
  Search,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import { GameIcon } from '../ui/GameIcon';
import { TierBadge } from '../ui/TierBadge';
import { cn, normalizeSearch, TIER_META } from '../../utils/formatters';

export type AppRoute =
  | { view: 'tier-list' }
  | { view: 'champions' }
  | { view: 'champion-builds'; championId: number }
  | { view: 'augments'; initialAugmentId?: number }
  | { view: 'my-builds' }
  | {
      view: 'editor';
      buildId?: string;
      preselectedChampionId?: number;
      preselectedAugmentId?: number;
    }
  | { view: 'data' };

interface TopNavProps {
  route: AppRoute;
  onNavigate: (next: AppRoute) => void;
}

export function TopNav({ route, onNavigate }: TopNavProps) {
  const { gameData, library } = useLibrary();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQuery('');
    }
  }, [searchOpen]);

  const results = useMemo(() => {
    const q = normalizeSearch(query.trim());
    if (!q) {
      return {
        champions: gameData.bundle.champions.slice(0, 6),
        builds: library.builds.slice(0, 4),
        augments: gameData.bundle.augments.slice(0, 4),
      };
    }
    const champions = gameData.bundle.champions
      .filter(
        (c) =>
          normalizeSearch(c.name).includes(q) || normalizeSearch(c.slug).includes(q)
      )
      .slice(0, 6);

    const builds = library.builds
      .filter((b) => {
        const champ = gameData.championById.get(b.championId);
        const matchAug = b.augments.some((entry) => {
          const aug = gameData.augmentById.get(entry.augmentId);
          return (
            aug &&
            (normalizeSearch(aug.name).includes(q) ||
              (aug.viName && normalizeSearch(aug.viName).includes(q)))
          );
        });
        return (
          normalizeSearch(b.name).includes(q) ||
          (champ && normalizeSearch(champ.name).includes(q)) ||
          matchAug
        );
      })
      .slice(0, 5);

    const augments = gameData.bundle.augments
      .filter(
        (a) =>
          normalizeSearch(a.name).includes(q) ||
          (a.viName && normalizeSearch(a.viName).includes(q)) ||
          normalizeSearch(a.description).includes(q)
      )
      .slice(0, 6);

    return { champions, builds, augments };
  }, [query, gameData, library.builds]);

  const navItems: Array<{
    id: string;
    label: string;
    shortLabel: string;
    active: boolean;
    icon: typeof Trophy;
    badge?: number;
    onClick: () => void;
  }> = [
    {
      id: 'tier-list',
      label: t.nav.tierList,
      shortLabel: 'Tier List',
      active: route.view === 'tier-list',
      icon: Trophy,
      onClick: () => onNavigate({ view: 'tier-list' }),
    },
    {
      id: 'champions',
      label: t.nav.champions,
      shortLabel: 'Tướng',
      active: route.view === 'champions' || route.view === 'champion-builds',
      icon: Users,
      onClick: () => onNavigate({ view: 'champions' }),
    },
    {
      id: 'augments',
      label: t.nav.augments,
      shortLabel: 'Kho Lõi',
      active: route.view === 'augments',
      icon: Cpu,
      onClick: () => onNavigate({ view: 'augments' }),
    },
    {
      id: 'my-builds',
      label: t.nav.myBuilds,
      shortLabel: 'Build',
      active:
        route.view === 'my-builds' || route.view === 'editor' || route.view === 'data',
      icon: Bookmark,
      badge: library.builds.length,
      onClick: () => onNavigate({ view: 'my-builds' }),
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px] liquid-glass rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <button
            type="button"
            onClick={() => onNavigate({ view: 'tier-list' })}
            className="flex items-center gap-3 text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] group-hover:bg-white/[0.13] transition-colors">
              <Sparkles className="h-4 w-4 text-white/90" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-white">
                  {t.brand.title}
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-white/[0.07] border border-white/12 px-2 py-0.5 font-mono-num text-[10px] text-white/70">
                  v{gameData.bundle.manifest.version}
                </span>
              </div>
              <p className="text-[11px] text-white/45 leading-none mt-0.5">
                {t.brand.subtitle}
              </p>
            </div>
          </button>

          {/* 4 Main Navigation Tabs */}
          <nav
            aria-label="Điều hướng chính"
            className="flex items-center gap-1 rounded-xl bg-black/35 p-1 border border-white/[0.07]"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                    item.active
                      ? 'bg-white text-black shadow-[0_2px_12px_rgba(255,255,255,0.18)]'
                      : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">{item.shortLabel}</span>
                  {typeof item.badge === 'number' && (
                    <span
                      className={cn(
                        'hidden sm:inline-flex items-center justify-center rounded-full px-1.5 py-0.2 font-mono-num text-[10px]',
                        item.active
                          ? 'bg-black/15 text-black font-semibold'
                          : 'bg-white/[0.08] text-white/60'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Quick Actions: Search + Create Build + Data */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              title="Tìm kiếm nhanh (Ctrl+K)"
              className="flex items-center gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-3 py-1.5 text-xs text-white/55 hover:text-white/85 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">{t.nav.quickSearchPlaceholder}</span>
              <kbd className="hidden lg:inline-block rounded-md bg-white/[0.07] border border-white/10 px-1.5 py-0.5 font-mono-num text-[10px] text-white/50">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() =>
                onNavigate({
                  view: 'editor',
                  preselectedChampionId:
                    route.view === 'champion-builds' ? route.championId : undefined,
                })
              }
              title="Mở trình tạo Build mới"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.nav.createBuild}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate({ view: 'data' })}
              title={t.nav.dataManager}
              aria-label={t.nav.dataManager}
              className={cn(
                'rounded-xl p-2 border transition-colors',
                route.view === 'data'
                  ? 'bg-white text-black border-white'
                  : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 text-white/60 hover:text-white'
              )}
            >
              <Database className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Command Search Palette */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-md pt-16 px-4 animate-fade-slide"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="liquid-glass-elevated w-full max-w-2xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search className="h-4 w-4 text-white/50 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm tên tướng, tên bộ build hoặc lõi công nghệ (VD: Yasuo, Eureka, Bouncing Bees)..."
                className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Đóng tìm kiếm"
                className="rounded-lg p-1 text-white/45 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
              {results.builds.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    Bộ build đã lưu
                  </div>
                  <div className="space-y-1">
                    {results.builds.map((b) => {
                      const champ = gameData.championById.get(b.championId);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            onNavigate({ view: 'champion-builds', championId: b.championId });
                          }}
                          className="w-full flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 hover:bg-white/[0.07] text-left transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <GameIcon
                              src={champ?.portraitUrl}
                              fallbackSrc={champ?.fallbackPortraitUrl}
                              alt={champ?.name || 'Tướng'}
                              className="h-8 w-8 rounded-lg"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-white truncate">
                                {b.name}
                              </div>
                              <div className="text-[11px] text-white/45">
                                {champ?.name} · {b.augments.length} lõi ưu tiên
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] text-white/40 shrink-0">Mở thư viện →</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {results.champions.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    Tướng (Champions)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {results.champions.map((c) => {
                      const count = library.builds.filter((b) => b.championId === c.id).length;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            onNavigate({ view: 'champion-builds', championId: c.id });
                          }}
                          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-white/[0.07] text-left transition-colors"
                        >
                          <GameIcon
                            src={c.portraitUrl}
                            fallbackSrc={c.fallbackPortraitUrl}
                            alt={c.name}
                            className="h-8 w-8 rounded-lg"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-white truncate">{c.name}</div>
                            <div className="text-[10px] text-white/45 font-mono-num">
                              {count} bộ build
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {results.augments.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    Lõi Công Nghệ (Augments)
                  </div>
                  <div className="space-y-1">
                    {results.augments.map((aug) => (
                      <button
                        key={aug.id}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          onNavigate({ view: 'augments', initialAugmentId: aug.id });
                        }}
                        className="w-full flex items-start gap-2.5 rounded-xl px-2.5 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-left transition-colors"
                      >
                        <GameIcon
                          src={aug.iconUrl}
                          fallbackSrc={aug.fallbackIconUrl}
                          alt={aug.name}
                          className={cn(
                            'h-8 w-8 rounded-lg mt-0.5 shrink-0',
                            TIER_META[aug.tier].ringClass
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-white">{aug.name}</span>
                            {aug.viName && (
                              <span className="text-[11px] text-white/45">({aug.viName})</span>
                            )}
                            <TierBadge tier={aug.tier} compact showVi />
                          </div>
                          <p className="text-[11px] text-white/55 line-clamp-2 mt-0.5">
                            {aug.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.builds.length === 0 &&
                results.champions.length === 0 &&
                results.augments.length === 0 && (
                  <div className="py-10 text-center text-xs text-white/45">
                    Không tìm thấy kết quả phù hợp cho &ldquo;{query}&rdquo;.
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
