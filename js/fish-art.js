/* Reef974 — dessins des espèces (SVG maison, viewBox 160×100)
   Chaque forme prend deux couleurs : body (corps) et accent (motifs). */

window.FISH_ART = (function () {
  const ink = '#071018';
  const eye = (x, y, r = 3.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + 0.6}" cy="${y}" r="${r * 0.55}" fill="${ink}"/>`;

  const shapes = {
    raie: (b, a) => `
      <path d="M80 18 C96 30 128 42 150 46 C132 52 104 56 88 70 C84 74 76 74 72 70 C56 56 28 52 10 46 C32 42 64 30 80 18Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M80 70 C80 80 81 90 84 98" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M80 22 C84 30 84 40 80 50 C76 40 76 30 80 22Z" fill="${a}" opacity=".55"/>
      ${[[56, 44], [104, 44], [66, 52], [94, 52], [44, 47], [116, 47], [80, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff" opacity=".85"/>`).join('')}
      ${eye(74, 26, 2.4)}${eye(86, 26, 2.4)}`,

    platax: (b, a) => `
      <path d="M58 50 C58 26 74 8 92 6 C96 22 98 32 104 40 C112 44 118 48 122 50 C118 52 112 56 104 60 C98 68 96 78 92 94 C74 92 58 74 58 50Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M122 50 L146 36 L140 50 L146 64Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M70 14 C66 30 66 70 70 86" fill="none" stroke="${a}" stroke-width="9" stroke-linecap="round"/>
      <path d="M90 8 C86 30 86 70 90 92" fill="none" stroke="${a}" stroke-width="9" stroke-linecap="round"/>
      <path d="M108 40 C106 46 106 54 108 60" fill="none" stroke="${a}" stroke-width="6" stroke-linecap="round"/>
      ${eye(64, 44)}`,

    papillon: (b, a) => `
      <path d="M26 50 C34 30 58 20 84 20 C104 20 118 30 124 42 L124 58 C118 70 104 80 84 80 C58 80 34 70 26 50Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M124 42 L146 30 L142 50 L146 70 L124 58Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M60 22 C80 6 108 14 120 34" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M44 28 C40 40 40 60 44 72" fill="none" stroke="${a}" stroke-width="7" stroke-linecap="round"/>
      ${[0, 1, 2, 3].map((i) => `<path d="M${66 + i * 12} 26 L${74 + i * 12} 74" stroke="${a}" stroke-width="1.6" opacity=".55"/>`).join('')}
      <circle cx="112" cy="40" r="5" fill="${a}"/>
      <path d="M26 50 L18 50" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
      ${eye(36, 48, 2.8)}`,

    baliste: (b, a) => `
      <path d="M20 54 C30 36 52 24 82 24 C106 24 122 36 128 50 C122 64 106 76 82 76 C52 76 30 70 20 54Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M128 50 L148 38 L144 50 L148 62Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M70 24 L76 10 L82 24" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M52 30 C60 44 60 60 52 72" fill="none" stroke="${a}" stroke-width="4"/>
      <path d="M38 44 C48 46 56 46 66 44" fill="none" stroke="#5ec8ff" stroke-width="3" stroke-linecap="round"/>
      <path d="M40 52 C50 54 58 54 68 52" fill="none" stroke="#5ec8ff" stroke-width="3" stroke-linecap="round"/>
      <path d="M86 56 C96 62 110 62 120 56" fill="none" stroke="${a}" stroke-width="6" stroke-linecap="round"/>
      <path d="M20 54 L28 58" stroke="#ffb547" stroke-width="3" stroke-linecap="round"/>
      ${eye(42, 40)}`,

    clown: (b, a) => `
      <path d="M22 52 C30 34 54 26 80 26 C104 26 120 38 126 50 C120 62 104 74 80 74 C54 74 30 70 22 52Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M126 50 L146 38 C142 46 142 54 146 62Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      ${[[46, 30, 70], [80, 26, 74], [112, 36, 64]].map(([x, y1, y2]) => `<path d="M${x} ${y1} C${x - 6} ${(y1 + y2) / 2} ${x - 6} ${(y1 + y2) / 2} ${x} ${y2}" fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round"/><path d="M${x} ${y1} C${x - 6} ${(y1 + y2) / 2} ${x - 6} ${(y1 + y2) / 2} ${x} ${y2}" fill="none" stroke="${a}" stroke-width="8" stroke-linecap="round"/>`).join('')}
      ${eye(34, 46)}`,

    ballon: (b, a) => `
      <circle cx="74" cy="52" r="36" fill="${b}" stroke="${ink}" stroke-width="2.5"/>
      <path d="M108 52 L134 40 L130 52 L134 64Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M44 68 C60 84 92 84 106 66 C96 74 60 76 44 68Z" fill="#fff" opacity=".6"/>
      ${[[60, 30], [78, 26], [94, 34], [54, 44], [72, 40], [90, 48], [100, 58]].map(([x, y]) => `<path d="M${x} ${y} l3 -5 l3 5" fill="none" stroke="${a}" stroke-width="2" stroke-linejoin="round"/>`).join('')}
      ${[[62, 56], [80, 60], [70, 66]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${a}"/>`).join('')}
      <circle cx="40" cy="54" r="3" fill="${ink}"/>
      ${eye(50, 42, 4)}`,

    murene: (b, a) => `
      <path d="M14 46 C24 30 44 30 54 42 C66 56 82 58 96 48 C110 38 126 40 136 52 C142 60 150 62 154 60 C150 70 140 72 132 66 C122 56 110 54 98 62 C82 74 62 72 50 58 C42 48 30 48 22 56 C18 60 12 58 14 46Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      ${[[36, 42], [62, 56], [80, 60], [104, 50], [124, 50], [46, 50], [92, 56]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${a}"/>`).join('')}
      <path d="M14 46 C18 52 22 52 26 50" fill="none" stroke="${ink}" stroke-width="2"/>
      ${eye(24, 40, 2.6)}`,

    requin: (b, a) => `
      <path d="M8 54 C30 40 70 34 110 40 C124 42 136 46 144 50 C136 56 120 62 100 64 C70 68 34 66 8 54Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M62 38 L74 12 L86 38" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M140 50 L156 26 L152 52 L156 76Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M60 62 L52 80 L76 64" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M12 56 C40 64 80 66 120 60" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/>
      <path d="M74 12 L76 16" stroke="${a}" stroke-width="6"/>
      ${[0, 1, 2].map((i) => `<path d="M${40 + i * 5} 46 l-2 10" stroke="${ink}" stroke-width="1.6"/>`).join('')}
      ${eye(26, 48, 2.6)}`,

    trompette: (b, a) => `
      <path d="M6 50 L40 46 C60 42 100 42 128 46 L150 40 L146 50 L150 60 L128 54 C100 58 60 58 40 54 L6 50Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${54 + i * 12} 45 L${56 + i * 12} 55" stroke="${a}" stroke-width="3" stroke-linecap="round"/>`).join('')}
      ${eye(44, 49, 2.4)}`,

    poulpe: (b, a) => `
      <path d="M50 52 C40 20 72 6 86 10 C104 14 116 32 106 52Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      ${[[56, 30, 70, 20, 92], [66, 40, 80, 34, 96], [78, 64, 84, 70, 96], [88, 92, 82, 108, 94], [98, 120, 74, 132, 88], [62, 26, 58, 18, 76]].map(([x1, cx, cy, x2, y2]) => `<path d="M${x1} 52 C${cx} ${cy} ${(x1 + x2) / 2} ${y2} ${x2} ${y2 - 6}" fill="none" stroke="${b}" stroke-width="8" stroke-linecap="round"/><path d="M${x1} 52 C${cx} ${cy} ${(x1 + x2) / 2} ${y2} ${x2} ${y2 - 6}" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>`).join('')}
      ${[[70, 26], [86, 22], [94, 36], [76, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${a}"/>`).join('')}
      ${eye(70, 46, 3)}${eye(90, 46, 3)}`,

    chirurgien: (b, a) => `
      <path d="M24 50 C32 30 56 18 84 18 C106 18 120 30 126 46 L126 54 C120 70 106 82 84 82 C56 82 32 70 24 50Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M126 46 L150 30 C144 44 144 56 150 70 L126 54Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      ${[50, 68, 86, 104].map((x) => `<path d="M${x} 22 C${x - 4} 40 ${x - 4} 60 ${x} 78" fill="none" stroke="${a}" stroke-width="4"/>`).join('')}
      <path d="M118 52 L126 50" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      ${eye(36, 44)}`,

    tortue: (b, a) => `
      <ellipse cx="80" cy="52" rx="38" ry="30" fill="${b}" stroke="${ink}" stroke-width="2.5"/>
      <path d="M80 26 L94 40 L94 62 L80 76 L66 62 L66 40Z" fill="none" stroke="${a}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M66 40 L48 34 M94 40 L112 34 M66 62 L48 70 M94 62 L112 70 M80 26 L80 22 M80 76 L80 82" stroke="${a}" stroke-width="2.5"/>
      <ellipse cx="80" cy="16" rx="10" ry="9" fill="#9bd38a" stroke="${ink}" stroke-width="2.5"/>
      <path d="M48 32 C34 18 22 18 18 24 C26 30 36 34 46 38Z" fill="#9bd38a" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M112 32 C126 18 138 18 142 24 C134 30 124 34 114 38Z" fill="#9bd38a" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M54 76 C46 88 38 90 34 88 C38 82 44 76 52 72Z" fill="#9bd38a" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M106 76 C114 88 122 90 126 88 C122 82 116 76 108 72Z" fill="#9bd38a" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      ${eye(76, 14, 1.8)}${eye(84, 14, 1.8)}`,

    poisson: (b, a) => `
      <path d="M22 50 C32 32 56 24 82 24 C106 24 120 36 126 48 C120 62 106 76 82 76 C56 76 32 68 22 50Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M126 48 L148 34 L142 50 L148 66 L124 54Z" fill="${b}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M62 26 C74 14 96 14 108 28" fill="${a}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M70 60 C76 66 84 66 90 62" fill="none" stroke="${a}" stroke-width="3" stroke-linecap="round"/>
      <path d="M60 36 C66 46 66 56 60 66" fill="none" stroke="${ink}" stroke-width="2" opacity=".4"/>
      ${eye(38, 46)}`
  };

  const LABELS = {
    raie: 'Raie', platax: 'Platax', papillon: 'Poisson-papillon', baliste: 'Baliste', clown: 'Poisson-clown',
    ballon: 'Poisson-ballon', murene: 'Murène', requin: 'Requin', trompette: 'Poisson-trompette', poulpe: 'Poulpe',
    chirurgien: 'Chirurgien', tortue: 'Tortue', poisson: 'Poisson'
  };

  function draw(shape, body, accent, locked) {
    const fn = shapes[shape] || shapes.poisson;
    const b = locked ? '#1a2440' : (body || '#4fc3ff');
    const a = locked ? '#24304f' : (accent || '#0b1a2a');
    let svg = fn(b, a);
    if (locked) svg = svg.replace(/#fff"/g, '#2a3858"').replace(/#9bd38a/g, '#1a2440').replace(/#5ec8ff/g, '#24304f').replace(/#ffb547/g, '#24304f');
    return `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${svg}</svg>`;
  }

  return { draw, shapes: Object.keys(shapes), LABELS };
})();
