/* =========================================================================
   Workforce Intelligence — data engine
   Deterministic sample-data generator, CSV + Microsoft Project (MSPDI) XML
   parsers, and the roll-up math the module reads against.

   No brand names from any prior product appear here. Everything is generic
   engineering-resource vocabulary: people, disciplines, projects, allocations,
   baselines (imported plans), requests, actuals.
   ========================================================================= */

/* ---------- month horizon ---------------------------------------------- */
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STD_BY_MONTH = [176, 160, 176, 176, 168, 176, 184, 176, 168, 184, 160, 168];

/* A fixed anchor keeps sample data reproducible regardless of the wall clock.
   Six settled months (with actuals) + six planning months (forecast only). */
const ANCHOR = { y: 2026, m: 7 }; // current period = Jul 2026

export function buildMonths() {
  const out = [];
  // start six months before the anchor
  let y = ANCHOR.y, m = ANCHOR.m - 5;
  while (m <= 0) { m += 12; y -= 1; }
  for (let i = 0; i < 12; i++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const planning = y > ANCHOR.y || (y === ANCHOR.y && m > ANCHOR.m);
    out.push({ key, label: `${MONTH_ABBR[m - 1]} ${String(y).slice(2)}`, std: STD_BY_MONTH[m - 1], planning });
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
}
export const MONTHS = buildMonths();
export const CURRENT = `${ANCHOR.y}-${String(ANCHOR.m).padStart(2, "0")}`;
export const DATA_MONTHS = MONTHS.filter((x) => !x.planning).map((x) => x.key);
export const monthStd = (k) => (MONTHS.find((m) => m.key === k) || { std: 173 }).std;
export const monthLabel = (k) => (MONTHS.find((m) => m.key === k) || { label: k }).label;
export const mIdx = (k) => MONTHS.findIndex((m) => m.key === k);
export const isPlanning = (k) => { const m = MONTHS.find((x) => x.key === k); return m ? m.planning : false; };

/* ---------- reference lists -------------------------------------------- */
export const DISCIPLINES = [
  { id: "SW", name: "Software", rate: 165 },
  { id: "FW", name: "Firmware", rate: 170 },
  { id: "EE", name: "Electrical", rate: 175 },
  { id: "ME", name: "Mechanical", rate: 160 },
  { id: "SE", name: "Systems", rate: 185 },
  { id: "TE", name: "Test", rate: 145 },
  { id: "PM", name: "Project Mgmt", rate: 150 },
];
export const discName = (id) => (DISCIPLINES.find((d) => d.id === id) || { name: id }).name;
export const discRate = (id) => (DISCIPLINES.find((d) => d.id === id) || { rate: 160 }).rate;

export const LOCATIONS = [
  { code: "AUS", name: "Austin, TX" },
  { code: "BOS", name: "Boston, MA" },
  { code: "DEN", name: "Denver, CO" },
  { code: "RAL", name: "Raleigh, NC" },
  { code: "REM", name: "Remote" },
];
export const locName = (c) => (LOCATIONS.find((l) => l.code === c) || { name: c }).name;

/* ---------- allocation helpers ----------------------------------------- */
export const pctIn = (o, k) => (o && o.pcts ? o.pcts[k] : o && o.ask ? o.ask[k] : 0) || 0;
export const activeIn = (a, k) => pctIn(a, k) > 0;
export const liveMonths = (o) => MONTHS.filter((m) => pctIn(o, m.key) > 0);
export const rangeLabel = (o) => {
  const ms = liveMonths(o);
  if (!ms.length) return "—";
  return ms.length === 1 ? ms[0].label : `${ms[0].label} – ${ms[ms.length - 1].label}`;
};
export const fteMonths = (o) => liveMonths(o).reduce((t, m) => t + pctIn(o, m.key) / 100, 0);
export const flatPcts = (from, to, pct) => {
  const out = {};
  MONTHS.forEach((m) => { if (mIdx(m.key) >= mIdx(from) && mIdx(m.key) <= mIdx(to)) out[m.key] = pct; });
  return out;
};
export const POLICY_MAX_DEFAULT = 110; // over-allocation ceiling, %

/* =========================================================================
   Deterministic sample generator
   ========================================================================= */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Adam", "Priya", "Marcus", "Elena", "Devon", "Naomi", "Grant", "Ines", "Tobias", "Ruth", "Omar", "Cleo", "Victor", "Hana", "Silas", "Marta", "Ezra", "Lena", "Bo", "Yara", "Nils", "Rosa", "Kai", "Freya", "Dorian", "Ivy", "Cyrus", "Nadia", "Elias", "Sofia", "Rex", "Thea", "Joel", "Mira", "Aden", "Wren", "Casper", "Lila", "Owen", "Zaida"];
const LAST = ["Vance", "Okonkwo", "Brandt", "Salgado", "Ferris", "Nakashima", "Delacroix", "Hartley", "Iversen", "Moreau", "Castile", "Dunbar", "Rhee", "Vollmer", "Aguilar", "Strand", "Bassett", "Petrova", "Halloran", "Mbeki", "Quintero", "Farr", "Lindgren", "Abernathy", "Duval", "Reyes", "Whitlock", "Bloom", "Tanaka", "Orozco", "Keene", "Vasquez", "Ashford", "Muir", "Calloway", "Berger"];
const PROJECT_NAMES = ["Halyard", "Cinder Ridge", "Blue Meridian", "Talon Works", "Northwind", "Kestrel II", "Ironbark", "Silverline", "Redstone", "Cobalt Harbor", "Vantage", "Perihelion", "Fairlead", "Stonecrop", "Longview", "Windrose"];
const PHASES = ["Design", "Integration", "Qualification", "Production", "Sustainment"];
const PM_NAMES = ["R. Okafor", "L. Castellanos", "D. Ahn", "M. Whitfield", "S. Bhatt", "J. Reinholt", "A. Duquesne", "T. Nakamura"];
const LEAD_NAMES = ["H. Varga", "C. Mbatha", "N. Petit", "E. Sandoval", "W. Kirchner", "J. Sorensen", "F. Oyelaran", "D. Marchetti"];
const NOTES = ["Backfill for rotation off project.", "Ramp for qualification test campaign.", "New scope added at last review.", "Coverage for integration lab shifts.", "Rework from design-review actions."];

/* headcount per discipline in the sample org */
const SAMPLE_HEADS = { SW: 34, FW: 14, EE: 16, ME: 15, SE: 12, TE: 11, PM: 8 };

export function generateSampleData() {
  const rnd = mulberry32(20260714);
  const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const rflt = (a, b) => a + rnd() * (b - a);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  /* projects */
  const used = new Set();
  const projects = PROJECT_NAMES.map((name, i) => {
    let code; do { code = "PRJ-" + rint(1000, 9999); } while (used.has(code)); used.add(code);
    return {
      id: "P" + i, code, name,
      manager: PM_NAMES[i % PM_NAMES.length],
      lead: LEAD_NAMES[i % LEAD_NAMES.length],
      phase: PHASES[i % PHASES.length],
      customer: pick(["Government", "Commercial", "Internal R&D"]),
    };
  });

  /* people */
  const people = [];
  const seen = new Set();
  DISCIPLINES.forEach((d) => {
    const n = SAMPLE_HEADS[d.id] || 10;
    for (let i = 0; i < n; i++) {
      let name; do { name = `${pick(FIRST)} ${pick(LAST)}`; } while (seen.has(name));
      seen.add(name);
      const r = rnd();
      people.push({
        id: `${d.id}-${String(i).padStart(3, "0")}`,
        name, disc: d.id,
        seniority: r < 0.4 ? 1 : r < 0.75 ? 2 : 3,
        loc: pick(LOCATIONS).code,
      });
    }
  });

  /* allocations: person -> project, % loading per month (lumpy) */
  const allocations = [];
  const STEPS = [10, 20, 25, 30, 40, 50, 60, 75, 100];
  const dataLast = DATA_MONTHS.length - 1;
  people.forEach((e) => {
    if (rnd() < 0.05) return; // some slack / overhead
    let remaining = rnd() < 0.45 ? 100 : rint(40, 90);
    const n = rnd() < 0.45 ? 1 : rnd() < 0.85 ? 2 : 3;
    const chosen = new Set();
    for (let i = 0; i < n && remaining >= 10; i++) {
      let p; do { p = pick(projects); } while (chosen.has(p.id));
      chosen.add(p.id);
      const opts = STEPS.filter((s) => s <= remaining);
      const pct = i === n - 1 && remaining <= 60 ? remaining : opts[Math.floor(rnd() * opts.length)] || 10;
      remaining -= pct;
      const fi = rnd() < 0.8 ? 0 : rint(1, 2);
      const ti = rnd() < 0.85 ? dataLast : rint(Math.max(fi, 3), dataLast);
      const pcts = {};
      const shape = rnd();
      for (let j = fi; j <= ti; j++) {
        let v = pct;
        if (shape < 0.18) v = Math.max(5, Math.round((pct * (0.5 + 0.5 * ((j - fi + 1) / (ti - fi + 1)))) / 5) * 5);
        else if (shape < 0.3) v = Math.max(5, Math.round((pct * (1 - 0.4 * ((j - fi) / Math.max(1, ti - fi)))) / 5) * 5);
        pcts[DATA_MONTHS[j]] = v;
      }
      allocations.push({ id: `A${allocations.length}`, personId: e.id, projectId: p.id, pcts, source: "baseline" });
    }
  });

  const personById = Object.fromEntries(people.map((e) => [e.id, e]));

  /* running load ledger */
  const load = {};
  allocations.forEach((a) => Object.entries(a.pcts).forEach(([k, v]) => { load[`${a.personId}|${k}`] = (load[`${a.personId}|${k}`] || 0) + v; }));
  const free = (id, k) => POLICY_MAX_DEFAULT - (load[`${id}|${k}`] || 0);

  /* budget: project x discipline x month, from allocations with noise */
  const budget = {};
  allocations.forEach((a) => {
    const d = personById[a.personId].disc;
    MONTHS.forEach((m) => {
      if (!activeIn(a, m.key)) return;
      const k = `${a.projectId}|${d}|${m.key}`;
      budget[k] = (budget[k] || 0) + (pctIn(a, m.key) / 100) * m.std;
    });
  });
  Object.keys(budget).forEach((k) => { budget[k] = Math.round(budget[k] * rflt(0.9, 1.18)); });

  /* baselines (as if imported from a plan): planned hours per project x month */
  const baselines = {};
  projects.forEach((p) => {
    const planned = {};
    MONTHS.forEach((m) => {
      let h = 0;
      Object.entries(budget).forEach(([k, v]) => { if (k.startsWith(p.id + "|") && k.endsWith(m.key)) h += v; });
      if (h > 0) planned[m.key] = Math.round(h * rflt(0.92, 1.1));
    });
    if (Object.keys(planned).length) baselines[p.id] = { source: "Sample plan", planned };
  });

  /* actuals from a timekeeping feed */
  const actuals = {};
  allocations.forEach((a) => {
    MONTHS.forEach((m) => {
      if (!activeIn(a, m.key) || m.planning) return;
      const committed = (pctIn(a, m.key) / 100) * m.std;
      let f = rflt(0.72, 1.14);
      if (rnd() < 0.06) f = rflt(0.25, 0.6);
      if (rnd() < 0.05) f = rflt(1.15, 1.35);
      let h = committed * f;
      if (m.key === CURRENT) h *= 0.5; // month in progress
      const k = `${a.personId}|${a.projectId}|${m.key}`;
      actuals[k] = Math.round(((actuals[k] || 0) + h) * 10) / 10;
    });
  });

  /* resource requests: an ask in % per month against a project+discipline */
  const requests = [];
  for (let i = 0; i < 12; i++) {
    const p = pick(projects);
    const d = pick(DISCIPLINES);
    const startI = rint(2, Math.min(5, MONTHS.length - 2));
    const len = Math.min(rnd() < 0.25 ? 1 : rint(2, 3), MONTHS.length - startI);
    const ask = {};
    let base = pick([25, 50, 75, 100]);
    for (let j = 0; j < len; j++) {
      const v = j === 0 ? base : Math.max(10, Math.min(100, base + pick([-25, 0, 25])));
      ask[MONTHS[startI + j].key] = v; base = v;
    }
    const roll = rnd();
    const fillState = roll < 0.4 ? "full" : roll < 0.62 ? "partial" : "none";

    if (fillState !== "none") {
      const target = {};
      Object.entries(ask).forEach(([k, v]) => { target[k] = fillState === "full" ? v : Math.max(5, Math.round((v * rflt(0.4, 0.75)) / 5) * 5); });
      const pool = people.filter((e) => e.disc === d.id);
      const usedP = [];
      const nEng = rnd() < 0.55 ? 1 : 2;
      for (let k = 0; k < nEng; k++) {
        const outstanding = Object.entries(target).filter(([mk, v]) => v - usedP.reduce((t, u) => t + (u.pcts[mk] || 0), 0) > 0);
        if (!outstanding.length) break;
        const fits = pool.filter((e) => !usedP.some((u) => u.personId === e.id) && outstanding.some(([mk]) => free(e.id, mk) > 0));
        if (!fits.length) break;
        const e = pick(fits);
        const pcts = {};
        outstanding.forEach(([mk, v]) => {
          const still = v - usedP.reduce((t, u) => t + (u.pcts[mk] || 0), 0);
          const take = Math.min(still, Math.floor(free(e.id, mk) / 5) * 5);
          if (take > 0) pcts[mk] = take;
        });
        if (!Object.keys(pcts).length) break;
        const alloc = { id: `A${allocations.length}`, personId: e.id, projectId: p.id, pcts, source: `REQ-${1040 + i}` };
        allocations.push(alloc);
        Object.entries(pcts).forEach(([mk, v]) => { load[`${e.id}|${mk}`] = (load[`${e.id}|${mk}`] || 0) + v; });
        usedP.push(alloc);
      }
    }

    requests.push({
      id: `REQ-${1040 + i}`, projectId: p.id, disc: d.id, ask,
      seniority: rint(1, 3),
      need: MONTHS[startI].key,
      note: pick(NOTES),
      status: "Open",
    });
  }

  return { projects, people, personById, allocations, budget, baselines, actuals, requests };
}

/* Empty store — nothing imported yet */
export function emptyData() {
  return { projects: [], people: [], personById: {}, allocations: [], budget: {}, baselines: {}, actuals: {}, requests: [] };
}

/* =========================================================================
   Roll-up: everything a view reads for a given month, computed from a store
   ========================================================================= */
export const pctOf = (a, b) => (b > 0 ? (a / b) * 100 : 0);

export function rollup(data, month) {
  const std = monthStd(month);
  const byProject = {}; // projectId -> {budget, committed, actual}
  const byDisc = {};
  const cell = {};      // projectId|disc
  const lines = [];

  (data.allocations || []).filter((a) => activeIn(a, month)).forEach((a) => {
    const e = data.personById[a.personId];
    if (!e) return;
    const committed = (pctIn(a, month) / 100) * std;
    const actual = data.actuals[`${a.personId}|${a.projectId}|${month}`] ?? 0;
    const ck = `${a.projectId}|${e.disc}`;
    cell[ck] = cell[ck] || { budget: data.budget[`${a.projectId}|${e.disc}|${month}`] || 0, committed: 0, actual: 0, heads: 0 };
    cell[ck].committed += committed; cell[ck].actual += actual; cell[ck].heads += 1;
    lines.push({ ...a, person: e, pct: pctIn(a, month), committed, actual });
  });

  Object.entries(cell).forEach(([k, v]) => {
    const [p, d] = k.split("|");
    byProject[p] = byProject[p] || { budget: 0, committed: 0, actual: 0 };
    byProject[p].budget += v.budget; byProject[p].committed += v.committed; byProject[p].actual += v.actual;
    byDisc[d] = byDisc[d] || { budget: 0, committed: 0, actual: 0 };
    byDisc[d].budget += v.budget; byDisc[d].committed += v.committed; byDisc[d].actual += v.actual;
  });

  const tot = { budget: 0, committed: 0, actual: 0 };
  Object.values(byProject).forEach((v) => { tot.budget += v.budget; tot.committed += v.committed; tot.actual += v.actual; });
  return { byProject, byDisc, cell, lines, tot, std };
}

/* per-person load, month by month */
export function loadByMonth(data) {
  const map = {};
  MONTHS.forEach((m) => { map[m.key] = {}; });
  (data.allocations || []).forEach((a) => {
    MONTHS.forEach((m) => { if (activeIn(a, m.key)) map[m.key][a.personId] = (map[m.key][a.personId] || 0) + pctIn(a, m.key); });
  });
  return map;
}

/* outstanding demand from open requests, hours by project x month */
export function outstandingDemand(data) {
  const byProject = {}; // projectId -> hours
  const byProjMonth = {}; // projectId|month -> hours
  (data.requests || []).forEach((r) => {
    if (r.status === "Declined") return;
    // coverage from allocations sourced to this request
    const cov = {};
    (data.allocations || []).forEach((a) => {
      if (a.source !== r.id) return;
      MONTHS.forEach((m) => { if (activeIn(a, m.key)) cov[m.key] = (cov[m.key] || 0) + pctIn(a, m.key); });
    });
    liveMonths(r).forEach((m) => {
      const short = Math.max(0, pctIn(r, m.key) - (cov[m.key] || 0));
      if (short <= 0) return;
      const hrs = (short / 100) * monthStd(m.key);
      byProject[r.projectId] = (byProject[r.projectId] || 0) + hrs;
      const pk = `${r.projectId}|${m.key}`;
      byProjMonth[pk] = (byProjMonth[pk] || 0) + hrs;
    });
  });
  return { byProject, byProjMonth };
}

export function requestState(data, r) {
  const cov = {};
  (data.allocations || []).forEach((a) => {
    if (a.source !== r.id) return;
    MONTHS.forEach((m) => { if (activeIn(a, m.key)) cov[m.key] = (cov[m.key] || 0) + pctIn(a, m.key); });
  });
  const months = liveMonths(r).map((m) => ({
    key: m.key, label: m.label, ask: pctIn(r, m.key),
    covered: cov[m.key] || 0, short: Math.max(0, pctIn(r, m.key) - (cov[m.key] || 0)),
  }));
  const askTotal = months.reduce((t, m) => t + m.ask, 0);
  const covTotal = months.reduce((t, m) => t + Math.min(m.ask, m.covered), 0);
  let status = r.status;
  if (status === "Open") status = covTotal === 0 ? "Open" : months.every((m) => m.short === 0) ? "Filled" : "Partially filled";
  return { months, askTotal, covTotal, status, pct: pctOf(covTotal, askTotal) };
}

/* =========================================================================
   CSV parsing
   ========================================================================= */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const norm = (s) => String(s || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
function header(rows) {
  const h = (rows[0] || []).map(norm);
  const idx = (names) => { for (const n of names) { const i = h.indexOf(norm(n)); if (i >= 0) return i; } return -1; };
  return { h, idx, body: rows.slice(1) };
}
function discFromText(t) {
  const s = norm(t);
  const byId = DISCIPLINES.find((d) => norm(d.id) === s);
  if (byId) return byId.id;
  const byName = DISCIPLINES.find((d) => norm(d.name).startsWith(s) || s.startsWith(norm(d.name)));
  return byName ? byName.id : "SW";
}
function locFromText(t) {
  const s = norm(t);
  const byCode = LOCATIONS.find((l) => norm(l.code) === s);
  if (byCode) return byCode.code;
  const byName = LOCATIONS.find((l) => norm(l.name).includes(s) && s.length > 1);
  return byName ? byName.code : "REM";
}

/* Users CSV → people[]  (columns: name, discipline, location, seniority) */
export function importUsersCSV(text) {
  const { idx, body } = header(parseCSV(text));
  const iName = idx(["name", "fullname", "employee", "person"]);
  const iDisc = idx(["discipline", "team", "department", "dept", "role"]);
  const iLoc = idx(["location", "site", "office", "city"]);
  const iSen = idx(["seniority", "level", "grade"]);
  const iEmail = idx(["email", "e-mail"]);
  const people = [];
  const counts = {};
  body.forEach((r) => {
    const name = (iName >= 0 ? r[iName] : r[0] || "").trim();
    if (!name) return;
    const disc = discFromText(iDisc >= 0 ? r[iDisc] : "SW");
    counts[disc] = (counts[disc] || 0) + 1;
    const senRaw = norm(iSen >= 0 ? r[iSen] : "");
    const seniority = /3|sr|senior|principal|staff|lead/.test(senRaw) ? 3 : /2|mid|ii/.test(senRaw) ? 2 : 1;
    people.push({
      id: `${disc}-${String(counts[disc]).padStart(3, "0")}`,
      name, disc, seniority,
      loc: locFromText(iLoc >= 0 ? r[iLoc] : ""),
      email: iEmail >= 0 ? r[iEmail].trim() : undefined,
    });
  });
  return people;
}

/* Projects CSV → projects[]  (columns: code, name, manager, lead, phase, customer) */
export function importProjectsCSV(text) {
  const { idx, body } = header(parseCSV(text));
  const iCode = idx(["code", "id", "number", "projectcode", "projectid"]);
  const iName = idx(["name", "project", "title", "projectname"]);
  const iMgr = idx(["manager", "pm", "projectmanager"]);
  const iLead = idx(["lead", "engineeringlead", "techlead", "epl"]);
  const iPhase = idx(["phase", "stage", "status"]);
  const iCust = idx(["customer", "client", "account"]);
  const projects = [];
  body.forEach((r, i) => {
    const name = (iName >= 0 ? r[iName] : r[0] || "").trim();
    if (!name) return;
    projects.push({
      id: "P" + i,
      code: (iCode >= 0 ? r[iCode] : "").trim() || "PRJ-" + (1000 + i),
      name,
      manager: (iMgr >= 0 ? r[iMgr] : "").trim() || "—",
      lead: (iLead >= 0 ? r[iLead] : "").trim() || "—",
      phase: (iPhase >= 0 ? r[iPhase] : "").trim() || "Design",
      customer: (iCust >= 0 ? r[iCust] : "").trim() || "—",
    });
  });
  return projects;
}

/* =========================================================================
   Microsoft Project (MSPDI) XML parser
   Reads .xml exported from Microsoft Project. Extracts the project name and
   task-level work, distributing each task's Work across the months it spans
   to produce a monthly baseline (planned hours by month).
   ========================================================================= */
function isoDurationToHours(s) {
  // MSPDI durations look like "PT40H0M0S"
  const m = /P(?:T)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(String(s || ""));
  if (!m) return 0;
  const h = +(m[1] || 0), min = +(m[2] || 0), sec = +(m[3] || 0);
  return h + min / 60 + sec / 3600;
}
function firstText(el, tag) {
  if (!el) return "";
  const n = el.getElementsByTagName(tag)[0];
  return n ? (n.textContent || "").trim() : "";
}
function monthKeyOf(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthsBetween(a, b) {
  const out = [];
  const s = new Date(a), e = new Date(b);
  if (isNaN(s) || isNaN(e)) return out;
  let y = s.getFullYear(), m = s.getMonth();
  const ey = e.getFullYear(), em = e.getMonth();
  let guard = 0;
  while ((y < ey || (y === ey && m <= em)) && guard++ < 120) {
    out.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m++; if (m > 11) { m = 0; y++; }
  }
  return out;
}

/* Returns { name, planned: {monthKey: hours}, taskCount } */
export function parseMSProjectXML(text) {
  if (typeof DOMParser === "undefined") throw new Error("XML parsing needs a browser environment.");
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("This file isn't valid XML.");
  const root = doc.documentElement;
  if (!/project/i.test(root.tagName)) throw new Error("Not a Microsoft Project (MSPDI) XML export.");

  const name = firstText(root, "Name") || firstText(root, "Title") || "Imported plan";
  const planned = {};
  let taskCount = 0;

  const tasks = root.getElementsByTagName("Task");
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (firstText(t, "Summary") === "1") continue;        // skip roll-up summary tasks
    if (firstText(t, "IsNull") === "1") continue;
    const work = isoDurationToHours(firstText(t, "Work"));
    if (work <= 0) continue;
    taskCount++;
    const start = firstText(t, "Start"), finish = firstText(t, "Finish");
    let keys = monthsBetween(start, finish);
    if (!keys.length) { const k = monthKeyOf(start); if (k) keys = [k]; }
    if (!keys.length) continue;
    const per = work / keys.length; // even spread across spanned months
    keys.forEach((k) => { planned[k] = Math.round(((planned[k] || 0) + per) * 10) / 10; });
  }

  // Fallback: if tasks carried no work, try assignment-level work.
  if (!Object.keys(planned).length) {
    const asg = root.getElementsByTagName("Assignment");
    for (let i = 0; i < asg.length; i++) {
      const a = asg[i];
      const work = isoDurationToHours(firstText(a, "Work"));
      if (work <= 0) continue;
      const start = firstText(a, "Start"), finish = firstText(a, "Finish");
      let keys = monthsBetween(start, finish);
      if (!keys.length) continue;
      const per = work / keys.length;
      keys.forEach((k) => { planned[k] = Math.round(((planned[k] || 0) + per) * 10) / 10; });
      taskCount++;
    }
  }

  if (!Object.keys(planned).length) throw new Error("No task work found in this plan.");
  return { name, planned, taskCount };
}
