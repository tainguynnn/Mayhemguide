import type { AugmentTier, ChampionRole, StatShardSlot } from '../types/gameData';
import type { ItemCategoryKey } from '../types/build';
import type { MetaDataKind, MetaTier } from '../types/meta';

export const VI = {
  brand: {
    title: 'ARAM: MAYHEM',
    subtitle: 'Thư viện Meta, Lõi & Build cá nhân',
    footer:
      'Mayhemguide v2 · Cẩm nang ARAM: Mayhem toàn diện · Lưu trữ trực tiếp trên trình duyệt (Local-first), không thu thập dữ liệu.',
  },

  nav: {
    tierList: 'Tier List',
    tierListSub: 'Bảng xếp hạng Meta',
    champions: 'Kho Tướng',
    augments: 'Kho Lõi',
    myBuilds: 'Bộ Build Của Tôi',
    createBuild: 'Tạo Build',
    dataManager: 'Sao Lưu & Dữ Liệu',
    quickSearchPlaceholder: 'Tìm tướng, lõi công nghệ, bộ build...',
  },

  roles: {
    ALL: 'Tất cả vai trò',
    Top: 'Đường Trên',
    Jungle: 'Đi Rừng',
    Mid: 'Đường Giữa',
    ADC: 'Xạ Thủ',
    Support: 'Hỗ Trợ',
  } satisfies Record<'ALL' | ChampionRole, string>,

  augmentTiers: {
    Prismatic: {
      key: 'Prismatic',
      en: 'Prismatic',
      vi: 'Kim Cương',
      fullHeader: 'PRISMATIC – KIM CƯƠNG',
      badgeFull: 'Kim Cương · Prismatic',
      slotHint: 'Chọn lõi Kim Cương ưu tiên',
      desc: 'Cấp độ cao nhất với hiệu ứng đa sắc, thay đổi hoàn toàn lối chơi.',
    },
    Gold: {
      key: 'Gold',
      en: 'Gold',
      vi: 'Vàng',
      fullHeader: 'GOLD – VÀNG',
      badgeFull: 'Vàng · Gold',
      slotHint: 'Chọn lõi Vàng ưu tiên',
      desc: 'Cấp độ Vàng kim, cung cấp trụ cột sức mạnh và cơ chế quan trọng.',
    },
    Silver: {
      key: 'Silver',
      en: 'Silver',
      vi: 'Bạc',
      fullHeader: 'SILVER – BẠC',
      badgeFull: 'Bạc · Silver',
      slotHint: 'Chọn lõi Bạc ưu tiên',
      desc: 'Cấp độ Bạc lạnh, bổ sung chỉ số nền tảng và hiệu ứng hỗ trợ ổn định.',
    },
  } satisfies Record<
    AugmentTier,
    {
      key: AugmentTier;
      en: string;
      vi: string;
      fullHeader: string;
      badgeFull: string;
      slotHint: string;
      desc: string;
    }
  >,

  metaTiers: {
    S: { label: 'Hạng S', short: 'S', desc: 'Áp đảo meta hiện tại' },
    A: { label: 'Hạng A', short: 'A', desc: 'Mạnh và ổn định' },
    B: { label: 'Hạng B', short: 'B', desc: 'Cân bằng, phụ thuộc đội hình' },
    C: { label: 'Hạng C', short: 'C', desc: 'Cần điều kiện hoặc kỹ năng cao' },
    D: { label: 'Hạng D', short: 'D', desc: 'Hiệu suất thấp trong meta' },
  } satisfies Record<MetaTier, { label: string; short: string; desc: string }>,

  dataKind: {
    real: {
      badge: 'Dữ liệu thống kê thực tế',
      desc: 'Số liệu tổng hợp trực tiếp từ các trận đấu ARAM: Mayhem thực tế.',
    },
    manual: {
      badge: 'Dữ liệu cập nhật thủ công',
      desc: 'Gói thống kê do người dùng tự nhập hoặc chỉnh sửa.',
    },
    sample: {
      badge: 'Dữ liệu mẫu minh họa',
      desc: 'Dữ liệu mẫu chỉ dùng để minh họa giao diện, không phải thống kê thực tế.',
    },
  } satisfies Record<MetaDataKind, { badge: string; desc: string }>,

  itemGroups: {
    starting: {
      label: 'Trang bị khởi đầu',
      short: 'Khởi đầu',
      hint: 'Trang bị mua đầu trận (Guardian, Giày, Nước Mắt...)',
    },
    core: {
      label: 'Trang bị cốt lõi',
      short: 'Cốt lõi',
      hint: 'Bộ trang bị bắt buộc tạo nên sức mạnh chính',
    },
    situational: {
      label: 'Trang bị tình huống',
      short: 'Tình huống',
      hint: 'Lên tùy theo đội hình đối phương và diễn biến trận đấu',
    },
    alternative: {
      label: 'Trang bị thay thế',
      short: 'Thay thế',
      hint: 'Phương án dự phòng khi cần đổi hướng lên đồ',
    },
  } satisfies Record<ItemCategoryKey, { label: string; short: string; hint: string }>,

  shardSlots: {
    Offensive: {
      label: 'Nhánh Công',
      short: 'Công',
    },
    Flex: {
      label: 'Nhánh Linh Hoạt',
      short: 'Linh hoạt',
    },
    Defensive: {
      label: 'Nhánh Phòng Thủ',
      short: 'Thủ',
    },
  } satisfies Record<StatShardSlot, { label: string; short: string }>,
} as const;

export type LocaleDictionary = typeof VI;
export const t = VI;

