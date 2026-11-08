import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'src', 'data');

const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';
const CDRAGON_V1 = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1';
const CDRAGON_VI_V1 = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/vi_vn/v1';
const CDRAGON_ASSETS = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/';
const CDRAGON_MAP12 = 'https://raw.communitydragon.org/latest/game/data/maps/shipping/map12/map12.bin.json';
const MERAKI_CHAMPS = 'https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json';
const WIKI_AUGMENTS_API = 'https://wiki.leagueoflegends.com/api.php?action=parse&page=ARAM:_Mayhem/Augments&prop=text&format=json';
const WIKI_AUG_MODULE_API = 'https://wiki.leagueoflegends.com/api.php?action=query&titles=Module:MayhemAugmentData/data&prop=revisions&rvprop=content&rvslots=main&format=json';

const POSITION_MAP = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  BOTTOM: 'ADC',
  SUPPORT: 'Support',
  UTILITY: 'Support',
};

// Verified against Official LoL Wiki Module:ChampionData/data for champions newer than Meraki cache
const CHAMPION_ROLE_OVERRIDES = {
  805: ['Mid'], // Locke
  904: ['Top', 'Jungle'], // Zaahen
};

// Verified ARAM: Mayhem exclusive / returning items from Official LoL Wiki ARAM:_Mayhem#Items
const MAYHEM_EXCLUSIVE_ITEM_IDS = new Set([
  3039, // Atma's Reckoning
  123430, // Rite of Ruin
  124011, // Sword of Blossoming Dawn
  6032, // Stat Bonus
  1111, // Jarvan I's
  994403, // Golden Spatula
  226668, // Ultra Hydra
  223069, // Void Immolation
  228002, // Wooglet's Witchcap
  3146, // Hextech Gunblade
]);

const STARTER_ITEM_IDS = new Set([
  2051, // Guardian's Horn
  3112, // Guardian's Orb
  3177, // Guardian's Blade
  3184, // Guardian's Hammer
  2003, // Health Potion
  2031, // Refillable Potion
  2141, // Cappa Juice
  1001, // Boots
  1036, // Long Sword
  1052, // Amplifying Tome
  1028, // Ruby Crystal
  1042, // Dagger
  1004, // Faerie Charm
  1029, // Cloth Armor
  1033, // Null-Magic Mantle
  1027, // Sapphire Crystal
  1018, // Cloak of Agility
  3070, // Tear of the Goddess
]);

function cdragonAssetUrl(assetPath) {
  if (!assetPath) return '';
  return CDRAGON_ASSETS + assetPath.replace(/^\/lol-game-data\/assets\//i, '').toLowerCase();
}

function decodeHtml(str) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#95;/g, '_');
}

function stripTags(html) {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(p|li|tr)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/^quest:\s*/i, '')
    .replace(/^pentakill:\s*/i, '')
    .replace(/[^a-z0-9]/g, '');
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.json();
}

function parseItemDescription(rawDesc) {
  if (!rawDesc) return { statsSummary: [], plainDescription: '' };
  const statsMatch = rawDesc.match(/<stats>([\s\S]*?)<\/stats>/i);
  const statsSummary = statsMatch
    ? stripTags(statsMatch[1])
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const bodyOnly = rawDesc.replace(/<stats>[\s\S]*?<\/stats>/i, '');
  const plainDescription = stripTags(bodyOnly);
  return { statsSummary, plainDescription };
}

function parseWikiAugments(html) {
  const rows = [
    ...html.matchAll(
      /<tr><td style="text-align:center;" id="([^"]+)">([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td style="text-align:center;">([^<]+)<\/td><\/tr>/g
    ),
  ];

  return rows.map((m) => {
    const cell0 = m[2];
    const cell1 = m[3];
    const tier = decodeHtml(m[4]).trim();
    const name = stripTags(cell0).replace(/\s+/g, ' ').trim();
    const imgMatch = cell0.match(/src="([^"]+)"/);
    const wikiImgPath = imgMatch ? decodeHtml(imgMatch[1]) : '';
    const wikiIconUrl = wikiImgPath
      ? wikiImgPath.startsWith('http')
        ? wikiImgPath
        : `https://wiki.leagueoflegends.com${wikiImgPath}`
      : '';
    const description = stripTags(cell1);
    return {
      name,
      tier,
      description,
      wikiIconUrl,
    };
  });
}

function parseLuaNotes(luaText) {
  const notesMap = new Map();
  const blocks = luaText.split(/\n\t\["/);
  for (const block of blocks.slice(1)) {
    const nameMatch = block.match(/^([^"]+)"\]\s*=\s*\{/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const notesMatch = block.match(/\["notes"\]\s*=\s*\[=\[([\s\S]*?)\]=\]/);
    if (notesMatch) {
      const cleanNotes = notesMatch[1]
        .replace(/\{\{as\|([^|}]+)(?:\|[^}]*)?\}\}/g, '$1')
        .replace(/\{\{tip\|(?:[^|}]+\|)?([^}]+)\}\}/g, '$1')
        .replace(/\{\{fd\|([^}]+)\}\}/g, '$1')
        .replace(/\{\{g\|([^}]+)\}\}/g, '$1 gold')
        .replace(/\{\{ii\|([^}]+)\}\}/g, '$1')
        .replace(/\{\{si\|([^}]+)\}\}/g, '$1')
        .replace(/\{\{ai\|([^|}]+)(?:\|[^}]*)?\}\}/g, '$1')
        .replace(/\{\{pp\|([^}]+)\}\}/g, '$1')
        .replace(/\[\[File:[^\]]+\]\]/g, '')
        .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
        .replace(/'''?/g, '')
        .replace(/^\s*\*\s*/gm, '• ')
        .replace(/[ \t]+/g, ' ')
        .trim();
      notesMap.set(normalizeName(name), cleanNotes);
    }
  }
  return notesMap;
}

async function main() {
  console.log('Syncing ARAM: Mayhem game data...');
  const versions = await fetchJson(`${DDRAGON_BASE}/api/versions.json`);
  const patch = versions[0];
  console.log('Latest Data Dragon patch:', patch);

  const [
    ddChampions,
    ddItems,
    ddSpells,
    merakiChampions,
    cdChampSummary,
    cdItems,
    cdSpells,
    cdPerks,
    cdPerkStyles,
    cdAugLists,
    cdCherryAugs,
    cdCherryAugsVi,
    cdMap12,
    wikiParsed,
    wikiModule,
  ] = await Promise.all([
    fetchJson(`${DDRAGON_BASE}/cdn/${patch}/data/en_US/champion.json`),
    fetchJson(`${DDRAGON_BASE}/cdn/${patch}/data/en_US/item.json`),
    fetchJson(`${DDRAGON_BASE}/cdn/${patch}/data/en_US/summoner.json`),
    fetchJson(MERAKI_CHAMPS),
    fetchJson(`${CDRAGON_V1}/champion-summary.json`),
    fetchJson(`${CDRAGON_V1}/items.json`),
    fetchJson(`${CDRAGON_V1}/summoner-spells.json`),
    fetchJson(`${CDRAGON_V1}/perks.json`),
    fetchJson(`${CDRAGON_V1}/perkstyles.json`),
    fetchJson(`${CDRAGON_V1}/augment-lists.json`),
    fetchJson(`${CDRAGON_V1}/cherry-augments.json`),
    fetchJson(`${CDRAGON_VI_V1}/cherry-augments.json`),
    fetchJson(CDRAGON_MAP12),
    fetchJson(WIKI_AUGMENTS_API),
    fetchJson(WIKI_AUG_MODULE_API),
  ]);

  // 1. Champions
  const merakiById = new Map(Object.values(merakiChampions).map((c) => [Number(c.id), c]));
  const cdChampById = new Map(cdChampSummary.map((c) => [Number(c.id), c]));

  const champions = Object.values(ddChampions.data)
    .map((dd) => {
      const id = Number(dd.key);
      const meraki = merakiById.get(id);
      const cd = cdChampById.get(id);
      let roles = CHAMPION_ROLE_OVERRIDES[id];
      if (!roles && meraki?.positions?.length) {
        roles = meraki.positions.map((p) => POSITION_MAP[p]).filter(Boolean);
      }
      if (!roles || roles.length === 0) {
        roles = ['Mid'];
      }
      return {
        id,
        slug: dd.id,
        name: dd.name,
        title: dd.title,
        roles: [...new Set(roles)],
        classes: dd.tags || [],
        portraitUrl: `${DDRAGON_BASE}/cdn/${patch}/img/champion/${dd.id}.png`,
        fallbackPortraitUrl: cd?.squarePortraitPath
          ? cdragonAssetUrl(cd.squarePortraitPath)
          : `${CDRAGON_V1}/champion-icons/${id}.png`,
        splashUrl: `${DDRAGON_BASE}/cdn/img/champion/splash/${dd.id}_0.jpg`,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // 2. ARAM: Mayhem Augments (KIWI + Wiki)
  const kiwiListEntry = cdAugLists.find((l) => l.modeName === 'KIWI');
  const kiwiApiSet = new Set(
    (kiwiListEntry?.augmentList || []).map((s) => s.replace('Maps/ModeSpecificData/Augments/', ''))
  );
  const cherryByApi = new Map(cdCherryAugs.map((a) => [a.augmentNameId, a]));
  const cherryViById = new Map(cdCherryAugsVi.map((a) => [a.id, a]));
  const cherryAllByNorm = new Map(
    cdCherryAugs
      .filter((a) => a.augmentNameId.startsWith('ARAM_') || kiwiApiSet.has(a.augmentNameId))
      .map((a) => [normalizeName(a.nameTRA), a])
  );

  const wikiHtml = wikiParsed.parse.text['*'];
  const wikiAugs = parseWikiAugments(wikiHtml);
  const luaText = Object.values(wikiModule.query.pages)[0].revisions[0].slots.main['*'];
  const wikiNotesMap = parseLuaNotes(luaText);

  const kiwiCherryAugs = cdCherryAugs.filter((a) => kiwiApiSet.has(a.augmentNameId));
  const kiwiByNorm = new Map(kiwiCherryAugs.map((a) => [normalizeName(a.nameTRA), a]));

  // Extra GoH Pentakill augments mapping (normalizeName strips "Pentakill: " prefix)
  const gohPentakillByName = new Map([
    ['heavy', cdCherryAugs.find((a) => a.augmentNameId === 'GoH_PentakillAug_Q')],
    ['power', cdCherryAugs.find((a) => a.augmentNameId === 'GoH_PentakillAug_W')],
    ['thrash', cdCherryAugs.find((a) => a.augmentNameId === 'GoH_PentakillAug_E')],
    ['doom', cdCherryAugs.find((a) => a.augmentNameId === 'GoH_PentakillAug_R')],
  ]);

  const seenAugIds = new Set();
  const augments = [];

  for (const w of wikiAugs) {
    const norm = normalizeName(w.name);
    let cdMatch = kiwiByNorm.get(norm) || gohPentakillByName.get(norm);
    let modeStatus = 'active';
    if (!cdMatch) {
      cdMatch = cherryAllByNorm.get(norm);
      modeStatus = 'rotated';
    }
    const id = cdMatch ? cdMatch.id : 900000 + augments.length;
    if (seenAugIds.has(id)) continue;
    seenAugIds.add(id);

    const viMatch = cdMatch ? cherryViById.get(cdMatch.id) : null;
    // Riot client data (CommunityDragon rarity) is authoritative for the current patch;
    // the Wiki tier is only a fallback (it lagged behind for Flow of Spirit, BONK!, Terror in 16.22).
    const cdTier =
      cdMatch?.rarity === 'kPrismatic'
        ? 'Prismatic'
        : cdMatch?.rarity === 'kGold'
        ? 'Gold'
        : cdMatch?.rarity === 'kSilver'
        ? 'Silver'
        : null;
    const tier =
      cdTier ||
      (w.tier === 'Silver' || w.tier === 'Gold' || w.tier === 'Prismatic' ? w.tier : 'Silver');

    augments.push({
      id,
      apiName: cdMatch?.augmentNameId || norm,
      name: w.name,
      viName: viMatch?.nameTRA && viMatch.nameTRA !== w.name ? viMatch.nameTRA : undefined,
      tier,
      description: w.description,
      notes: wikiNotesMap.get(norm),
      iconUrl: cdMatch?.augmentSmallIconPath ? cdragonAssetUrl(cdMatch.augmentSmallIconPath) : w.wikiIconUrl,
      fallbackIconUrl: w.wikiIconUrl,
      modeStatus,
    });
  }

  // Ensure any KIWI augment not listed on Wiki isn't silently dropped
  for (const cd of kiwiCherryAugs) {
    if (seenAugIds.has(cd.id)) continue;
    seenAugIds.add(cd.id);
    const viMatch = cherryViById.get(cd.id);
    const tier =
      cd.rarity === 'kPrismatic' ? 'Prismatic' : cd.rarity === 'kGold' ? 'Gold' : 'Silver';
    augments.push({
      id: cd.id,
      apiName: cd.augmentNameId,
      name: cd.nameTRA.trim(),
      viName: viMatch?.nameTRA && viMatch.nameTRA !== cd.nameTRA ? viMatch.nameTRA.trim() : undefined,
      tier,
      description: cd.summaryDescription || 'ARAM: Mayhem Augment (client data).',
      iconUrl: cdragonAssetUrl(cd.augmentSmallIconPath),
      modeStatus: 'active',
    });
  }

  const tierOrder = { Prismatic: 0, Gold: 1, Silver: 2 };
  augments.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || a.name.localeCompare(b.name));

  // 3. ARAM: Mayhem Items (KIWI itemLists)
  const kiwiMode = cdMap12['Maps/Shipping/Map12/Modes/KIWI'];
  const kiwiItemIds = new Set();
  for (const listKey of kiwiMode?.itemLists || []) {
    const listObj = cdMap12[listKey];
    for (const ref of listObj?.mItems || []) {
      const id = Number(ref.replace('Items/', ''));
      if (!Number.isNaN(id)) kiwiItemIds.add(id);
    }
  }
  const cdItemById = new Map(cdItems.map((i) => [i.id, i]));
  const items = [];
  for (const id of kiwiItemIds) {
    const cd = cdItemById.get(id);
    const dd = ddItems.data[String(id)];
    if (!cd && !dd) continue;
    // Skip hidden non-buyable champion tokens except meaningful Mayhem quest rewards
    const isMayhemExclusive = MAYHEM_EXCLUSIVE_ITEM_IDS.has(id);
    const inStore = cd?.inStore ?? true;
    const priceTotal = cd?.priceTotal ?? dd?.gold?.total ?? 0;
    const name = cd?.name || dd?.name || `Item ${id}`;
    if (!inStore && !isMayhemExclusive) continue;
    if (id === 220008 || id === 1111) continue; // Internal quest voucher / token

    const categories = cd?.categories || [];
    const isBoots = categories.includes('Boots');
    const isStarter =
      STARTER_ITEM_IDS.has(id) ||
      [2051, 3112, 3177, 3184].includes(id) ||
      (isBoots && priceTotal <= 300);
    const isCompleted =
      isMayhemExclusive ||
      (isBoots && priceTotal >= 900) ||
      (!isStarter && priceTotal >= 1800 && (!cd?.to || cd.to.length === 0));

    const { statsSummary, plainDescription } = parseItemDescription(cd?.description || dd?.description || '');
    items.push({
      id,
      name,
      plainDescription: plainDescription || dd?.plaintext || '',
      statsSummary,
      priceTotal,
      inStore,
      isStarter,
      isBoots,
      isMayhemExclusive,
      isCompleted,
      categories,
      iconUrl: `${DDRAGON_BASE}/cdn/${patch}/img/item/${id}.png`,
      fallbackIconUrl: cd?.iconPath ? cdragonAssetUrl(cd.iconPath) : `${DDRAGON_BASE}/cdn/${patch}/img/item/${id}.png`,
    });
  }
  items.sort((a, b) => Number(b.isMayhemExclusive) - Number(a.isMayhemExclusive) || b.priceTotal - a.priceTotal || a.name.localeCompare(b.name));

  // 4. ARAM: Mayhem Summoner Spells (KIWI)
  const ddSpellByKey = new Map(Object.values(ddSpells.data).map((s) => [Number(s.key), s]));
  const summonerSpells = cdSpells
    .filter((s) => Array.isArray(s.gameModes) && s.gameModes.includes('KIWI') && s.name)
    .map((s) => {
      const dd = ddSpellByKey.get(s.id);
      return {
        id: s.id,
        name: s.name,
        description: stripTags(s.description || dd?.description || ''),
        cooldown: s.cooldown || (dd?.cooldown?.[0] ?? 0),
        iconUrl: dd ? `${DDRAGON_BASE}/cdn/${patch}/img/spell/${dd.id}.png` : cdragonAssetUrl(s.iconPath),
        fallbackIconUrl: cdragonAssetUrl(s.iconPath),
      };
    })
    .sort((a, b) => {
      const priority = [4, 32, 6, 7, 21, 14, 1, 13];
      return priority.indexOf(a.id) - priority.indexOf(b.id);
    });

  // 5. Stat Shards (Offensive, Flex, Defensive)
  const cdPerkById = new Map(cdPerks.map((p) => [p.id, p]));
  const statSlots = cdPerkStyles.styles[0].slots.filter((s) => s.type === 'kStatMod');
  const slotNameMap = {
    Offense: 'Offensive',
    Flex: 'Flex',
    Defense: 'Defensive',
  };
  const statShards = [];
  for (const slot of statSlots) {
    const slotLabel = slotNameMap[slot.slotLabel] || slot.slotLabel;
    for (const perkId of slot.perks) {
      const p = cdPerkById.get(perkId);
      if (!p) continue;
      statShards.push({
        id: p.id,
        name: p.name,
        shortDesc: stripTags(p.shortDesc || p.longDesc || ''),
        slot: slotLabel,
        iconUrl: cdragonAssetUrl(p.iconPath),
      });
    }
  }

  const manifest = {
    version: patch,
    mode: 'ARAM: Mayhem',
    updatedAt: new Date().toISOString(),
    sources: [
      { name: 'Riot Data Dragon', url: `${DDRAGON_BASE}/cdn/${patch}` },
      { name: 'CommunityDragon (KIWI / Map12)', url: 'https://raw.communitydragon.org/latest/' },
      { name: 'Official League of Legends Wiki (ARAM:_Mayhem/Augments)', url: 'https://wiki.leagueoflegends.com/en-us/ARAM:_Mayhem/Augments' },
      { name: 'Meraki Analytics Champion Positions', url: MERAKI_CHAMPS },
    ],
    counts: {
      champions: champions.length,
      augments: augments.length,
      items: items.length,
      summonerSpells: summonerSpells.length,
      statShards: statShards.length,
    },
  };

  await fs.mkdir(DATA_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(DATA_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2)),
    fs.writeFile(path.join(DATA_DIR, 'champions.json'), JSON.stringify(champions, null, 2)),
    fs.writeFile(path.join(DATA_DIR, 'augments.json'), JSON.stringify(augments, null, 2)),
    fs.writeFile(path.join(DATA_DIR, 'items.json'), JSON.stringify(items, null, 2)),
    fs.writeFile(path.join(DATA_DIR, 'spells.json'), JSON.stringify(summonerSpells, null, 2)),
    fs.writeFile(path.join(DATA_DIR, 'statShards.json'), JSON.stringify(statShards, null, 2)),
  ]);

  console.log('Sync complete!', manifest.counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
