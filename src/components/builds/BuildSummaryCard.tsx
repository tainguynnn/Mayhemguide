import { useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  GitCompare,
  Pencil,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import type { MayhemBuild } from '../../types/build';
import { buildTierSlotGrid } from '../../utils/augmentSlots';
import { cn, formatRelativeTimeVi, TIER_META, TIER_ORDER } from '../../utils/formatters';
import { GameIcon } from '../ui/GameIcon';
import { TierGlyph } from '../ui/TierBadge';
import { AugmentDetailModal } from '../augments/AugmentDetailModal';

interface BuildSummaryCardProps {
  build: MayhemBuild;
  showChampion?: boolean;
  compareSelected?: boolean;
  onToggleCompare?: (buildId: string) => void;
  onOpenChampion?: (championId: number) => void;
  onViewDetail: (build: MayhemBuild) => void;
  onEdit: (build: MayhemBuild) => void;
  onDuplicate: (build: MayhemBuild) => void;
  onDelete: (build: MayhemBuild) => void;
}

export function BuildSummaryCard({
  build,
  showChampion = false,
  compareSelected = false,
  onToggleCompare,
  onOpenChampion,
  onViewDetail,
  onEdit,
  onDuplicate,
  onDelete,
}: BuildSummaryCardProps) {
  const { gameData, toggleFavoriteBuild } = useLibrary();
  const champ = gameData.championById.get(build.championId);
  const slotGrid = buildTierSlotGrid(build.augments, gameData.augmentById);
  const [detailModalAugmentId, setDetailModalAugmentId] = useState<number | null>(null);

  const previewItems =
    build.items.core.length > 0 ? build.items.core : build.items.starting;

  const spell0 =
    build.summonerSpells[0] != null ? gameData.spellById.get(build.summonerSpells[0]) : undefined;
  const spell1 =
    build.summonerSpells[1] != null ? gameData.spellById.get(build.summonerSpells[1]) : undefined;

  return (
    <article
      className={cn(
        'liquid-glass liquid-card-interactive rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4',
        compareSelected && 'border-white/40 ring-1 ring-white/25 bg-white/[0.065]'
      )}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {showChampion && (
              <button
                type="button"
                onClick={() => onOpenChampion?.(build.championId)}
                className="shrink-0 group"
                title={`Mở thư viện ${champ?.name || ''}`}
              >
                <GameIcon
                  src={champ?.portraitUrl}
                  fallbackSrc={champ?.fallbackPortraitUrl}
                  alt={champ?.name || 'Tướng'}
                  className="h-11 w-11 rounded-xl border border-white/15 group-hover:border-white/35 transition-colors"
                />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {showChampion && champ && (
                  <button
                    type="button"
                    onClick={() => onOpenChampion?.(build.championId)}
                    className="text-[11px] font-medium text-white/55 hover:text-white transition-colors"
                  >
                    {champ.name}
                  </button>
                )}
                <span className="text-[11px] text-white/35 font-mono-num">
                  {formatRelativeTimeVi(build.updatedAt)}
                </span>
              </div>
              <h3
                onClick={() => onViewDetail(build)}
                className="mt-0.5 text-sm sm:text-[15px] font-semibold text-white truncate cursor-pointer hover:text-white/80 transition-colors"
              >
                {build.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleCompare && (
              <button
                type="button"
                onClick={() => onToggleCompare(build.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium border transition-colors',
                  compareSelected
                    ? 'bg-white text-black border-white'
                    : 'bg-white/[0.04] text-white/60 border-white/10 hover:bg-white/[0.09] hover:text-white'
                )}
                title="Chọn để so sánh"
              >
                {compareSelected ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <GitCompare className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">So sánh</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => toggleFavoriteBuild(build.id)}
              className={cn(
                'rounded-lg p-1.5 border transition-colors',
                build.favorite
                  ? 'bg-white/14 border-white/30 text-white'
                  : 'bg-white/[0.04] border-white/10 text-white/40 hover:text-white/80'
              )}
              title={build.favorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'}
            >
              <Star className={cn('h-3.5 w-3.5', build.favorite && 'fill-current')} />
            </button>
          </div>
        </div>

        {/* 3-Tier Priority Augments Breakdown (Prismatic / Gold / Silver) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-white/45">
            <span className="inline-flex items-center gap-1 font-medium uppercase tracking-wider text-[10px]">
              <Sparkles className="h-3 w-3" />
              Lõi ưu tiên ({build.augments.length}/12)
            </span>
            {build.augments.some((a) => a.alternativeAugmentIds.length > 0) && (
              <span className="text-[10px] text-white/40">Có lõi dự phòng</span>
            )}
          </div>

          {build.augments.length > 0 ? (
            <div className="space-y-1.5">
              {TIER_ORDER.map((tierKey) => {
                const slots = slotGrid[tierKey];
                const info = t.augmentTiers[tierKey];
                return (
                  <div
                    key={tierKey}
                    className="liquid-glass-subtle rounded-xl px-2.5 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-[92px] shrink-0">
                      <span
                        className={cn(
                          'inline-flex h-5 w-5 items-center justify-center rounded-md',
                          TIER_META[tierKey].badgeClass
                        )}
                      >
                        <TierGlyph tier={tierKey} className="h-3 w-3" />
                      </span>
                      <div className="leading-tight">
                        <div
                          className={cn(
                            'text-[10px] font-bold tracking-wide',
                            TIER_META[tierKey].textClass
                          )}
                        >
                          {info.vi}
                        </div>
                        <div className="text-[9px] text-white/40 font-mono-num">
                          {slots.filter(Boolean).length}/4 vị trí
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0 flex-wrap">
                      {slots.map((entry, idx) => {
                        const aug = entry
                          ? gameData.augmentById.get(entry.augmentId)
                          : undefined;
                        return aug ? (
                          <div
                            key={`${tierKey}-${idx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailModalAugmentId(aug.id);
                            }}
                            title={`Ưu tiên #${idx + 1} (${info.vi}): ${aug.name} ${aug.viName ? `(${aug.viName})` : ''}\n${aug.description}\n(Nhấn để xem chi tiết)`}
                            className="flex items-center gap-1 rounded-lg bg-black/35 hover:bg-white/[0.08] border border-white/10 pr-1.5 pl-1 py-0.5 max-w-[110px] min-w-0 cursor-pointer transition-colors"
                          >
                            <GameIcon
                              src={aug.iconUrl}
                              fallbackSrc={aug.fallbackIconUrl}
                              alt={aug.name}
                              className={cn(
                                'h-6 w-6 rounded-md shrink-0',
                                TIER_META[tierKey].ringClass
                              )}
                            />
                            <span className="text-[10px] font-medium text-white/90 truncate hidden md:inline">
                              {aug.name}
                            </span>
                          </div>
                        ) : (
                          <div
                            key={`${tierKey}-${idx}`}
                            title={`Vị trí #${idx + 1} (${info.vi}): Trống`}
                            className={cn(
                              'h-7 w-7 rounded-lg border border-dashed flex items-center justify-center font-mono-num text-[9px] text-white/25 shrink-0',
                              TIER_META[tierKey].slotClass
                            )}
                          >
                            {idx + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 py-3 text-center text-xs text-white/40">
              Chưa chọn Lõi Công Nghệ
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Items + Spells + Shards Compact Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.07]">
          {/* Items */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {previewItems.slice(0, 6).map((itemId, i) => {
              const item = gameData.itemById.get(itemId);
              return (
                <div key={`${itemId}-${i}`} title={item?.name || `Trang bị #${itemId}`}>
                  <GameIcon
                    src={item?.iconUrl}
                    fallbackSrc={item?.fallbackIconUrl}
                    alt={item?.name || 'Trang bị'}
                    className="h-7 w-7 rounded-lg border border-white/12"
                  />
                </div>
              );
            })}
            {previewItems.length === 0 && (
              <span className="text-[11px] text-white/35">Chưa có trang bị cốt lõi</span>
            )}
          </div>

          {/* Spells & Shards */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[spell0, spell1].map((sp, i) => (
                <div
                  key={i}
                  title={
                    sp
                      ? `${sp.name} (${sp.viName ? sp.viName + ' · ' : ''}${sp.cooldown}s):\n${sp.viDescription || sp.description}`
                      : 'Chưa chọn phép'
                  }
                >
                  {sp ? (
                    <GameIcon
                      src={sp.iconUrl}
                      fallbackSrc={sp.fallbackIconUrl}
                      alt={sp.name}
                      className="h-6 w-6 rounded-md border border-white/15"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-md border border-dashed border-white/15 bg-white/[0.02]" />
                  )}
                </div>
              ))}
            </div>

            <div className="h-4 w-px bg-white/10" />

            <div className="flex items-center gap-1">
              {(
                [
                  ['Offensive', build.statShards.offensive],
                  ['Flex', build.statShards.flex],
                  ['Defensive', build.statShards.defensive],
                ] as const
              ).map(([slot, shardId]) => {
                const shard =
                  shardId != null
                    ? gameData.shardBySlotAndId.get(`${slot}:${shardId}`)
                    : undefined;
                return (
                  <div
                    key={slot}
                    title={
                      shard
                        ? `${t.shardSlots[slot].label}: ${shard.viName || shard.name} (${shard.viShortDesc || shard.shortDesc})`
                        : `${t.shardSlots[slot].label}: Chưa chọn`
                    }
                  >
                    {shard ? (
                      <GameIcon
                        src={shard.iconUrl}
                        alt={shard.name}
                        className="h-5 w-5 rounded-full border border-white/15 bg-black/50 p-0.5"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-dashed border-white/15" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onViewDetail(build)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Chi tiết</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(build)}
              className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              title="Chỉnh sửa bộ build"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(build)}
              className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              title="Nhân bản bộ build"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(build)}
              className="rounded-lg p-1.5 text-white/45 hover:bg-white/10 hover:text-white transition-colors"
              title="Xóa bộ build"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Augment Detail Modal */}
      <AugmentDetailModal
        augmentId={detailModalAugmentId}
        open={detailModalAugmentId !== null}
        onClose={() => setDetailModalAugmentId(null)}
      />
    </article>
  );
}
