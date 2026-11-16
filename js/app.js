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
const REUNION = [[-21.40, 55.20], [-20.86, 55.85]];
const PHOTO_ZOOM = 14;
let map, spotLayer, photoLayer, missionLayer;

function initMap() {
  map = L.map('map', { zoomControl: false, minZoom: 9, maxZoom: 19, maxBounds: [[-21.9, 54.7], [-20.4, 56.4]], attributionControl: true, zoomSnap: 0.5 });
  L.control.zoom({ position: 'topright', zoomInTitle: 'Zoomer', zoomOutTitle: 'Dézoomer' }).addTo(map);
  const bases = {
    sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, maxNativeZoom: 18, attribution: 'Imagerie © Esri, Maxar, Earthstar Geographics'
    }),
    dark: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, maxNativeZoom: 16, attribution: 'Fond © Esri, HERE, Garmin, © OpenStreetMap'
    })
  };
  const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 18, pane: 'overlayPane', opacity: .85 });
  const darkLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 16, pane: 'overlayPane' });
  let current = null;
  const setBase = (k) => {
    if (current) map.removeLayer(bases[current]);
    current = k; bases[k].addTo(map);
    if (k === 'sat') { labels.addTo(map); map.removeLayer(darkLabels); } else { darkLabels.addTo(map); map.removeLayer(labels); }
    const el = document.getElementById('map');
    el.classList.toggle('sat-base', k === 'sat'); el.classList.toggle('dark-base', k === 'dark');
    document.querySelectorAll('.layer-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layer === k)));
  };
  document.querySelectorAll('.layer-btn').forEach((b) => b.addEventListener('click', () => setBase(b.dataset.layer)));
  setBase('sat');
  map.fitBounds(REUNION);
  missionLayer = L.layerGroup().addTo(map);
  spotLayer = L.layerGroup().addTo(map);
  photoLayer = L.layerGroup();
  map.on('zoomend', syncPhotoLayer);
}

function syncPhotoLayer() {
  const show = map.getZoom() >= PHOTO_ZOOM;
  document.querySelector('.map-frame').classList.toggle('zoomed', show);
  if (show && !map.hasLayer(photoLayer)) photoLayer.addTo(map);
  if (!show && map.hasLayer(photoLayer)) map.removeLayer(photoLayer);
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

function renderMarkers() {
  spotLayer.clearLayers();
  photoLayer.clearLayers();
  state.spots.filter((s) => !state.hidden.has(s.type)).forEach((s) => {
    const t = TYPES[s.type] || TYPES.photo;
    const on = s.id === state.selected;
    const icon = L.divIcon({
      className: 'lf-icon', iconSize: [48, 48], iconAnchor: [24, 24],
      html: `<button type="button" class="marker${on ? ' on' : ''}" aria-label="${esc(t.badge)} : ${esc(s.name)}" style="--c:${t.color}"><span class="ring" aria-hidden="true"></span><span class="dot">${svgIcon(s.type)}</span></button>`
    });
    L.marker([s.lat, s.lon], { icon, zIndexOffset: on ? 1000 : 0, keyboard: false, riseOnHover: true })
      .on('click', () => {
        state.selected = s.id;
        renderMarkers(); renderCard();
        if ((s.photos || []).length && map.getZoom() < PHOTO_ZOOM + 2) map.flyTo([s.lat, s.lon], PHOTO_ZOOM + 2, { duration: 1.2 });
      })
      .addTo(spotLayer);
    // points photo : en cercle autour du spot (ou à leur position GPS si renseignée)
    const items = (s.photos || []).filter((p) => p.image || p.video);
    items.forEach((p, i) => {
      const hasPos = typeof p.lat === 'number' && typeof p.lon === 'number';
      const ang = (i / Math.max(items.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const r = 46;
      const dx = hasPos ? 0 : Math.round(Math.cos(ang) * r);
      const dy = hasPos ? 0 : Math.round(Math.sin(ang) * r);
      const pi = L.divIcon({
        className: 'lf-icon', iconSize: [30, 30], iconAnchor: [15 - dx, 15 - dy],
        html: `<button type="button" class="pdot" aria-label="${p.video ? 'Vidéo' : 'Photo'} : ${esc(p.species || s.name)}">${p.video ? '<span class="pvid" aria-hidden="true"></span>' : ''}<span class="pthumb" aria-hidden="true">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ''}</span></button>`
      });
      L.marker(hasPos ? [p.lat, p.lon] : [s.lat, s.lon], { icon: pi, keyboard: false, zIndexOffset: 2000 })
        .on('click', () => { state.selected = s.id; renderMarkers(); renderCard(); openLightbox(s, p); })
        .addTo(photoLayer);
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

function openLightbox(s, first) {
  const dlg = $('#lightbox');
  let photos = (s.photos || []).filter((p) => p.image || p.video);
  if (first) photos = [first, ...photos.filter((p) => p !== first)];
  $('#lb-title').textContent = s.name;
  $('#lb-body').innerHTML = photos.length
    ? `<div class="lb-grid">${photos.map((p) => `
        <figure>${p.video
          ? `<video src="${esc(p.video)}" ${p.image ? `poster="${esc(p.image)}"` : ''} controls playsinline preload="none" aria-label="Vidéo : ${esc(p.species || s.name)}"></video>`
          : `<img src="${esc(p.image)}" alt="${esc(p.species || s.name)}" loading="lazy">`}
          <figcaption><b>${esc(p.species || '')}</b>${[p.date, p.depth ? p.depth + ' m' : ''].filter(Boolean).map(esc).join(' · ')}${p.caption ? `<span>${esc(p.caption)}</span>` : ''}</figcaption>
        </figure>`).join('')}</div>`
    : `<p class="lb-empty">Les photos de ce spot arrivent bientôt.</p>`;
  dlg.showModal();
}

function renderMissionRoute(fit) {
  missionLayer.clearLayers();
  const m = state.missions[state.mission];
  if (!m) return;
  const pts = (m.steps || []).map(spotById).filter(Boolean).map((s) => [s.lat, s.lon]);
  if (pts.length < 2) return;
  L.polyline(pts, { color: '#ffb547', weight: 10, opacity: .35, className: 'route-glow', lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(missionLayer);
  const line = L.polyline(pts, { color: '#ffb547', weight: 4, className: 'route', lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(missionLayer);
  line.bindTooltip('Mission · ' + m.title, { permanent: true, direction: 'bottom', className: 'mission-tip', offset: [0, 18] }).openTooltip(pts[Math.floor(pts.length / 2)]);
  if (fit) map.flyToBounds(line.getBounds(), { padding: [70, 70], duration: 1.2 });
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
