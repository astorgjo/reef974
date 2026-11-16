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

const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svgIcon = (type, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[type] || ICONS.photo}</svg>`;

const state = { spots: [], missions: [], site: {}, selected: null, hidden: new Set(), mission: 0 };
const PHOTO_ZOOM = 14;
let map, spotMarkers = [], photoMarkers = [], is3D = true;

function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: REEF_MAP.style(),
    bounds: REEF_MAP.BOUNDS,
    fitBoundsOptions: { padding: 30 },
    pitch: 45, bearing: -12,
    maxPitch: 70, minZoom: 8.5, maxZoom: 19,
    attributionControl: { compact: true, customAttribution: REEF_MAP.attribution },
    cooperativeGestures: false
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.on('load', () => {
    map.setTerrain({ source: 'dem3d', exaggeration: 1.3 });
    map.addSource('mission', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'mission-glow', type: 'line', source: 'mission', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffb547', 'line-width': 12, 'line-opacity': 0.35, 'line-blur': 6 } });
    map.addLayer({ id: 'mission-line', type: 'line', source: 'mission', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffb547', 'line-width': 4, 'line-dasharray': [2, 1.2] } });
    renderMissionRoute();
  });
  map.on('zoom', syncPhotoLayer);
  $('#view-3d').addEventListener('click', () => {
    is3D = !is3D;
    $('#view-3d').setAttribute('aria-pressed', String(is3D));
    map.setTerrain(is3D ? { source: 'dem3d', exaggeration: 1.3 } : null);
    map.easeTo({ pitch: is3D ? 45 : 0, bearing: is3D ? -12 : 0, duration: 800 });
  });
  $('#view-island').addEventListener('click', () => map.fitBounds(REEF_MAP.BOUNDS, { padding: 30, pitch: is3D ? 45 : 0, bearing: is3D ? -12 : 0 }));
}

function syncPhotoLayer() {
  $('.map-frame').classList.toggle('zoomed', map.getZoom() >= PHOTO_ZOOM);
}

async function load() {
  const get = (p) => fetch(p, { cache: 'no-cache' }).then((r) => r.json());
  const [spots, missions, site] = await Promise.all([get('data/spots.json'), get('data/missions.json'), get('data/site.json')]);
  state.spots = spots.filter((s) => typeof s.lat === 'number' && typeof s.lon === 'number');
  state.missions = missions;
  state.site = site;
  state.selected = state.spots[0]?.id;
  initMap();
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

function distM(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toR, dLon = (b[0] - a[0]) * toR;
  const x = dLon * Math.cos(((a[1] + b[1]) / 2) * toR);
  return Math.sqrt(x * x + dLat * dLat) * R;
}

function groupPhotos(s) {
  const items = (s.photos || []).filter((p) => p.image || p.video);
  const groups = [];
  items.forEach((p) => {
    const key = (p.species || '').trim().toLowerCase();
    const pos = typeof p.lat === 'number' && typeof p.lon === 'number' ? [p.lon, p.lat] : null;
    const g = key && groups.find((g) => g.key === key && ((!g.pos && !pos) || (g.pos && pos && distM(g.pos, pos) < 30)));
    if (g) {
      g.items.push(p);
      if (pos) { g.pts.push(pos); g.pos = [g.pts.reduce((t, q) => t + q[0], 0) / g.pts.length, g.pts.reduce((t, q) => t + q[1], 0) / g.pts.length]; }
    } else groups.push({ key: key || Symbol(), items: [p], pts: pos ? [pos] : [], pos });
  });
  return groups;
}

function renderMarkers() {
  spotMarkers.forEach((m) => m.remove());
  photoMarkers.forEach((m) => m.remove());
  spotMarkers = []; photoMarkers = [];
  state.spots.filter((s) => !state.hidden.has(s.type)).forEach((s) => {
    const t = TYPES[s.type] || TYPES.photo;
    const on = s.id === state.selected;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'marker' + (on ? ' on' : '');
    el.style.setProperty('--c', t.color);
    el.setAttribute('aria-label', `${t.badge} : ${s.name}`);
    el.innerHTML = `<span class="ring" aria-hidden="true"></span><span class="dot">${svgIcon(s.type)}</span>`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      state.selected = s.id;
      renderMarkers(); renderCard();
      if ((s.photos || []).length && map.getZoom() < PHOTO_ZOOM + 1.5) map.flyTo({ center: [s.lon, s.lat], zoom: PHOTO_ZOOM + 2, duration: 1600 });
    });
    spotMarkers.push(new maplibregl.Marker({ element: el }).setLngLat([s.lon, s.lat]).addTo(map));
    if (on) el.parentElement && (el.style.zIndex = 3);

    // regroupe les photos d'une même espèce prises au même endroit (< 30 m)
    const groups = groupPhotos(s);
    groups.forEach((g, i) => {
      const ang = (i / Math.max(groups.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const first = g.items[0];
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'pdot' + (g.items.length > 1 ? ' multi' : '');
      const label = first.species || s.name;
      d.setAttribute('aria-label', g.items.length > 1 ? `${label} : ${g.items.length} photos et vidéos` : `${first.video ? 'Vidéo' : 'Photo'} : ${label}`);
      const thumb = g.items.find((p) => p.image);
      d.innerHTML = `${g.items.some((p) => p.video) ? '<span class="pvid" aria-hidden="true"></span>' : ''}${g.items.length > 1 ? `<span class="pcount" aria-hidden="true">${g.items.length}</span>` : ''}<span class="pthumb" aria-hidden="true">${thumb ? `<img src="${esc(thumb.image)}" alt="" loading="lazy">` : ''}</span>`;
      d.addEventListener('click', (e) => { e.stopPropagation(); state.selected = s.id; renderCard(); openViewer(s, g.items, 0); });
      const offset = g.pos ? [0, 0] : [Math.round(Math.cos(ang) * 46), Math.round(Math.sin(ang) * 46)];
      photoMarkers.push(new maplibregl.Marker({ element: d, offset }).setLngLat(g.pos || [s.lon, s.lat]).addTo(map));
    });
  });
  syncPhotoLayer();
}

function renderCard() {
  const s = spotById(state.selected);
  if (!s) return;
  const t = TYPES[s.type] || TYPES.photo;
  const photo = (s.photos || []).find((p) => p.image && !p.video) || (s.photos || []).find((p) => p.image);
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
  const photos = (s.photos || []).filter((p) => p.image || p.video);
  dlg.classList.remove('single');
  $('#lb-title').textContent = s.name;
  $('#lb-body').innerHTML = photos.length
    ? `<div class="lb-grid">${photos.map((p, i) => `
        <figure><button type="button" class="lb-open" data-i="${i}" aria-label="Agrandir : ${esc(p.species || s.name)}">
          ${p.video && !p.image ? `<video src="${esc(p.video)}" muted playsinline preload="metadata"></video>` : `<img src="${esc(p.image)}" alt="" loading="lazy">`}
          ${p.video ? '<span class="play" aria-hidden="true"></span>' : ''}
        </button>
        <figcaption><b>${esc(p.species || '')}</b>${[p.date, p.depth ? p.depth + ' m' : ''].filter(Boolean).map(esc).join(' · ')}</figcaption>
        </figure>`).join('')}</div>`
    : `<p class="lb-empty">Les photos de ce spot arrivent bientôt.</p>`;
  $('#lb-body').querySelectorAll('.lb-open').forEach((b) => b.addEventListener('click', () => openViewer(s, photos, Number(b.dataset.i))));
  if (!dlg.open) dlg.showModal();
}

/* Visionneuse : une photo ou vidéo en grand, avec défilement dans le groupe */
let viewer = null;
function openViewer(s, list, index) {
  if (!Array.isArray(list)) list = [list];
  viewer = { s, list, index: index || 0 };
  const dlg = $('#lightbox');
  dlg.classList.add('single');
  drawViewer();
  if (!dlg.open) dlg.showModal();
}

function stepViewer(d) {
  if (!viewer || viewer.list.length < 2) return;
  viewer.index = (viewer.index + d + viewer.list.length) % viewer.list.length;
  drawViewer();
}

function drawViewer() {
  const { s, list, index } = viewer;
  const p = list[index];
  const many = list.length > 1;
  $('#lb-title').textContent = (p.species || s.name) + (many ? `  ·  ${index + 1} / ${list.length}` : '');
  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d; } };
  const rows = [
    ['Espèce', p.species],
    ['Lieu', p.place || s.name],
    ['Date', p.date ? fmtDate(p.date) : ''],
    ['Profondeur', p.depth ? p.depth + ' m' : '']
  ].filter(([, v]) => v);
  $('#lb-body').innerHTML = `
    <div class="lb-single">
      ${many ? '<button type="button" class="lb-nav prev" aria-label="Photo précédente">‹</button>' : ''}
      ${p.video
        ? `<video src="${esc(p.video)}" ${p.image ? `poster="${esc(p.image)}"` : ''} controls autoplay muted playsinline loop aria-label="Vidéo : ${esc(p.species || s.name)}"></video>`
        : `<img src="${esc(p.image)}" alt="${esc(p.species || s.name)}">`}
      ${many ? '<button type="button" class="lb-nav next" aria-label="Photo suivante">›</button>' : ''}
    </div>
    ${many ? `<div class="lb-dots" aria-hidden="true">${list.map((_, i) => `<span class="${i === index ? 'on' : ''}"></span>`).join('')}</div>` : ''}
    <div class="lb-info">
      <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${p.caption ? `<p>${esc(p.caption)}</p>` : ''}
    </div>`;
  if (many) {
    $('#lb-body .lb-nav.prev').addEventListener('click', () => stepViewer(-1));
    $('#lb-body .lb-nav.next').addEventListener('click', () => stepViewer(1));
  }
}

document.addEventListener('keydown', (e) => {
  const dlg = document.getElementById('lightbox');
  if (!dlg.open || !dlg.classList.contains('single')) return;
  if (e.key === 'ArrowRight') stepViewer(1);
  if (e.key === 'ArrowLeft') stepViewer(-1);
});

/* swipe sur mobile */
(() => {
  let x0 = null;
  document.addEventListener('touchstart', (e) => { if (document.getElementById('lightbox').open) x0 = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) stepViewer(dx < 0 ? 1 : -1);
  }, { passive: true });
})();

let missionTip = null;
function renderMissionRoute(fit) {
  const src = map && map.getSource && map.getSource('mission');
  if (!src) return;
  const m = state.missions[state.mission];
  const pts = m ? (m.steps || []).map(spotById).filter(Boolean).map((s) => [s.lon, s.lat]) : [];
  src.setData({ type: 'FeatureCollection', features: pts.length > 1 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: pts }, properties: {} }] : [] });
  if (missionTip) { missionTip.remove(); missionTip = null; }
  if (pts.length < 2) return;
  const tip = document.createElement('div');
  tip.className = 'mission-tip';
  tip.textContent = 'Mission · ' + m.title;
  missionTip = new maplibregl.Marker({ element: tip, anchor: 'top', offset: [0, 22] }).setLngLat(pts[Math.floor(pts.length / 2)]).addTo(map);
  if (fit) {
    const b = pts.reduce((bb, p) => bb.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
    map.fitBounds(b, { padding: 90, duration: 1600, pitch: is3D ? 45 : 0 });
  }
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
    $('#carte').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => renderMissionRoute(true), 400);
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
