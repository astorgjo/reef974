/* Reef974 — style de carte maison (MapLibre)
   Données : OpenStreetMap via OpenFreeMap (vecteur) + relief/bathymétrie (tuiles Terrarium, AWS Open Data).
   Tout le rendu (couleurs, typo, relief) est défini ici. */

window.REEF_MAP = (function () {
  const C = {
    deep: '#041021', ocean: '#08304a', shelf: '#0f5f7a', lagoon: '#2fd6c8',
    land0: '#2c6b47', land1: '#3f7a4c', land2: '#7d7a4e', land3: '#a88a62', land4: '#d9c9a3',
    coast: '#e9f6ee', road: '#f4e9c8', roadMain: '#ffcf7a', river: '#7fd8ff',
    town: '#f4f6fb', halo: '#05101c', accent: '#1ee3cf'
  };
  const FONT = ['Noto Sans Bold'];
  const FONT_IT = ['Noto Sans Italic'];

  function style(opts = {}) {
    const sat = !!opts.satellite;
    const sources = {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      dem: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 15, encoding: 'terrarium', attribution: 'Relief : Mapzen Terrain Tiles (AWS Open Data)' },
      dem3d: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 15, encoding: 'terrarium' }
    };
    if (sat) {
      sources.sat = { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 18, attribution: 'Imagerie © Esri, Maxar, Earthstar Geographics' };
    }
    const layers = [{ id: 'bg', type: 'background', paint: { 'background-color': C.land0 } }];

    if (sat) {
      layers.push({ id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': 0.15, 'raster-contrast': 0.05 } });
    } else {
      layers.push(
        { id: 'relief-color', type: 'color-relief', source: 'dem', paint: {
          'color-relief-color': ['interpolate', ['linear'], ['elevation'],
            -4500, C.deep, -2000, '#062240', -800, C.ocean, -150, C.shelf, -30, '#1a8fb0', -6, '#26b9c4', -0.5, C.lagoon,
            0, C.land0, 150, C.land1, 900, '#4f7d4e', 1500, C.land2, 2200, C.land3, 3000, C.land4]
        } },
        { id: 'hillshade', type: 'hillshade', source: 'dem', paint: {
          'hillshade-exaggeration': 0.6, 'hillshade-shadow-color': '#03101a', 'hillshade-highlight-color': '#fff4d6', 'hillshade-accent-color': '#0b2a2a', 'hillshade-illumination-direction': 315
        } },
        { id: 'wood', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-color': '#123a29', 'fill-opacity': 0.28 } },
        { id: 'urban', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood', 'commercial', 'industrial']]], paint: { 'fill-color': '#26303f', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.35, 15, 0.2] } },
        { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': '#1b8fb0', 'fill-opacity': 0.12 } }
      );
    }

    layers.push(
      { id: 'coast', type: 'line', source: 'omt', 'source-layer': 'water', filter: ['==', ['get', 'class'], 'ocean'],
        paint: { 'line-color': C.coast, 'line-opacity': sat ? 0.35 : 0.75, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 14, 2.2] } },
      { id: 'park', type: 'line', source: 'omt', 'source-layer': 'park', minzoom: 9,
        paint: { 'line-color': '#b5ec5c', 'line-opacity': 0.35, 'line-width': 1.2, 'line-dasharray': [3, 3] } },
      { id: 'rivers', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 10,
        paint: { 'line-color': C.river, 'line-opacity': 0.55, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 15, 2] } },
      { id: 'buildings', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 15,
        paint: { 'fill-color': sat ? '#ffffff' : '#0d1730', 'fill-opacity': sat ? 0 : 0.55, 'fill-outline-color': '#2a3a55' } },
      { id: 'paths', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 13,
        filter: ['in', ['get', 'class'], ['literal', ['path', 'track']]],
        paint: { 'line-color': C.road, 'line-opacity': 0.5, 'line-width': 1, 'line-dasharray': [2, 2] } },
      { id: 'roads-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12,
        filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary']]],
        paint: { 'line-color': C.road, 'line-opacity': 0.4, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 16, 3] } },
      { id: 'roads-glow', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 8,
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': C.roadMain, 'line-opacity': 0.25, 'line-blur': 3, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3, 16, 12] } },
      { id: 'roads-main', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 8,
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': C.roadMain, 'line-opacity': 0.85, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 16, 4] } },
      { id: 'road-names', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 14,
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 11, 'text-letter-spacing': 0.05 },
        paint: { 'text-color': '#f4e9c8', 'text-halo-color': C.halo, 'text-halo-width': 1.4 } },
      { id: 'peaks', type: 'symbol', source: 'omt', 'source-layer': 'mountain_peak', minzoom: 9,
        filter: ['>', ['to-number', ['get', 'ele'], 0], 1500],
        layout: { 'text-field': ['concat', '▲ ', ['upcase', ['get', 'name']], '\n', ['to-string', ['get', 'ele']], ' m'], 'text-font': FONT, 'text-size': 11, 'text-letter-spacing': 0.12, 'text-anchor': 'top' },
        paint: { 'text-color': '#fff4d6', 'text-halo-color': C.halo, 'text-halo-width': 1.6 } },
      { id: 'ocean-name', type: 'symbol', source: 'omt', 'source-layer': 'water_name', maxzoom: 9,
        layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': FONT_IT, 'text-size': 14, 'text-letter-spacing': 0.4 },
        paint: { 'text-color': '#9fdcf0', 'text-opacity': 0.7 } },
      { id: 'villages', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 12,
        filter: ['in', ['get', 'class'], ['literal', ['village', 'hamlet', 'suburb', 'neighbourhood']]],
        layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': FONT, 'text-size': 11, 'text-letter-spacing': 0.12 },
        paint: { 'text-color': '#dfe4ee', 'text-halo-color': C.halo, 'text-halo-width': 1.4 } },
      { id: 'towns', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 8,
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
        layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 9, 11, 14, 15], 'text-letter-spacing': 0.15 },
        paint: { 'text-color': C.town, 'text-halo-color': C.halo, 'text-halo-width': 1.8 } }
    );

    return {
      version: 8,
      glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sources, layers,
      sky: { 'sky-color': '#0a2a40', 'horizon-color': '#ffb547', 'fog-color': '#06192b', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.4 }
    };
  }

  const BOUNDS = [[55.20, -21.40], [55.85, -20.86]];
  return { style, BOUNDS, attribution: '© OpenStreetMap · OpenFreeMap · Relief Mapzen/AWS' };
})();
