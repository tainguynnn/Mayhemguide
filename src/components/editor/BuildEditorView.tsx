import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CopyPlus,
  Info,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import { generateId } from '../../services/buildStorage';
import type { BuildAugmentEntry, MayhemBuild } from '../../types/build';
import type { AugmentTier, GameAugment, StatShardSlot } from '../../types/gameData';
import {
  buildTierSlotGrid,
  flattenTierSlotGrid,
  SLOTS_PER_TIER,
  type TierSlotGrid,
} from '../../utils/augmentSlots';
import { cn, TIER_META, TIER_ORDER } from '../../utils/formatters';
import { GameIcon } from '../ui/GameIcon';
import { TierBadge, TierGlyph } from '../ui/TierBadge';
import { AugmentPickerPanel } from './AugmentPickerPanel';
import { ChampionPickerModal } from './ChampionPickerModal';
import { ItemPickerSection } from './ItemPickerSection';
import { AugmentDetailModal } from '../augments/AugmentDetailModal';

interface BuildEditorViewProps {
  existingBuild?: MayhemBuild;
  preselectedChampionId?: number;
  preselectedAugmentId?: number;
  onCancel: () => void;
  onSaved: (build: MayhemBuild) => void;
}

const NOTE_TABS: Array<{
  key: keyof MayhemBuild['notes'];
  label: string;
  placeholder: string;
}> = [
  {
    key: 'gameplay',
    label: 'Cách vận hành',
    placeholder:
      'VD: Tập trung cấu rỉa từ xa, tận dụng combo kỹ năng khi đối phương tiến lên...',
  },
  {
    key: 'synergy',
    label: 'Kết hợp Lõi & Trang bị',
    placeholder:
      'VD: Eureka chuyển hóa lượng SMPT lớn từ Mũ Phù Thủy thành Điểm Hồi Kỹ Năng...',
  },
  {
    key: 'conditions',
    label: 'Điều kiện sử dụng',
    placeholder:
      'VD: Phù hợp khi đội hình thiếu sát thương phép hoặc địch có nhiều đấu sĩ cận chiến...',
  },
  {
    key: 'alternatives',
    label: 'Phương án dự phòng',
    placeholder:
      'VD: Nếu không roll ra Jeweled Gauntlet ở lượt đầu, ưu tiên lấy Tap Dancer...',
  },
  {
    key: 'matchups',
    label: 'Đối đầu & Chiến thuật',
    placeholder:
      'VD: Gặp đội hình nhiều khống chế cứng hãy đổi Tốc Hành sang Thanh Tẩy...',
  },
];

const SHARD_SLOTS: StatShardSlot[] = ['Offensive', 'Flex', 'Defensive'];

function createInitialDraft(
  existingBuild: MayhemBuild | undefined,
  preselectedChampionId: number | undefined,
  preselectedAugment: GameAugment | undefined
): MayhemBuild {
  if (existingBuild) {
    return {
      ...existingBuild,
      augments: existingBuild.augments.map((a) => ({
        ...a,
        alternativeAugmentIds: [...a.alternativeAugmentIds],
      })),
      items: {
        starting: [...existingBuild.items.starting],
        core: [...existingBuild.items.core],
        situational: [...existingBuild.items.situational],
        alternative: [...existingBuild.items.alternative],
      },
      summonerSpells: [...existingBuild.summonerSpells] as [number | null, number | null],
      statShards: { ...existingBuild.statShards },
      notes: { ...existingBuild.notes },
    };
  }
  const now = new Date().toISOString();
  const initialAugments: BuildAugmentEntry[] = preselectedAugment
    ? [
        {
          uid: generateId('aug'),
          augmentId: preselectedAugment.id,
          priority: 1,
          tier: preselectedAugment.tier,
          slotIndex: 0,
          synergyNote: '',
          alternativeAugmentIds: [],
        },
      ]
    : [];

  return {
    id: generateId('build'),
    championId: preselectedChampionId ?? 103,
    name: '',
    favorite: false,
    augments: initialAugments,
    items: {
      starting: [],
      core: [],
      situational: [],
      alternative: [],
    },
    summonerSpells: [4, 32],
    statShards: {
      offensive: 5008,
      flex: 5008,
      defensive: 5001,
    },
    notes: {
      gameplay: '',
      synergy: '',
      conditions: '',
      alternatives: '',
      matchups: '',
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function BuildEditorView({
  existingBuild,
  preselectedChampionId,
  preselectedAugmentId,
  onCancel,
  onSaved,
}: BuildEditorViewProps) {
  const { gameData, saveBuild, notify } = useLibrary();

  const preselectedAugment =
    preselectedAugmentId != null
      ? gameData.augmentById.get(preselectedAugmentId)
      : undefined;

  const [draft, setDraft] = useState<MayhemBuild>(() =>
    createInitialDraft(existingBuild, preselectedChampionId, preselectedAugment)
  );

  // 3×4 Priority Augment Grid state (4 Prismatic, 4 Gold, 4 Silver)
  const [slotGrid, setSlotGrid] = useState<TierSlotGrid>(() =>
    buildTierSlotGrid(
      createInitialDraft(existingBuild, preselectedChampionId, preselectedAugment).augments,
      gameData.augmentById
    )
  );

  const [targetSlot, setTargetSlot] = useState<{
    tier: AugmentTier;
    slotIndex: number;
  } | null>(null);

  const [pickerTierFilter, setPickerTierFilter] = useState<'ALL' | AugmentTier>('ALL');

  const [championModalOpen, setChampionModalOpen] = useState(
    !existingBuild && !preselectedChampionId
  );
  const [altModalUid, setAltModalUid] = useState<string | null>(null);
  const [detailModalAugmentId, setDetailModalAugmentId] = useState<number | null>(null);
  const [activeSpellSlot, setActiveSpellSlot] = useState<0 | 1>(0);
  const [activeNoteTab, setActiveNoteTab] = useState<keyof MayhemBuild['notes']>('gameplay');
  const [errorMsg, setErrorMsg] = useState('');

  const pickerContainerRef = useRef<HTMLDivElement>(null);

  const champion = gameData.championById.get(draft.championId);

  const syncGridToDraft = (nextGrid: TierSlotGrid) => {
    setSlotGrid(nextGrid);
    setDraft((prev) => ({
      ...prev,
      augments: flattenTierSlotGrid(nextGrid),
    }));
  };

  const selectedAugmentIds = useMemo(
    () => draft.augments.map((a) => a.augmentId),
    [draft.augments]
  );

  const altTargetEntry = useMemo(
    () => draft.augments.find((a) => a.uid === altModalUid) || null,
    [draft.augments, altModalUid]
  );

  const focusPickerOnSlot = (tier: AugmentTier, slotIndex: number) => {
    setTargetSlot({ tier, slotIndex });
    setPickerTierFilter(tier);
    pickerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleToggleAugmentFromPicker = (aug: GameAugment) => {
    const tier = aug.tier;
    const currentRow = [...slotGrid[tier]];
    const existingIdx = currentRow.findIndex((e) => e?.augmentId === aug.id);

    // If already selected in this tier, remove it
    if (existingIdx !== -1) {
      currentRow[existingIdx] = null;
      syncGridToDraft({ ...slotGrid, [tier]: currentRow });
      return;
    }

    // Determine which slot (0..3) in `aug.tier` to place the augment
    let destSlot = -1;
    if (targetSlot && targetSlot.tier === tier) {
      destSlot = targetSlot.slotIndex;
    } else {
      destSlot = currentRow.findIndex((e) => e === null);
    }

    if (destSlot === -1) {
      notify(
        `Nhóm ${t.augmentTiers[tier].fullHeader} đã đủ 4 lõi ưu tiên. Hãy nhấn "Đổi lõi" ở vị trí bạn muốn thay thế.`,
        'warning'
      );
      return;
    }

    const prevEntry = currentRow[destSlot];
    currentRow[destSlot] = {
      uid: prevEntry?.uid || generateId('aug'),
      augmentId: aug.id,
      priority: destSlot + 1,
      tier,
      slotIndex: destSlot,
      synergyNote: prevEntry?.synergyNote || '',
      alternativeAugmentIds: prevEntry ? [...prevEntry.alternativeAugmentIds] : [],
    };

    const nextGrid = { ...slotGrid, [tier]: currentRow };
    syncGridToDraft(nextGrid);

    // Advance targetSlot to next empty slot in the same tier if one exists
    const nextEmpty = currentRow.findIndex((e) => e === null);
    if (nextEmpty !== -1) {
      setTargetSlot({ tier, slotIndex: nextEmpty });
    } else {
      setTargetSlot(null);
    }
  };

  const clearSlot = (tier: AugmentTier, slotIndex: number) => {
    const currentRow = [...slotGrid[tier]];
    currentRow[slotIndex] = null;
    syncGridToDraft({ ...slotGrid, [tier]: currentRow });
    if (
      targetSlot &&
      targetSlot.tier === tier &&
      targetSlot.slotIndex === slotIndex
    ) {
      setTargetSlot(null);
    }
  };

  const swapSlotWithinTier = (tier: AugmentTier, slotIndex: number, dir: -1 | 1) => {
    const targetIdx = slotIndex + dir;
    if (targetIdx < 0 || targetIdx >= SLOTS_PER_TIER) return;
    const currentRow = [...slotGrid[tier]];
    [currentRow[slotIndex], currentRow[targetIdx]] = [
      currentRow[targetIdx],
      currentRow[slotIndex],
    ];
    syncGridToDraft({ ...slotGrid, [tier]: currentRow });
  };

  const updateSlotNote = (tier: AugmentTier, slotIndex: number, synergyNote: string) => {
    const currentRow = [...slotGrid[tier]];
    const entry = currentRow[slotIndex];
    if (!entry) return;
    currentRow[slotIndex] = { ...entry, synergyNote };
    syncGridToDraft({ ...slotGrid, [tier]: currentRow });
  };

  const toggleAlternativeAugment = (uid: string, altAug: GameAugment) => {
    const nextGrid: TierSlotGrid = {
      Prismatic: [...slotGrid.Prismatic],
      Gold: [...slotGrid.Gold],
      Silver: [...slotGrid.Silver],
    };
    for (const tier of TIER_ORDER) {
      nextGrid[tier] = nextGrid[tier].map((entry) => {
        if (!entry || entry.uid !== uid) return entry;
        const exists = entry.alternativeAugmentIds.includes(altAug.id);
        return {
          ...entry,
          alternativeAugmentIds: exists
            ? entry.alternativeAugmentIds.filter((id) => id !== altAug.id)
            : [...entry.alternativeAugmentIds, altAug.id],
        };
      });
    }
    syncGridToDraft(nextGrid);
  };

  const selectSummonerSpell = (spellId: number) => {
    setDraft((prev) => {
      const next: [number | null, number | null] = [...prev.summonerSpells];
      const otherSlot = activeSpellSlot === 0 ? 1 : 0;
      if (next[otherSlot] === spellId) {
        next[otherSlot] = next[activeSpellSlot];
      }
      next[activeSpellSlot] = spellId;
      return { ...prev, summonerSpells: next };
    });
    setActiveSpellSlot((slot) => (slot === 0 ? 1 : 0));
  };

  const handleSave = (asNewCopy = false) => {
    if (!draft.name.trim()) {
      setErrorMsg('Vui lòng đặt tên cho bộ build trước khi lưu.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrorMsg('');
    const now = new Date().toISOString();
    const flattenedAugments = flattenTierSlotGrid(slotGrid);
    const payload: MayhemBuild = asNewCopy
      ? {
          ...draft,
          id: generateId('build'),
          name: `${draft.name.trim()} (Bản mới)`,
          augments: flattenedAugments,
          createdAt: now,
          updatedAt: now,
        }
      : {
          ...draft,
          name: draft.name.trim(),
          augments: flattenedAugments,
        };
    const saved = saveBuild(payload);
    notify(
      existingBuild && !asNewCopy
        ? `Đã cập nhật bộ build "${saved.name}"`
        : `Đã lưu bộ build "${saved.name}"`
    );
    onSaved(saved);
  };

  const targetReplacingAug = useMemo(() => {
    if (!targetSlot) return undefined;
    const entry = slotGrid[targetSlot.tier][targetSlot.slotIndex];
    return entry ? gameData.augmentById.get(entry.augmentId)?.name : undefined;
  }, [targetSlot, slotGrid, gameData.augmentById]);

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Top Bar */}
      <div className="liquid-glass rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-3 py-2 text-xs font-medium text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại</span>
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-white">
              {existingBuild ? 'Chỉnh sửa Build ARAM: Mayhem' : 'Tạo Build ARAM: Mayhem mới'}
            </h1>
            <p className="text-xs text-white/50">
              Thiết lập 12 vị trí Lõi Ưu Tiên (4 Kim Cương · 4 Vàng · 4 Bạc), trang bị và chiến thuật vận hành.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {existingBuild && (
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 px-3.5 py-2 text-xs font-medium text-white transition-colors"
            >
              <CopyPlus className="h-3.5 w-3.5" />
              <span>Lưu thành bản mới</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black hover:bg-white/90 px-4 py-2 text-xs font-semibold transition-colors shadow-[0_6px_24px_rgba(255,255,255,0.18)]"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Lưu Build</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl bg-white/10 border border-white/35 px-4 py-3 text-xs font-medium text-white">
          {errorMsg}
        </div>
      )}

      {/* Main 2-Column Studio */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Steps 1 - 7 */}
        <div className="xl:col-span-8 space-y-6">
          {/* Step 1 & 2: Champion + Build Name */}
          <section className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Bước 1 &amp; 2 · Chọn Tướng &amp; Đặt Tên Bộ Build
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <button
                type="button"
                onClick={() => setChampionModalOpen(true)}
                className="flex items-center gap-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/12 p-3 text-left transition-colors shrink-0"
              >
                <GameIcon
                  src={champion?.portraitUrl}
                  fallbackSrc={champion?.fallbackPortraitUrl}
                  alt={champion?.name || 'Tướng'}
                  className="h-14 w-14 rounded-xl border border-white/20"
                />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/45">
                    Tướng (Champion)
                  </div>
                  <div className="text-base font-semibold text-white">
                    {champion?.name || 'Chọn Tướng'}
                  </div>
                  <div className="text-[11px] text-white/60">Nhấn để đổi tướng</div>
                </div>
              </button>

              <div className="flex-1 flex items-center gap-2.5">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[11px] font-medium text-white/55 block">
                    Tên bộ build
                  </label>
                  <input
                    value={draft.name}
                    onChange={(e) => {
                      setDraft((prev) => ({ ...prev, name: e.target.value }));
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder={`VD: ${champion?.name || 'Ahri'} — Eureka Hồi Chiêu Cực Đại`}
                    className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, favorite: !prev.favorite }))}
                  className={cn(
                    'mt-5 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-medium border transition-colors shrink-0',
                    draft.favorite
                      ? 'bg-white text-black border-white'
                      : 'bg-white/[0.05] text-white/70 border-white/10 hover:bg-white/[0.1]'
                  )}
                >
                  <Star className={cn('h-3.5 w-3.5', draft.favorite && 'fill-current')} />
                  <span className="hidden sm:inline">Yêu thích</span>
                </button>
              </div>
            </div>
          </section>

          {/* Step 3: Priority Augments (3 Tier Groups × 4 Priority Slots = 12 Slots) */}
          <section className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Bước 3 · Lõi Ưu Tiên (Priority Augments · 12 vị trí)
                </span>
                <p className="text-xs text-white/50 mt-0.5">
                  Mỗi cấp độ có 4 vị trí ưu tiên riêng biệt. Nhấn vào ô trống để chọn lõi đúng cấp độ, hoặc giữ trống nếu chưa chọn đủ 4 lõi.
                </p>
              </div>
              <span className="rounded-full bg-white/[0.06] border border-white/12 px-3 py-1 font-mono-num text-xs text-white/80">
                Đã chọn {draft.augments.length} / 12 lõi
              </span>
            </div>

            {/* 3 Tier Priority Groups: PRISMATIC, GOLD, SILVER */}
            <div className="space-y-5">
              {TIER_ORDER.map((tierKey) => {
                const tierInfo = t.augmentTiers[tierKey];
                const slots = slotGrid[tierKey];
                const filledCount = slots.filter(Boolean).length;

                return (
                  <div
                    key={tierKey}
                    className={cn(
                      'liquid-glass-subtle rounded-2xl p-4 sm:p-5 space-y-3.5',
                      TIER_META[tierKey].accentClass
                    )}
                  >
                    {/* Group Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-xl',
                            TIER_META[tierKey].badgeClass
                          )}
                        >
                          <TierGlyph tier={tierKey} className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className={cn(
                                'text-sm font-bold tracking-wide',
                                TIER_META[tierKey].textClass
                              )}
                            >
                              {tierInfo.fullHeader}
                            </h3>
                            <TierBadge tier={tierKey} compact showVi />
                          </div>
                          <p className="text-[11px] text-white/45">{tierInfo.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono-num text-xs text-white/60">
                          {filledCount} / {SLOTS_PER_TIER} lõi ưu tiên
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const emptyIdx = slots.findIndex((s) => s === null);
                            focusPickerOnSlot(tierKey, emptyIdx !== -1 ? emptyIdx : 0);
                          }}
                          className="rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 px-2.5 py-1 text-[11px] font-medium text-white/85 transition-colors"
                        >
                          Lọc kho lõi {tierInfo.vi}
                        </button>
                      </div>
                    </div>

                    {/* 4 Uniform Priority Slots */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {slots.map((entry, slotIdx) => {
                        const isTarget =
                          targetSlot?.tier === tierKey &&
                          targetSlot?.slotIndex === slotIdx;
                        const aug = entry
                          ? gameData.augmentById.get(entry.augmentId)
                          : undefined;

                        if (!entry || !aug) {
                          return (
                            <button
                              key={`${tierKey}-empty-${slotIdx}`}
                              type="button"
                              onClick={() => focusPickerOnSlot(tierKey, slotIdx)}
                              className={cn(
                                'min-h-[112px] rounded-2xl border border-dashed p-3.5 flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer',
                                TIER_META[tierKey].slotClass,
                                isTarget
                                  ? 'bg-white/[0.1] ring-2 ring-white/50'
                                  : 'bg-white/[0.015] hover:bg-white/[0.05]'
                              )}
                            >
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-white/75">
                                <TierGlyph tier={tierKey} className="h-3.5 w-3.5" />
                                <span>
                                  Vị trí ưu tiên #{slotIdx + 1} ·{' '}
                                  {isTarget ? 'Đang chọn lõi bên dưới...' : 'Trống'}
                                </span>
                              </div>
                              <span className="text-[11px] text-white/40">
                                Nhấn để chọn lõi {tierInfo.vi} ({tierInfo.en})
                              </span>
                            </button>
                          );
                        }

                        return (
                          <div
                            key={entry.uid}
                            className={cn(
                              'min-h-[112px] rounded-2xl p-3.5 border flex flex-col justify-between gap-2.5 transition-all min-w-0 overflow-hidden',
                              isTarget
                                ? 'bg-white/[0.11] border-white/50 ring-2 ring-white/35'
                                : 'bg-black/35 border-white/12'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <GameIcon
                                  src={aug.iconUrl}
                                  fallbackSrc={aug.fallbackIconUrl}
                                  alt={aug.name}
                                  className={cn(
                                    'h-11 w-11 rounded-xl shrink-0',
                                    TIER_META[aug.tier].ringClass
                                  )}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="rounded-md bg-white/12 px-1.5 py-0.2 font-mono-num text-[10px] font-semibold text-white/85">
                                      #{slotIdx + 1}
                                    </span>
                                    <span className="text-xs sm:text-sm font-semibold text-white truncate">
                                      {aug.name}
                                    </span>
                                    {aug.viName && (
                                      <span className="text-[10px] text-white/50 truncate">
                                        ({aug.viName})
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-white/55 line-clamp-2 mt-0.5 leading-snug">
                                    {aug.description}
                                  </p>
                                </div>
                              </div>

                              {/* Slot Actions: Info, Move, Replace, Backup, Remove */}
                              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                                <button
                                  type="button"
                                  onClick={() => setDetailModalAugmentId(aug.id)}
                                  className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                                  title="Xem chi tiết cơ chế & thống kê lõi"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={slotIdx === 0}
                                  onClick={() => swapSlotWithinTier(tierKey, slotIdx, -1)}
                                  className="rounded p-1 text-white/45 hover:bg-white/10 hover:text-white disabled:opacity-20"
                                  title="Tăng thứ tự ưu tiên trong nhóm"
                                >
                                  <ArrowLeft className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={slotIdx === SLOTS_PER_TIER - 1}
                                  onClick={() => swapSlotWithinTier(tierKey, slotIdx, 1)}
                                  className="rounded p-1 text-white/45 hover:bg-white/10 hover:text-white disabled:opacity-20"
                                  title="Giảm thứ tự ưu tiên trong nhóm"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => focusPickerOnSlot(tierKey, slotIdx)}
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium border transition-colors',
                                    isTarget
                                      ? 'bg-white text-black border-white font-semibold'
                                      : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/12 text-white/80'
                                  )}
                                  title="Đổi sang lõi khác cùng cấp độ"
                                >
                                  <RefreshCw className="h-2.5 w-2.5" />
                                  <span>Đổi</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAltModalUid(entry.uid)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 px-2 py-1 text-[10px] text-white/75"
                                  title="Chọn lõi dự phòng khi không roll ra lõi này"
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                  <span>Dự phòng ({entry.alternativeAugmentIds.length})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => clearSlot(tierKey, slotIdx)}
                                  className="rounded-lg p-1 text-white/45 hover:bg-white/10 hover:text-white"
                                  title="Xóa lõi khỏi vị trí này"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Synergy Note & Backup Chips */}
                            <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
                              <input
                                value={entry.synergyNote}
                                onChange={(e) =>
                                  updateSlotNote(tierKey, slotIdx, e.target.value)
                                }
                                placeholder="Ghi chú kết hợp hoặc lý do ưu tiên lõi này..."
                                className="liquid-input w-full rounded-lg px-2.5 py-1 text-[11px]"
                              />
                              {entry.alternativeAugmentIds.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-white/40">Dự phòng:</span>
                                  {entry.alternativeAugmentIds.map((altId) => {
                                    const alt = gameData.augmentById.get(altId);
                                    if (!alt) return null;
                                    return (
                                      <span
                                        key={altId}
                                        className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] border border-white/12 px-1.5 py-0.5 text-[10px] text-white/85"
                                      >
                                        <GameIcon
                                          src={alt.iconUrl}
                                          fallbackSrc={alt.fallbackIconUrl}
                                          alt={alt.name}
                                          className="h-3.5 w-3.5 rounded"
                                        />
                                        <span>{alt.name}</span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleAlternativeAugment(entry.uid, alt)
                                          }
                                          className="text-white/45 hover:text-white"
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual Augment Browser */}
            <div ref={pickerContainerRef} className="pt-2 border-t border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  Kho Lõi Công Nghệ (Nhấn vào lõi để điền vào nhóm cấp độ tương ứng)
                </span>
              </div>
              <AugmentPickerPanel
                selectedIds={selectedAugmentIds}
                forcedTier={pickerTierFilter}
                onTierFilterChange={(next) => {
                  setPickerTierFilter(next);
                  if (targetSlot && next !== 'ALL' && next !== targetSlot.tier) {
                    setTargetSlot(null);
                  }
                }}
                targetSlotBanner={
                  targetSlot
                    ? {
                        tier: targetSlot.tier,
                        slotIndex: targetSlot.slotIndex,
                        replacingName: targetReplacingAug,
                        onClearTarget: () => setTargetSlot(null),
                      }
                    : null
                }
                onToggleSelect={handleToggleAugmentFromPicker}
              />
            </div>
          </section>

          {/* Step 4: Items */}
          <section className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Bước 4 · Trang Bị (Items)
              </span>
              <p className="text-xs text-white/45 mt-0.5">
                Chọn nhóm trang bị mục tiêu rồi nhấn vào biểu tượng trang bị bên dưới để thêm.
              </p>
            </div>
            <ItemPickerSection
              items={draft.items}
              onChange={(items) => setDraft((prev) => ({ ...prev, items }))}
            />
          </section>

          {/* Step 5 & 6: Summoner Spells & Stat Shards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Step 5: Summoner Spells */}
            <section className="liquid-glass rounded-3xl p-5 space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Bước 5 · Phép Bổ Trợ (2 ô)
                </span>
                <p className="text-xs text-white/45 mt-0.5">
                  Chỉ hiển thị các phép khả dụng trong chế độ ARAM: Mayhem.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {([0, 1] as const).map((slotIdx) => {
                  const spId = draft.summonerSpells[slotIdx];
                  const sp = spId != null ? gameData.spellById.get(spId) : undefined;
                  const active = activeSpellSlot === slotIdx;
                  return (
                    <button
                      key={slotIdx}
                      type="button"
                      onClick={() => setActiveSpellSlot(slotIdx)}
                      className={cn(
                        'rounded-2xl p-3 border flex items-center gap-2.5 text-left transition-all',
                        active
                          ? 'bg-white/[0.1] border-white/40'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                      )}
                    >
                      {sp ? (
                        <GameIcon
                          src={sp.iconUrl}
                          fallbackSrc={sp.fallbackIconUrl}
                          alt={sp.name}
                          className="h-10 w-10 rounded-xl border border-white/15"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl border border-dashed border-white/20" />
                      )}
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-white/45">
                          Ô phép {slotIdx + 1} {active ? '(Đang chọn)' : ''}
                        </div>
                        <div className="text-xs font-semibold text-white truncate">
                          {sp?.name || 'Chọn phép'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 pt-1">
                {gameData.bundle.summonerSpells.map((sp) => {
                  const isAssigned = draft.summonerSpells.includes(sp.id);
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => selectSummonerSpell(sp.id)}
                      title={`${sp.name} (${sp.viName ? sp.viName + ' · ' : ''}${sp.cooldown}s):\n${sp.viDescription || sp.description}`}
                      className={cn(
                        'rounded-xl p-2 border flex flex-col items-center gap-1 transition-all min-w-0',
                        isAssigned
                          ? 'bg-white/[0.13] border-white/40 ring-1 ring-white/20'
                          : 'bg-white/[0.025] border-white/[0.08] hover:bg-white/[0.08]'
                      )}
                    >
                      <GameIcon
                        src={sp.iconUrl}
                        fallbackSrc={sp.fallbackIconUrl}
                        alt={sp.name}
                        className="h-9 w-9 rounded-lg shrink-0"
                      />
                      <span className="text-[11px] font-medium text-white truncate w-full text-center block">
                        {sp.name}
                      </span>
                      {sp.viName && (
                        <span className="text-[9px] text-white/50 truncate w-full text-center block">
                          {sp.viName}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 6: Stat Shards */}
            <section className="liquid-glass rounded-3xl p-5 space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Bước 6 · Mảnh Chỉ Số (Stat Shards)
                </span>
                <p className="text-xs text-white/45 mt-0.5">
                  Chọn 1 mảnh chỉ số cho mỗi nhánh Công, Linh Hoạt và Phòng Thủ (hỗ trợ đầy đủ các lựa chọn chỉ số).
                </p>
              </div>

              <div className="space-y-4">
                {SHARD_SLOTS.map((slot) => {
                  const fieldKey = slot.toLowerCase() as 'offensive' | 'flex' | 'defensive';
                  const currentId = draft.statShards[fieldKey];
                  const options = gameData.shardsBySlot[slot];
                  return (
                    <div key={slot} className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-white/70">
                        <span>{t.shardSlots[slot].label}</span>
                        <span className="text-[11px] font-mono-num text-white/40">
                          {options.length} lựa chọn
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {options.map((shard) => {
                          const selected = currentId === shard.id;
                          return (
                            <button
                              key={`${slot}-${shard.id}`}
                              type="button"
                              onClick={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  statShards: { ...prev.statShards, [fieldKey]: shard.id },
                                }))
                              }
                              title={`${shard.viName || shard.name} (${shard.name}): ${shard.viShortDesc || shard.shortDesc}`}
                              className={cn(
                                'rounded-xl p-2.5 border flex items-center gap-2.5 text-left transition-all min-w-0 overflow-hidden',
                                selected
                                  ? 'bg-white/[0.14] border-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                                  : 'bg-white/[0.025] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20'
                              )}
                            >
                              <GameIcon
                                src={shard.iconUrl}
                                alt={shard.name}
                                className="h-7 w-7 rounded-full bg-black/60 p-0.5 border border-white/15 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-white truncate">
                                  {shard.viName || shard.name}
                                </div>
                                <div className="text-[10px] text-white/50 truncate font-mono-num">
                                  {shard.viShortDesc || shard.shortDesc}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Step 7: Build Notes */}
          <section className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Bước 7 · Ghi Chú Chiến Thuật
              </span>
              <p className="text-xs text-white/45 mt-0.5">
                Ghi chú đầy đủ cách vận hành, điều kiện sử dụng và đối đầu.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {NOTE_TABS.map((tab) => {
                const hasText = Boolean(draft.notes[tab.key].trim());
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveNoteTab(tab.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                      activeNoteTab === tab.key
                        ? 'bg-white text-black border-white'
                        : 'bg-white/[0.04] text-white/65 border-white/10 hover:bg-white/[0.09]'
                    )}
                  >
                    <span>{tab.label}</span>
                    {hasText && (
                      <Check
                        className={cn(
                          'h-3 w-3',
                          activeNoteTab === tab.key ? 'text-black' : 'text-white/70'
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {NOTE_TABS.map((tab) =>
              activeNoteTab === tab.key ? (
                <textarea
                  key={tab.key}
                  rows={4}
                  value={draft.notes[tab.key]}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      notes: { ...prev.notes, [tab.key]: e.target.value },
                    }))
                  }
                  placeholder={tab.placeholder}
                  className="liquid-input w-full rounded-2xl p-4 text-sm leading-relaxed resize-y"
                />
              ) : null
            )}
          </section>
        </div>

        {/* Right 4 Columns: Step 8 Sticky Live Preview */}
        <aside className="xl:col-span-4 xl:sticky xl:top-20 space-y-4">
          <div className="liquid-glass-elevated rounded-3xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Bước 8 · Xem Trước Bộ Build
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-white/55">
                <Sparkles className="h-3 w-3" />
                Trực tiếp
              </span>
            </div>

            {/* Champion + Title */}
            <div className="flex items-center gap-3.5">
              <GameIcon
                src={champion?.portraitUrl}
                fallbackSrc={champion?.fallbackPortraitUrl}
                alt={champion?.name || 'Tướng'}
                className="h-14 w-14 rounded-2xl border border-white/20"
              />
              <div className="min-w-0">
                <div className="text-xs text-white/55">{champion?.name}</div>
                <div className="text-base font-semibold text-white truncate">
                  {draft.name.trim() || 'Chưa đặt tên bộ build'}
                </div>
              </div>
            </div>

            {/* 12 Priority Augments Preview by Tier */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-medium text-white/50">
                <span>Lõi ưu tiên theo cấp độ</span>
                <span className="font-mono-num">{draft.augments.length} / 12</span>
              </div>

              {TIER_ORDER.map((tierKey) => {
                const slots = slotGrid[tierKey];
                const info = t.augmentTiers[tierKey];
                return (
                  <div key={tierKey} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-bold tracking-wide',
                          TIER_META[tierKey].textClass
                        )}
                      >
                        <TierGlyph tier={tierKey} className="h-2.5 w-2.5" />
                        <span>{info.fullHeader}</span>
                      </span>
                      <span className="font-mono-num text-white/40">
                        {slots.filter(Boolean).length}/4
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {slots.map((entry, idx) => {
                        const aug = entry
                          ? gameData.augmentById.get(entry.augmentId)
                          : undefined;
                        return aug ? (
                          <div
                            key={`${tierKey}-${idx}`}
                            onClick={() => setDetailModalAugmentId(aug.id)}
                            title={`#${idx + 1}: ${aug.name} (Nhấn để xem chi tiết)`}
                            className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 p-1.5 min-w-0 overflow-hidden cursor-pointer transition-colors"
                          >
                            <GameIcon
                              src={aug.iconUrl}
                              fallbackSrc={aug.fallbackIconUrl}
                              alt={aug.name}
                              className={cn(
                                'h-8 w-8 rounded-lg shrink-0',
                                TIER_META[tierKey].ringClass
                              )}
                            />
                            <span className="text-[9px] text-white/80 truncate w-full text-center block">
                              {aug.name}
                            </span>
                          </div>
                        ) : (
                          <div
                            key={`${tierKey}-${idx}`}
                            className={cn(
                              'h-[54px] rounded-xl border border-dashed flex items-center justify-center font-mono-num text-[10px] text-white/25',
                              TIER_META[tierKey].slotClass
                            )}
                          >
                            #{idx + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Items Preview */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-medium text-white/50">Trang bị</div>
              {(
                [
                  ['starting', draft.items.starting],
                  ['core', draft.items.core],
                  ['situational', draft.items.situational],
                  ['alternative', draft.items.alternative],
                ] as const
              ).map(([key, list]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-white/45 w-24 shrink-0">
                    {t.itemGroups[key].short}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {list.length > 0 ? (
                      list.map((id, i) => {
                        const it = gameData.itemById.get(id);
                        return (
                          <GameIcon
                            key={`${id}-${i}`}
                            src={it?.iconUrl}
                            fallbackSrc={it?.fallbackIconUrl}
                            alt={it?.name || 'Trang bị'}
                            className="h-7 w-7 rounded-lg border border-white/15"
                          />
                        );
                      })
                    ) : (
                      <span className="text-[11px] text-white/25">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Spells & Shards Preview */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {draft.summonerSpells.map((id, idx) => {
                  const sp = id != null ? gameData.spellById.get(id) : undefined;
                  return sp ? (
                    <GameIcon
                      key={idx}
                      src={sp.iconUrl}
                      fallbackSrc={sp.fallbackIconUrl}
                      alt={sp.name}
                      className="h-8 w-8 rounded-lg border border-white/15"
                    />
                  ) : (
                    <div
                      key={idx}
                      className="h-8 w-8 rounded-lg border border-dashed border-white/15"
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                {SHARD_SLOTS.map((slot) => {
                  const fieldKey = slot.toLowerCase() as 'offensive' | 'flex' | 'defensive';
                  const id = draft.statShards[fieldKey];
                  const shard =
                    id != null ? gameData.shardBySlotAndId.get(`${slot}:${id}`) : undefined;
                  return shard ? (
                    <GameIcon
                      key={slot}
                      src={shard.iconUrl}
                      alt={shard.name}
                      className="h-6 w-6 rounded-full bg-black/60 p-0.5 border border-white/15"
                    />
                  ) : (
                    <div
                      key={slot}
                      className="h-6 w-6 rounded-full border border-dashed border-white/15"
                    />
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSave(false)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black hover:bg-white/90 py-3 text-xs font-semibold transition-colors shadow-[0_8px_28px_rgba(255,255,255,0.16)]"
            >
              <Save className="h-4 w-4" />
              <span>{existingBuild ? 'Lưu thay đổi' : 'Lưu vào Bộ Build Của Tôi'}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Champion Picker Modal */}
      <ChampionPickerModal
        open={championModalOpen}
        selectedChampionId={draft.championId}
        onSelect={(championId) => setDraft((prev) => ({ ...prev, championId }))}
        onClose={() => setChampionModalOpen(false)}
      />

      {/* Alternative Augments Picker Modal */}
      {altTargetEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 backdrop-blur-md p-4 animate-fade-slide"
          onClick={() => setAltModalUid(null)}
        >
          <div
            className="liquid-glass-elevated w-full max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Chọn lõi dự phòng cho &ldquo;
                  {gameData.augmentById.get(altTargetEntry.augmentId)?.name}&rdquo;
                </h3>
                <p className="text-xs text-white/50">
                  Lưu các lựa chọn thay thế khi không xuất hiện lõi mong muốn trong trận.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAltModalUid(null)}
                className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <AugmentPickerPanel
                selectedIds={altTargetEntry.alternativeAugmentIds}
                excludedIds={[altTargetEntry.augmentId]}
                onToggleSelect={(aug) => toggleAlternativeAugment(altTargetEntry.uid, aug)}
                compact
              />
            </div>
            <div className="px-5 py-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setAltModalUid(null)}
                className="rounded-xl bg-white text-black px-4 py-2 text-xs font-semibold"
              >
                Hoàn tất ({altTargetEntry.alternativeAugmentIds.length} lựa chọn)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Augment Detail Modal (Complete mechanics, stats, synergy) */}
      <AugmentDetailModal
        augmentId={detailModalAugmentId}
        open={detailModalAugmentId !== null}
        onClose={() => setDetailModalAugmentId(null)}
        onSelectAugment={(aug) => handleToggleAugmentFromPicker(aug)}
        selectActionLabel={
          targetSlot
            ? `Lắp vào #${targetSlot.slotIndex + 1} (${t.augmentTiers[targetSlot.tier].vi})`
            : undefined
        }
        isAlreadySelected={detailModalAugmentId ? selectedAugmentIds.includes(detailModalAugmentId) : false}
      />
    </div>
  );
}
