import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, Sparkles, X } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import type { BuildItems, ItemCategoryKey } from '../../types/build';
import type { GameItem } from '../../types/gameData';
import { cn, translateItemStat } from '../../utils/formatters';
import { GameIcon } from '../ui/GameIcon';

interface ItemPickerSectionProps {
  items: BuildItems;
  onChange: (next: BuildItems) => void;
}

const BUCKET_META: Array<{ key: ItemCategoryKey; label: string; hint: string }> = [
  { key: 'starting', label: t.itemGroups.starting.label, hint: t.itemGroups.starting.hint },
  { key: 'core', label: t.itemGroups.core.label, hint: t.itemGroups.core.hint },
  {
    key: 'situational',
    label: t.itemGroups.situational.label,
    hint: t.itemGroups.situational.hint,
  },
  {
    key: 'alternative',
    label: t.itemGroups.alternative.label,
    hint: t.itemGroups.alternative.hint,
  },
];

type ItemFilterTab = 'completed' | 'starter' | 'mayhem' | 'components' | 'all';

const ITEM_TABS: Array<{ id: ItemFilterTab; label: string }> = [
  { id: 'completed', label: 'Trang bị lớn & Giày' },
  { id: 'starter', label: 'Khởi đầu' },
  { id: 'mayhem', label: 'Mayhem Đặc biệt' },
  { id: 'components', label: 'Thành phần' },
  { id: 'all', label: 'Tất cả' },
];

export function ItemPickerSection({ items, onChange }: ItemPickerSectionProps) {
  const { gameData } = useLibrary();
  const [activeBucket, setActiveBucket] = useState<ItemCategoryKey>('core');
  const [filterTab, setFilterTab] = useState<ItemFilterTab>('completed');
  const [search, setSearch] = useState('');
  const [hoveredItem, setHoveredItem] = useState<GameItem | null>(null);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return gameData.bundle.items.filter((item) => {
      if (filterTab === 'completed' && !item.isCompleted) return false;
      if (filterTab === 'starter' && !item.isStarter) return false;
      if (filterTab === 'mayhem' && !item.isMayhemExclusive) return false;
      if (filterTab === 'components' && (item.isCompleted || item.isStarter)) return false;

      if (q) {
        const hay = `${item.name} ${item.statsSummary.join(' ')} ${item.plainDescription}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [gameData.bundle.items, filterTab, search]);

  const addItemToBucket = (itemId: number) => {
    const current = items[activeBucket];
    // Allow multiple items in starting if consumables, otherwise prevent exact duplicate in same bucket unless user really wants? Better prevent accidental duplicate in same bucket
    if (current.includes(itemId)) return;
    onChange({
      ...items,
      [activeBucket]: [...current, itemId],
    });
  };

  const removeItemAt = (bucket: ItemCategoryKey, idx: number) => {
    onChange({
      ...items,
      [bucket]: items[bucket].filter((_, i) => i !== idx),
    });
  };

  const moveItem = (bucket: ItemCategoryKey, idx: number, dir: -1 | 1) => {
    const arr = [...items[bucket]];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= arr.length) return;
    [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]];
    onChange({ ...items, [bucket]: arr });
  };

  return (
    <div className="space-y-4">
      {/* 4 Item Buckets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BUCKET_META.map(({ key, label, hint }) => {
          const isActive = activeBucket === key;
          const bucketList = items[key];
          return (
            <div
              key={key}
              onClick={() => setActiveBucket(key)}
              className={cn(
                'rounded-2xl p-3.5 border cursor-pointer transition-all space-y-2.5',
                isActive
                  ? 'bg-white/[0.075] border-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                  : 'bg-white/[0.025] border-white/[0.08] hover:border-white/20'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{label}</span>
                    {isActive && (
                      <span className="rounded-full bg-white text-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        Đang chọn
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/45 mt-0.5">{hint}</p>
                </div>
                <span className="font-mono-num text-[11px] text-white/45">
                  {bucketList.length}
                </span>
              </div>

              {bucketList.length > 0 ? (
                <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  {bucketList.map((itemId, idx) => {
                    const item = gameData.itemById.get(itemId);
                    return (
                      <div
                        key={`${itemId}-${idx}`}
                        className="group flex items-center gap-1 rounded-xl bg-black/45 border border-white/15 p-1 pr-1.5"
                      >
                        <GameIcon
                          src={item?.iconUrl}
                          fallbackSrc={item?.fallbackIconUrl}
                          alt={item?.name || 'Item'}
                          className="h-7 w-7 rounded-lg"
                        />
                        <span className="text-[11px] text-white/90 max-w-[105px] truncate px-1">
                          {item?.name || `#${itemId}`}
                        </span>
                        <div className="flex items-center">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveItem(key, idx, -1)}
                            className="p-0.5 text-white/40 hover:text-white disabled:opacity-20"
                            title="Sang trái"
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === bucketList.length - 1}
                            onClick={() => moveItem(key, idx, 1)}
                            className="p-0.5 text-white/40 hover:text-white disabled:opacity-20"
                            title="Sang phải"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItemAt(key, idx)}
                            className="p-0.5 text-white/45 hover:text-white"
                            title="Xóa trang bị"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 py-2.5 text-center text-[11px] text-white/35">
                  Nhấn vào trang bị bên dưới để thêm vào {label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Item Browser */}
      <div className="liquid-glass-subtle rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Tìm trang bị để thêm vào ${BUCKET_META.find((b) => b.key === activeBucket)?.label}...`}
              className="liquid-input w-full rounded-xl pl-9 pr-8 py-2 text-xs"
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

          <div className="flex flex-wrap gap-1.5">
            {ITEM_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors',
                  filterTab === tab.id
                    ? 'bg-white text-black border-white'
                    : 'bg-white/[0.04] text-white/65 border-white/10 hover:bg-white/[0.09]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Item Icon Grid (Rock-solid, no layout shifts above it) */}
        <div className="max-h-[260px] overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {filteredCatalog.map((item) => {
            const inCurrentBucket = items[activeBucket].includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => addItemToBucket(item.id)}
                onMouseEnter={() => setHoveredItem(item)}
                title={`${item.name} (${item.priceTotal}g)`}
                className={cn(
                  'group relative rounded-xl p-1.5 border flex flex-col items-center gap-1 transition-all',
                  inCurrentBucket
                    ? 'bg-white/[0.13] border-white/40'
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/25'
                )}
              >
                <div className="relative">
                  <GameIcon
                    src={item.iconUrl}
                    fallbackSrc={item.fallbackIconUrl}
                    alt={item.name}
                    className="h-10 w-10 rounded-lg"
                  />
                  {item.isMayhemExclusive && (
                    <span
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-white border border-black"
                      title="Trang bị đặc biệt ARAM: Mayhem"
                    />
                  )}
                  {!inCurrentBucket && (
                    <span className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center rounded-lg bg-black/55 text-white transition-opacity">
                      <Plus className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/75 truncate w-full text-center">
                  {item.name}
                </span>
                <span className="font-mono-num text-[9px] text-white/40">{item.priceTotal}g</span>
              </button>
            );
          })}
          {filteredCatalog.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-white/40">
              Không có trang bị khớp tìm kiếm.
            </div>
          )}
        </div>

        {/* Item Inspector (Docked below the grid - prevents layout-shift jitter) */}
        {hoveredItem ? (
          <div className="rounded-xl bg-black/45 border border-white/12 p-3 flex items-start gap-3 animate-fade-slide">
            <GameIcon
              src={hoveredItem.iconUrl}
              fallbackSrc={hoveredItem.fallbackIconUrl}
              alt={hoveredItem.name}
              className="h-10 w-10 rounded-lg shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white">{hoveredItem.name}</span>
                <span className="font-mono-num text-[11px] text-white/55">
                  {hoveredItem.priceTotal} vàng
                </span>
                {hoveredItem.isMayhemExclusive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/12 border border-white/25 px-2 py-0.5 text-[10px] text-white">
                    <Sparkles className="h-2.5 w-2.5" />
                    Độc quyền Mayhem
                  </span>
                )}
              </div>
              {hoveredItem.statsSummary.length > 0 && (
                <div className="text-[11px] text-white/80">
                  {hoveredItem.statsSummary.map(translateItemStat).join(' · ')}
                </div>
              )}
              {hoveredItem.plainDescription && (
                <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed">
                  {hoveredItem.plainDescription}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-white/35 text-center py-1">
            Rê chuột vào một trang bị để xem chi tiết chỉ số và giá tiền
          </div>
        )}
      </div>
    </div>
  );
}

