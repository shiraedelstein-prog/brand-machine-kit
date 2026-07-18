// Brand Machine — zero-dependency local server.
// Serves the dashboard (public/) and a JSON API over the workspaces/ folder.
// Claude Code writes the workspace files; this server just reads/updates them.

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { computeSignals, writeSignals } = require('./signals');

const PORT = process.env.PORT || 5178;
const ROOT = __dirname;
const SEED_WORKSPACES = path.join(ROOT, 'workspaces');
// In production (e.g. Render) point WORKSPACES at a persistent disk so edits survive restarts.
const WORKSPACES = process.env.WORKSPACES || SEED_WORKSPACES;
const PUBLIC = path.join(ROOT, 'public');

// On a fresh persistent disk (empty), copy the seeded workspaces in once.
if (WORKSPACES !== SEED_WORKSPACES) {
  try {
    if (!fs.existsSync(WORKSPACES) || fs.readdirSync(WORKSPACES).length === 0) {
      fs.mkdirSync(WORKSPACES, { recursive: true });
      fs.cpSync(SEED_WORKSPACES, WORKSPACES, { recursive: true });
      console.log('Seeded workspaces into', WORKSPACES);
    }
  } catch (err) {
    console.error('Workspace seed failed:', err.message);
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.csv': 'text/csv; charset=utf-8',
};

const DOCS = ['brand-identity', 'visual-identity', 'channel-strategy', 'viral-research', 'content-plan'];

function docPath(slug, doc) {
  if (doc === 'viral-research') return path.join(WORKSPACES, slug, 'research', 'viral-research.md');
  return path.join(WORKSPACES, slug, doc + '.md');
}

function safeSlug(s) {
  return /^[a-z0-9-]+$/.test(s) ? s : null;
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJsonFile(p, fallback) {
  try {
    return JSON.parse(await fsp.readFile(p, 'utf8'));
  } catch {
    return fallback;
  }
}

async function listBrands() {
  let dirs = [];
  try {
    dirs = (await fsp.readdir(WORKSPACES, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
  const brands = [];
  for (const slug of dirs) {
    const brand = await readJsonFile(path.join(WORKSPACES, slug, 'brand.json'), null);
    if (!brand) continue;
    const content = await listContent(slug);
    const metrics = await readJsonFile(path.join(WORKSPACES, slug, 'metrics.json'), []);
    const docs = {};
    for (const d of DOCS) docs[d] = fs.existsSync(docPath(slug, d));
    brands.push({
      ...brand,
      slug,
      docs,
      contentCounts: countByStatus(content),
      metricsCount: metrics.length,
      totalViews: metrics.reduce((a, m) => a + (Number(m.views) || 0), 0),
    });
  }
  return brands;
}

function countByStatus(content) {
  const c = { idea: 0, draft: 0, ready: 0, posted: 0 };
  for (const item of content) if (c[item.status] !== undefined) c[item.status]++;
  return c;
}

async function listCampaigns(slug) {
  const dir = path.join(WORKSPACES, slug, 'campaigns');
  let files = [];
  try {
    files = (await fsp.readdir(dir)).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const items = [];
  for (const f of files) {
    const item = await readJsonFile(path.join(dir, f), null);
    if (item) items.push(item);
  }
  items.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  return items;
}

async function listContent(slug) {
  const dir = path.join(WORKSPACES, slug, 'content');
  let files = [];
  try {
    files = (await fsp.readdir(dir)).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const items = [];
  for (const f of files) {
    const item = await readJsonFile(path.join(dir, f), null);
    if (item) items.push(item);
  }
  items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return items;
}

function parseCsv(text) {
  // Simple CSV: no embedded newlines inside quotes needed for metrics rows.
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const split = (line) => {
    const out = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  const numeric = ['views', 'likes', 'comments', 'shares', 'saves', 'clicks', 'followersgained'];
  const keyMap = { followersgained: 'followersGained', contentid: 'contentId', posturl: 'postUrl' };
  return lines.slice(1).map((line) => {
    const vals = split(line);
    const row = {};
    headers.forEach((h, i) => {
      const key = keyMap[h] || h;
      row[key] = numeric.includes(h) ? Number(vals[i]) || 0 : vals[i] || '';
    });
    return row;
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const parts = url.pathname.split('/').filter(Boolean);

    // ---- API ----
    if (parts[0] === 'api') {
      // GET /api/brands
      if (req.method === 'GET' && parts[1] === 'brands' && parts.length === 2) {
        return send(res, 200, await listBrands());
      }

      // POST /api/brands  {name, niche}
      if (req.method === 'POST' && parts[1] === 'brands' && parts.length === 2) {
        const body = JSON.parse(await readBody(req) || '{}');
        const name = (body.name || '').trim();
        if (!name) return send(res, 400, { error: 'name required' });
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (!safeSlug(slug)) return send(res, 400, { error: 'invalid name' });
        const dir = path.join(WORKSPACES, slug);
        if (fs.existsSync(dir)) return send(res, 409, { error: 'brand exists' });
        await fsp.mkdir(path.join(dir, 'content'), { recursive: true });
        await fsp.mkdir(path.join(dir, 'assets'), { recursive: true });
        await fsp.mkdir(path.join(dir, 'research'), { recursive: true });
        await fsp.mkdir(path.join(dir, 'campaigns'), { recursive: true });
        const brand = { name, slug, niche: body.niche || '', createdAt: new Date().toISOString() };
        await fsp.writeFile(path.join(dir, 'brand.json'), JSON.stringify(brand, null, 2));
        await fsp.writeFile(path.join(dir, 'metrics.json'), '[]');
        return send(res, 201, brand);
      }

      const slug = safeSlug(parts[2] || '');
      if (parts[1] === 'brands' && slug) {
        const brandDir = path.join(WORKSPACES, slug);

        // GET /api/brands/:slug
        if (req.method === 'GET' && parts.length === 3) {
          const brand = await readJsonFile(path.join(brandDir, 'brand.json'), null);
          if (!brand) return send(res, 404, { error: 'not found' });
          const docs = {};
          for (const d of DOCS) docs[d] = fs.existsSync(docPath(slug, d));
          let assets = [];
          try {
            assets = (await fsp.readdir(path.join(brandDir, 'assets'))).filter((f) => MIME[path.extname(f).toLowerCase()]);
          } catch {}
          return send(res, 200, {
            ...brand,
            docs,
            assets,
            content: await listContent(slug),
            campaigns: await listCampaigns(slug),
            metrics: await readJsonFile(path.join(brandDir, 'metrics.json'), []),
            signals: await computeSignals(WORKSPACES, slug),
          });
        }

        // GET /api/brands/:slug/signals — what the logged results actually say.
        if (req.method === 'GET' && parts[3] === 'signals' && parts.length === 4) {
          return send(res, 200, await computeSignals(WORKSPACES, slug));
        }

        // GET /api/brands/:slug/docs/:doc
        if (req.method === 'GET' && parts[3] === 'docs' && DOCS.includes(parts[4])) {
          try {
            const md = await fsp.readFile(docPath(slug, parts[4]), 'utf8');
            return send(res, 200, { doc: parts[4], markdown: md });
          } catch {
            return send(res, 404, { error: 'doc not written yet' });
          }
        }

        // PATCH /api/brands/:slug/content/:id  (merge fields, e.g. status change)
        if (req.method === 'PATCH' && parts[3] === 'content' && parts[4]) {
          const id = parts[4].replace(/[^a-zA-Z0-9_-]/g, '');
          const file = path.join(brandDir, 'content', id + '.json');
          const item = await readJsonFile(file, null);
          if (!item) return send(res, 404, { error: 'not found' });
          const patch = JSON.parse(await readBody(req) || '{}');
          const updated = { ...item, ...patch, id: item.id };
          if (patch.status === 'posted' && !updated.postedAt) updated.postedAt = new Date().toISOString();
          await fsp.writeFile(file, JSON.stringify(updated, null, 2));
          return send(res, 200, updated);
        }

        // PATCH /api/brands/:slug/campaigns/:id  (merge fields, e.g. status change)
        if (req.method === 'PATCH' && parts[3] === 'campaigns' && parts[4] && parts.length === 5) {
          const id = parts[4].replace(/[^a-zA-Z0-9_-]/g, '');
          const file = path.join(brandDir, 'campaigns', id + '.json');
          const item = await readJsonFile(file, null);
          if (!item) return send(res, 404, { error: 'not found' });
          const patch = JSON.parse(await readBody(req) || '{}');
          const updated = { ...item, ...patch, id: item.id, results: item.results || [] };
          if (Array.isArray(patch.results)) updated.results = patch.results;
          await fsp.writeFile(file, JSON.stringify(updated, null, 2));
          return send(res, 200, updated);
        }

        // POST /api/brands/:slug/campaigns/:id/results  (append one result entry)
        if (req.method === 'POST' && parts[3] === 'campaigns' && parts[4] && parts[5] === 'results') {
          const id = parts[4].replace(/[^a-zA-Z0-9_-]/g, '');
          const file = path.join(brandDir, 'campaigns', id + '.json');
          const item = await readJsonFile(file, null);
          if (!item) return send(res, 404, { error: 'not found' });
          const entry = JSON.parse(await readBody(req) || '{}');
          if (!entry.date) return send(res, 400, { error: 'date required' });
          entry.redemptions = Number(entry.redemptions) || 0;
          entry.revenue = Number(entry.revenue) || 0;
          entry.cost = Number(entry.cost) || 0;
          item.results = item.results || [];
          item.results.push(entry);
          await fsp.writeFile(file, JSON.stringify(item, null, 2));
          return send(res, 200, item);
        }

        // POST /api/brands/:slug/metrics  (single JSON entry)
        if (req.method === 'POST' && parts[3] === 'metrics' && parts.length === 4) {
          const entry = JSON.parse(await readBody(req) || '{}');
          if (!entry.date) return send(res, 400, { error: 'date required' });
          const file = path.join(brandDir, 'metrics.json');
          const metrics = await readJsonFile(file, []);
          metrics.push(entry);
          await fsp.writeFile(file, JSON.stringify(metrics, null, 2));
          const signals = await writeSignals(WORKSPACES, slug);
          return send(res, 200, { ok: true, count: metrics.length, signals });
        }

        // POST /api/brands/:slug/metrics/csv  (raw CSV text body)
        if (req.method === 'POST' && parts[3] === 'metrics' && parts[4] === 'csv') {
          const rows = parseCsv(await readBody(req));
          if (!rows.length) return send(res, 400, { error: 'no rows parsed — need a header row plus data rows' });
          const file = path.join(brandDir, 'metrics.json');
          const metrics = await readJsonFile(file, []);
          metrics.push(...rows);
          await fsp.writeFile(file, JSON.stringify(metrics, null, 2));
          const signals = await writeSignals(WORKSPACES, slug);
          return send(res, 200, { ok: true, imported: rows.length, count: metrics.length, signals });
        }
      }
      return send(res, 404, { error: 'unknown api route' });
    }

    // ---- Workspace asset files: /files/:slug/assets/<name> ----
    if (parts[0] === 'files' && safeSlug(parts[1] || '')) {
      const rel = parts.slice(2).join('/');
      const full = path.join(WORKSPACES, parts[1], rel);
      if (!full.startsWith(path.join(WORKSPACES, parts[1]))) return send(res, 403, { error: 'forbidden' });
      try {
        const data = await fsp.readFile(full);
        return send(res, 200, data, MIME[path.extname(full).toLowerCase()] || 'application/octet-stream');
      } catch {
        return send(res, 404, { error: 'file not found' });
      }
    }

    // ---- Static frontend ----
    let rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const full = path.join(PUBLIC, rel);
    if (!full.startsWith(PUBLIC)) return send(res, 403, 'forbidden', 'text/plain');
    try {
      const data = await fsp.readFile(full);
      return send(res, 200, data, MIME[path.extname(full).toLowerCase()] || 'text/plain');
    } catch {
      // SPA fallback
      const data = await fsp.readFile(path.join(PUBLIC, 'index.html'));
      return send(res, 200, data, MIME['.html']);
    }
  } catch (err) {
    return send(res, 500, { error: String(err && err.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`Brand Machine running at http://localhost:${PORT}`);
});
