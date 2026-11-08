import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Pencil, Sparkles, Star, X } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import type { ItemCategoryKey, MayhemBuild } from '../../types/build';
import { buildTierSlotGrid } from '../../utils/augmentSlots';
import { cn, formatRelativeTimeVi, TIER_META, TIER_ORDER, translateItemStat } from '../../utils/formatters';
import { GameIcon } from '../ui/GameIcon';
import { TierBadge, TierGlyph } from '../ui/TierBadge';
import { AugmentDetailModal } from '../augments/AugmentDetailModal';

interface BuildDetailModalProps {
  build: MayhemBuild | null;
  onClose: () => void;
  onEdit: (build: MayhemBuild) => void;
  onDuplicate: (build: MayhemBuild) => void;
}

const ITEM_GROUP_KEYS: ItemCategoryKey[] = ['starting', 'core', 'situational', 'alternative'];

const NOTE_SECTIONS: Array<{ key: keyof MayhemBuild['notes']; label: string }> = [
  { key: 'gameplay', label: 'Cách vận hành bộ build' },
  { key: 'synergy', label: 'Kết hợp giữa Lõi & Trang bị' },
  { key: 'conditions', label: 'Điều kiện sử dụng' },
  { key: 'alternatives', label: 'Những phương án thay thế' },
  { key: 'matchups', label: 'Đối đầu & Chiến thuật đặc biệt' },
];

export function BuildDetailModal({
  build,
  onClose,
  onEdit,
  onDuplicate,
}: BuildDetailModalProps) {
  const { gameData, toggleFavoriteBuild } = useLibrary();
  const [detailModalAugmentId, setDetailModalAugmentId] = useState<number | null>(null);

  useEffect(() => {
    if (!build) return;
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
  }, [build, onClose]);

  if (!build) return null;

  const champ = gameData.championById.get(build.championId);
  const slotGrid = buildTierSlotGrid(build.augments, gameData.augmentById);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="liquid-glass-elevated w-full max-w-4xl max-h-[88vh] rounded-3xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner */}
        <div className="relative px-6 py-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <GameIcon
              src={champ?.portraitUrl}
              fallbackSrc={champ?.fallbackPortraitUrl}
              alt={champ?.name || 'Tướng'}
              className="h-14 w-14 rounded-2xl border border-white/20"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-white/55">
                <span className="font-medium text-white/80">{champ?.name}</span>
                <span>·</span>
                <span>Cập nhật {formatRelativeTimeVi(build.updatedAt)}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-white truncate mt-0.5">
                {build.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleFavoriteBuild(build.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-colors',
                build.favorite
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'bg-white/[0.05] border-white/10 text-white/70 hover:text-white'
              )}
            >
              <Star className={cn('h-3.5 w-3.5', build.favorite && 'fill-current')} />
              <span>{build.favorite ? 'Yêu thích' : 'Thích'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onDuplicate(build);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/85 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Nhân bản</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(build);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold bg-white text-black hover:bg-white/90 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Chỉnh sửa</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-white/55 hover:bg-white/10 hover:text-white"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section A: 12 Priority Augments across 3 Tiers */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/55">
              <Sparkles className="h-3.5 w-3.5" />
              Lõi Ưu Tiên ({build.augments.length} / 12 vị trí)
            </h3>

            <div className="space-y-4">
              {TIER_ORDER.map((tierKey) => {
                const slots = slotGrid[tierKey];
                const info = t.augmentTiers[tierKey];
                return (
                  <div
                    key={tierKey}
                    className={cn(
                      'liquid-glass-subtle rounded-2xl p-4 space-y-3',
                      TIER_META[tierKey].accentClass
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-lg',
                            TIER_META[tierKey].badgeClass
                          )}
                        >
                          <TierGlyph tier={tierKey} className="h-3.5 w-3.5" />
                        </span>
                        <span
                          className={cn(
                            'text-xs font-bold tracking-wide',
                            TIER_META[tierKey].textClass
                          )}
                        >
                          {info.fullHeader}
                        </span>
                        <TierBadge tier={tierKey} compact showVi />
                      </div>
                      <span className="font-mono-num text-xs text-white/50">
                        {slots.filter(Boolean).length}/4 vị trí
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {slots.map((entry, idx) => {
                        const aug = entry
                          ? gameData.augmentById.get(entry.augmentId)
                          : undefined;
                        if (!entry || !aug) {
                          return (
                            <div
                              key={`${tierKey}-empty-${idx}`}
                              className={cn(
                                'rounded-xl border border-dashed p-3 flex items-center justify-between text-xs text-white/35',
                                TIER_META[tierKey].slotClass
                              )}
                            >
                              <span>Vị trí ưu tiên #{idx + 1}</span>
                              <span>Chưa chọn lõi {info.vi}</span>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={entry.uid}
                            onClick={() => setDetailModalAugmentId(aug.id)}
                            className="rounded-xl bg-black/35 hover:bg-white/[0.06] border border-white/10 p-3 space-y-2 cursor-pointer transition-colors"
                            title="Nhấn để xem chi tiết cơ chế & thống kê lõi"
                          >
                            <div className="flex items-start gap-2.5">
                              <GameIcon
                                src={aug.iconUrl}
                                fallbackSrc={aug.fallbackIconUrl}
                                alt={aug.name}
                                className={cn(
                                  'h-10 w-10 rounded-xl shrink-0',
                                  TIER_META[aug.tier].ringClass
                                )}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="rounded bg-white/12 px-1.5 py-0.2 font-mono-num text-[10px] font-semibold text-white/85">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-xs sm:text-sm font-semibold text-white">
                                    {aug.name}
                                  </span>
                                  {aug.viName && (
                                    <span className="text-[11px] text-white/45">
                                      ({aug.viName})
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-white/70">
                                  {aug.description}
                                </p>
                              </div>
                            </div>

                            {entry.synergyNote && (
                              <div className="rounded-lg bg-white/[0.04] border border-white/[0.07] px-2.5 py-1.5 text-[11px] text-white/80">
                                <span className="text-white/45 font-medium">Ghi chú: </span>
                                {entry.synergyNote}
                              </div>
                            )}

                            {entry.alternativeAugmentIds.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <span className="text-[10px] text-white/45">Dự phòng:</span>
                                {entry.alternativeAugmentIds.map((altId) => {
                                  const alt = gameData.augmentById.get(altId);
                                  if (!alt) return null;
                                  return (
                                    <span
                                      key={altId}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailModalAugmentId(alt.id);
                                      }}
                                      title={`${alt.name}: ${alt.description}\n(Nhấn để xem chi tiết)`}
                                      className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] hover:bg-white/15 border border-white/10 px-1.5 py-0.5 text-[10px] text-white/85 transition-colors"
                                    >
                                      <GameIcon
                                        src={alt.iconUrl}
                                        fallbackSrc={alt.fallbackIconUrl}
                                        alt={alt.name}
                                        className="h-3.5 w-3.5 rounded"
                                      />
                                      <span>{alt.name}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section B: Items */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/55">
              Trang Bị (Items)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ITEM_GROUP_KEYS.map((key) => {
                const list = build.items[key];
                const label = t.itemGroups[key].label;
                return (
                  <div key={key} className="liquid-glass-subtle rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-medium text-white/75">
                      <span>{label}</span>
                      <span className="font-mono-num text-[11px] text-white/40">
                        {list.length} món
                      </span>
                    </div>
                    {list.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {list.map((itemId, idx) => {
                          const item = gameData.itemById.get(itemId);
                          return (
                            <div
                              key={`${itemId}-${idx}`}
                              title={
                                item
                                  ? `${item.name} (${item.priceTotal} vàng)\n${item.statsSummary.map(translateItemStat).join(', ')}\n${item.plainDescription}`
                                  : `Trang bị #${itemId}`
                              }
                              className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] pr-2.5 pl-1.5 py-1"
                            >
                              <GameIcon
                                src={item?.iconUrl}
                                fallbackSrc={item?.fallbackIconUrl}
                                alt={item?.name || 'Trang bị'}
                                className="h-7 w-7 rounded-lg"
                              />
                              <div className="min-w-0">
                                <div className="text-[11px] font-medium text-white/90 truncate max-w-[140px]">
                                  {item?.name || `Trang bị #${itemId}`}
                                </div>
                                {item && (
                                  <div className="text-[10px] font-mono-num text-white/40">
                                    {item.priceTotal} vàng
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-white/35">Chưa chọn</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section C & D: Summoner Spells & Stat Shards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <section className="liquid-glass-subtle rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/55">
                Phép Bổ Trợ
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {build.summonerSpells.map((spellId, i) => {
                  const sp = spellId != null ? gameData.spellById.get(spellId) : undefined;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] p-2.5"
                    >
                      {sp ? (
                        <>
                          <GameIcon
                            src={sp.iconUrl}
                            fallbackSrc={sp.fallbackIconUrl}
                            alt={sp.name}
                            className="h-9 w-9 rounded-lg border border-white/15"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-white truncate">
                              {sp.name}
                              {sp.viName && (
                                <span className="text-[10px] text-white/50 ml-1">
                                  ({sp.viName})
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono-num text-white/45">
                              {sp.cooldown}s hồi chiêu
                            </div>
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-white/35">Chưa chọn</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="liquid-glass-subtle rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/55">
                Mảnh Chỉ Số (Stat Shards)
              </h3>
              <div className="space-y-2">
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
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-1.5"
                    >
                      <span className="text-[11px] font-medium text-white/50">
                        {t.shardSlots[slot].label}
                      </span>
                      {shard ? (
                        <div className="flex items-center gap-2">
                          <GameIcon
                            src={shard.iconUrl}
                            alt={shard.name}
                            className="h-5 w-5 rounded-full bg-black/50 p-0.5 border border-white/15 shrink-0"
                          />
                          <div className="text-right">
                            <div className="text-xs text-white/90">
                              {shard.viName || shard.name}
                            </div>
                            <div className="text-[10px] text-white/50 font-mono-num">
                              {shard.viShortDesc || shard.shortDesc}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-white/35">Chưa chọn</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Section E: Notes */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/55">
              Ghi Chú Chiến Thuật
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {NOTE_SECTIONS.map(({ key, label }) => {
                const text = build.notes[key]?.trim();
                if (!text) return null;
                return (
                  <div key={key} className="liquid-glass-subtle rounded-2xl p-4 space-y-1.5">
                    <div className="text-xs font-semibold text-white/85">{label}</div>
                    <p className="text-xs leading-relaxed text-white/65 whitespace-pre-line">
                      {text}
                    </p>
                  </div>
                );
              })}
              {NOTE_SECTIONS.every(({ key }) => !build.notes[key]?.trim()) && (
                <div className="md:col-span-2 rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
                  Bộ build này chưa có ghi chú chi tiết.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Augment Detail Modal */}
      <AugmentDetailModal
        augmentId={detailModalAugmentId}
        open={detailModalAugmentId !== null}
        onClose={() => setDetailModalAugmentId(null)}
      />
    </div>,
    document.body
  );
}
