/* Reef974 — page Espèces (bestiaire) */

const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (v) => String(v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

let entries = [];
let filter = 'all';

async function load() {
  const get = (p) => fetch(p, { cache: 'no-cache' }).then((r) => r.json());
  const [spots, catalog, site] = await Promise.all([get('data/spots.json'), get('data/especes.json'), get('data/site.json').catch(() => ({}))]);

  entries = catalog.map((c) => ({ ...c, keys: [c.name, ...(c.aliases || [])].map(norm), photos: [], spots: new Map() }));
  spots.forEach((s) => (s.photos || []).filter((p) => p.image || p.video).forEach((p) => {
    const k = norm(p.species);
    if (!k) return;
    let e = entries.find((x) => x.keys.includes(k));
    if (!e) {
      e = { name: p.species.trim(), shape: 'poisson', family: 'Autres', body: '#7fb8d8', accent: '#24506a', note: '', keys: [k], photos: [], spots: new Map() };
      entries.push(e);
    }
    e.photos.push({ ...p, _spot: s });
    e.spots.set(s.id, s);
  }));
  entries.forEach((e, i) => { e.seen = e.photos.length > 0; e.order = i; });
  entries.sort((a, b) => (b.seen - a.seen) || (b.photos.length - a.photos.length) || (a.order - b.order));

  const seen = entries.filter((e) => e.seen).length;
  $('#stat-collection').innerHTML = `${seen} <em>/ ${entries.length} espèces</em>`;
  $('#collection-fill').style.width = (entries.length ? (seen / entries.length) * 100 : 0) + '%';
  if (site.instagram) document.querySelectorAll('[data-instagram]').forEach((a) => { a.href = `https://www.instagram.com/${site.instagram}`; const n = a.querySelector('[data-ig-name]'); if (n) n.textContent = '@' + site.instagram; });
  render();
}

function render() {
  const list = entries.filter((e) => filter === 'all' || (filter === 'seen' ? e.seen : !e.seen));
  $('#bestiaire').innerHTML = list.map((e) => {
    const idx = entries.indexOf(e) + 1;
    const spotNames = [...e.spots.values()].map((s) => s.name);
    const firstSpot = [...e.spots.values()][0];
    return `<article class="sp-card ${e.seen ? 'seen' : 'locked'}">
      <div class="sp-art">
        <span class="sp-num">#${String(idx).padStart(3, '0')}</span>
        <span class="sp-badge">${e.seen ? `${e.photos.length} ${e.photos.length > 1 ? 'médias' : 'média'}` : 'À découvrir'}</span>
        ${FISH_ART.draw(e.shape, e.body, e.accent, !e.seen)}
      </div>
      <div class="sp-body">
        <h2>${e.seen ? esc(e.name) : esc(e.name)}</h2>
        <span class="sp-family">${esc(e.family || '')}</span>
        ${e.note ? `<p>${esc(e.note)}</p>` : ''}
        ${e.seen ? `<span class="sp-meta">Vu à : ${spotNames.map(esc).join(', ')}</span>` : '<span class="sp-meta">Pas encore photographiée.</span>'}
        ${e.seen ? `<div class="sp-actions">
          <button type="button" class="btn" data-view="${idx - 1}">Voir les photos</button>
          <a class="btn-ghost" href="./?spot=${encodeURIComponent(firstSpot.id)}#carte">Sur la carte</a>
        </div>` : ''}
      </div>
    </article>`;
  }).join('');
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => openViewer(entries[Number(b.dataset.view)])));
}

document.querySelectorAll('#sp-filters .chip').forEach((b) => b.addEventListener('click', () => {
  filter = b.dataset.f;
  document.querySelectorAll('#sp-filters .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  render();
}));

/* ---------- Visionneuse ---------- */
let viewer = null;
function openViewer(e) {
  viewer = { e, index: 0 };
  const dlg = $('#lightbox');
  dlg.classList.add('single');
  draw();
  if (!dlg.open) dlg.showModal();
}
function step(d) {
  if (!viewer || viewer.e.photos.length < 2) return;
  viewer.index = (viewer.index + d + viewer.e.photos.length) % viewer.e.photos.length;
  draw();
}
function draw() {
  const { e, index } = viewer;
  const list = e.photos;
  const p = list[index];
  const many = list.length > 1;
  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (x) { return d; } };
  $('#lb-title').textContent = e.name + (many ? `  ·  ${index + 1} / ${list.length}` : '');
  const rows = [['Espèce', p.species], ['Lieu', p.place || p._spot.name], ['Date', p.date ? fmtDate(p.date) : ''], ['Profondeur', p.depth ? p.depth + ' m' : '']].filter(([, v]) => v);
  $('#lb-body').innerHTML = `
    <div class="lb-single">
      ${many ? '<button type="button" class="lb-nav prev" aria-label="Photo précédente">‹</button>' : ''}
      ${p.video
        ? `<video src="${esc(p.video)}" ${p.image ? `poster="${esc(p.image)}"` : ''} controls autoplay muted playsinline loop></video>`
        : `<img src="${esc(p.image)}" alt="${esc(p.species || e.name)}">`}
      ${many ? '<button type="button" class="lb-nav next" aria-label="Photo suivante">›</button>' : ''}
    </div>
    ${many ? `<div class="lb-dots" aria-hidden="true">${list.map((_, i) => `<span class="${i === index ? 'on' : ''}"></span>`).join('')}</div>` : ''}
    <div class="lb-info">
      <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${p.caption ? `<p>${esc(p.caption)}</p>` : ''}
    </div>`;
  if (many) {
    $('#lb-body .lb-nav.prev').addEventListener('click', () => step(-1));
    $('#lb-body .lb-nav.next').addEventListener('click', () => step(1));
  }
}
document.addEventListener('keydown', (e) => {
  if (!$('#lightbox').open) return;
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowLeft') step(-1);
});
$('#lb-close').addEventListener('click', () => $('#lightbox').close());
$('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') e.target.close(); });

load().catch((err) => { console.error(err); $('#bestiaire').innerHTML = '<p>Impossible de charger les espèces pour le moment.</p>'; });
