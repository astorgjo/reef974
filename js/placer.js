/* Reef974 — outil de placement des points (spots et photos)
   Enregistre data/spots.json directement dans le repo GitHub avec le jeton de l'utilisateur. */

const REPO = 'astorgjo/reef974';
const FILE = 'data/spots.json';
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let spots = [];
let spotIdx = 0;
let itemIdx = -1; // -1 = le spot lui-même, sinon index de la photo
let changed = false;
let pin = null;
const ghosts = [];

const tokenInput = $('#token');
try { tokenInput.value = localStorage.getItem('reef974-token') || ''; } catch (e) {}
tokenInput.addEventListener('change', () => { try { localStorage.setItem('reef974-token', tokenInput.value.trim()); } catch (e) {} });

const map = new maplibregl.Map({
  container: 'map',
  style: REEF_MAP.style({ satellite: true }),
  bounds: REEF_MAP.BOUNDS,
  fitBoundsOptions: { padding: 30 },
  maxZoom: 19.5,
  attributionControl: { compact: true }
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
map.getCanvas().classList.add('crosshair');

document.querySelectorAll('[data-base]').forEach((b) => b.addEventListener('click', () => {
  const sat = b.dataset.base === 'sat';
  document.querySelectorAll('[data-base]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const c = map.getCenter(), z = map.getZoom();
  map.setStyle(REEF_MAP.style({ satellite: sat }));
  map.once('styledata', () => map.jumpTo({ center: c, zoom: z }));
}));

function status(msg, kind) {
  const el = $('#status');
  el.textContent = msg;
  el.className = 'status' + (kind ? ' ' + kind : '');
}

function current() {
  const s = spots[spotIdx];
  return itemIdx < 0 ? s : (s.photos || [])[itemIdx];
}

function renderSelect() {
  $('#spot-select').innerHTML = spots.map((s, i) => `<option value="${i}">${esc(s.name)} · ${esc(s.area || '')}</option>`).join('');
  $('#spot-select').value = String(spotIdx);
}

function renderItems() {
  const s = spots[spotIdx];
  const photos = s.photos || [];
  const row = (i, thumb, title, sub, placed) => `
    <button type="button" class="item" data-i="${i}" aria-pressed="${i === itemIdx}">
      ${thumb}<span>${esc(title)}<small>${esc(sub)}</small></span>
      <span class="pos${placed ? ' ok' : ''}">${placed ? 'Placé' : 'Autour du spot'}</span>
    </button>`;
  $('#items').innerHTML =
    row(-1, '<span class="ico" aria-hidden="true">📍</span>', 'Le spot lui-même', 'Position du repère principal', true) +
    photos.map((p, i) => row(i, p.image ? `<img src="${esc(p.image)}" alt="">` : '<span class="ico"></span>',
      (p.video ? 'Vidéo · ' : '') + (p.species || 'Photo ' + (i + 1)), p.date || '', typeof p.lat === 'number')).join('');
  document.querySelectorAll('.item').forEach((b) => b.addEventListener('click', () => { itemIdx = Number(b.dataset.i); renderItems(); renderPins(true); }));
}

function renderPins(fly) {
  ghosts.forEach((g) => g.remove());
  ghosts.length = 0;
  const s = spots[spotIdx];
  // les autres éléments du spot, en fantôme
  [s, ...(s.photos || [])].forEach((it, i) => {
    if (i - 1 === itemIdx || typeof it.lat !== 'number') return;
    const g = document.createElement('div');
    g.className = 'ghost';
    ghosts.push(new maplibregl.Marker({ element: g }).setLngLat([it.lon, it.lat]).addTo(map));
  });
  const it = current();
  const pos = typeof it.lat === 'number' ? [it.lon, it.lat] : [s.lon, s.lat];
  if (!pin) {
    const el = document.createElement('div');
    el.className = 'pin';
    pin = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(pos).addTo(map);
    pin.on('dragend', () => setPos(pin.getLngLat()));
  } else pin.setLngLat(pos);
  if (fly) map.flyTo({ center: pos, zoom: Math.max(map.getZoom(), 17), duration: 1000 });
}

function setPos(ll) {
  const it = current();
  it.lat = Math.round(ll.lat * 1e6) / 1e6;
  it.lon = Math.round(ll.lng * 1e6) / 1e6;
  pin.setLngLat([it.lon, it.lat]);
  changed = true;
  renderItems();
  status(`Point posé : ${it.lat}, ${it.lon}. Pense à enregistrer.`);
}

map.on('click', (e) => setPos(e.lngLat));

$('#spot-select').addEventListener('change', (e) => { spotIdx = Number(e.target.value); itemIdx = -1; renderItems(); renderPins(true); });

window.addEventListener('beforeunload', (e) => { if (changed) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- GitHub ---------- */
const b64decode = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g, '')), (c) => c.charCodeAt(0)));
const b64encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

async function save() {
  const token = tokenInput.value.trim();
  if (!token) { status('Ajoute d\'abord ton jeton GitHub (section « Réglage du compte GitHub » en bas).', 'err'); $('details').open = true; return; }
  if (!changed) { status('Rien à enregistrer.'); return; }
  status('Enregistrement…');
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}?ref=main`, { headers, cache: 'no-store' });
    if (!r.ok) throw new Error(r.status === 401 ? 'jeton refusé' : 'lecture impossible (' + r.status + ')');
    const remote = await r.json();
    // on repart de la version du repo et on n'applique que les positions modifiées ici
    const latest = JSON.parse(b64decode(remote.content));
    spots.forEach((s) => {
      const t = latest.find((x) => x.id === s.id);
      if (!t) return;
      t.lat = s.lat; t.lon = s.lon;
      (s.photos || []).forEach((p) => {
        const tp = (t.photos || []).find((x) => (x.image || '') === (p.image || '') && (x.video || '') === (p.video || ''));
        if (tp && typeof p.lat === 'number') { tp.lat = p.lat; tp.lon = p.lon; }
      });
    });
    const body = JSON.stringify(latest, null, 2) + '\n';
    const put = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ message: 'Positions mises à jour depuis l\'outil Placer', content: b64encode(body), sha: remote.sha, branch: 'main' })
    });
    if (!put.ok) throw new Error('écriture refusée (' + put.status + ')');
    changed = false;
    spots = latest;
    status('Enregistré ✔ Le site se met à jour dans une minute environ.', 'ok');
  } catch (err) {
    status('Échec : ' + err.message + '. Vérifie ton jeton (accès au repo reef974, Contents : Read and write).', 'err');
  }
}
$('#save').addEventListener('click', save);

$('#copy-json').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(spots, null, 2)); status('Données copiées. Tu peux me les coller dans la conversation.', 'ok'); }
  catch (e) { status('Copie impossible dans ce navigateur.', 'err'); }
});

fetch('data/spots.json', { cache: 'no-cache' }).then((r) => r.json()).then((d) => {
  spots = d;
  const want = new URLSearchParams(location.search).get('spot');
  const i = spots.findIndex((s) => s.id === want);
  spotIdx = i >= 0 ? i : 0;
  renderSelect(); renderItems();
  map.on('load', () => renderPins(true));
  if (map.loaded()) renderPins(true);
});
