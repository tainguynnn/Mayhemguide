import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { t } from '../../i18n/vi';
import type { ChampionRole } from '../../types/gameData';
import { cn } from '../../utils/formatters';
import { GameIcon } from '../ui/GameIcon';

interface ChampionPickerModalProps {
  open: boolean;
  selectedChampionId: number | null;
  onSelect: (championId: number) => void;
  onClose: () => void;
}

const ROLES: Array<'ALL' | ChampionRole> = ['ALL', 'Top', 'Jungle', 'Mid', 'ADC', 'Support'];

export function ChampionPickerModal({
  open,
  selectedChampionId,
  onSelect,
  onClose,
}: ChampionPickerModalProps) {
  const { gameData } = useLibrary();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'ALL' | ChampionRole>('ALL');

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return gameData.bundle.champions.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) {
        return false;
      }
      if (role !== 'ALL' && !c.roles.includes(role)) return false;
      return true;
    });
  }, [gameData.bundle.champions, search, role]);

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

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="liquid-glass-elevated w-full max-w-4xl max-h-[84vh] rounded-3xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Chọn Tướng</h3>
            <p className="text-xs text-white/50">
              {gameData.bundle.champions.length} tướng khả dụng trong chế độ ARAM: Mayhem
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 border-b border-white/[0.08] space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên tướng..."
              autoFocus
              className="liquid-input w-full rounded-xl pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                  role === r
                    ? 'bg-white text-black border-white'
                    : 'bg-white/[0.04] text-white/65 border-white/10 hover:bg-white/[0.09]'
                )}
              >
                {t.roles[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
          {list.map((champ) => {
            const active = champ.id === selectedChampionId;
            return (
              <button
                key={champ.id}
                type="button"
                onClick={() => {
                  onSelect(champ.id);
                  onClose();
                }}
                className={cn(
                  'rounded-xl p-2 flex flex-col items-center gap-1.5 border text-center transition-all',
                  active
                    ? 'bg-white/15 border-white/45'
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20'
                )}
              >
                <GameIcon
                  src={champ.portraitUrl}
                  fallbackSrc={champ.fallbackPortraitUrl}
                  alt={champ.name}
                  className="h-14 w-14 rounded-xl"
                />
                <span className="text-[11px] font-medium text-white truncate w-full">
                  {champ.name}
                </span>
              </button>
            );
          })}
          {list.length === 0 && (
            <div className="col-span-full py-10 text-center text-xs text-white/45">
              Không tìm thấy champion phù hợp.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

