/*
 * Ontology Atlas — synthetic corpus generator.
 * Deterministic (seeded) so the graph looks the same on every load.
 * Exposes window.ONTOLOGY = { classes, domains, nodes, edges, ... }.
 *
 * Structure (bottom → top):
 *   tier 0  connectors   (warehouse connections)
 *   tier 1  schemas      (per connector)
 *   tier 2  tables, datasets
 *   tier 3  workspace    (directories, TQL/SQL modules, code, docs, playbooks, data apps …)
 */
(function (global) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20260728);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const randint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const chance = (p) => rnd() < p;
  const gauss = () => {
    let u = 0;
    while (u === 0) u = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
  };
  function weighted(w) {
    const keys = Object.keys(w);
    let s = 0;
    for (const k of keys) s += w[k];
    let x = rnd() * s;
    for (const k of keys) { x -= w[k]; if (x <= 0) return k; }
    return keys[keys.length - 1];
  }

  const CLASSES = [
    { id: 'connector', name: 'Connector',  color: '#4d8dff' },
    { id: 'schema',    name: 'Schema',     color: '#8a6dff' },
    { id: 'table',     name: 'Table',      color: '#2cc9a6' },
    { id: 'tql',       name: 'TQL module', color: '#3fd26f' },
    { id: 'sql',       name: 'SQL',        color: '#b9d63c' },
    { id: 'playbook',  name: 'Playbook',   color: '#ff9a3d' },
    { id: 'dataapp',   name: 'Data app',   color: '#f5c542' },
    { id: 'code',      name: 'Code',       color: '#dfe5ee' },
    { id: 'document',  name: 'Document',   color: '#8d97a8' },
    { id: 'config',    name: 'Config',     color: '#ff4d7a' },
    { id: 'dataset',   name: 'Dataset',    color: '#2f9bf0' },
    { id: 'asset',     name: 'Asset',      color: '#c98b4e' },
    { id: 'directory', name: 'Directory',  color: '#667085' },
    { id: 'other',     name: 'Other',      color: '#4a5160' },
  ];

  const CONNECTORS = [
    { name: 'NORTHWIND-RDS',       schemas: ['CORE', 'PUBLIC', 'V1', 'BILLING'] },
    { name: 'NW_USAGE',            schemas: ['ANA_USAGE', 'EVENTS', 'SEGMENT'] },
    { name: 'NW_PROD_DATA_READER', schemas: ['STRIPE', 'RAMP', 'MERCURY'] },
    { name: 'PROD_DATA_READER',    schemas: ['CRM', 'HUBSPOT', 'PARTNERSHIPS', 'US_REAL_ESTATE'] },
    { name: 'RECRUITING',          schemas: ['GREENHOUSE', 'CORE_EMPLOYEES'] },
    { name: 'WORKSPACE_SYNC',      schemas: ['GMAIL', 'GCAL', 'SLACK', 'GRAIN', 'LOOPS'] },
    { name: 'ENG_WAREHOUSE',       schemas: ['GITHUB', 'LINEAR', 'SENTRY'] },
  ];

  const TABLES = {
    CORE: ['USERS', 'ORGANIZATIONS', 'MEMBERSHIPS', 'WORKSPACES', 'API_KEYS', 'FEATURE_FLAGS', 'INVITES', 'AUDIT_LOG'],
    PUBLIC: ['ACCOUNTS', 'PLANS', 'SEATS', 'REGIONS', 'COUNTRIES'],
    V1: ['QUERIES', 'RESULTS', 'CONNECTIONS', 'THREADS', 'MESSAGES', 'FEEDBACK'],
    BILLING: ['INVOICES', 'LINE_ITEMS', 'CREDITS', 'USAGE_RECORDS', 'CONTRACTS'],
    ANA_USAGE: ['DAILY_ACTIVE', 'SESSIONS', 'PAGE_VIEWS', 'QUERY_RUNS', 'TOKEN_SPEND', 'LATENCY'],
    EVENTS: ['TRACKS', 'IDENTIFIES', 'PAGES', 'GROUPS'],
    SEGMENT: ['USERS', 'ACCOUNTS', 'TRAITS'],
    STRIPE: ['CHARGES', 'CUSTOMERS', 'INVOICES', 'SUBSCRIPTIONS', 'PAYOUTS', 'REFUNDS', 'DISPUTES', 'PRICES', 'PRODUCTS'],
    RAMP: ['TRANSACTIONS', 'CARDS', 'REIMBURSEMENTS', 'VENDORS', 'BILLS'],
    MERCURY: ['TRANSACTIONS', 'ACCOUNTS', 'BALANCES', 'RECIPIENTS'],
    CRM: ['ACCOUNTS', 'CONTACTS', 'OPPORTUNITIES', 'OPPORTUNITY_STAGES', 'LEADS', 'ACTIVITIES', 'PIPELINES', 'TASKS'],
    HUBSPOT: ['DEALS', 'COMPANIES', 'EMAILS', 'FORMS', 'CAMPAIGNS', 'LISTS'],
    PARTNERSHIPS: ['PARTNERS', 'REFERRALS', 'PAYOUTS', 'TIERS'],
    US_REAL_ESTATE: ['OFFICES', 'LEASES', 'COSTS'],
    GREENHOUSE: ['CANDIDATES', 'APPLICATIONS', 'INTERVIEWS', 'OFFERS', 'JOBS', 'SCORECARDS'],
    CORE_EMPLOYEES: ['EMPLOYEES', 'TEAMS', 'COMPENSATION', 'TIME_OFF', 'EQUIPMENT'],
    GMAIL: ['MESSAGES', 'THREADS', 'LABELS'],
    GCAL: ['EVENTS', 'ATTENDEES', 'CALENDARS'],
    SLACK: ['MESSAGES', 'CHANNELS', 'USERS', 'REACTIONS', 'THREADS'],
    GRAIN: ['RECORDINGS', 'HIGHLIGHTS', 'TRANSCRIPTS', 'PARTICIPANTS'],
    LOOPS: ['CONTACTS', 'CAMPAIGNS', 'SENDS', 'EVENTS'],
    GITHUB: ['REPOS', 'PULL_REQUESTS', 'COMMITS', 'ISSUES', 'REVIEWS', 'WORKFLOW_RUNS'],
    LINEAR: ['ISSUES', 'PROJECTS', 'CYCLES', 'TEAMS', 'COMMENTS'],
    SENTRY: ['ISSUES', 'EVENTS', 'RELEASES'],
  };

  // Workspace domains: how many files each holds and what kinds of files.
  const DOMAINS = [
    { name: 'DATABASES',    files: 360, mix: { tql: 40, sql: 38, document: 14, code: 4, other: 4 } },
    { name: 'APPS',         files: 440, mix: { code: 46, dataapp: 5, tql: 14, document: 16, asset: 6, config: 1.2, other: 6 } },
    { name: 'DASHBOARDS',   files: 60,  mix: { tql: 44, sql: 22, document: 20, asset: 8 } },
    { name: 'GO_TO_MARKET', files: 58,  mix: { document: 58, sql: 14, tql: 10, playbook: 6, asset: 6, other: 6 } },
    { name: 'PLAYBOOKS',    files: 58,  mix: { playbook: 26, document: 50, tql: 14, sql: 8 } },
    { name: 'SKILLS',       files: 70,  mix: { code: 40, document: 46, tql: 10, config: 2 } },
    { name: 'USERS',        files: 190, mix: { document: 70, code: 12, other: 14, asset: 4 } },
    { name: 'APIS',         files: 30,  mix: { code: 60, document: 26, config: 8 } },
    { name: 'AGENTS',       files: 135, mix: { code: 44, document: 30, playbook: 6, tql: 12, config: 2 } },
  ];

  // Which schemas each domain tends to query.
  const AFFINITY = {
    DATABASES: ['CORE', 'PUBLIC', 'V1', 'BILLING', 'ANA_USAGE', 'EVENTS', 'SEGMENT'],
    APPS: ['V1', 'CORE', 'ANA_USAGE', 'STRIPE', 'GITHUB'],
    DASHBOARDS: ['STRIPE', 'BILLING', 'ANA_USAGE', 'RAMP', 'MERCURY', 'CRM'],
    GO_TO_MARKET: ['CRM', 'HUBSPOT', 'LOOPS', 'GMAIL', 'PARTNERSHIPS', 'GRAIN'],
    PLAYBOOKS: ['CRM', 'GRAIN', 'GCAL', 'SLACK', 'HUBSPOT'],
    SKILLS: ['SLACK', 'GITHUB', 'LINEAR', 'GMAIL'],
    USERS: ['CORE_EMPLOYEES', 'GREENHOUSE', 'GCAL', 'SLACK', 'US_REAL_ESTATE'],
    APIS: ['V1', 'CORE', 'SENTRY'],
    AGENTS: ['V1', 'ANA_USAGE', 'SLACK', 'GITHUB', 'LINEAR', 'SENTRY'],
  };

  const SUBJ = ['revenue', 'mrr', 'arr', 'churn', 'pipeline', 'usage', 'retention', 'cohort', 'accounts', 'invoices',
    'seats', 'signups', 'activation', 'funnel', 'nps', 'tickets', 'hiring', 'payroll', 'spend', 'burn', 'forecast',
    'quota', 'leads', 'deals', 'renewals', 'expansion', 'latency', 'errors', 'deploys', 'commits', 'sessions',
    'agents', 'prompts', 'tokens', 'evals', 'meetings', 'outreach', 'partners', 'leases', 'headcount', 'runway',
    'margin', 'cac', 'ltv', 'conversion', 'onboarding'];
  const MOD = ['daily', 'weekly', 'monthly', 'by_segment', 'by_region', 'by_plan', 'rollup', 'snapshot', 'trend',
    'summary', 'cohorts', 'top_n', 'v2', 'clean', 'joined', 'attribution', 'base', 'staging', 'final', 'alerts'];
  const DIRW = ['core', 'shared', 'lib', 'internal', 'legacy', 'v2', 'experiments', 'reports', 'metrics', 'models',
    'staging', 'marts', 'utils', 'components', 'hooks', 'routes', 'handlers', 'notes', 'specs', 'drafts', 'archive',
    'templates', 'prompts', 'tools', 'evals', 'sources', 'exports', 'weekly', 'finance', 'sales', 'eng', 'ops',
    'people', 'growth'];

  const T0 = Date.UTC(2024, 1, 1);
  const T1 = Date.UTC(2026, 8, 26);
  // skew < 1 → biased toward recent, skew > 1 → biased toward early
  const dateAfter = (min, skew = 0.6) => {
    const lo = Math.max(min, T0);
    return Math.round(lo + Math.pow(rnd(), skew) * (T1 - lo));
  };

  const nodes = [];
  const edges = [];
  const edgeKeys = new Set();
  const add = (n) => { n.id = nodes.length; n.hits = n.hits || 0; n.hits30 = 0; nodes.push(n); return n; };
  const link = (a, b, type) => {
    if (!a || !b || a === b) return;
    const k = a.id + '>' + b.id;
    if (edgeKeys.has(k)) return;
    edgeKeys.add(k);
    edges.push({ s: a.id, t: b.id, type });
  };

  const used = new Map();
  function uniq(base, ext = '') {
    const k = base + ext;
    const c = used.get(k) || 0;
    used.set(k, c + 1);
    return c ? `${base}_${c + 1}${ext}` : k;
  }

  const DEAD = { code: 0.14, document: 0.3, tql: 0.1, sql: 0.16, other: 0.42, asset: 0.36, config: 0.04, playbook: 0.08, dataapp: 0.04 };
  const SIZE = { code: [5500, 1.0], document: [8000, 1.1], tql: [2600, 0.8], sql: [2200, 0.8], asset: [160000, 0.9],
    other: [70000, 1.4], config: [1400, 0.6], playbook: [6000, 0.7], dataapp: [38000, 0.7] };
  const drawHits = (deadP) => (chance(deadP) ? 0 : Math.max(1, Math.floor(Math.exp(Math.pow(rnd(), 1.7) * 9.2))));

  // ── data layer ──────────────────────────────────────────────
  const connectors = [], schemas = [], tables = [];
  for (const c of CONNECTORS) {
    const cn = add({ name: c.name, cls: 'connector', tier: 0, parent: null, size: 0,
      created: T0 + Math.round(rnd() * 0.25 * (T1 - T0)), path: c.name.toLowerCase() });
    connectors.push(cn);
    for (const s of c.schemas) {
      const sn = add({ name: s, cls: 'schema', tier: 1, parent: cn.id, size: 0,
        created: dateAfter(cn.created, 2.2), path: `${cn.path}/${s.toLowerCase()}` });
      schemas.push(sn);
      link(cn, sn, 'has_schema');
      for (const t of TABLES[s]) {
        const tn = add({ name: `${s}.${t}`, cls: 'table', tier: 2, parent: sn.id, size: 0,
          rows: Math.round(Math.exp(6 + rnd() * 11)), created: dateAfter(sn.created, 1.8),
          path: `${sn.path}/${t.toLowerCase()}`, hits: drawHits(0.3) });
        tn._pop = 0.15 + Math.pow(rnd(), 3) * 3;
        tn._schema = s;
        tables.push(tn);
        link(sn, tn, 'has_table');
      }
    }
  }

  const tablesByDomain = {};
  for (const d of DOMAINS) tablesByDomain[d.name] = tables.filter((t) => AFFINITY[d.name].includes(t._schema));
  function pickTable(domain) {
    const pool = chance(0.75) && tablesByDomain[domain] ? tablesByDomain[domain] : tables;
    let s = 0;
    for (const t of pool) s += t._pop;
    let x = rnd() * s;
    for (const t of pool) { x -= t._pop; if (x <= 0) return t; }
    return pool[pool.length - 1];
  }

  const datasets = [];
  for (let k = 0; k < 19; k++) {
    const dom = pick(['DATABASES', 'DATABASES', 'DASHBOARDS', 'APPS', 'GO_TO_MARKET']);
    const t0 = pickTable(dom);
    const nm = uniq(`ds_${pick(SUBJ)}_${pick(MOD)}`);
    const dn = add({ name: nm, cls: 'dataset', tier: 2, parent: t0.id, domain: dom,
      size: Math.round(Math.exp(11 + rnd() * 2.5)), created: dateAfter(t0.created), path: `datasets/${nm}`,
      hits: drawHits(0.1) });
    datasets.push(dn);
    link(dn, t0, 'derives');
    for (let j = randint(0, 2); j > 0; j--) link(dn, pickTable(dom), 'derives');
  }

  // ── workspace ───────────────────────────────────────────────
  const EXT = {
    code: () => pick(['.py', '.py', '.ts', '.tsx', '.go']),
    document: () => pick(['.md', '.md', '.mdx', '.txt']),
    tql: () => '.tql',
    sql: () => '.sql',
    other: () => pick(['.csv', '.json', '.ipynb', '.parquet']),
  };
  function fileName(cls) {
    switch (cls) {
      case 'config': return uniq(pick(['settings', 'connections', 'agents', 'deploy', 'routing', 'ontology']), pick(['.yaml', '.toml', '.json']));
      case 'asset': return uniq(`${pick(SUBJ)}_${pick(['chart', 'diagram', 'hero', 'icon', 'export'])}`, pick(['.png', '.svg', '.pdf']));
      case 'playbook': return uniq(`${pick(SUBJ)}_${pick(['review', 'playbook', 'runbook', 'sweep', 'digest', 'triage'])}`, '.playbook');
      case 'dataapp': return uniq(`${pick(SUBJ)}-${pick(['explorer', 'console', 'tracker', 'board', 'studio', 'monitor'])}`, '.app');
      default: return uniq(`${pick(SUBJ)}_${pick(MOD)}`, EXT[cls]());
    }
  }

  const filesByDomain = {};
  const dirPaths = new Set();
  for (const d of DOMAINS) {
    const slug = d.name.toLowerCase();
    const root = add({ name: slug + '/', cls: 'directory', tier: 3, domain: d.name, parent: null, depth: 0,
      created: dateAfter(T0, 3), size: 0, path: slug });
    const dirs = [root];
    const nDirs = Math.round(d.files / 3.1);
    for (let k = 0; k < nDirs; k++) {
      const par = chance(0.35) ? root : pick(dirs.filter((x) => x.depth < 3));
      let nm = pick(DIRW);
      let p = `${par.path}/${nm}`;
      for (let j = 2; dirPaths.has(p); j++) { nm = `${pick(DIRW)}_${j}`; p = `${par.path}/${nm}`; }
      dirPaths.add(p);
      const dn = add({ name: nm + '/', cls: 'directory', tier: 3, domain: d.name, parent: par.id, depth: par.depth + 1,
        created: dateAfter(par.created, 1.6), size: 0, path: p });
      dirs.push(dn);
      link(par, dn, 'contains');
    }
    filesByDomain[d.name] = [];
    for (let k = 0; k < d.files; k++) {
      const cls = weighted(d.mix);
      const par = pick(dirs);
      const nm = fileName(cls);
      const [med, sg] = SIZE[cls];
      const f = add({ name: nm, cls, tier: 3, domain: d.name, parent: par.id, size: Math.round(med * Math.exp(gauss() * sg)),
        created: dateAfter(par.created), path: `${par.path}/${nm}`, hits: drawHits(DEAD[cls]) });
      link(par, f, 'contains');
      filesByDomain[d.name].push(f);
      if (cls === 'tql' || cls === 'sql') {
        for (let j = randint(1, cls === 'tql' ? 4 : 3); j > 0; j--) link(f, pickTable(d.name), 'reads');
        if (cls === 'tql' && chance(0.12)) link(f, pick(datasets), 'reads');
      }
    }
  }

  // cross-links between workspace files
  const files = nodes.filter((n) => n.tier === 3 && n.cls !== 'directory');
  const of = (list, classes) => list.filter((n) => classes.includes(n.cls));
  const allModels = of(files, ['tql', 'sql']);
  const allDocs = of(files, ['document']);
  const allCode = of(files, ['code']);
  const allPlaybooks = of(files, ['playbook']);
  const modelsBy = {}, codeBy = {};
  for (const d of DOMAINS) {
    modelsBy[d.name] = of(filesByDomain[d.name], ['tql', 'sql']);
    codeBy[d.name] = of(filesByDomain[d.name], ['code']);
  }
  const pickOr = (list, fallback) => pick(list.length ? list : fallback);

  for (const f of files) {
    const dom = f.domain;
    switch (f.cls) {
      case 'dataapp':
        for (let j = randint(3, 7); j > 0; j--) link(f, chance(0.7) ? pickOr(modelsBy[dom], allModels) : pick(allModels), 'uses');
        break;
      case 'playbook':
        for (let j = randint(2, 5); j > 0; j--) link(f, pick(chance(0.6) ? allModels : allDocs), 'uses');
        if (chance(0.4)) link(f, pickTable(dom), 'reads');
        break;
      case 'code':
        if (chance(0.25)) for (let j = randint(1, 2); j > 0; j--) link(f, pickOr(modelsBy[dom], allModels), 'uses');
        if (chance(0.38)) for (let j = randint(1, 2); j > 0; j--) link(f, pick(codeBy[dom]), 'imports');
        if (dom === 'AGENTS' && chance(0.25)) link(f, pick(allPlaybooks), 'invokes');
        break;
      case 'document':
        if (chance(0.3)) {
          for (let j = randint(1, 2); j > 0; j--) {
            const r = rnd();
            link(f, r < 0.3 ? pickTable(dom) : r < 0.6 ? pick(allModels) : r < 0.8 ? pick(allDocs) : pick(allCode), 'references');
          }
        }
        break;
      case 'tql':
        if (chance(0.2)) link(f, pickOr(modelsBy[dom], allModels), 'composes');
        break;
      case 'config':
        for (let j = randint(1, 3); j > 0; j--) link(f, pick(connectors), 'configures');
        break;
    }
  }

  // ── derive domains for the data layer from who uses it ─────
  const votes = new Map();
  const vote = (id, dom, w) => {
    let m = votes.get(id);
    if (!m) votes.set(id, (m = {}));
    m[dom] = (m[dom] || 0) + w;
  };
  const top = (id, fallback) => {
    const m = votes.get(id);
    if (!m) return fallback;
    let best = fallback, bw = -1;
    for (const k in m) if (m[k] > bw) { bw = m[k]; best = k; }
    return best;
  };
  for (const e of edges) {
    const s = nodes[e.s], t = nodes[e.t];
    if (t.tier === 2 && s.domain) vote(t.id, s.domain, 1);
  }
  for (const t of tables) t.domain = top(t.id, 'DATABASES');
  for (const t of tables) vote(t.parent, t.domain, 1);
  for (const s of schemas) s.domain = top(s.id, 'DATABASES');
  for (const s of schemas) vote(s.parent, s.domain, 1);
  for (const c of connectors) c.domain = top(c.id, 'DATABASES');

  // ── usage: roll hits up through lineage and the directory tree ─
  for (const e of edges) {
    if (e.type === 'reads' || e.type === 'derives') nodes[e.t].hits += Math.round(nodes[e.s].hits * 0.6);
  }
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (n.parent != null && n.cls !== 'dataset') nodes[n.parent].hits += n.hits;
  }
  for (const n of nodes) {
    const p = Math.min(0.9, 0.012 * Math.pow(Math.log1p(n.hits), 1.6));
    n.hits30 = n.hits > 0 && chance(p) ? randint(1, Math.max(1, Math.round(n.hits * 0.05))) : 0;
    delete n._pop;
    delete n._schema;
  }

  const out = {
    name: 'Ontology Atlas',
    version: 'v1',
    org: 'NORTHWIND · INTERNAL',
    generatedAt: '2026-09-28T04:45:00Z',
    classes: CLASSES,
    domains: DOMAINS.map((d) => d.name),
    nodes,
    edges,
  };
  global.ONTOLOGY = out;
  if (typeof module !== 'undefined' && module.exports) module.exports = out;
})(typeof window !== 'undefined' ? window : globalThis);
