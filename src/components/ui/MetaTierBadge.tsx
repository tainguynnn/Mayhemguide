import type { MetaTier } from '../../types/meta';
import { t } from '../../i18n/vi';
import { cn } from '../../utils/formatters';

interface MetaTierBadgeProps {
  tier: MetaTier;
  showPrefix?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const META_TIER_STYLES: Record<MetaTier, string> = {
  S: 'bg-white text-black border-white font-bold shadow-[0_2px_10px_rgba(255,255,255,0.2)]',
  A: 'bg-white/[0.15] text-white border-white/35 font-semibold',
  B: 'bg-white/[0.08] text-white/85 border-white/20 font-semibold',
  C: 'bg-white/[0.04] text-white/65 border-white/12 font-medium',
  D: 'bg-white/[0.02] text-white/45 border-white/[0.08] font-medium',
};

export function MetaTierBadge({
  tier,
  showPrefix = false,
  size = 'md',
  className,
}: MetaTierBadgeProps) {
  const meta = t.metaTiers[tier];

  return (
    <span
      title={`${meta.label} — ${meta.desc}`}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border font-mono-num select-none shrink-0',
        META_TIER_STYLES[tier],
        size === 'sm' ? 'min-w-[24px] px-1.5 py-0.5 text-[10px]' : 'min-w-[28px] px-2 py-0.5 text-xs',
        className
      )}
    >
      {showPrefix ? meta.label : meta.short}
    </span>
  );
}

