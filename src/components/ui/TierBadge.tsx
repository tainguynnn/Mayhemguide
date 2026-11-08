import { Crown, Gem, Hexagon } from 'lucide-react';
import type { AugmentTier } from '../../types/gameData';
import { cn, TIER_META } from '../../utils/formatters';

/**
 * Distinct glyph per rarity so tiers are never identified by colour alone:
 * Silver = hexagon, Gold = crown, Prismatic = gem.
 */
export function TierGlyph({ tier, className }: { tier: AugmentTier; className?: string }) {
  const Icon = tier === 'Prismatic' ? Gem : tier === 'Gold' ? Crown : Hexagon;
  return <Icon aria-hidden className={cn('shrink-0', className)} strokeWidth={2.2} />;
}

interface TierBadgeProps {
  tier: AugmentTier;
  compact?: boolean;
  /** Append the Vietnamese name, e.g. "Prismatic · Kim Cương". */
  showVi?: boolean;
  className?: string;
}

export function TierBadge({ tier, compact = false, showVi = false, className }: TierBadgeProps) {
  const meta = TIER_META[tier];

  return (
    <span
      title={`${meta.label} · ${meta.viLabel}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold tracking-wide select-none whitespace-nowrap',
        meta.badgeClass,
        compact ? 'px-1.5 py-[1px] text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
        className
      )}
    >
      <TierGlyph tier={tier} className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      <span>{showVi ? `${meta.label} · ${meta.viLabel}` : meta.label}</span>
    </span>
  );
}
