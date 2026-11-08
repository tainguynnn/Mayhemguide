import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Check,
  Trophy,
  Users,
  Info,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import type { GameAugment } from '../../types/gameData';
import type { SynergyTuple } from '../../types/meta';
import { GameIcon } from '../ui/GameIcon';
import { TierBadge, TierGlyph } from '../ui/TierBadge';
import { MetaTierBadge } from '../ui/MetaTierBadge';
import {
  TIER_META,
  formatCompactNumber,
  formatPercent,
  cn,
} from '../../utils/formatters';
import { t } from '../../i18n/vi';

export interface AugmentDetailModalProps {
  augmentId: number | null;
  open: boolean;
  onClose: () => void;
  /** Optional callback to create a build using this augment and optionally a synergy champion. */
  onCreateBuild?: (augmentId: number, championId?: number) => void;
  /** Optional callback when used as a picker inside BuildEditor. */
  onSelectAugment?: (augment: GameAugment) => void;
  selectActionLabel?: string;
  isAlreadySelected?: boolean;
}

export const AugmentDetailModal: React.FC<AugmentDetailModalProps> = ({
  augmentId,
  open,
  onClose,
  onCreateBuild,
  onSelectAugment,
  selectActionLabel,
  isAlreadySelected = false,
}) => {
  const { gameData, metaStats } = useLibrary();
  const [activeId, setActiveId] = useState<number | null>(augmentId);

  useEffect(() => {
    setActiveId(augmentId);
  }, [augmentId]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || activeId == null) return null;

  const augment = gameData.augmentById.get(activeId);
  if (!augment) return null;

  const stat = metaStats.augmentById.get(activeId);
  const synergies = metaStats.synergyByAugmentId.get(activeId) || [];
  const tierMeta = TIER_META[augment.tier];
  const tierInfo = t.augmentTiers[augment.tier];

  // Related same-tier augments (excluding current)
  const relatedSameTier = gameData.bundle.augments
    .filter((a) => a.id !== augment.id && a.tier === augment.tier && a.modeStatus === 'active')
    .slice(0, 4);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={cn(
          'liquid-glass-elevated w-full max-w-3xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col my-auto border shadow-2xl',
          tierMeta.accentClass
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex flex-wrap items-start justify-between gap-4 bg-white/[0.02]">
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
            <div className="relative shrink-0">
              <GameIcon
                src={augment.iconUrl}
                fallbackSrc={augment.fallbackIconUrl}
                alt={augment.name}
                className={cn('h-14 w-14 sm:h-16 sm:w-16 rounded-2xl', tierMeta.ringClass)}
              />
              <div
                className={cn(
                  'absolute -bottom-1.5 -right-1.5 rounded-full p-1 shadow-md',
                  tierMeta.badgeClass
                )}
              >
                <TierGlyph tier={augment.tier} className="h-3 w-3" />
              </div>
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
                  {augment.name}
                </h2>
                {augment.viName && (
                  <span className="text-xs sm:text-sm text-white/60 font-medium">
                    ({augment.viName})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <TierBadge tier={augment.tier} showVi />
                {stat ? (
                  <>
                    <MetaTierBadge tier={stat.tier} showPrefix />
                    <span className="font-mono-num text-[11px] text-white/50">
                      Hạng #{stat.rank} meta
                    </span>
                  </>
                ) : (
                  <span className="rounded-lg bg-white/[0.05] border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
                    Ít mẫu (&lt;200 trận)
                  </span>
                )}
                {augment.modeStatus === 'rotated' && (
                  <span className="rounded-full bg-white/[0.08] border border-white/15 px-2 py-0.5 text-[10px] text-white/55">
                    Đã xoay vòng
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSelectAugment ? (
              <button
                type="button"
                onClick={() => {
                  onSelectAugment(augment);
                  onClose();
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors',
                  isAlreadySelected
                    ? 'bg-white/15 text-white border border-white/25 hover:bg-white/20'
                    : 'bg-white text-black hover:bg-white/90 shadow-[0_4px_16px_rgba(255,255,255,0.18)]'
                )}
              >
                {isAlreadySelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span>
                  {selectActionLabel || (isAlreadySelected ? 'Đã chọn trong build' : 'Lắp vào bộ build')}
                </span>
              </button>
            ) : onCreateBuild ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCreateBuild(augment.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black hover:bg-white/90 px-3.5 py-2 text-xs font-semibold transition-colors shadow-[0_4px_16px_rgba(255,255,255,0.18)]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tạo Build với lõi này</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="rounded-xl p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Section 1: Effect & Wiki Mechanics */}
          <div className="liquid-glass-subtle rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/50">
              <span>Hiệu ứng Lõi Công Nghệ</span>
              <span className={tierMeta.textClass}>{tierInfo.en}</span>
            </div>
            <p className="text-sm text-white/90 leading-relaxed font-normal">
              {augment.description}
            </p>

            {augment.notes && (
              <div className="pt-3.5 border-t border-white/[0.08] space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/65">
                  <Info className="h-3.5 w-3.5 text-white/50" />
                  <span>Chi tiết cơ chế &amp; Tương tác kỹ năng (Wiki ARAM: Mayhem):</span>
                </div>
                <p className="text-xs text-white/70 whitespace-pre-line leading-relaxed bg-black/25 rounded-xl p-3 border border-white/[0.06]">
                  {augment.notes}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Meta Statistics & Stage Breakdown */}
          {stat ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-white/75" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    Thống kê thực chiến (Phiên bản {metaStats.bundle.patch})
                  </span>
                </div>
                <span className="font-mono-num text-[11px] text-white/45">
                  {formatCompactNumber(stat.matches)} trận ghi nhận
                </span>
              </div>

              {/* Top 3 Metric Cards */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="liquid-glass-subtle rounded-2xl p-3 sm:p-3.5">
                  <div className="text-[10px] sm:text-[11px] text-white/45">Xếp hạng Meta</div>
                  <div className="mt-1 flex items-center gap-2">
                    <MetaTierBadge tier={stat.tier} showPrefix size="sm" />
                    <span className="font-mono-num text-xs sm:text-sm font-semibold text-white/80">
                      #{stat.rank}
                    </span>
                  </div>
                </div>

                <div className="liquid-glass-subtle rounded-2xl p-3 sm:p-3.5">
                  <div className="text-[10px] sm:text-[11px] text-white/45">Tỷ lệ thắng (Win Rate)</div>
                  <div className="mt-1 font-mono-num text-base sm:text-lg font-bold text-white">
                    {formatPercent(stat.winRate, 2)}
                  </div>
                </div>

                <div className="liquid-glass-subtle rounded-2xl p-3 sm:p-3.5">
                  <div className="text-[10px] sm:text-[11px] text-white/45">Tỷ lệ chọn (Pick Rate)</div>
                  <div className="mt-1 font-mono-num text-base sm:text-lg font-bold text-white">
                    {formatPercent(stat.pickRate, 2)}
                  </div>
                </div>
              </div>

              {/* Stage Breakdown 1 to 4 */}
              {stat.stages && Object.keys(stat.stages).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                    <TrendingUp className="h-3 w-3" />
                    <span>Hiệu suất theo từng lượt chọn lõi (Vòng 1 – 4):</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['1', '2', '3', '4'] as const).map((stageKey) => {
                      const st = stat.stages?.[stageKey];
                      return (
                        <div
                          key={stageKey}
                          className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-2.5 sm:p-3 space-y-1"
                        >
                          <div className="text-[10px] uppercase text-white/40">
                            Lượt chọn #{stageKey}
                          </div>
                          {st ? (
                            <>
                              <div className="font-mono-num text-xs sm:text-sm font-semibold text-white">
                                {formatPercent(st.winRate, 2)}
                              </div>
                              <div className="font-mono-num text-[10px] text-white/45 truncate">
                                Chọn {formatPercent(st.pickRate, 2)} ({formatCompactNumber(st.matches)})
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-white/25">—</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 p-4 text-xs text-white/50">
              Lõi này hiện có ít hơn 200 trận thống kê trong bản cập nhật hiện tại hoặc mới được thêm vào.
            </div>
          )}

          {/* Section 3: Synergy Champions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-white/75" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Tướng kết hợp hiệu quả nhất (Synergy Champions)
                </span>
              </div>
              <span className="text-[11px] text-white/40">
                Xếp theo độ gia tăng tỷ lệ thắng (Lift)
              </span>
            </div>

            {synergies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {synergies.slice(0, 10).map(([champId, wr, lift]: SynergyTuple) => {
                  const champ = gameData.championById.get(champId);
                  if (!champ) return null;
                  return (
                    <div
                      key={champId}
                      className="rounded-2xl p-2.5 sm:p-3 bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.07] flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GameIcon
                          src={champ.portraitUrl}
                          fallbackSrc={champ.fallbackPortraitUrl}
                          alt={champ.name}
                          className="h-10 w-10 rounded-xl border border-white/15 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {champ.name}
                          </div>
                          <div className="text-[10px] text-white/45">
                            {champ.roles.map((r) => t.roles[r]).join(' · ')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="text-right space-y-0.5 font-mono-num">
                          <div className="text-xs font-semibold text-white">
                            Thắng {formatPercent(wr, 1)}
                          </div>
                          <div
                            className={cn(
                              'text-[10px] font-semibold',
                              lift >= 0 ? 'text-white/90' : 'text-white/50'
                            )}
                          >
                            {lift >= 0 ? `+${lift.toFixed(1)}%` : `${lift.toFixed(1)}%`}
                          </div>
                        </div>

                        {onCreateBuild && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onCreateBuild(augment.id, champId);
                            }}
                            title={`Tạo Build cho ${champ.name} với lõi ${augment.name}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-white/[0.08] hover:bg-white text-white hover:text-black border border-white/15 px-2 py-1 text-[10px] font-semibold transition-colors"
                          >
                            <span>Tạo</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
                Chưa có dữ liệu cặp tướng – lõi đạt ngưỡng 1,000 trận trong phiên bản này.
              </div>
            )}
          </div>

          {/* Section 4: Related Same-Tier Augments */}
          {relatedSameTier.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-white/[0.07]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-white/70" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Lõi Công Nghệ cùng cấp độ ({tierInfo.vi}) — Nhấn để xem nhanh
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {relatedSameTier.map((rel) => {
                  const relStat = metaStats.augmentById.get(rel.id);
                  return (
                    <button
                      key={rel.id}
                      type="button"
                      onClick={() => setActiveId(rel.id)}
                      className="rounded-xl p-2 bg-white/[0.025] hover:bg-white/[0.08] border border-white/[0.07] hover:border-white/20 flex items-center gap-2 min-w-0 transition-all text-left cursor-pointer group"
                    >
                      <GameIcon
                        src={rel.iconUrl}
                        fallbackSrc={rel.fallbackIconUrl}
                        alt={rel.name}
                        className={cn('h-8 w-8 rounded-lg shrink-0 group-hover:scale-105 transition-transform', tierMeta.ringClass)}
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-white truncate group-hover:text-white">
                          {rel.name}
                        </div>
                        {relStat && (
                          <div className="font-mono-num text-[9px] text-white/45">
                            {formatPercent(relStat.winRate, 1)} WR
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
