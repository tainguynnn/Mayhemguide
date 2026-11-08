import type { MayhemBuild } from '../types/build';

export function createSeedBuilds(): MayhemBuild[] {
  const now = Date.now();
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

  return [
    {
      id: 'seed-jhin-jeweled-caster',
      championId: 202, // Jhin
      name: 'Jeweled Gauntlet — Crit Caster R',
      favorite: true,
      augments: [
        {
          uid: 'seed-aug-1',
          augmentId: 1048, // Jeweled Gauntlet (Prismatic)
          tier: 'Prismatic',
          slotIndex: 0,
          priority: 1,
          synergyNote: 'Biến W & R (Curtain Call) thành chí mạng phép + tăng tỉ lệ crit theo AP/AD.',
          alternativeAugmentIds: [1195], // Giant Slayer
        },
        {
          uid: 'seed-aug-1b',
          augmentId: 1081, // Tap Dancer (Prismatic)
          tier: 'Prismatic',
          slotIndex: 1,
          priority: 2,
          synergyNote: 'Cộng dồn tốc độ di chuyển và tốc đánh chuyển hóa thành AD cho Jhin.',
          alternativeAugmentIds: [1079], // Symphony of War
        },
        {
          uid: 'seed-aug-2',
          augmentId: 1047, // It's Critical (Gold)
          tier: 'Gold',
          slotIndex: 0,
          priority: 3,
          synergyNote: 'Cộng thẳng 50% Crit Chance giúp Jeweled Gauntlet chạm 100% crit sớm.',
          alternativeAugmentIds: [1071], // Scopier Weapons
        },
        {
          uid: 'seed-aug-2b',
          augmentId: 1071, // Scopier Weapons (Gold)
          tier: 'Gold',
          slotIndex: 1,
          priority: 4,
          synergyNote: 'Tăng tầm đánh xa giúp bắn phát thứ 4 cực kỳ an toàn.',
          alternativeAugmentIds: [],
        },
        {
          uid: 'seed-aug-3',
          augmentId: 1026, // Don't Blink (Silver)
          tier: 'Silver',
          slotIndex: 0,
          priority: 5,
          synergyNote: 'Tận dụng tốc độ chạy sau đòn crit của nội tại Jhin để tăng sát thương tầm xa.',
          alternativeAugmentIds: [1105], // Homeguard
        },
        {
          uid: 'seed-aug-3b',
          augmentId: 1170, // Scoped Weapons (Silver)
          tier: 'Silver',
          slotIndex: 1,
          priority: 6,
          synergyNote: 'Cộng thêm tầm đánh cơ bản ở mốc Bạc.',
          alternativeAugmentIds: [],
        },
      ],
      items: {
        starting: [3184, 1001, 2003], // Guardian's Hammer, Boots, Health Potion
        core: [3009, 6676, 3031, 3094], // Boots of Swiftness, The Collector, Infinity Edge, Rapid Firecannon
        situational: [3036, 3072], // Lord Dominik's Regards, Bloodthirster
        alternative: [126697], // Hubris
      },
      summonerSpells: [4, 32], // Flash, Mark
      statShards: {
        offensive: 5008, // Adaptive Force
        flex: 5010, // Move Speed
        defensive: 5001, // Health Scaling
      },
      notes: {
        gameplay:
          'Ưu tiên cấu rỉa từ tuyến sau bằng W và phát bắn thứ 4. Khi có Jeweled Gauntlet, dùng R ở khoảng cách an toàn để dứt điểm nhiều mục tiêu với sát thương chí mạng.',
        synergy:
          "Jeweled Gauntlet + It's Critical + Infinity Edge giúp kỹ năng lẫn đòn đánh thường tối đa hóa sát thương chí mạng mà không cần mua quá nhiều đồ tốc đánh.",
        conditions:
          'Mạnh nhất khi đội hình địch có 2–3 tướng máu giấy hoặc thiếu sát thủ tiếp cận.',
        alternatives:
          'Nếu không ra Jeweled Gauntlet ở mốc Prismatic, đổi sang Giant Slayer hoặc Tap Dancer để giữ khả năng kite.',
        matchups:
          'Giữ Flash để né snowball lao vào của sát thủ; ưu tiên mua Rapid Firecannon sớm để đánh phát thứ 4 an toàn.',
      },
      createdAt: iso(180),
      updatedAt: iso(25),
    },
    {
      id: 'seed-jhin-symphony-speed',
      championId: 202, // Jhin
      name: 'The Fast — Symphony & Tap Dancer',
      favorite: false,
      augments: [
        {
          uid: 'seed-aug-j2-1',
          augmentId: 1081, // Tap Dancer (Prismatic)
          tier: 'Prismatic',
          slotIndex: 0,
          priority: 1,
          synergyNote: 'Tốc đánh chuyển hóa thành AD và tốc độ chạy liên tục trên Jhin.',
          alternativeAugmentIds: [1079], // Symphony of War
        },
        {
          uid: 'seed-aug-j2-3',
          augmentId: 1071, // Scopier Weapons (Gold)
          tier: 'Gold',
          slotIndex: 0,
          priority: 2,
          synergyNote: 'Tăng tầm đánh giúp thả diều và tích Tap Dancer cực kỳ an toàn.',
          alternativeAugmentIds: [1047], // It's Critical
        },
        {
          uid: 'seed-aug-j2-2',
          augmentId: 1022, // Deft (Silver)
          tier: 'Silver',
          slotIndex: 0,
          priority: 3,
          synergyNote: '60% tốc đánh buff trực tiếp lượng AD nội tại Whisper của Jhin.',
          alternativeAugmentIds: [1105], // Homeguard
        },
      ],
      items: {
        starting: [3184, 1001], // Guardian's Hammer, Boots
        core: [3009, 3094, 3031, 6676], // Swifties, RFC, IE, Collector
        situational: [3072, 3036], // Bloodthirster, LDR
        alternative: [994403], // Golden Spatula
      },
      summonerSpells: [4, 6], // Flash, Ghost
      statShards: {
        offensive: 5005, // Attack Speed
        flex: 5010, // Move Speed
        defensive: 5013, // Tenacity and Slow Resist
      },
      notes: {
        gameplay:
          'Lối chơi tốc độ cực đại: bật Ghost + đòn crit để di chuyển né toàn bộ kỹ năng định hướng và liên tục giữ khoảng cách.',
        synergy:
          'Tap Dancer + Deft + Scopier Weapons biến Jhin thành pháo đài di động không thể bị chạm tới.',
        conditions:
          'Rất hiệu quả trước đội hình nhiều đấu sĩ/tank đi bộ như Darius, Sett, Mordekaiser.',
        alternatives:
          'Nếu gặp nhiều khống chế cứng, đổi Ghost lấy Cleanse và ưu tiên Stat Shard Tenacity.',
        matchups:
          'Tránh đứng gần tường khi đối đầu các tướng mở giao tranh bất ngờ.',
      },
      createdAt: iso(240),
      updatedAt: iso(95),
    },
    {
      id: 'seed-ahri-eureka-haste',
      championId: 103, // Ahri
      name: 'Eureka — Hyper Haste Charm Spam',
      favorite: true,
      augments: [
        {
          uid: 'seed-aug-a1',
          augmentId: 1030, // Eureka (Prismatic)
          tier: 'Prismatic',
          slotIndex: 0,
          priority: 1,
          synergyNote: 'Chuyển AP thành lượng Ability Haste khổng lồ để spam Q/E liên tục.',
          alternativeAugmentIds: [1045, 1388], // Infernal Conduit, Infinite Recursion
        },
        {
          uid: 'seed-aug-a2',
          augmentId: 1390, // Phenomenal Evil (Gold)
          tier: 'Gold',
          slotIndex: 0,
          priority: 2,
          synergyNote: 'Cộng dồn AP vĩnh viễn mỗi lần trúng chiêu — nhân đôi sức mạnh với Eureka.',
          alternativeAugmentIds: [1116, 1311], // Flashy, Overflow
        },
        {
          uid: 'seed-aug-a3',
          augmentId: 1056, // Mind to Matter (Silver)
          tier: 'Silver',
          slotIndex: 0,
          priority: 3,
          synergyNote: 'Chuyển mana từ Malignance/Archangel thành máu giúp Ahri lướt sâu không sợ sốc.',
          alternativeAugmentIds: [1105], // Homeguard
        },
      ],
      items: {
        starting: [3112, 3070], // Guardian's Orb, Tear of the Goddess
        core: [3020, 3118, 3003, 3089], // Sorc Shoes, Malignance, Archangel's Staff, Rabadon's Deathcap
        situational: [3157, 3135, 4629], // Zhonya's, Void Staff, Cosmic Drive
        alternative: [228002, 4645], // Wooglet's Witchcap, Shadowflame
      },
      summonerSpells: [4, 32], // Flash, Mark
      statShards: {
        offensive: 5007, // Ability Haste
        flex: 5008, // Adaptive Force
        defensive: 5001, // Health Scaling
      },
      notes: {
        gameplay:
          'Cấu rỉa liên tục bằng Q và bắt lẻ bằng E (hồi chiêu ~3 giây cuối trận). Dùng Spirit Rush + Snowball để mở góc bắt chủ lực địch.',
        synergy:
          'Phenomenal Evil tích AP liên tục → Eureka biến AP thành Ability Haste → spam nhiều kỹ năng hơn → tích Phenomenal Evil nhanh hơn.',
        conditions:
          'Cực kỳ linh hoạt trong mọi đội hình vì Ahri vừa có khống chế vừa có cơ động.',
        alternatives:
          'Nếu ra Quest: Wooglet’s Witchcap thì ưu tiên lên Zhonya sớm để nhận trang bị 300 AP.',
        matchups:
          'Giữ E để ngắt lao vào của các tướng như Lee Sin, Akali, Leona.',
      },
      createdAt: iso(360),
      updatedAt: iso(45),
    },
    {
      id: 'seed-chogath-goliath-raidboss',
      championId: 31, // Cho'Gath
      name: 'Goliath — Void Immolation Raid Boss',
      favorite: true,
      augments: [
        {
          uid: 'seed-aug-c1',
          augmentId: 1041, // Goliath (Prismatic)
          tier: 'Prismatic',
          slotIndex: 0,
          priority: 1,
          synergyNote: '+35% Health và +15% Adaptive Force khuếch đại toàn bộ sát thương E/R và Heartsteel.',
          alternativeAugmentIds: [1015], // Circle of Death
        },
        {
          uid: 'seed-aug-c2',
          augmentId: 1152, // Quest: Steel Your Heart (Gold)
          tier: 'Gold',
          slotIndex: 0,
          priority: 2,
          synergyNote: 'Nhân lượng cộng dồn Heartsteel khi đạt 300 stack — biến Cho’Gath thành boss bất tử.',
          alternativeAugmentIds: [1002, 1353], // Apex Inventor, Tank Engine
        },
        {
          uid: 'seed-aug-c3',
          augmentId: 1013, // Celestial Body (Gold)
          tier: 'Gold',
          slotIndex: 1,
          priority: 3,
          synergyNote: 'Thêm 1250 máu ngay lập tức giúp vượt mốc máu tối đa cực sớm.',
          alternativeAugmentIds: [1149], // Impassable
        },
      ],
      items: {
        starting: [2051, 2003], // Guardian's Horn, Health Potion
        core: [3111, 3084, 2502, 3083], // Merc Treads, Heartsteel, Unending Despair, Warmog's
        situational: [3065, 6665, 3068], // Spirit Visage, Jak'Sho, Sunfire
        alternative: [223069], // Void Immolation
      },
      summonerSpells: [4, 32], // Flash, Mark
      statShards: {
        offensive: 5007, // Ability Haste
        flex: 5001, // Health Scaling
        defensive: 5013, // Tenacity and Slow Resist
      },
      notes: {
        gameplay:
          'Lấy cấp 6 và tích stack R vào lính hoặc tướng địch hồi chiêu nhanh. Dùng Snowball lao vào giữa đội hình để kích Unending Despair và Heartsteel nhiều mục tiêu.',
        synergy:
          'Goliath + Quest: Steel Your Heart + Unending Despair + Spirit Visage tạo vòng lặp hồi máu tỉ lệ theo lượng máu tối đa khổng lồ.',
        conditions:
          'Mạnh nhất khi team thiếu chống chịu tuyến đầu hoặc địch ít sát thương theo % máu.',
        alternatives:
          'Apex Inventor giảm hồi chiêu Heartsteel & Unending Despair cực mạnh nếu không ra Steel Your Heart.',
        matchups:
          'Cẩn thận các tướng cấu rỉa tầm xa có Liandry / BORK; ưu tiên giày Thủy Ngân nếu nhiều CC.',
      },
      createdAt: iso(500),
      updatedAt: iso(120),
    },
    {
      id: 'seed-sona-protein-shake',
      championId: 37, // Sona
      name: 'Protein Shake — Tank Enchanter Aura',
      favorite: false,
      augments: [
        {
          uid: 'seed-aug-s1',
          augmentId: 1324, // Protein Shake (Prismatic)
          tier: 'Prismatic',
          slotIndex: 0,
          priority: 1,
          synergyNote: 'Chuyển Giáp & Kháng Phép cộng thêm thành Heal & Shield Power cực lớn.',
          alternativeAugmentIds: [1095], // Windspeaker's Blessing
        },
        {
          uid: 'seed-aug-s2',
          augmentId: 1141, // All For You (Gold)
          tier: 'Gold',
          slotIndex: 0,
          priority: 2,
          synergyNote: 'Tăng 30% hiệu lực hồi máu & tạo khiên cho đồng minh trong vùng hào quang W.',
          alternativeAugmentIds: [1118], // Critical Healing
        },
        {
          uid: 'seed-aug-s3',
          augmentId: 1037, // First-Aid Kit (Silver)
          tier: 'Silver',
          slotIndex: 0,
          priority: 3,
          synergyNote: '+20% Heal & Shield Power giá trị cao ngay từ giai đoạn đầu.',
          alternativeAugmentIds: [1076], // Sonic Boom
        },
      ],
      items: {
        starting: [3112, 3070], // Guardian's Orb, Tear
        core: [3158, 6617, 124011, 3003], // Ionian Boots, Moonstone Renewer, Sword of Blossoming Dawn, Archangel's Staff
        situational: [6616, 3504, 3107, 6621], // Staff of Flowing Water, Ardent Censer, Redemption, Dawncore
        alternative: [6665], // Jak'Sho (for Protein Shake scaling)
      },
      summonerSpells: [4, 7], // Flash, Heal
      statShards: {
        offensive: 5007, // Ability Haste
        flex: 5010, // Move Speed
        defensive: 5001, // Health Scaling
      },
      notes: {
        gameplay:
          'Giữ vị trí giữa đội hình, spam W + E liên tục để phủ khiên toàn đội và kích hoạt Sword of Blossoming Dawn.',
        synergy:
          'Protein Shake cho phép Sona lên thêm món chống chịu (như Jak’Sho / Locket) mà vẫn khuếch đại lượng hồi máu và tạo khiên vượt trội.',
        conditions:
          'Cực kỳ mạnh khi đi cùng từ 2 carry trở lên trong ARAM Mayhem.',
        alternatives:
          'Nếu không có Protein Shake, chuyển sang Windspeaker’s Blessing + Critical Healing và lên full đồ enchanter thuần.',
        matchups:
          'Tránh đi lẻ check bụi; dùng R chủ động cắt nhịp lao vào của sát thủ.',
      },
      createdAt: iso(720),
      updatedAt: iso(210),
    },
  ];
}
