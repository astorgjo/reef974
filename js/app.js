/* Reef974 — carte interactive
   Les données viennent de /data/*.json (modifiables depuis l'admin Pages CMS). */

const TYPES = {
  photo:   { label: 'Spots photo', badge: 'Spot photo', color: 'var(--photo)' },
  van:     { label: 'Spots van',   badge: 'Spot van',   color: 'var(--van)' },
  bivouac: { label: 'Bivouacs',    badge: 'Bivouac',    color: 'var(--bivouac)' },
  rando:   { label: 'Randos',      badge: 'Rando',      color: 'var(--rando)' }
};

const ICONS = {
  photo: '<path d="M3 12c3-4 7-6 11-6 3 0 5 2 7 6-2 4-4 6-7 6-4 0-8-2-11-6z"/><path d="M3 12l-1-3M3 12l-1 3"/><circle cx="16" cy="11" r="1"/>',
  van: '<path d="M2 16V8a2 2 0 0 1 2-2h11l5 5v5h-2"/><path d="M6 16h8"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/><path d="M15 6v5h5"/>',
  bivouac: '<path d="M3 20L12 4l9 16z"/><path d="M12 20l-3-6h6z"/>',
  rando: '<path d="M2 20l7-12 4 6 3-4 6 10z"/>'
};

/* Projection : doit rester identique à celle qui a servi à dessiner la carte SVG */
const PROJ = { lon0: 55.17, lat0: -20.83, c: Math.cos(21.15 * Math.PI / 180), s: 1510 };
const VIEW = { x: -140, y: -120, w: 1240, h: 1110 };
const toXY = (lat, lon) => [(lon - PROJ.lon0) * PROJ.c * PROJ.s, (PROJ.lat0 - lat) * PROJ.s];
const toPct = (lat, lon) => {
  const [x, y] = toXY(lat, lon);
  return [((x - VIEW.x) / VIEW.w) * 100, ((y - VIEW.y) / VIEW.h) * 100];
};

const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svgIcon = (type, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[type] || ICONS.photo}</svg>`;

const state = { spots: [], missions: [], site: {}, selected: null, hidden: new Set(), mission: 0 };

async function load() {
  const get = (p) => fetch(p, { cache: 'no-cache' }).then((r) => r.json());
  const [spots, missions, site] = await Promise.all([get('data/spots.json'), get('data/missions.json'), get('data/site.json')]);
  state.spots = spots.filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');
  state.missions = missions;
  state.site = site;
  state.selected = state.spots[0]?.id;
  renderFilters();
  renderMarkers();
  renderCard();
  renderMissions();
  renderMissionRoute();
  renderVan();
  renderStats();
}

function spotById(id) { return state.spots.find((s) => s.id === id); }

function renderFilters() {
  $('#filters').innerHTML = Object.entries(TYPES).map(([k, t]) =>
    `<button type="button" class="chip" data-type="${k}" aria-pressed="${!state.hidden.has(k)}" style="--c:${t.color}"><i></i>${t.label}</button>`
  ).join('');
  $('#filters').querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.type;
    state.hidden.has(k) ? state.hidden.delete(k) : state.hidden.add(k);
    renderFilters();
    renderMarkers();
  }));
}

function renderMarkers() {
  const layer = $('#markers');
  layer.innerHTML = state.spots.filter((s) => !state.hidden.has(s.type)).map((s) => {
    const [x, y] = toPct(s.lat, s.lon);
    const t = TYPES[s.type] || TYPES.photo;
    return `<button type="button" class="marker" data-id="${esc(s.id)}" aria-pressed="${s.id === state.selected}" aria-label="${esc(t.badge)} : ${esc(s.name)}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--c:${t.color}">
      <span class="ring" aria-hidden="true"></span><span class="dot">${svgIcon(s.type)}</span></button>`;
  }).join('');
  layer.querySelectorAll('.marker').forEach((b) => b.addEventListener('click', () => {
    state.selected = b.dataset.id;
    renderMarkers();
    renderCard();
  }));
}

function renderCard() {
  const s = spotById(state.selected);
  if (!s) return;
  const t = TYPES[s.type] || TYPES.photo;
  const photo = (s.photos || []).find((p) => p.image);
  $('#spot-card').innerHTML = `
    <div class="card-media">
      ${photo ? `<img src="${esc(photo.image)}" alt="${esc(photo.species || s.name)}">` : `<span class="ph">Photo · ${esc(s.name)}</span>`}
      <span class="badge" style="--c:${t.color}">${t.badge}</span>
    </div>
    <div class="card-body">
      <div><h2>${esc(s.name)}</h2><div class="area">${esc(s.area)}</div></div>
      <p>${esc(s.text)}</p>
      <div class="tags">${(s.tags || []).map((g) => `<span>${esc(g)}</span>`).join('')}</div>
      <button type="button" class="btn" id="open-photos">
        Voir les photos du spot${s.photos?.length ? ` (${s.photos.length})` : ''}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
      </button>
    </div>`;
  $('#open-photos').addEventListener('click', () => openLightbox(s));
}

function openLightbox(s) {
  const dlg = $('#lightbox');
  const photos = (s.photos || []).filter((p) => p.image);
  $('#lb-title').textContent = s.name;
  $('#lb-body').innerHTML = photos.length
    ? `<div class="lb-grid">${photos.map((p) => `
        <figure><img src="${esc(p.image)}" alt="${esc(p.species || s.name)}" loading="lazy">
          <figcaption><b>${esc(p.species || '')}</b>${[p.date, p.depth ? p.depth + ' m' : ''].filter(Boolean).map(esc).join(' · ')}${p.caption ? `<span>${esc(p.caption)}</span>` : ''}</figcaption>
        </figure>`).join('')}</div>`
    : `<p class="lb-empty">Les photos de ce spot arrivent bientôt.</p>`;
  dlg.showModal();
}

function renderMissionRoute() {
  const m = state.missions[state.mission];
  const layer = document.getElementById('mission-layer');
  const tag = $('#mission-tag');
  if (!m || !layer) return;
  const pts = (m.steps || []).map(spotById).filter(Boolean).map((s) => toXY(s.lat, s.lon));
  if (pts.length < 2) { layer.innerHTML = ''; tag.hidden = true; return; }
  const d = 'M' + pts.map(([x, y]) => `${x.toFixed(0)},${y.toFixed(0)}`).join(' L');
  layer.innerHTML = `<path class="route-glow" d="${d}"/><path class="route" d="${d}"/>`;
  const last = spotById(m.steps[m.steps.length - 1]);
  const first = spotById(m.steps[0]);
  const [x1, y1] = toPct(first.lat, first.lon);
  const [x2, y2] = toPct(last.lat, last.lon);
  tag.hidden = false;
  tag.textContent = 'Mission · ' + m.title;
  tag.style.left = ((x1 + x2) / 2) + '%';
  tag.style.top = (Math.max(y1, y2) + 6) + '%';
}

function renderMissions() {
  $('#missions-list').innerHTML = state.missions.map((m, i) => {
    const steps = (m.steps || []).map((id) => spotById(id)?.name || id);
    return `<article class="mission${i === state.mission ? ' active' : ''}">
      <div class="mission-top"><span>Mission ${String(i + 1).padStart(2, '0')}</span><span class="pill">${i === state.mission ? 'Sur la carte' : 'Disponible'}</span></div>
      <h3>${esc(m.title)}</h3>
      <div class="kpis">
        <div><small>Durée</small><b>${esc(m.days)}</b></div>
        <div><small>Distance</small><b>${esc(m.km)}</b></div>
        <div><small>Étapes</small><b>${steps.length}</b></div>
      </div>
      <ol class="steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="mission-actions">
        <button type="button" class="btn-ghost" data-show="${i}">Voir sur la carte</button>
        <a class="btn btn-outline" href="#van">Lancer la mission avec ${esc(state.site.van?.name || 'le van')}</a>
      </div>
    </article>`;
  }).join('');
  $('#missions-list').querySelectorAll('[data-show]').forEach((b) => b.addEventListener('click', () => {
    state.mission = Number(b.dataset.show);
    renderMissions();
    renderMissionRoute();
    $('#carte').scrollIntoView({ behavior: 'smooth' });
  }));
}

function renderVan() {
  const v = state.site.van || {};
  $('#van-name').textContent = v.name || 'Don Pablo';
  $('#van-pitch').textContent = v.pitch || '';
  $('#van-beds').textContent = v.beds || '—';
  $('#van-equipment').textContent = v.equipment || '—';
  $('#van-price').textContent = v.price || '—';
  $('#van-cta').textContent = v.status || 'Bientôt à la location';
  $('#van-media').innerHTML = v.photo
    ? `<img src="${esc(v.photo)}" alt="${esc(v.name)} sur un spot">`
    : `<span class="ph">Photo · ${esc(v.name || 'le van')} sur un spot</span>`;
  const ig = state.site.instagram;
  if (ig) document.querySelectorAll('[data-instagram]').forEach((a) => { a.href = `https://www.instagram.com/${ig}`; a.querySelector('[data-ig-name]').textContent = '@' + ig; });
}

function renderStats() {
  const photoSpots = state.spots.filter((s) => s.type === 'photo').length;
  const species = new Set(state.spots.flatMap((s) => (s.photos || []).map((p) => (p.species || '').trim().toLowerCase())).filter(Boolean));
  $('#stat-spots').innerHTML = `${photoSpots} <em>spots photo</em>`;
  $('#stat-species').innerHTML = `${species.size} <em>espèces</em>`;
  $('#stat-missions').innerHTML = `${state.missions.length} <em>missions</em>`;
}

document.getElementById('lb-close').addEventListener('click', () => document.getElementById('lightbox').close());
document.getElementById('lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') e.target.close(); });

load().catch((err) => {
  console.error(err);
  document.getElementById('spot-card').innerHTML = '<div class="card-body"><p>Impossible de charger les spots pour le moment.</p></div>';
});
