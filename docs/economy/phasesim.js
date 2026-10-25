// Pacing prototype for the T-016 phase design (docs/economy/phases.md). Plain JS numbers, no game code.
// Stage 6 of T-016 replaces it with a Jest balance test on the real engine.
// Usage: node docs/economy/phasesim.js [tapsPerSec] [--gaps]
//   --gaps prints every pause over 60 s with the state at its end.
// As a module: require('./phasesim').simulate(taps) returns { byRank, rankMinutes, ... } without printing.
let TAPS = 4;
let VERBOSE = false;
const TAP_PASSIVE_SHARE = 0.05; // each tap also gives 5% of that resource's passive /s
const MILESTONES = [25, 50, 100, 200];

// produces: K = cognitive, W = capital, I = influence. cost currency in `cur`.
const SKILLS = [
  // Knowledge branch (cost Cognitive, gives Cognitive/s)
  { id: 'k1', res: 'K', cur: 'K', base: 10, r: 1.15, per: 0.5, rank: 0 },
  { id: 'k2', res: 'K', cur: 'K', base: 75, r: 1.15, per: 2.5, rank: 0, req: ['k1', 3] },
  { id: 'k3', res: 'K', cur: 'K', base: 600, r: 1.16, per: 9, rank: 1, req: ['k2', 3] },
  { id: 'k4', res: 'K', cur: 'K', base: 2.5e3, r: 1.16, per: 35, rank: 2, req: ['k3', 3] },
  { id: 'k5', res: 'K', cur: 'K', base: 4.5e4, r: 1.17, per: 280, rank: 3, req: ['k4', 5] },
  { id: 'k6', res: 'K', cur: 'K', base: 5e5, r: 1.17, per: 1800, rank: 4, req: ['k5', 5] },
  { id: 'k7', res: 'K', cur: 'K', base: 6e6, r: 1.18, per: 1.2e4, rank: 5, req: ['k6', 5] },
  { id: 'k8', res: 'K', cur: 'K', base: 8e7, r: 1.18, per: 8e4, rank: 6, req: ['k7', 5] },
  { id: 'k9', res: 'K', cur: 'K', base: 1.2e9, r: 1.19, per: 6e5, rank: 7, req: ['k8', 5] },
  { id: 'k10', res: 'K', cur: 'K', base: 2e10, r: 1.2, per: 5e6, rank: 8, req: ['k9', 5] },
  // Work branch (cost Capital, gives Capital/s, gated by knowledge levels)
  { id: 'w1', res: 'W', cur: 'W', base: 15, r: 1.15, per: 0.6, rank: 3, req: ['k3', 5] },
  { id: 'w2', res: 'W', cur: 'W', base: 120, r: 1.15, per: 4, rank: 3, req: ['k4', 3] },
  { id: 'w3', res: 'W', cur: 'W', base: 1.3e3, r: 1.16, per: 25, rank: 4, req: ['k4', 10] },
  { id: 'w4', res: 'W', cur: 'W', base: 1.4e4, r: 1.16, per: 160, rank: 4, req: ['k5', 5] },
  { id: 'w5', res: 'W', cur: 'W', base: 1.6e5, r: 1.17, per: 1100, rank: 5, req: ['k6', 5] },
  { id: 'w6', res: 'W', cur: 'W', base: 2e6, r: 1.17, per: 8e3, rank: 6, req: ['k7', 5] },
  { id: 'w7', res: 'W', cur: 'W', base: 3e7, r: 1.18, per: 7e4, rank: 7, req: ['k8', 5] },
  { id: 'w8', res: 'W', cur: 'W', base: 5e8, r: 1.18, per: 6e5, rank: 8, req: ['k9', 5] },
  { id: 'w9', res: 'W', cur: 'W', base: 1e10, r: 1.19, per: 6e6, rank: 9, req: ['k10', 5] },
  { id: 'w10', res: 'W', cur: 'W', base: 2.5e11, r: 1.2, per: 7e7, rank: 9, req: ['w9', 10] },
  // Influence branch (cost Capital, gives Influence/s)
  { id: 'i1', res: 'I', cur: 'W', base: 3e4, r: 1.16, per: 0.4, rank: 5 },
  { id: 'i2', res: 'I', cur: 'W', base: 4e5, r: 1.17, per: 3, rank: 5, req: ['i1', 5] },
  { id: 'i3', res: 'I', cur: 'W', base: 6e6, r: 1.17, per: 22, rank: 6, req: ['i2', 5] },
  { id: 'i4', res: 'I', cur: 'W', base: 1e8, r: 1.18, per: 170, rank: 7, req: ['i3', 5] },
  { id: 'i5', res: 'I', cur: 'W', base: 2e9, r: 1.19, per: 1400, rank: 8, req: ['i4', 5] },
  { id: 'i6', res: 'I', cur: 'W', base: 5e10, r: 1.2, per: 1.2e4, rank: 9, req: ['i5', 5] },
  // Stage 4 fillers for ranks 5–7 (Middle → Tech Lead), phases.md §5.5. Each sits between two existing
  // rungs of its branch (base cost at 1/3 and 2/3 of the gap in log space; Knowledge and Influence also
  // pay back 40% faster than the interpolated rung) so there is always an affordable next step.
  // Comments give the registry ids.
  { id: 'k6a', res: 'K', cur: 'K', base: 1.1e6, r: 1.17, per: 5.6e3, rank: 5, req: ['k6', 3] }, // typescrypt
  { id: 'k6b', res: 'K', cur: 'K', base: 2.6e6, r: 1.17, per: 1.1e4, rank: 5, req: ['k6', 3] }, // sql-indexes
  { id: 'k7a', res: 'K', cur: 'K', base: 1.4e7, r: 1.18, per: 3.7e4, rank: 6, req: ['k7', 3] }, // design-patterns
  { id: 'k7b', res: 'K', cur: 'K', base: 3.4e7, r: 1.18, per: 7.1e4, rank: 6, req: ['k7', 3] }, // message-queues
  { id: 'k8a', res: 'K', cur: 'K', base: 2e8, r: 1.18, per: 2.6e5, rank: 7, req: ['k8', 3] }, // kubernoodles
  { id: 'k8b', res: 'K', cur: 'K', base: 4.9e8, r: 1.18, per: 5.1e5, rank: 7, req: ['k8', 3] }, // rust-rewrite
  { id: 'w4a', res: 'W', cur: 'W', base: 3.1e4, r: 1.16, per: 300, rank: 5, req: ['w4', 3] }, // support-chatbot
  { id: 'w4b', res: 'W', cur: 'W', base: 7.2e4, r: 1.16, per: 580, rank: 5, req: ['w4', 3] }, // legacy-php
  { id: 'w5a', res: 'W', cur: 'W', base: 3.7e5, r: 1.17, per: 2.1e3, rank: 6, req: ['w5', 3] }, // payment-gateway
  { id: 'w5b', res: 'W', cur: 'W', base: 8.7e5, r: 1.17, per: 4.2e3, rank: 6, req: ['w5', 3] }, // fluttr-app
  { id: 'w6a', res: 'W', cur: 'W', base: 4.9e6, r: 1.17, per: 1.6e4, rank: 7, req: ['w6', 3] }, // data-lake
  { id: 'w6b', res: 'W', cur: 'W', base: 1.2e7, r: 1.17, per: 3.4e4, rank: 7, req: ['w6', 3] }, // marketplace
  { id: 'i1a', res: 'I', cur: 'W', base: 1.1e5, r: 1.16, per: 1.8, rank: 5, req: ['i1', 3] }, // stack-overflaw
  { id: 'i2a', res: 'I', cur: 'W', base: 1.5e6, r: 1.17, per: 14, rank: 6, req: ['i2', 3] }, // tube-tutorials
  { id: 'i3a', res: 'I', cur: 'W', base: 2.4e7, r: 1.17, per: 100, rank: 7, req: ['i3', 3] }, // tech-book
];

// Perks: one effect each.
const PERKS = [
  { id: 'coffee', cur: 'K', base: 40, r: 1.6, rank: 0, effect: 'tap', value: 0.5, max: 15 }, // +50% tap power per level, all modes
  { id: 'sleep', cur: 'K', base: 300, r: 1.8, rank: 1, effect: 'stress', value: 4, max: 10 }, // -4% stress per tap per level
  { id: 'keyboard', cur: 'W', base: 200, r: 1.7, rank: 3, effect: 'tapW', value: 1, max: 10 }, // +100% Work tap per level
];

// Tech upgrades: four tiers per Knowledge/Work skill, paid in Cognitive and priced from the
// knowledge skill behind it (its own base, or the knowledge skill it requires; k10 for w10).
let TECH = [];
function buildTech() {
TECH = [];
for (const s of SKILLS.filter((x) => x.res !== 'I')) {
  // A work skill gated by another work skill prices from that skill's knowledge (w10 → w9 → k10).
  let basis = s;
  while (basis.res !== 'K') basis = SKILLS.find((k) => k.id === basis.req[0]);
  const kEquivalent = basis.base;
  TECH.push({ id: `${s.id}-t1`, skill: s.id, lvl: 10, mult: 2, cost: kEquivalent * 25 });
  TECH.push({ id: `${s.id}-t2`, skill: s.id, lvl: 25, mult: 1.5, cost: kEquivalent * 120 });
  TECH.push({ id: `${s.id}-t3`, skill: s.id, lvl: 40, mult: 2, cost: kEquivalent * 400 });
  TECH.push({ id: `${s.id}-t4`, skill: s.id, lvl: 60, mult: 1.5, cost: kEquivalent * 2500 });
}
// Influence skills get their own upgrades, paid in Influence (second sink).
for (const s of SKILLS.filter((x) => x.res === 'I')) {
  TECH.push({ id: `${s.id}-t1`, skill: s.id, lvl: 10, mult: 2, cost: s.per * 400, cur: 'I' });
  TECH.push({ id: `${s.id}-t2`, skill: s.id, lvl: 25, mult: 2, cost: s.per * 3000, cur: 'I' });
}
}

// Leadership perks: one-off, paid in Influence.
const LEAD = [
  { id: 'delegate', cost: 150, branch: 'W', mult: 2, rank: 6 },
  { id: 'mentor', cost: 600, branch: 'K', mult: 2, rank: 6 },
  { id: 'hire', cost: 1.2e4, branch: 'W', mult: 3, rank: 7 },
  { id: 'budget', cost: 5e4, branch: 'K', mult: 3, rank: 7 },
  { id: 'okr', cost: 6e5, branch: 'W', mult: 4, rank: 8 },
  { id: 'board', cost: 1e7, branch: 'W', mult: 5, rank: 9 },
];

// Ranks. earnedK / earnedW are lifetime totals; spendI is consumed on promotion.
const RANKS = [
  { name: 'Першокурсник' },
  { name: 'Студент-самоучка', earnedK: 250, lvl: ['k1', 5] },
  { name: 'Кандидат на стажування', earnedK: 1.5e3, lvl: ['k3', 3] },
  { name: 'Trainee (перша зарплата)', earnedK: 6e3, lvl: ['k4', 1] },
  { name: 'Junior', earnedW: 6e4, lvl: ['w2', 10] },
  { name: 'Middle (відкривається Influence)', earnedW: 3e5, lvl: ['k5', 5] },
  { name: 'Senior', earnedW: 2e7, spendI: 1.5e4 },
  { name: 'Tech Lead', earnedW: 1.5e8, spendI: 5e4 },
  { name: 'Principal Architect', earnedW: 8e9, spendI: 1e6 },
  { name: 'Unicorn CTO', earnedW: 4e11, spendI: 2e7 },
  { name: 'Gooble CEO', earnedW: 1.5e13, spendI: 2e8 },
];

function simulate(taps = 4, verbose = false) {
TAPS = taps;
VERBOSE = verbose;
buildTech();
const st = { K: 0, W: 0, I: 0, eK: 0, eW: 0, lv: {}, perk: {}, tech: new Set(), lead: new Set(), rank: 0, t: 0 };
const modesOpen = () => ['K', ...(st.rank >= 3 ? ['W'] : []), ...(st.rank >= 5 ? ['I'] : [])];
const lvl = (id) => st.lv[id] ?? 0;
const cost = (s, l = lvl(s.id)) => s.base * s.r ** l;
const unlocked = (s) => st.rank >= s.rank && (!s.req || lvl(s.req[0]) >= s.req[1]);

function skillMult(s) {
  let m = 2 ** MILESTONES.filter((x) => lvl(s.id) >= x).length;
  for (const u of TECH) if (u.skill === s.id && st.tech.has(u.id)) m *= u.mult;
  for (const l of LEAD) if (l.branch === s.res && st.lead.has(l.id)) m *= l.mult;
  return m;
}
function rates() {
  const r = { K: 0, W: 0, I: 0 };
  for (const s of SKILLS) r[s.res] += lvl(s.id) * s.per * skillMult(s);
  return r;
}
function tapValue(mode, r) {
  const base = { K: 1, W: 2, I: 0.2 }[mode];
  let m = 1 + (st.perk.coffee ?? 0) * 0.5;
  if (mode === 'W') m *= 1 + (st.perk.keyboard ?? 0);
  return base * m + r[mode] * TAP_PASSIVE_SHARE;
}

function gateMet(rk) {
  if (rk.earnedK && st.eK < rk.earnedK) return false;
  if (rk.earnedW && st.eW < rk.earnedW) return false;
  if (rk.lvl && lvl(rk.lvl[0]) < rk.lvl[1]) return false;
  if (rk.spendI && st.I < rk.spendI) return false;
  return true;
}

// Where should taps go? The resource the next gate is waiting on, else the most valuable one.
function chooseMode(r) {
  const next = RANKS[st.rank + 1];
  const open = modesOpen();
  if (next) {
    if (next.spendI && st.I < next.spendI && open.includes('I') && st.eW >= (next.earnedW ?? 0) * 0.3) return 'I';
    if (next.earnedW && st.eW < next.earnedW && open.includes('W')) return 'W';
    if (next.earnedK && st.eK < next.earnedK) return 'K';
  }
  return open.includes('W') ? 'W' : 'K';
}

function buyBest() {
  let bought = true;
  while (bought) {
    bought = false;
    const r = rates();
    // Reserve influence for the next promotion.
    const next = RANKS[st.rank + 1];
    const reserveI = next?.spendI ?? 0;
    for (const l of LEAD) {
      if (!st.lead.has(l.id) && st.rank >= l.rank && st.I - reserveI >= l.cost) { st.I -= l.cost; st.lead.add(l.id); bought = true; }
    }
    for (const u of TECH) {
      const cur = u.cur ?? 'K';
      const free = cur === 'I' ? st.I - reserveI : st[cur];
      if (!st.tech.has(u.id) && lvl(u.skill) >= u.lvl && free >= u.cost) { st[cur] -= u.cost; st.tech.add(u.id); bought = true; }
    }
    for (const p of PERKS) {
      const l = st.perk[p.id] ?? 0;
      const c = p.base * p.r ** l;
      if (st.rank >= p.rank && l < p.max && st[p.cur] >= c && c < (r[p.cur] + 1) * 120) { st[p.cur] -= c; st.perk[p.id] = l + 1; bought = true; }
    }
    // Best payback per currency.
    for (const cur of ['K', 'W']) {
      let best = null;
      for (const s of SKILLS) {
        if (s.cur !== cur || !unlocked(s)) continue;
        const c = cost(s);
        const gain = s.per * skillMult(s) * (s.res === 'I' ? 3e3 : 1); // value influence highly so it gets bought
        const score = c / gain;
        if (!best || score < best.score) best = { s, c, score };
      }
      if (best && st[cur] >= best.c) { st[cur] -= best.c; st.lv[best.s.id] = lvl(best.s.id) + 1; bought = true; }
    }
  }
}

const log = [];
const rankMinutes = [];
let firstBuy = null; let lastEvent = 0; const gaps = [];
const DT = 1;
while (st.rank < RANKS.length - 1 && st.t < 6 * 3600) {
  const r = rates();
  const mode = chooseMode(r);
  const gain = { K: r.K * DT, W: r.W * DT, I: r.I * DT };
  gain[mode] += tapValue(mode, r) * TAPS * DT;
  st.K += gain.K; st.W += gain.W; st.I += gain.I; st.eK += gain.K; st.eW += gain.W;
  const before = Object.values(st.lv).reduce((a, b) => a + b, 0) + st.tech.size + st.lead.size + Object.values(st.perk).reduce((a, b) => a + b, 0);
  buyBest();
  const after = Object.values(st.lv).reduce((a, b) => a + b, 0) + st.tech.size + st.lead.size + Object.values(st.perk).reduce((a, b) => a + b, 0);
  if (firstBuy === null && after > before) firstBuy = st.t + DT;
  if (after > before) {
    if (VERBOSE && st.t - lastEvent > 60) {
      const rr = rates();
      console.log(`gap ${st.t - lastEvent}s rank ${st.rank} at ${(st.t / 60).toFixed(1)} min | K=${st.K.toExponential(1)} W=${st.W.toExponential(1)} I=${st.I.toExponential(1)} | /s K=${rr.K.toExponential(1)} W=${rr.W.toExponential(1)} I=${rr.I.toExponential(1)} | ${JSON.stringify(st.lv)}`);
    }
    gaps.push([st.t - lastEvent, st.rank]); lastEvent = st.t;
  }
  const next = RANKS[st.rank + 1];
  if (gateMet(next)) {
    if (next.spendI) st.I -= next.spendI; gaps.push([st.t - lastEvent, st.rank]); lastEvent = st.t;
    st.rank += 1;
    rankMinutes[st.rank] = st.t / 60;
    const rr = rates();
    log.push(`${(st.t / 60).toFixed(1).padStart(6)} хв  ${next.name.padEnd(34)} K/s=${rr.K.toExponential(1)} $/s=${rr.W.toExponential(1)} I/s=${rr.I.toExponential(1)}`);
  }
  st.t += DT;
}
const byRank = {};
for (const [g, r] of gaps) byRank[r] = Math.max(byRank[r] ?? 0, g);
return { taps, firstBuy, log, rankMinutes, byRank, st, stuck: st.rank < RANKS.length - 1 };
}

module.exports = { SKILLS, simulate };

if (require.main === module) {
  const res = simulate(Number(process.argv[2] ?? 4), process.argv.includes('--gaps'));
  const { st } = res;
  console.log(`taps/s=${res.taps}  first purchase at ${res.firstBuy}s`);
  console.log(res.log.join('\n'));
  console.log('max gap without any purchase, by rank (s):', JSON.stringify(res.byRank));
  console.log('skills:', SKILLS.length, '| leadership perks:', [...st.lead].join(','), '| tech upgrades:', st.tech.size, '| perks:', JSON.stringify(st.perk));
  if (res.stuck) console.log(`STUCK at rank ${st.rank} after ${(st.t / 60).toFixed(0)} min`, { K: st.K, W: st.W, I: st.I, eW: st.eW });
}
