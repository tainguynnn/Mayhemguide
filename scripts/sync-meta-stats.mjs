/**
 * Sync ARAM: Mayhem meta statistics (Pick Rate / Win Rate / Tier) into src/data/meta/.
 *
 * Source: HexMayhem (https://hexmayhem.com) — a stats site dedicated exclusively to
 * ARAM: Mayhem (Riot mode KIWI). It publishes per-patch aggregates for champions and
 * augments (robots.txt: "Allow: /"). Numbers are copied verbatim from the source's
 * server-rendered page payload; nothing is estimated or generated here.
 *
 * Outputs:
 *   src/data/meta/metaStats.json        — champion + augment tier list, synergy (eager)
 *   src/data/meta/championAugments.json — per-champion augment performance (lazy-loaded)
 *
 * Usage: npm run sync-meta
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://hexmayhem.com';
const OUT_DIR = path.resolve(process.cwd(), 'src', 'data', 'meta');
const GAME_DATA_DIR = path.resolve(process.cwd(), 'src', 'data');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 MayhemguideSync/1.0';

/** Minimum champion+augment sample size for the synergy (lift) ranking. */
const SYNERGY_MIN_MATCHES = 1000;
const SYNERGY_TOP_N = 12;
const CONCURRENCY = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, attempt = 1) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt <= 3) {
      await sleep(1500 * attempt);
      return fetchText(url, attempt + 1);
    }
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  if (/cf-chl|challenge-platform|Just a moment\.\.\./i.test(text)) {
    throw new Error(`Anti-bot challenge served for ${url} — stopping (will not bypass).`);
  }
  return text;
}

/** Concatenate Next.js RSC flight chunks embedded in the HTML. */
function extractFlight(html) {
  return [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)]
    .map((m) => JSON.parse(`"${m[1]}"`))
    .join('');
}

/** Extract a balanced JSON array/object starting at `startIdx`. */
function extractBalanced(src, startIdx) {
  const open = src[startIdx];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = startIdx; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return src.slice(startIdx, i + 1);
    }
  }
  throw new Error('Unbalanced JSON in flight payload');
}

function extractJsonAfterKey(flight, key) {
  const idx = flight.indexOf(`"${key}":`);
  if (idx < 0) throw new Error(`Key "${key}" not found in payload`);
  let start = idx + key.length + 3;
  while (flight[start] === ' ') start++;
  return JSON.parse(extractBalanced(flight, start));
}

const round2 = (n) => Math.round(n * 100) / 100;

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const gameChampions = JSON.parse(await fs.readFile(path.join(GAME_DATA_DIR, 'champions.json'), 'utf8'));
  const gameAugments = JSON.parse(await fs.readFile(path.join(GAME_DATA_DIR, 'augments.json'), 'utf8'));
  const champIds = new Set(gameChampions.map((c) => c.id));
  const augById = new Map(gameAugments.map((a) => [a.id, a]));

  console.log('→ Fetching champion tier list…');
  const champFlight = extractFlight(await fetchText(`${BASE}/champions`));
  const champRows = extractJsonAfterKey(champFlight, 'initialRows');
  const meta = extractJsonAfterKey(champFlight, 'initialMeta');
  console.log(`  ${champRows.length} champions · patch ${meta.patch} · data date ${meta.dataDate} · ${meta.allMatches} matches`);

  console.log('→ Fetching augment tier list…');
  const augFlight = extractFlight(await fetchText(`${BASE}/augments`));
  const augRows = extractJsonAfterKey(augFlight, 'initialRows');
  const augMeta = extractJsonAfterKey(augFlight, 'initialMeta');
  if (augMeta.patch !== meta.patch || augMeta.dataDate !== meta.dataDate) {
    throw new Error(`Patch mismatch between pages: ${meta.patch}/${meta.dataDate} vs ${augMeta.patch}/${augMeta.dataDate}`);
  }
  console.log(`  ${augRows.length} augments`);

  // ---- Validate identifiers against our verified game data ----
  const RARITY = { silver: 'Silver', gold: 'Gold', prismatic: 'Prismatic' };
  const unknownChamps = champRows.filter((r) => !champIds.has(r.id)).map((r) => `${r.id}:${r.title}`);
  const unknownAugs = augRows.filter((r) => !augById.has(r.id)).map((r) => `${r.id}:${r.name}`);
  const rarityMismatch = augRows
    .filter((r) => augById.has(r.id) && augById.get(r.id).tier !== RARITY[r.rarity])
    .map((r) => `${r.id}:${r.name} (${r.rarity} vs ${augById.get(r.id).tier})`);
  if (unknownChamps.length) console.warn('  ! Champions not in champions.json:', unknownChamps.join(', '));
  if (unknownAugs.length) console.warn('  ! Augments not in augments.json:', unknownAugs.join(', '));
  if (rarityMismatch.length) console.warn('  ! Rarity mismatches:', rarityMismatch.join(', '));

  const champions = champRows
    .filter((r) => champIds.has(r.id))
    .map((r) => ({
      championId: r.id,
      tier: r.tier,
      rank: r.rank,
      winRate: r.wr,
      pickRate: r.pr,
      matches: r.n,
      optimalWinRate: r.potential?.estimate ?? null,
    }));

  const augments = augRows
    .filter((r) => augById.has(r.id))
    .map((r) => ({
      augmentId: r.id,
      rarity: RARITY[r.rarity],
      tier: r.tier,
      rank: r.rank,
      winRate: r.wr,
      pickRate: r.pr,
      matches: r.n,
      stages: Object.fromEntries(
        Object.entries(r.stages || {}).map(([k, s]) => [k, { winRate: s.wr, pickRate: s.pr, matches: s.n, tier: s.tier }])
      ),
    }));

  // ---- Per-champion augment performance ----
  console.log(`→ Fetching ${champRows.length} champion pages (concurrency ${CONCURRENCY})…`);
  const championAugments = {};
  const failures = [];
  const queue = champRows.filter((r) => champIds.has(r.id));
  let done = 0;
  async function worker() {
    while (queue.length) {
      const row = queue.shift();
      const slug = String(row.alias).toLowerCase();
      try {
        const flight = extractFlight(await fetchText(`${BASE}/champions/${slug}`));
        const idx = flight.indexOf(`"champId":${row.id},"all":`);
        if (idx < 0) throw new Error('augment block not found');
        const obj = JSON.parse(extractBalanced(flight, flight.lastIndexOf('{', idx)));
        championAugments[row.id] = obj.all
          .filter((a) => augById.has(a.id))
          .map((a) => [a.id, a.wr, a.pr, a.n, a.lift]);
      } catch (e) {
        failures.push(`${row.title} (${slug}): ${e.message}`);
      }
      done++;
      if (done % 25 === 0) console.log(`  ${done}/${champRows.length}`);
      await sleep(150);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (failures.length) console.warn('  ! Champion page failures:', failures.join(' | '));

  // ---- Augment → champion synergy (derived by inverting per-champion stats) ----
  const synergy = {};
  for (const [champId, rows] of Object.entries(championAugments)) {
    for (const [augId, wr, pr, n, lift] of rows) {
      if (n < SYNERGY_MIN_MATCHES) continue;
      (synergy[augId] ||= []).push([Number(champId), wr, round2(lift), pr, n]);
    }
  }
  for (const key of Object.keys(synergy)) {
    synergy[key] = synergy[key].sort((a, b) => b[2] - a[2]).slice(0, SYNERGY_TOP_N);
  }

  const metaStats = {
    schemaVersion: 1,
    dataKind: 'real',
    mode: 'ARAM: Mayhem (KIWI)',
    patch: meta.patch,
    dataDate: meta.dataDate,
    fetchedAt: new Date().toISOString(),
    totalMatches: meta.allMatches,
    minSampleSize: 200,
    source: {
      name: 'HexMayhem',
      url: BASE,
      note:
        'Thống kê tổng hợp riêng cho ARAM: Mayhem, mọi rank. Tier & thứ hạng tướng theo "optimal win rate" của nguồn; mẫu dưới 200 trận bị loại.',
    },
    synergyMethod: {
      minMatches: SYNERGY_MIN_MATCHES,
      topN: SYNERGY_TOP_N,
      description:
        'Lift = Win Rate của tướng khi có Augment − Win Rate cơ bản của tướng. Chỉ tính cặp tướng/Augment có ≥ 1.000 trận.',
    },
    champions,
    augments,
    augmentSynergy: synergy,
  };

  await fs.writeFile(path.join(OUT_DIR, 'metaStats.json'), JSON.stringify(metaStats));
  await fs.writeFile(
    path.join(OUT_DIR, 'championAugments.json'),
    JSON.stringify({ patch: meta.patch, dataDate: meta.dataDate, columns: ['augmentId', 'winRate', 'pickRate', 'matches', 'lift'], champions: championAugments })
  );

  console.log('✓ Wrote metaStats.json:', champions.length, 'champions,', augments.length, 'augments,', Object.keys(synergy).length, 'synergy lists');
  console.log('✓ Wrote championAugments.json:', Object.keys(championAugments).length, 'champions');
}

main().catch((e) => {
  console.error('✗ Sync failed:', e.message);
  process.exit(1);
});

