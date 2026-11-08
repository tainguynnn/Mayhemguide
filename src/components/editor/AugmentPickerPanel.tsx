import { useEffect, useMemo, useState } from 'react';
import { Check, Info, Plus, Search, X } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import type { AugmentTier, GameAugment } from '../../types/gameData';
import { cn, formatPercent, normalizeSearch, TIER_META } from '../../utils/formatters';
import { GameIcon } from '../ui/GameIcon';
import { MetaTierBadge } from '../ui/MetaTierBadge';
import { TierBadge, TierGlyph } from '../ui/TierBadge';
import { AugmentDetailModal } from '../augments/AugmentDetailModal';

interface AugmentPickerPanelProps {
  selectedIds: number[];
  excludedIds?: number[];
  onToggleSelect: (augment: GameAugment) => void;
  /** Optional controlled tier filter (e.g. when filling a specific tier slot). */
  forcedTier?: 'ALL' | AugmentTier;
  onTierFilterChange?: (tier: 'ALL' | AugmentTier) => void;
  targetSlotBanner?: {
    tier: AugmentTier;
    slotIndex: number;
    replacingName?: string;
    onClearTarget: () => void;
  } | null;
  compact?: boolean;
}

const TIERS: Array<'ALL' | AugmentTier> = ['ALL', 'Prismatic', 'Gold', 'Silver'];

export function AugmentPickerPanel({
  selectedIds,
  excludedIds = [],
  onToggleSelect,
  forcedTier,
  onTierFilterChange,
  targetSlotBanner,
  compact = false,
}: AugmentPickerPanelProps) {
  const { gameData, metaStats } = useLibrary();
  const [search, setSearch] = useState('');
  const [internalTier, setInternalTier] = useState<'ALL' | AugmentTier>(
    forcedTier ?? 'ALL'
  );
  const [includeRotated, setIncludeRotated] = useState(false);
  const [detailModalAugmentId, setDetailModalAugmentId] = useState<number | null>(null);

  useEffect(() => {
    if (forcedTier) {
      setInternalTier(forcedTier);
    }
  }, [forcedTier]);

  const activeTier = forcedTier ?? internalTier;

  const handleSelectTier = (next: 'ALL' | AugmentTier) => {
    setInternalTier(next);
    onTierFilterChange?.(next);
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const excludedSet = useMemo(() => new Set(excludedIds), [excludedIds]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(search.trim());
    return gameData.bundle.augments.filter((aug) => {
      if (excludedSet.has(aug.id)) return false;
      if (!includeRotated && aug.modeStatus === 'rotated') return false;
      if (activeTier !== 'ALL' && aug.tier !== activeTier) return false;
      if (q) {
        const hay = normalizeSearch(
          `${aug.name} ${aug.viName || ''} ${aug.description}`
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [gameData.bundle.augments, excludedSet, includeRotated, activeTier, search]);

  return (
    <div className="space-y-3">
      {/* Active Target Slot Banner */}
      {targetSlotBanner && (
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 border flex flex-wrap items-center justify-between gap-2',
            TIER_META[targetSlotBanner.tier].badgeClass
          )}
        >
          <div className="flex items-center gap-2 text-xs font-medium min-w-0">
            <TierGlyph tier={targetSlotBanner.tier} className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Đang chọn lõi cho nhóm{' '}
              <strong>{t.augmentTiers[targetSlotBanner.tier].fullHeader}</strong> · Vị trí ưu tiên{' '}
              <strong className="font-mono-num">#{targetSlotBanner.slotIndex + 1}</strong>
              {targetSlotBanner.replacingName
                ? ` (Thay thế "${targetSlotBanner.replacingName}")`
                : ' (Đang trống)'}
            </span>
          </div>
          <button
            type="button"
            onClick={targetSlotBanner.onClearTarget}
            className="inline-flex items-center gap-1 rounded-lg bg-black/35 hover:bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white transition-colors shrink-0"
          >
            <X className="h-3 w-3" />
            <span>Bỏ ghim vị trí</span>
          </button>
        </div>
      )}

      {/* Search & Rotated Toggle */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm lõi công nghệ (tên Anh/Việt hoặc từ khóa hiệu ứng)..."
            className="liquid-input w-full rounded-xl pl-9 pr-8 py-2 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Xóa tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <label className="inline-flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-1.5 text-[11px] text-white/65 cursor-pointer select-none shrink-0">
          <input
            type="checkbox"
            checked={includeRotated}
            onChange={(e) => setIncludeRotated(e.target.checked)}
            className="accent-white rounded"
          />
          <span>Hiện cả lõi đã xoay vòng</span>
        </label>
      </div>

      {/* Tier Filter Pills with distinct Tier Icons & Colors */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {TIERS.map((tierOpt) => {
            const active = activeTier === tierOpt;
            if (tierOpt === 'ALL') {
              return (
                <button
                  key={tierOpt}
                  type="button"
                  onClick={() => handleSelectTier('ALL')}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                    active
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-white/[0.04] text-white/65 border-white/10 hover:bg-white/[0.09]'
                  )}
                >
                  Tất cả cấp độ
                </button>
              );
            }
            const info = t.augmentTiers[tierOpt];
            return (
              <button
                key={tierOpt}
                type="button"
                onClick={() => handleSelectTier(tierOpt)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all',
                  active
                    ? `${TIER_META[tierOpt].badgeClass} ring-2 ring-white/40`
                    : 'bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.09]'
                )}
              >
                <TierGlyph tier={tierOpt} className="h-3 w-3" />
                <span>
                  {info.en} · {info.vi}
                </span>
              </button>
            );
          })}
        </div>
        <span className="font-mono-num text-[11px] text-white/45">
          {filtered.length} lõi khả dụng
        </span>
      </div>

      {/* Visual Augment Grid - ZERO hover jitter layout shifts, rock solid container */}
      <div
        className={cn(
          'overflow-y-auto pr-1 grid gap-2.5',
          compact
            ? 'max-h-[340px] grid-cols-1 sm:grid-cols-2'
            : 'max-h-[440px] grid-cols-1 sm:grid-cols-2'
        )}
      >
        {filtered.map((aug) => {
          const isSelected = selectedSet.has(aug.id);
          const stat = metaStats.augmentById.get(aug.id);
          return (
            <div
              key={aug.id}
              onClick={() => onToggleSelect(aug)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleSelect(aug);
                }
              }}
              className={cn(
                'group rounded-xl p-3 border cursor-pointer flex items-start gap-2.5 transition-all text-left min-w-0 overflow-hidden',
                isSelected
                  ? 'bg-white/[0.12] border-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
                  : 'bg-white/[0.025] border-white/[0.07] hover:bg-white/[0.07] hover:border-white/20'
              )}
            >
              <GameIcon
                src={aug.iconUrl}
                fallbackSrc={aug.fallbackIconUrl}
                alt={aug.name}
                loading="lazy"
                className={cn(
                  'h-11 w-11 rounded-lg shrink-0',
                  TIER_META[aug.tier].ringClass
                )}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-white truncate block">
                      {aug.name}
                    </span>
                    {aug.viName && (
                      <span className="text-[10px] text-white/50 truncate block">
                        {aug.viName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {stat && <MetaTierBadge tier={stat.tier} size="sm" />}
                    <TierBadge tier={aug.tier} compact />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailModalAugmentId(aug.id);
                      }}
                      title="Xem chi tiết cơ chế & thống kê"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/15 hover:text-white transition-colors"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                    <span
                      className={cn(
                        'inline-flex h-5 w-5 items-center justify-center rounded-md border text-[10px]',
                        isSelected
                          ? 'bg-white text-black border-white'
                          : 'bg-white/[0.05] text-white/60 border-white/10 group-hover:text-white'
                      )}
                    >
                      {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-white/60 line-clamp-2 leading-snug">
                  {aug.description}
                </p>

                <div className="flex items-center justify-between gap-1 text-[10px] text-white/45 font-mono-num pt-0.5">
                  {stat ? (
                    <span>
                      Thắng {formatPercent(stat.winRate, 1)} · Chọn {formatPercent(stat.pickRate, 1)}
                    </span>
                  ) : (
                    <span>Chưa đủ 200 trận</span>
                  )}
                  {aug.notes && (
                    <span className="inline-flex items-center gap-0.5 text-white/40 text-[9px]">
                      <span>Có cơ chế</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-8 text-center text-xs text-white/40">
            Không tìm thấy Lõi Công Nghệ phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>

      {/* Augment Detail Modal (Zero layout shift, opened on demand) */}
      <AugmentDetailModal
        augmentId={detailModalAugmentId}
        open={detailModalAugmentId !== null}
        onClose={() => setDetailModalAugmentId(null)}
        onSelectAugment={(aug) => onToggleSelect(aug)}
        selectActionLabel={
          targetSlotBanner
            ? `Lắp vào #${targetSlotBanner.slotIndex + 1} (${t.augmentTiers[targetSlotBanner.tier].vi})`
            : undefined
        }
        isAlreadySelected={detailModalAugmentId ? selectedSet.has(detailModalAugmentId) : false}
      />
    </div>
  );
}
