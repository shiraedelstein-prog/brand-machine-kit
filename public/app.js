/* Brand Machine dashboard SPA */
'use strict';

const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');

/* ---------- channel color assignment (fixed order, never cycled) ---------- */
const CHANNEL_SLOTS = ['tiktok', 'instagram', 'youtube', 'x', 'linkedin', 'pinterest'];
const CHANNEL_LABELS = {
  tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube',
  x: 'X / Twitter', linkedin: 'LinkedIn', pinterest: 'Pinterest',
};
function chanColor(channel) {
  const i = CHANNEL_SLOTS.indexOf((channel || '').toLowerCase());
  return `var(--series-${i >= 0 ? i + 1 : 6})`;
}
function chanLabel(c) { return CHANNEL_LABELS[(c || '').toLowerCase()] || c || '—'; }

const STATUSES = ['idea', 'draft', 'ready', 'posted'];
const STATUS_LABELS = { idea: 'Ideas', draft: 'Drafts', ready: 'Ready to post', posted: 'Posted' };

/* ---------- helpers ---------- */
async function api(path, opts) {
  const res = await fetch('/api' + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.round(n));
}
function toast(msg) {
  const t = el(`<div class="toast">${esc(msg)}</div>`);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
function copyText(text, label) {
  navigator.clipboard.writeText(text).then(() => toast(`${label} copied`));
}

/* ---------- tiny markdown renderer ---------- */
function renderMd(md) {
  const lines = md.split(/\r?\n/);
  let html = '', inList = null, inTable = false, para = [];
  const inline = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const flushPara = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
  const closeList = () => { if (inList) { html += `</${inList}>`; inList = null; } };
  const closeTable = () => { if (inTable) { html += '</tbody></table>'; inTable = false; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { flushPara(); closeList(); closeTable(); continue; }

    if (t.startsWith('|')) {
      flushPara(); closeList();
      const cells = t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // separator row
      if (!inTable) {
        html += `<table><thead><tr>${cells.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>`;
        inTable = true;
      } else {
        html += `<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`;
      }
      continue;
    }
    closeTable();

    const h = t.match(/^(#{1,4})\s+(.*)/);
    if (h) { flushPara(); closeList(); html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; continue; }
    if (/^(-{3,}|\*{3,})$/.test(t)) { flushPara(); closeList(); html += '<hr>'; continue; }
    if (t.startsWith('>')) { flushPara(); closeList(); html += `<blockquote>${inline(t.slice(1).trim())}</blockquote>`; continue; }

    const ul = t.match(/^[-*]\s+(.*)/);
    const ol = t.match(/^\d+\.\s+(.*)/);
    if (ul || ol) {
      flushPara();
      const want = ul ? 'ul' : 'ol';
      if (inList !== want) { closeList(); html += `<${want}>`; inList = want; }
      html += `<li>${inline((ul || ol)[1])}</li>`;
      continue;
    }
    closeList();
    para.push(t);
  }
  flushPara(); closeList(); closeTable();
  return html;
}

/* ---------- router ---------- */
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  modalRoot.innerHTML = '';
  if (parts[0] === 'b' && parts[1]) return renderBrand(parts[1], parts[2] || 'overview');
  return renderHome();
}

/* ================= HOME ================= */
async function renderHome() {
  app.innerHTML = '<div class="loading">Loading…</div>';
  const brands = await api('/brands');
  app.innerHTML = '';
  app.appendChild(el(`<div>
    <h1>Your brands</h1>
    <p class="sub">Each brand is a workspace of files. Run pipeline steps with Claude Code; watch everything here.</p>
  </div>`));

  const grid = el('<div class="grid cols-3"></div>');
  for (const b of brands) {
    const docsDone = Object.values(b.docs).filter(Boolean).length;
    grid.appendChild(el(`<a class="card brand-card" href="#/b/${b.slug}">
      <h3>${esc(b.name)}</h3>
      <div class="niche">${esc(b.niche || 'no niche set')}</div>
      <div class="pill-row">
        <span class="pill ${docsDone === 4 ? 'on' : ''}">${docsDone}/4 strategy docs</span>
        <span class="pill">${b.contentCounts.idea + b.contentCounts.draft + b.contentCounts.ready} in pipeline</span>
        <span class="pill ${b.contentCounts.posted ? 'on' : ''}">${b.contentCounts.posted} posted</span>
        <span class="pill">${fmt(b.totalViews)} views tracked</span>
      </div>
    </a>`));
  }
  app.appendChild(grid);

  app.appendChild(el(`<div class="card" style="margin-top:24px;max-width:560px">
    <h2 style="margin-top:0">New brand</h2>
    <div class="form-row">
      <input type="text" id="nb-name" placeholder="Brand name" />
      <input type="text" id="nb-niche" placeholder="Niche (e.g. men's skincare)" />
    </div>
    <button class="btn primary" id="nb-create">Create workspace</button>
    <p class="note" style="margin-top:10px">Then tell Claude Code: <em>"Run the brand identity step for &lt;name&gt;"</em> — it fills the workspace and everything appears here.</p>
  </div>`));
  document.getElementById('nb-create').onclick = async () => {
    const name = document.getElementById('nb-name').value.trim();
    const niche = document.getElementById('nb-niche').value.trim();
    if (!name) return toast('Enter a brand name');
    try {
      const b = await api('/brands', { method: 'POST', body: JSON.stringify({ name, niche }) });
      location.hash = `#/b/${b.slug}`;
    } catch (e) { toast(e.message); }
  };
}

/* ================= BRAND ================= */
const TABS = [
  ['overview', 'Overview'], ['identity', 'Brand identity'], ['visual', 'Visual identity'],
  ['channels', 'Channels'], ['research', 'Viral research'], ['plan', 'Content plan'],
  ['content', 'Content'], ['results', 'Results'],
];
const TAB_DOC = { identity: 'brand-identity', visual: 'visual-identity', channels: 'channel-strategy', research: 'viral-research', plan: 'content-plan' };

async function renderBrand(slug, tab) {
  app.innerHTML = '<div class="loading">Loading…</div>';
  let b;
  try { b = await api('/brands/' + slug); }
  catch { app.innerHTML = '<p class="empty">Brand not found. <a href="#/">Back</a></p>'; return; }

  app.innerHTML = '';
  app.appendChild(el(`<div>
    <p class="sub" style="margin:0"><a href="#/">← All brands</a></p>
    <h1>${esc(b.name)}</h1>
    <p class="sub">${esc(b.niche || '')}</p>
  </div>`));

  const tabs = el('<nav class="tabs"></nav>');
  for (const [key, label] of TABS) {
    const btn = el(`<button class="tab ${key === tab ? 'active' : ''}">${label}</button>`);
    btn.onclick = () => { location.hash = `#/b/${slug}/${key}`; };
    tabs.appendChild(btn);
  }
  app.appendChild(tabs);

  const body = el('<div></div>');
  app.appendChild(body);

  if (tab === 'overview') renderOverview(body, b);
  else if (TAB_DOC[tab]) renderDoc(body, b, TAB_DOC[tab], tab);
  else if (tab === 'content') renderContent(body, b);
  else if (tab === 'results') renderResults(body, b);
}

/* ---------- overview ---------- */
function renderOverview(root, b) {
  const c = b.content;
  const counts = { idea: 0, draft: 0, ready: 0, posted: 0 };
  c.forEach((i) => counts[i.status] !== undefined && counts[i.status]++);
  const steps = [
    ['brand-identity', 'Brand identity', 'Positioning, audience, voice, story', `Ask Claude: "Run the brand identity step for ${b.name}"`],
    ['visual-identity', 'Visual identity', 'Colors, type, image style, do/don\'t', `Ask Claude: "Run the visual identity step for ${b.name}"`],
    ['channel-strategy', 'Channel strategy', 'Best channels for the niche + cadence', `Ask Claude: "Pick the best channels for ${b.name}"`],
    ['viral-research', 'Viral research', 'What\'s working in the niche right now', `Ask Claude: "Run viral research for ${b.name}"`],
    ['content-plan', 'Content plan', '2–3 recurring series with jobs + 30-day calendar', `Ask Claude: "Build the content plan for ${b.name}"`],
  ];
  const wrap = el('<div class="card" style="max-width:760px"><h2 style="margin-top:0">Pipeline</h2><div class="steps"></div></div>');
  const list = wrap.querySelector('.steps');
  steps.forEach(([doc, title, desc, hint], i) => {
    const done = b.docs[doc];
    list.appendChild(el(`<div class="step ${done ? 'done' : ''}">
      <div class="dot">${done ? '✓' : i + 1}</div>
      <div><h4>${title}</h4><p>${desc}</p>${done ? '' : `<p class="hint">${esc(hint)}</p>`}</div>
    </div>`));
  });
  list.appendChild(el(`<div class="step ${c.length ? 'done' : ''}">
    <div class="dot">${c.length ? '✓' : 6}</div>
    <div><h4>Content machine</h4>
      <p>${counts.idea} ideas · ${counts.draft} drafts · ${counts.ready} ready · ${counts.posted} posted</p>
      ${c.length ? '' : `<p class="hint">Ask Claude: "Generate a content batch for ${esc(b.name)}"</p>`}
    </div>
  </div>`));
  list.appendChild(el(`<div class="step ${b.metrics.length ? 'done' : ''}">
    <div class="dot">${b.metrics.length ? '✓' : 7}</div>
    <div><h4>Results tracking</h4>
      <p>${b.metrics.length} metric entries logged</p>
      ${b.metrics.length ? '' : '<p class="hint">Add entries or import a CSV in the Results tab after posting.</p>'}
    </div>
  </div>`));
  root.appendChild(wrap);
}

/* ---------- strategy doc tabs ---------- */
async function renderDoc(root, b, doc, tab) {
  if (!b.docs[doc]) {
    root.appendChild(el(`<div class="doc-missing">
      <p>This document hasn't been generated yet.</p>
      <p>Tell Claude Code: <code>Run the ${doc.replace(/-/g, ' ')} step for ${esc(b.name)}</code> — it writes
      <code>workspaces/${b.slug}/${doc === 'viral-research' ? 'research/viral-research.md' : doc + '.md'}</code> and this tab lights up.</p>
    </div>`));
    return;
  }
  const { markdown } = await api(`/brands/${b.slug}/docs/${doc}`);
  const wrap = el('<div class="md"></div>');
  if (tab === 'visual') {
    const hexes = [...new Set((markdown.match(/#[0-9a-fA-F]{6}\b/g) || []))].slice(0, 10);
    if (hexes.length) {
      const row = el('<div class="swatch-row"></div>');
      hexes.forEach((h) => row.appendChild(el(`<div class="swatch"><div class="chip" style="background:${h}"></div>${h}</div>`)));
      wrap.appendChild(row);
    }
  }
  wrap.appendChild(el(`<div>${renderMd(markdown)}</div>`));
  root.appendChild(wrap);
}

/* ---------- content board ---------- */
function renderContent(root, b) {
  if (!b.content.length) {
    root.appendChild(el(`<div class="doc-missing">
      <p>No content yet.</p>
      <p>Tell Claude Code: <code>Generate a content batch for ${esc(b.name)}</code>. It writes one JSON file per piece into
      <code>workspaces/${b.slug}/content/</code> — with hooks, captions, scripts, and generated media in <code>assets/</code>.</p>
    </div>`));
    return;
  }
  const board = el('<div class="board"></div>');
  for (const status of STATUSES) {
    const items = b.content.filter((i) => i.status === status);
    const col = el(`<div>
      <div class="col-head"><span class="dot-s" style="background:var(--status-${status})"></span>
      ${STATUS_LABELS[status]} <span class="count">${items.length}</span></div>
    </div>`);
    for (const item of items) {
      const card = el(`<div class="card content-card">
        <h4>${esc(item.title)}</h4>
        <div class="meta">
          <span class="chan-tag"><span class="dot-s" style="background:${chanColor(item.channel)}"></span>${esc(chanLabel(item.channel))}</span>
          <span>${esc(item.format || '')}</span>
          ${item.series ? `<span>📚 ${esc(item.series)}</span>` : ''}
          ${item.assets && item.assets.length ? `<span>🖼 ${item.assets.length}</span>` : ''}
        </div>
        ${item.hook ? `<div class="hook">“${esc(item.hook.length > 90 ? item.hook.slice(0, 90) + '…' : item.hook)}”</div>` : ''}
      </div>`);
      card.onclick = () => openContentModal(b, item);
      col.appendChild(card);
    }
    board.appendChild(col);
  }
  root.appendChild(board);
}

function openContentModal(b, item) {
  const overlay = el('<div class="modal-overlay"></div>');
  const assetHtml = (item.assets || []).map((a) => {
    const url = `/files/${b.slug}/${a}`;
    return /\.(mp4|webm)$/i.test(a)
      ? `<video src="${url}" controls muted></video>`
      : `<img src="${url}" alt="" loading="lazy" />`;
  }).join('');
  const fields = [
    ['Hook', item.hook], ['Body / caption', item.body], ['CTA', item.cta],
    ['Hashtags', (item.hashtags || []).join(' ')], ['Script', item.script],
    ['Series / job', [item.series, item.job].filter(Boolean).join(' — ')],
    ['Source insight', item.sourceInsight],
  ];
  const modal = el(`<div class="modal">
    <button class="close" title="Close">✕</button>
    <h3>${esc(item.title)}</h3>
    <div class="meta" style="color:var(--text-muted);font-size:13px">
      <span class="chan-tag"><span class="dot-s" style="background:${chanColor(item.channel)}"></span>${esc(chanLabel(item.channel))}</span>
      · ${esc(item.format || '')} · <span style="color:var(--status-${item.status})">${esc(item.status)}</span>
      ${item.postUrl ? ` · <a href="${esc(item.postUrl)}" target="_blank" rel="noopener">view post ↗</a>` : ''}
    </div>
    ${fields.filter(([, v]) => v).map(([label, v]) => `
      <div class="field"><label>${label}<button class="copy-btn" data-copy="${esc(v)}">copy</button></label>
      <div class="val">${esc(v)}</div></div>`).join('')}
    ${assetHtml ? `<div class="field"><label>Assets</label><div class="asset-grid">${assetHtml}</div></div>` : ''}
    <div class="status-row"></div>
  </div>`);
  modal.querySelector('.close').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  modal.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.onclick = () => copyText(btn.dataset.copy, 'Text');
  });

  const row = modal.querySelector('.status-row');
  const idx = STATUSES.indexOf(item.status);
  if (idx < STATUSES.length - 1) {
    const next = STATUSES[idx + 1];
    const btn = el(`<button class="btn primary">Move to ${STATUS_LABELS[next]}</button>`);
    btn.onclick = async () => {
      let patch = { status: next };
      if (next === 'posted') {
        const url = prompt('Post URL (optional):', '');
        if (url) patch.postUrl = url;
      }
      await api(`/brands/${b.slug}/content/${item.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      overlay.remove();
      route();
    };
    row.appendChild(btn);
  }
  if (idx > 0) {
    const prev = STATUSES[idx - 1];
    const btn = el(`<button class="btn">Back to ${STATUS_LABELS[prev]}</button>`);
    btn.onclick = async () => {
      await api(`/brands/${b.slug}/content/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status: prev }) });
      overlay.remove();
      route();
    };
    row.appendChild(btn);
  }

  overlay.appendChild(modal);
  modalRoot.appendChild(overlay);
}

/* ---------- results ---------- */
function renderResults(root, b) {
  const m = b.metrics;
  const eng = (r) => (Number(r.likes) || 0) + (Number(r.comments) || 0) + (Number(r.shares) || 0) + (Number(r.saves) || 0);
  const totalViews = m.reduce((a, r) => a + (Number(r.views) || 0), 0);
  const totalEng = m.reduce((a, r) => a + eng(r), 0);
  const engRate = totalViews ? (totalEng / totalViews * 100) : 0;
  const followers = m.reduce((a, r) => a + (Number(r.followersGained) || 0), 0);

  // best post by views
  const byContent = {};
  for (const r of m) {
    const key = r.contentId || '(untracked)';
    byContent[key] = byContent[key] || { views: 0, eng: 0 };
    byContent[key].views += Number(r.views) || 0;
    byContent[key].eng += eng(r);
  }
  const best = Object.entries(byContent).sort((a, z) => z[1].views - a[1].views)[0];
  const titleOf = (id) => (b.content.find((c) => c.id === id) || {}).title || id;

  root.appendChild(el(`<div class="grid cols-4">
    <div class="card stat-tile"><div class="label">Views tracked</div><div class="value">${fmt(totalViews)}</div></div>
    <div class="card stat-tile"><div class="label">Engagements</div><div class="value">${fmt(totalEng)}</div></div>
    <div class="card stat-tile"><div class="label">Engagement rate</div><div class="value">${engRate.toFixed(1)}%</div></div>
    <div class="card stat-tile"><div class="label">Followers gained</div><div class="value">${followers >= 0 ? '+' : ''}${fmt(followers)}</div></div>
  </div>`));
  if (best && best[1].views > 0) {
    root.appendChild(el(`<p class="note" style="margin:12px 2px 0">🏆 Best performer: <strong>${esc(titleOf(best[0]))}</strong> — ${fmt(best[1].views)} views, ${fmt(best[1].eng)} engagements</p>`));
  }

  root.appendChild(signalsCard(b.signals));

  if (m.length) {
    root.appendChild(lineChartCard(m));
    root.appendChild(barChartCard(byContent, titleOf));
    root.appendChild(tableCard(m, titleOf));
  } else {
    root.appendChild(el('<p class="empty">No metrics yet — add your first entry below after posting.</p>'));
  }
  root.appendChild(entryFormCard(b));
}

/* ---------- signals: what the numbers actually say ----------
   This is the panel that closes the loop. Steps 5 and 6 of the pipeline read the
   same signals.json this renders, so what you see here is literally what Claude
   is required to plan the next batch against. */
const DIM_LABEL = { series: 'Series', format: 'Format', channel: 'Channel', job: 'Job' };

function signalsCard(s) {
  if (!s) return el('<div></div>');

  // Below the sample floor there are no findings, and the panel says so rather than
  // dressing up 2 posts as a trend.
  if (!s.ready) {
    return el(`<div class="card signals">
      <div class="card-head">
        <h3>Signals</h3>
        <span class="pill pill-muted">${s.measuredPosts}/${s.minSample} posts measured</span>
      </div>
      <p class="note">${esc(s.readyNote)}</p>
      ${unloggedNote(s)}
    </div>`);
  }

  const rows = s.actionable.map((a) => `
    <li class="signal ${a.verdict}">
      <span class="signal-verdict">${a.verdict === 'over' ? 'Do more' : 'Fix or cut'}</span>
      <span class="signal-what"><b>${esc(a.value)}</b> <span class="dim">${DIM_LABEL[a.dimension] || a.dimension}</span></span>
      <span class="signal-index">${a.index}x baseline</span>
      <span class="signal-n">n=${a.n}</span>
    </li>`).join('');

  return el(`<div class="card signals">
    <div class="card-head">
      <h3>Signals</h3>
      <span class="pill">${s.measuredPosts} posts measured</span>
    </div>
    <p class="note">${esc(s.readyNote)}</p>
    ${s.actionable.length
      ? `<ul class="signal-list">${rows}</ul>
         <p class="hint">Claude reads this before writing the next batch. Ask it to “rebuild the content plan from the signals”.</p>`
      : '<p class="note">Nothing is clearly over or under performing yet. Everything is within normal range of your baseline.</p>'}
    ${unloggedNote(s)}
  </div>`);
}

function unloggedNote(s) {
  if (!s.unloggedPosted || !s.unloggedPosted.length) return '';
  const names = s.unloggedPosted.slice(0, 3).map((u) => esc(u.title)).join(', ');
  const more = s.unloggedPosted.length > 3 ? ` and ${s.unloggedPosted.length - 3} more` : '';
  return `<p class="hint">${s.unloggedPosted.length} posted item${s.unloggedPosted.length > 1 ? 's have' : ' has'} no results logged (${names}${more}). The loop is blind to ${s.unloggedPosted.length > 1 ? 'them' : 'it'} until you add the numbers below.</p>`;
}

/* views-over-time line chart, one series per channel */
function lineChartCard(metrics) {
  const dates = [...new Set(metrics.map((r) => r.date))].sort();
  const channels = [...new Set(metrics.map((r) => (r.channel || '').toLowerCase()).filter(Boolean))]
    .sort((a, z) => CHANNEL_SLOTS.indexOf(a) - CHANNEL_SLOTS.indexOf(z));
  if (dates.length < 2 || !channels.length) return el('<div></div>');

  const series = channels.map((ch) => ({
    channel: ch,
    values: dates.map((d) => metrics.filter((r) => r.date === d && (r.channel || '').toLowerCase() === ch)
      .reduce((a, r) => a + (Number(r.views) || 0), 0)),
  }));
  const maxY = Math.max(1, ...series.flatMap((s) => s.values));

  const W = 860, H = 260, PL = 52, PR = 90, PT = 14, PB = 30;
  const x = (i) => PL + (i / (dates.length - 1)) * (W - PL - PR);
  const y = (v) => PT + (1 - v / maxY) * (H - PT - PB);

  let gridHtml = '';
  const ticks = 4;
  for (let t = 0; t <= ticks; t++) {
    const v = (maxY / ticks) * t, yy = y(v);
    gridHtml += `<line x1="${PL}" x2="${W - PR}" y1="${yy}" y2="${yy}" stroke="var(--grid)" stroke-width="1"/>
      <text x="${PL - 8}" y="${yy + 4}" text-anchor="end" font-size="11" fill="var(--text-muted)" style="font-variant-numeric:tabular-nums">${fmt(v)}</text>`;
  }
  let xLabels = '';
  const step = Math.max(1, Math.ceil(dates.length / 7));
  dates.forEach((d, i) => {
    if (i % step === 0 || i === dates.length - 1) {
      xLabels += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--text-muted)">${d.slice(5)}</text>`;
    }
  });

  let linesHtml = '';
  series.forEach((s) => {
    const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    const col = chanColor(s.channel);
    linesHtml += `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    // direct label at line end
    linesHtml += `<text x="${W - PR + 8}" y="${y(s.values[s.values.length - 1]) + 4}" font-size="11.5" fill="var(--text-secondary)">${esc(chanLabel(s.channel))}</text>`;
  });

  const card = el(`<div class="card chart-card">
    <h3>Views over time</h3>
    <div class="chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Views over time by channel">
        ${gridHtml}
        <line x1="${PL}" x2="${W - PR}" y1="${y(0)}" y2="${y(0)}" stroke="var(--baseline)" stroke-width="1"/>
        ${xLabels}${linesHtml}
        <line class="xhair" y1="${PT}" y2="${H - PB}" stroke="var(--baseline)" stroke-width="1" style="display:none"/>
        <g class="dots"></g>
        <rect class="hit" x="${PL}" y="${PT}" width="${W - PL - PR}" height="${H - PT - PB}" fill="transparent"/>
      </svg>
      <div class="chart-tooltip"></div>
    </div>
    ${series.length > 1 ? `<div class="legend">${series.map((s) =>
      `<span class="l-item"><span class="dot-s" style="background:${chanColor(s.channel)}"></span>${esc(chanLabel(s.channel))}</span>`).join('')}</div>` : ''}
  </div>`);

  // hover layer: crosshair + tooltip on nearest date
  const svg = card.querySelector('svg');
  const hit = card.querySelector('.hit');
  const xhair = card.querySelector('.xhair');
  const dotsG = card.querySelector('.dots');
  const tip = card.querySelector('.chart-tooltip');
  const wrap = card.querySelector('.chart-wrap');
  hit.addEventListener('mousemove', (e) => {
    const rect = svg.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (W / rect.width);
    let bi = 0, bd = Infinity;
    dates.forEach((d, i) => { const dd = Math.abs(x(i) - sx); if (dd < bd) { bd = dd; bi = i; } });
    xhair.setAttribute('x1', x(bi)); xhair.setAttribute('x2', x(bi));
    xhair.style.display = '';
    dotsG.innerHTML = series.map((s) =>
      `<circle cx="${x(bi)}" cy="${y(s.values[bi])}" r="4" fill="${chanColor(s.channel)}" stroke="var(--surface-1)" stroke-width="2"/>`).join('');
    tip.innerHTML = `<div class="tt-date">${dates[bi]}</div>` + series.map((s) =>
      `<div class="tt-row"><span class="dot-s" style="width:8px;height:8px;border-radius:50%;background:${chanColor(s.channel)}"></span>${esc(chanLabel(s.channel))}: <strong>${fmt(s.values[bi])}</strong></div>`).join('');
    tip.style.display = 'block';
    const wr = wrap.getBoundingClientRect();
    const px = (x(bi) / W) * wr.width;
    tip.style.left = Math.min(px + 14, wr.width - tip.offsetWidth - 4) + 'px';
    tip.style.top = '10px';
  });
  hit.addEventListener('mouseleave', () => {
    xhair.style.display = 'none'; dotsG.innerHTML = ''; tip.style.display = 'none';
  });
  return card;
}

/* views per content piece — horizontal bars, single hue */
function barChartCard(byContent, titleOf) {
  const rows = Object.entries(byContent).filter(([id]) => id !== '(untracked)')
    .sort((a, z) => z[1].views - a[1].views).slice(0, 8);
  if (!rows.length) return el('<div></div>');
  const maxV = Math.max(1, ...rows.map(([, v]) => v.views));
  const W = 860, rowH = 34, PL = 240, PR = 70, PT = 6;
  const H = PT + rows.length * rowH + 8;

  let barsHtml = '';
  rows.forEach(([id, v], i) => {
    const yy = PT + i * rowH + 6;
    const bw = Math.max(2, (v.views / maxV) * (W - PL - PR));
    const title = titleOf(id);
    barsHtml += `
      <text x="${PL - 10}" y="${yy + 15}" text-anchor="end" font-size="12" fill="var(--text-secondary)">${esc(title.length > 34 ? title.slice(0, 34) + '…' : title)}</text>
      <path d="M ${PL} ${yy} h ${Math.max(0, bw - 4)} a 4 4 0 0 1 4 4 v ${22 - 8} a 4 4 0 0 1 -4 4 h ${-Math.max(0, bw - 4)} z" fill="var(--series-1)">
        <title>${esc(title)}: ${fmt(v.views)} views, ${fmt(v.eng)} engagements</title>
      </path>
      <text x="${PL + bw + 8}" y="${yy + 15}" font-size="12" fill="var(--text-secondary)" style="font-variant-numeric:tabular-nums">${fmt(v.views)}</text>`;
  });

  return el(`<div class="card chart-card">
    <h3>Views by content piece</h3>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Views by content piece">
      <line x1="${PL}" x2="${PL}" y1="${PT}" y2="${H - 4}" stroke="var(--baseline)" stroke-width="1"/>
      ${barsHtml}
    </svg>
  </div>`);
}

function tableCard(metrics, titleOf) {
  const rows = [...metrics].sort((a, z) => (z.date || '').localeCompare(a.date || ''));
  return el(`<div class="card chart-card">
    <h3>All entries</h3>
    <div style="overflow-x:auto"><table class="data">
      <thead><tr><th>Date</th><th>Content</th><th>Channel</th>
        <th class="num">Views</th><th class="num">Likes</th><th class="num">Comments</th>
        <th class="num">Shares</th><th class="num">Saves</th><th class="num">Followers</th></tr></thead>
      <tbody>${rows.map((r) => `<tr>
        <td>${esc(r.date || '')}</td>
        <td>${esc(titleOf(r.contentId || '') || '—')}</td>
        <td><span class="chan-tag"><span class="dot-s" style="background:${chanColor(r.channel)}"></span>${esc(chanLabel(r.channel))}</span></td>
        <td class="num">${fmt(r.views)}</td><td class="num">${fmt(r.likes)}</td>
        <td class="num">${fmt(r.comments)}</td><td class="num">${fmt(r.shares)}</td>
        <td class="num">${fmt(r.saves)}</td><td class="num">${fmt(r.followersGained)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>`);
}

function entryFormCard(b) {
  const options = b.content.filter((c) => c.status === 'posted' || c.status === 'ready')
    .map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('');
  const card = el(`<div class="card chart-card">
    <h3>Add results</h3>
    <div class="form-row">
      <input type="date" id="m-date" value="${new Date().toISOString().slice(0, 10)}" />
      <select id="m-channel">${CHANNEL_SLOTS.map((c) => `<option value="${c}">${CHANNEL_LABELS[c]}</option>`).join('')}</select>
      <select id="m-content"><option value="">(no linked content)</option>${options}</select>
    </div>
    <div class="form-row">
      <input type="number" id="m-views" placeholder="Views" min="0" />
      <input type="number" id="m-likes" placeholder="Likes" min="0" />
      <input type="number" id="m-comments" placeholder="Comments" min="0" />
      <input type="number" id="m-shares" placeholder="Shares" min="0" />
      <input type="number" id="m-saves" placeholder="Saves" min="0" />
      <input type="number" id="m-followers" placeholder="Followers +" />
    </div>
    <button class="btn primary" id="m-add">Add entry</button>
    <hr style="border:none;border-top:1px solid var(--grid);margin:18px 0" />
    <h3 style="font-size:14px">CSV import</h3>
    <p class="note">Header row: <code>date,channel,contentId,views,likes,comments,shares,saves,followersGained</code> — extra columns are kept.</p>
    <textarea id="m-csv" rows="4" placeholder="Paste CSV here…"></textarea>
    <div class="form-row" style="align-items:center">
      <button class="btn" id="m-import" style="flex:0 0 auto">Import pasted CSV</button>
      <input type="file" id="m-file" accept=".csv,text/csv" style="flex:0 0 auto;width:auto;border:none;padding:0" />
    </div>
  </div>`);

  const val = (id) => card.querySelector(id).value;
  card.querySelector('#m-add').onclick = async () => {
    const entry = {
      date: val('#m-date'), channel: val('#m-channel'), contentId: val('#m-content'),
      views: Number(val('#m-views')) || 0, likes: Number(val('#m-likes')) || 0,
      comments: Number(val('#m-comments')) || 0, shares: Number(val('#m-shares')) || 0,
      saves: Number(val('#m-saves')) || 0, followersGained: Number(val('#m-followers')) || 0,
    };
    if (!entry.date) return toast('Date required');
    await api(`/brands/${b.slug}/metrics`, { method: 'POST', body: JSON.stringify(entry) });
    toast('Entry added');
    route();
  };
  const importCsv = async (text) => {
    try {
      const r = await api(`/brands/${b.slug}/metrics/csv`, { method: 'POST', body: text });
      toast(`Imported ${r.imported} rows`);
      route();
    } catch (e) { toast(e.message); }
  };
  card.querySelector('#m-import').onclick = () => {
    const text = val('#m-csv');
    if (!text.trim()) return toast('Paste CSV first');
    importCsv(text);
  };
  card.querySelector('#m-file').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => importCsv(reader.result);
    reader.readAsText(f);
  };
  return card;
}
