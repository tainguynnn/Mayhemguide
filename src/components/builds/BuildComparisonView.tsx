import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Diff, Sparkles, X } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import type { ItemCategoryKey, MayhemBuild } from '../../types/build';
import type { GameChampion, StatShardSlot } from '../../types/gameData';
import { buildTierSlotGrid } from '../../utils/augmentSlots';
import { cn, TIER_META, TIER_ORDER } from '../../utils/formatters';
import { GameIcon } from '../ui/GameIcon';
import { TierBadge, TierGlyph } from '../ui/TierBadge';
import { AugmentDetailModal } from '../augments/AugmentDetailModal';

interface BuildComparisonViewProps {
  champion: GameChampion;
  builds: MayhemBuild[];
  onClose: () => void;
  onRemoveBuild: (buildId: string) => void;
}

const ITEM_KEYS: ItemCategoryKey[] = ['starting', 'core', 'situational', 'alternative'];
const SHARD_SLOTS: StatShardSlot[] = ['Offensive', 'Flex', 'Defensive'];

function setsDiffer(lists: number[][]): boolean {
  if (lists.length <= 1) return false;
  const serialized = lists.map((arr) => [...new Set(arr)].sort((a, b) => a - b).join(','));
  return new Set(serialized).size > 1;
}

export function BuildComparisonView({
  champion,
  builds,
  onClose,
  onRemoveBuild,
}: BuildComparisonViewProps) {
  const { gameData } = useLibrary();
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [detailModalAugmentId, setDetailModalAugmentId] = useState<number | null>(null);

  const analysis = useMemo(() => {
    const augAppearance = new Map<number, number>();
    for (const b of builds) {
      const uniqueAugIds = new Set(b.augments.map((a) => a.augmentId));
      for (const id of uniqueAugIds) {
        augAppearance.set(id, (augAppearance.get(id) || 0) + 1);
      }
    }

    const augmentSignatures = builds.map((b) =>
      [...b.augments]
        .sort((a, b2) => a.priority - b2.priority)
        .map((a) => a.augmentId)
        .join(',')
    );
    const augmentsDiffer = new Set(augmentSignatures).size > 1;

    const itemDiffByCat: Record<ItemCategoryKey, boolean> = {
      starting: setsDiffer(builds.map((b) => b.items.starting)),
      core: setsDiffer(builds.map((b) => b.items.core)),
      situational: setsDiffer(builds.map((b) => b.items.situational)),
      alternative: setsDiffer(builds.map((b) => b.items.alternative)),
    };

    const itemAppearanceByCat = new Map<ItemCategoryKey, Map<number, number>>();
    for (const key of ITEM_KEYS) {
      const freq = new Map<number, number>();
      for (const b of builds) {
        for (const id of new Set(b.items[key])) {
          freq.set(id, (freq.get(id) || 0) + 1);
        }
      }
      itemAppearanceByCat.set(key, freq);
    }

    const spellSignatures = builds.map((b) =>
      b.summonerSpells
        .filter((s): s is number => s != null)
        .sort((a, b2) => a - b2)
        .join(',')
    );
    const spellsDiffer = new Set(spellSignatures).size > 1;
    const spellAppearance = new Map<number, number>();
    for (const b of builds) {
      for (const s of new Set(b.summonerSpells.filter((x): x is number => x != null))) {
        spellAppearance.set(s, (spellAppearance.get(s) || 0) + 1);
      }
    }

    const shardDiffBySlot: Record<StatShardSlot, boolean> = {
      Offensive: new Set(builds.map((b) => b.statShards.offensive ?? -1)).size > 1,
      Flex: new Set(builds.map((b) => b.statShards.flex ?? -1)).size > 1,
      Defensive: new Set(builds.map((b) => b.statShards.defensive ?? -1)).size > 1,
    };

    const shardAnyDiff =
      shardDiffBySlot.Offensive || shardDiffBySlot.Flex || shardDiffBySlot.Defensive;

    return {
      augAppearance,
      augmentsDiffer,
      itemDiffByCat,
      itemAppearanceByCat,
      spellsDiffer,
      spellAppearance,
      shardDiffBySlot,
      shardAnyDiff,
    };
  }, [builds]);

  const gridColsClass =
    builds.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : builds.length === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';

  return (
    <div className="space-y-5 animate-fade-slide">
      {/* Header */}
      <div className="liquid-glass rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-3 py-2 text-xs font-medium text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại</span>
          </button>
          <GameIcon
            src={champion.portraitUrl}
            fallbackSrc={champion.fallbackPortraitUrl}
            alt={champion.name}
            className="h-11 w-11 rounded-xl border border-white/15"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold text-white">
                So Sánh Build · {champion.name}
              </h1>
              <span className="rounded-full bg-white/[0.08] border border-white/15 px-2.5 py-0.5 font-mono-num text-[11px] text-white/80">
                {builds.length} bộ build
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Các mục có viền sáng &amp; nhãn &ldquo;Khác biệt&rdquo; là điểm khác nhau giữa các bộ build.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOnlyDifferences((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium border transition-colors',
            onlyDifferences
              ? 'bg-white text-black border-white'
              : 'bg-white/[0.05] text-white/75 border-white/12 hover:bg-white/[0.1]'
          )}
        >
          <Diff className="h-3.5 w-3.5" />
          <span>{onlyDifferences ? 'Đang chỉ hiện khác biệt' : 'Chỉ hiện điểm khác biệt'}</span>
        </button>
      </div>

      {/* Column Headers */}
      <div className={cn('grid gap-4', gridColsClass)}>
        {builds.map((b) => (
          <div
            key={b.id}
            className="liquid-glass rounded-2xl p-4 flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Bộ build</div>
              <h2 className="text-sm font-semibold text-white truncate">{b.name}</h2>
            </div>
            {builds.length > 2 && (
              <button
                type="button"
                onClick={() => onRemoveBuild(b.id)}
                className="rounded-lg p-1.5 text-white/45 hover:bg-white/10 hover:text-white"
                title="Bỏ khỏi so sánh"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 1. Augments Comparison by Tier */}
      {(!onlyDifferences || analysis.augmentsDiffer) && (
        <section
          className={cn(
            'liquid-glass rounded-3xl p-5 space-y-4',
            analysis.augmentsDiffer && 'border-white/25'
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-white/75" />
              <h3 className="text-sm font-semibold text-white">
                Lõi Ưu Tiên (Theo 3 Cấp Độ)
              </h3>
            </div>
            <DiffPill differs={analysis.augmentsDiffer} />
          </div>

          <div className="space-y-4">
            {TIER_ORDER.map((tierKey) => {
              const info = t.augmentTiers[tierKey];
              return (
                <div
                  key={tierKey}
                  className={cn(
                    'liquid-glass-subtle rounded-2xl p-4 space-y-3',
                    TIER_META[tierKey].accentClass
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-md',
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

                  <div className={cn('grid gap-4', gridColsClass)}>
                    {builds.map((b) => {
                      const slots = buildTierSlotGrid(b.augments, gameData.augmentById)[
                        tierKey
                      ];
                      return (
                        <div key={`${b.id}-${tierKey}`} className="space-y-2">
                          {slots.map((entry, idx) => {
                            const aug = entry
                              ? gameData.augmentById.get(entry.augmentId)
                              : undefined;
                            if (!entry || !aug) {
                              return (
                                <div
                                  key={idx}
                                  className={cn(
                                    'rounded-xl border border-dashed px-2.5 py-2 text-xs text-white/30 flex items-center justify-between',
                                    TIER_META[tierKey].slotClass
                                  )}
                                >
                                  <span className="font-mono-num">#{idx + 1}</span>
                                  <span>Trống</span>
                                </div>
                              );
                            }
                            const shared =
                              (analysis.augAppearance.get(aug.id) || 0) === builds.length;
                            return (
                              <div
                                key={entry.uid}
                                onClick={() => setDetailModalAugmentId(aug.id)}
                                title={`${aug.name} (Nhấn để xem chi tiết)`}
                                className={cn(
                                  'rounded-xl p-2.5 flex items-center justify-between gap-2 border transition-colors cursor-pointer',
                                  shared
                                    ? 'bg-white/[0.025] hover:bg-white/[0.06] border-white/[0.07] opacity-80'
                                    : 'bg-white/[0.09] hover:bg-white/[0.14] border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="font-mono-num text-[10px] text-white/45 w-4 shrink-0">
                                    #{idx + 1}
                                  </span>
                                  <GameIcon
                                    src={aug.iconUrl}
                                    fallbackSrc={aug.fallbackIconUrl}
                                    alt={aug.name}
                                    className={cn(
                                      'h-8 w-8 rounded-lg shrink-0',
                                      TIER_META[aug.tier].ringClass
                                    )}
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium text-white truncate">
                                      {aug.name}
                                    </div>
                                    <div className="text-[10px] text-white/45">
                                      {shared ? 'Giống nhau' : 'Khác biệt'}
                                    </div>
                                  </div>
                                </div>
                                <TierBadge tier={aug.tier} compact />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Items Comparison */}
      <section className="liquid-glass rounded-3xl p-5 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Trang Bị (Items)</h3>
          <DiffPill differs={Object.values(analysis.itemDiffByCat).some(Boolean)} />
        </div>

        <div className="space-y-4">
          {ITEM_KEYS.map((key) => {
            const label = t.itemGroups[key].label;
            const catDiffers = analysis.itemDiffByCat[key];
            if (onlyDifferences && !catDiffers) return null;
            const freq = analysis.itemAppearanceByCat.get(key)!;

            return (
              <div
                key={key}
                className={cn(
                  'rounded-2xl p-4 border space-y-3',
                  catDiffers
                    ? 'bg-white/[0.04] border-white/20'
                    : 'bg-white/[0.018] border-white/[0.06]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/85">{label}</span>
                  <DiffPill differs={catDiffers} compact />
                </div>

                <div className={cn('grid gap-3', gridColsClass)}>
                  {builds.map((b) => {
                    const list = b.items[key];
                    return (
                      <div key={b.id} className="flex flex-wrap gap-2">
                        {list.length > 0 ? (
                          list.map((itemId, idx) => {
                            const item = gameData.itemById.get(itemId);
                            const shared = (freq.get(itemId) || 0) === builds.length;
                            return (
                              <div
                                key={`${itemId}-${idx}`}
                                title={item?.name || `Trang bị #${itemId}`}
                                className={cn(
                                  'flex items-center gap-1.5 rounded-xl pr-2 pl-1 py-1 border',
                                  shared
                                    ? 'bg-white/[0.025] border-white/[0.08] opacity-75'
                                    : 'bg-white/[0.1] border-white/30'
                                )}
                              >
                                <GameIcon
                                  src={item?.iconUrl}
                                  fallbackSrc={item?.fallbackIconUrl}
                                  alt={item?.name || 'Trang bị'}
                                  className="h-6 w-6 rounded-md"
                                />
                                <span className="text-[11px] text-white/90 truncate max-w-[110px]">
                                  {item?.name || `#${itemId}`}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-[11px] text-white/35">Chưa chọn</span>
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

      {/* 3. Summoner Spells & Stat Shards Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(!onlyDifferences || analysis.spellsDiffer) && (
          <section
            className={cn(
              'liquid-glass rounded-3xl p-5 space-y-4',
              analysis.spellsDiffer && 'border-white/25'
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Phép Bổ Trợ</h3>
              <DiffPill differs={analysis.spellsDiffer} />
            </div>
            <div className="space-y-2.5">
              {builds.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 flex items-center justify-between gap-3"
                >
                  <span className="text-xs font-medium text-white/75 truncate max-w-[160px]">
                    {b.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {b.summonerSpells.map((spId, idx) => {
                      const sp = spId != null ? gameData.spellById.get(spId) : undefined;
                      const shared =
                        spId != null && (analysis.spellAppearance.get(spId) || 0) === builds.length;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-center gap-1.5 rounded-lg px-2 py-1 border',
                            shared
                              ? 'bg-white/[0.03] border-white/10 opacity-75'
                              : 'bg-white/[0.1] border-white/30'
                          )}
                        >
                          {sp ? (
                            <>
                              <GameIcon
                                src={sp.iconUrl}
                                fallbackSrc={sp.fallbackIconUrl}
                                alt={sp.name}
                                className="h-5 w-5 rounded"
                              />
                              <span className="text-[11px] text-white">
                                {sp.name}
                                {sp.viName && (
                                  <span className="text-[10px] text-white/50 ml-1">
                                    ({sp.viName})
                                  </span>
                                )}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-white/35">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {(!onlyDifferences || analysis.shardAnyDiff) && (
          <section
            className={cn(
              'liquid-glass rounded-3xl p-5 space-y-4',
              analysis.shardAnyDiff && 'border-white/25'
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Mảnh Chỉ Số (Stat Shards)</h3>
              <DiffPill differs={analysis.shardAnyDiff} />
            </div>

            <div className="space-y-2.5">
              {SHARD_SLOTS.map((slot) => {
                const differs = analysis.shardDiffBySlot[slot];
                if (onlyDifferences && !differs) return null;
                return (
                  <div
                    key={slot}
                    className={cn(
                      'rounded-xl p-3 border space-y-2',
                      differs
                        ? 'bg-white/[0.045] border-white/25'
                        : 'bg-white/[0.02] border-white/[0.06]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/55">
                        {t.shardSlots[slot].label}
                      </span>
                      <DiffPill differs={differs} compact />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {builds.map((b) => {
                        const key = slot.toLowerCase() as 'offensive' | 'flex' | 'defensive';
                        const id = b.statShards[key];
                        const shard =
                          id != null ? gameData.shardBySlotAndId.get(`${slot}:${id}`) : undefined;
                        return (
                          <div
                            key={b.id}
                            className="flex items-center gap-2 rounded-lg bg-black/30 border border-white/[0.08] px-2 py-1.5"
                          >
                            {shard ? (
                              <>
                                <GameIcon
                                  src={shard.iconUrl}
                                  alt={shard.name}
                                  className="h-4 w-4 rounded-full"
                                />
                                <div className="min-w-0">
                                  <div className="text-[10px] text-white/40 truncate">{b.name}</div>
                                  <div
                                    className="text-[11px] text-white/90 truncate"
                                    title={`${shard.viName || shard.name}: ${shard.viShortDesc || shard.shortDesc}`}
                                  >
                                    {shard.viName || shard.name}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <span className="text-[11px] text-white/35">Chưa chọn</span>
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
        )}
      </div>

      {/* 4. Notes Comparison */}
      {!onlyDifferences && (
        <section className="liquid-glass rounded-3xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Ghi Chú &amp; Cách Vận Hành</h3>
          <div className={cn('grid gap-4', gridColsClass)}>
            {builds.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-2.5"
              >
                <div className="text-xs font-semibold text-white/90">{b.name}</div>
                {b.notes.gameplay && (
                  <p className="text-xs text-white/65 leading-relaxed">
                    <span className="text-white/45">Vận hành: </span>
                    {b.notes.gameplay}
                  </p>
                )}
                {b.notes.synergy && (
                  <p className="text-xs text-white/65 leading-relaxed">
                    <span className="text-white/45">Kết hợp: </span>
                    {b.notes.synergy}
                  </p>
                )}
                {b.notes.conditions && (
                  <p className="text-xs text-white/65 leading-relaxed">
                    <span className="text-white/45">Điều kiện: </span>
                    {b.notes.conditions}
                  </p>
                )}
                {!b.notes.gameplay && !b.notes.synergy && !b.notes.conditions && (
                  <p className="text-xs text-white/35">Chưa có ghi chú.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Augment Detail Modal */}
      <AugmentDetailModal
        augmentId={detailModalAugmentId}
        open={detailModalAugmentId !== null}
        onClose={() => setDetailModalAugmentId(null)}
      />
    </div>
  );
}

function DiffPill({ differs, compact = false }: { differs: boolean; compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
        differs
          ? 'bg-white text-black border-white'
          : 'bg-white/[0.04] text-white/50 border-white/10'
      )}
    >
      {differs ? <Diff className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
      <span>{differs ? 'Khác biệt' : 'Giống nhau'}</span>
    </span>
  );
}
