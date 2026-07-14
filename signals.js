// Brand Machine — signals: turns logged metrics into a performance read.
//
// This is what closes the loop. The dashboard collects numbers; this file works out
// what those numbers MEAN (which series / format / channel / job actually perform),
// and writes signals.json. CLAUDE.md requires the content-plan and content-batch
// steps to read signals.json before writing anything, so real results steer the next round.
//
// Deliberately dumb arithmetic — no AI, no guessing. It cannot invent a finding.
// The only opinion it holds is that small samples are not evidence (see MIN_SAMPLE).

const fsp = require('fs/promises');
const path = require('path');

// Below this many measured posts in a group, we refuse to call it a win or a loss.
// 4 data points saying "carousels beat reels" is noise, and a machine that rewrites
// your strategy off noise is worse than one that stays quiet.
const MIN_SAMPLE = 3;

// A group must beat/miss the brand's own baseline by this much before we call it.
const OVER = 1.5;
const UNDER = 0.6;

const DIMENSIONS = ['series', 'format', 'channel', 'job'];

async function readJson(p, fallback) {
  try {
    return JSON.parse(await fsp.readFile(p, 'utf8'));
  } catch {
    return fallback;
  }
}

async function readContent(brandDir) {
  const dir = path.join(brandDir, 'content');
  let files = [];
  try {
    files = (await fsp.readdir(dir)).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const items = [];
  for (const f of files) {
    const item = await readJson(path.join(dir, f), null);
    if (item && item.id) items.push(item);
  }
  return items;
}

const num = (v) => Number(v) || 0;

function engagement(row) {
  return num(row.likes) + num(row.comments) + num(row.shares) + num(row.saves);
}

// Median, not mean. One post going viral must not redefine "normal" for the brand and
// make every other post look like a failure.
function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

// A post can be logged more than once (snapshots over time). Those rows are cumulative,
// so summing them would double-count. Take the latest snapshot per post instead.
function latestPerPost(metrics) {
  const byId = new Map();
  for (const row of metrics) {
    if (!row || !row.contentId) continue;
    const prev = byId.get(row.contentId);
    if (!prev) {
      byId.set(row.contentId, row);
      continue;
    }
    const newer = String(row.date || '') > String(prev.date || '');
    const sameDateButBigger =
      String(row.date || '') === String(prev.date || '') && num(row.views) > num(prev.views);
    if (newer || sameDateButBigger) byId.set(row.contentId, row);
  }
  return byId;
}

function summarise(rows) {
  const n = rows.length;
  const views = rows.reduce((a, r) => a + num(r.views), 0);
  const eng = rows.reduce((a, r) => a + engagement(r), 0);
  const clicks = rows.reduce((a, r) => a + num(r.clicks), 0);
  return {
    n,
    medianViews: median(rows.map((r) => num(r.views))),
    meanViews: n ? Math.round(views / n) : 0,
    meanEngagement: n ? Math.round(eng / n) : 0,
    // Engagement rate only means something when there are views to divide by.
    engagementRate: views ? Number((eng / views).toFixed(4)) : null,
    totalClicks: clicks,
  };
}

// A group is judged against the OTHER posts, not against a baseline it is itself part of.
// If half your posts are Teardowns, Teardowns drag the all-posts baseline toward themselves
// and can never look like they outperform it. The honest question is "does this beat the rest?".
function compare(groupRows, restRows) {
  const groupMedian = median(groupRows.map((r) => num(r.views)));
  const restMedian = median(restRows.map((r) => num(r.views)));

  if (groupRows.length < MIN_SAMPLE) return { index: null, verdict: 'insufficient' };
  // Nothing credible to compare against.
  if (restRows.length < MIN_SAMPLE || !restMedian) return { index: null, verdict: 'insufficient' };

  const index = Number((groupMedian / restMedian).toFixed(2));
  if (index >= OVER) return { index, verdict: 'over' };
  if (index <= UNDER) return { index, verdict: 'under' };
  return { index, verdict: 'par' };
}

async function computeSignals(workspaces, slug) {
  const brandDir = path.join(workspaces, slug);
  const content = await readContent(brandDir);
  const metrics = await readJson(path.join(brandDir, 'metrics.json'), []);

  const byId = new Map(content.map((c) => [c.id, c]));
  const latest = latestPerPost(Array.isArray(metrics) ? metrics : []);

  // Join each measured post back to the attributes we want to learn from.
  const measured = [];
  const orphanMetrics = [];
  for (const [contentId, row] of latest) {
    const item = byId.get(contentId);
    if (!item) {
      orphanMetrics.push(contentId);
      continue;
    }
    measured.push({
      id: contentId,
      title: item.title || contentId,
      series: item.series || '',
      format: item.format || '',
      channel: item.channel || '',
      job: item.job || '',
      hook: item.hook || '',
      views: num(row.views),
      engagement: engagement(row),
      clicks: num(row.clicks),
      date: row.date || '',
    });
  }

  // Posted but never logged — the loop is blind to these.
  const unlogged = content
    .filter((c) => c.status === 'posted' && !latest.has(c.id))
    .map((c) => ({ id: c.id, title: c.title || c.id, channel: c.channel || '' }));

  const baseline = summarise(measured);
  const ready = measured.length >= MIN_SAMPLE;

  const dimensions = {};
  for (const dim of DIMENSIONS) {
    const groups = new Map();
    for (const m of measured) {
      const key = m[dim];
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }
    dimensions[dim] = [...groups.entries()]
      .map(([value, rows]) => {
        const rest = measured.filter((m) => m[dim] !== value);
        const s = summarise(rows);
        const { index, verdict } = compare(rows, rest);
        return { value, ...s, index, verdict };
      })
      .sort((a, b) => b.medianViews - a.medianViews);
  }

  // Only groups that cleared the sample bar are allowed to become instructions.
  const actionable = [];
  for (const dim of DIMENSIONS) {
    for (const g of dimensions[dim]) {
      if (g.verdict === 'over') {
        actionable.push({ dimension: dim, value: g.value, verdict: 'over', index: g.index, n: g.n });
      } else if (g.verdict === 'under') {
        actionable.push({ dimension: dim, value: g.value, verdict: 'under', index: g.index, n: g.n });
      }
    }
  }
  actionable.sort((a, b) => (b.index || 0) - (a.index || 0));

  const ranked = [...measured].sort((a, b) => b.views - a.views);

  return {
    generatedAt: new Date().toISOString(),
    minSample: MIN_SAMPLE,
    measuredPosts: measured.length,
    unloggedPosted: unlogged,
    orphanMetrics,
    // When ready is false, NOTHING here is evidence. Say so rather than acting on it.
    ready,
    readyNote: ready
      ? `Based on ${measured.length} measured posts. Groups with fewer than ${MIN_SAMPLE} posts are marked insufficient and must not be treated as findings.`
      : `Only ${measured.length} measured post(s). Below the ${MIN_SAMPLE}-post minimum, so there are no findings yet. Log more results before letting numbers steer the plan.`,
    baseline,
    dimensions,
    actionable: ready ? actionable : [],
    topPosts: ranked.slice(0, 3),
    bottomPosts: ranked.length > 3 ? ranked.slice(-3).reverse() : [],
  };
}

// Recomputed and written on every metrics change, so signals.json is never stale.
async function writeSignals(workspaces, slug) {
  const signals = await computeSignals(workspaces, slug);
  await fsp.writeFile(
    path.join(workspaces, slug, 'signals.json'),
    JSON.stringify(signals, null, 2)
  );
  return signals;
}

module.exports = { computeSignals, writeSignals, MIN_SAMPLE };
