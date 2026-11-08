import type { AugmentTier } from '../types/gameData';

export function formatRelativeTimeVi(isoDate: string): string {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

export const TIER_META: Record<
  AugmentTier,
  {
    label: string;
    viLabel: string;
    /** Badge surface (background + border + text). */
    badgeClass: string;
    /** Rarity-coloured text (Prismatic uses an iridescent gradient). */
    textClass: string;
    /** Framed border for augment icons (works with any border-radius). */
    ringClass: string;
    /** Thin accent line for containers grouped by rarity. */
    accentClass: string;
    /** Border tint for empty/placeholder slots. */
    slotClass: string;
  }
> = {
  Silver: {
    label: 'Silver',
    viLabel: 'Bạc',
    badgeClass: 'tier-silver',
    textClass: 'tier-text-silver',
    ringClass: 'aug-ring-silver',
    accentClass: 'tier-accent-silver',
    slotClass: 'tier-slot-silver',
  },
  Gold: {
    label: 'Gold',
    viLabel: 'Vàng',
    badgeClass: 'tier-gold',
    textClass: 'tier-text-gold',
    ringClass: 'aug-ring-gold',
    accentClass: 'tier-accent-gold',
    slotClass: 'tier-slot-gold',
  },
  Prismatic: {
    label: 'Prismatic',
    viLabel: 'Kim Cương',
    badgeClass: 'tier-prismatic',
    textClass: 'tier-text-prismatic',
    ringClass: 'aug-ring-prismatic',
    accentClass: 'tier-accent-prismatic',
    slotClass: 'tier-slot-prismatic',
  },
};

/** Display order for rarity groups (highest first). */
export const TIER_ORDER: AugmentTier[] = ['Prismatic', 'Gold', 'Silver'];

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(value);
}

export function formatDateVi(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate.length === 10 ? `${isoDate}T00:00:00` : isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Lowercase + strip diacritics so "Kim Cuong" matches "Kim Cương". */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const STAT_TRANSLATIONS: Array<[RegExp, string]> = [
  [/Attack Damage/gi, 'Sát thương Đòn đánh (AD)'],
  [/Ability Power/gi, 'Sức mạnh Phép thuật (AP)'],
  [/Ability Haste/gi, 'Điểm hồi Kỹ năng'],
  [/Armor Penetration/gi, 'Xuyên Giáp'],
  [/Magic Penetration/gi, 'Xuyên Kháng Phép'],
  [/Critical Strike Chance/gi, 'Tỷ lệ Chí mạng'],
  [/Critical Strike Damage/gi, 'Sát thương Chí mạng'],
  [/Attack Speed/gi, 'Tốc độ Đánh'],
  [/Life Steal/gi, 'Hút máu'],
  [/Omnivamp/gi, 'Hút máu Toàn phần'],
  [/Magic Resist/gi, 'Kháng Phép'],
  [/Armor/gi, 'Giáp'],
  [/Base Health Regen/gi, 'Hồi Máu cơ bản'],
  [/Health Regen/gi, 'Hồi Máu'],
  [/Base Mana Regen/gi, 'Hồi Năng lượng cơ bản'],
  [/Mana Regen/gi, 'Hồi Năng lượng'],
  [/Health/gi, 'Máu'],
  [/Mana/gi, 'Năng lượng'],
  [/Move Speed/gi, 'Tốc độ Di chuyển'],
  [/Lethality/gi, 'Sát lực'],
  [/Tenacity/gi, 'Kháng Hiệu ứng'],
  [/Slow Resist/gi, 'Kháng Làm chậm'],
  [/Heal and Shield Power/gi, 'Hiệu lực Hồi máu & Lá chắn'],
];

export function translateItemStat(stat: string): string {
  let translated = stat;
  for (const [re, vi] of STAT_TRANSLATIONS) {
    if (re.test(translated)) {
      translated = translated.replace(re, vi);
    }
  }
  return translated;
}

export const ITEM_CATEGORY_VI: Record<string, string> = {
  ALL: 'Tất cả',
  Damage: 'Sát thương (AD)',
  SpellDamage: 'Phép thuật (AP)',
  CriticalStrike: 'Chí mạng',
  AttackSpeed: 'Tốc độ đánh',
  LifeSteal: 'Hút máu',
  ArmorPenetration: 'Xuyên giáp',
  Health: 'Máu & Chống chịu',
  Armor: 'Giáp',
  SpellBlock: 'Kháng phép',
  AbilityHaste: 'Hồi kỹ năng',
  Mana: 'Năng lượng',
  Boots: 'Giày',
  Starter: 'Khởi đầu',
  Consumable: 'Tiêu thụ',
  OnHit: 'Đòn đánh',
  Aura: 'Hào quang',
  NonbootsMovement: 'Tốc độ chạy',
};


