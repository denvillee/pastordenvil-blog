/*
  The shareables studio. Four card templates drawn straight onto a <canvas>
  with the 2D API.

  No html-to-image library, deliberately. Every one of them loads from a CDN,
  and this site runs script-src 'self', so they are blocked, in some browsers
  silently. The whole cost of doing without is the word-wrap helper below.

  Two things that would otherwise ruin the export:

  - Fonts are awaited before anything is drawn. Canvas falls back to a system
    face without saying so, which produces an export that looks wrong while the
    on-screen preview looks right.
  - Everything is drawn at 2x by scaling the context, not by upscaling a 1x
    bitmap afterwards. Layout stays in 1080-wide coordinates throughout.

  Nothing is stored except which template and size were last used. The text is
  disposable by design.
*/

const PAD = 72;
const SIZES = {
  feed:  { w: 1080, h: 1350, label: 'Feed 4:5' },
  story: { w: 1080, h: 1920, label: 'Story 9:16' },
};
const C = {
  ink: '#0E1211', pine: '#10302A', pineLift: '#1B4A3E', brass: '#E3B85C',
  bone: '#F3F1EA', sage: '#7FA491', clay: '#B8674A',
  them: '#2B332E', brassInk: '#241A00', sageInk: '#0B241D', clayInk: '#FCF4F0',
};

const el = (id) => document.getElementById(id);
const canvas = el('cv');
const ctx = canvas.getContext('2d');

let template = 'thread';
let size = 'feed';

/* ── helpers ──────────────────────────────────────────────────────────────── */

const archivo = (w, px, wdth) =>
  `${w} ${px}px ${wdth ? `"Archivo"` : `"Archivo"`}, system-ui, sans-serif`;
const spectral = (w, px) => `${w} ${px}px "Spectral", Georgia, serif`;

/* The verse poster wants Archivo at wdth 86, and canvas gives you no way to ask
   for it. There is no ctx.fontVariationSettings, and a percentage font-stretch
   in the font shorthand is not merely ignored, it invalidates the whole string:
   Chromium silently drops back to 10px sans-serif, so the export comes out in a
   system face at a sixth of the size while nothing throws.

   The way through is to let CSS pin the axis instead. "Archivo Poster" is
   declared once in the page with font-stretch: 86%, pointing at the same woff2
   that is already loaded, so it costs no request. Canvas then asks for that
   family by name and gets the 86 width instance. */
const archivoW = (w, px) => `${w} ${px}px "Archivo Poster", "Archivo", system-ui, sans-serif`;

function wrap(text, maxWidth, maxCharsPerLine) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    const tooWide = ctx.measureText(test).width > maxWidth;
    const tooLong = maxCharsPerLine && test.length > maxCharsPerLine;
    if (line && (tooWide || tooLong)) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(x, y, w, h, r) {
  const rr = typeof r === 'number' ? { tl: r, tr: r, br: r, bl: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + rr.tl, y);
  ctx.lineTo(x + w - rr.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr.tr);
  ctx.lineTo(x + w, y + h - rr.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr.br, y + h);
  ctx.lineTo(x + rr.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr.bl);
  ctx.lineTo(x, y + rr.tl);
  ctx.quadraticCurveTo(x, y, x + rr.tl, y);
  ctx.closePath();
}

/* Letter-spaced small caps, which canvas has no property for. */
function tracked(text, x, y, spacing, align) {
  const chars = [...String(text)];
  const total = chars.reduce((n, ch) => n + ctx.measureText(ch).width + spacing, 0) - spacing;
  let cx = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  for (const ch of chars) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return total;
}

/* The hero's ruled field, at the same alpha and pitch, scaled to the card. */
function ruledField(w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(243,241,234,.055)';
  const pitch = 2.35 * 16 * 1.6;   /* .hero-field's 2.35rem, scaled to the card */
  for (let y = 0; y < h; y += pitch) ctx.fillRect(0, y, w, 1);

  /* The hero wash is a CSS 105deg gradient, which runs mostly left to right
     and only slightly down. createLinearGradient(0,0,w,h) would run it corner
     to corner instead, which on a 4:5 card is nearly 50 degrees off and reads
     as a different field. So the CSS angle is converted properly: direction
     vector, CSS gradient-line length, then the two endpoints about the centre. */
  const deg = 105, rad = (deg * Math.PI) / 180;
  const dx = Math.sin(rad), dy = Math.cos(rad) * -1;      /* screen coords, y down */
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = w / 2, cy = h / 2;
  const g = ctx.createLinearGradient(
    cx - (dx * len) / 2, cy - (dy * len) / 2,
    cx + (dx * len) / 2, cy + (dy * len) / 2,
  );
  g.addColorStop(0, 'rgba(10,33,29,1)');
  g.addColorStop(0.48, 'rgba(10,33,29,0)');
  g.addColorStop(1, 'rgba(27,74,62,.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function sourceLabel(text, w, h, colour) {
  if (!text) return;
  ctx.fillStyle = colour;
  ctx.font = archivo(600, 22);
  ctx.textBaseline = 'alphabetic';
  /* On a story the label sits in the lower third rather than on the floor, so
     the extra height reads as air rather than as a gap under the type. */
  const y = size === 'story' ? h - PAD - (h - 1350) * 0.28 : h - PAD;
  tracked(text.toUpperCase(), PAD, y, 0.09 * 22, 'left');
}

/* ── the four templates ───────────────────────────────────────────────────── */

function drawThread(w, h, d) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(243,241,234,.7)';
  ctx.font = archivo(800, 24);
  ctx.textBaseline = 'top';
  tracked('Text thread', PAD, PAD, 0.14 * 24, 'left');

  const boxW = w - PAD * 2;
  const maxW = boxW * 0.82;
  const padX = 34, padY = 26, gap = 20, lh = 34 * 1.34;

  ctx.font = archivo(500, 34);
  const rows = d.lines.map((l, i) => {
    const inner = maxW - padX * 2;
    const lines = wrap(l.text, inner);
    const tw = Math.max(...lines.map((t) => ctx.measureText(t).width));
    return { ...l, lines, w: Math.min(maxW, tw + padX * 2), h: lines.length * lh + padY * 2, last: i === d.lines.length - 1 };
  });

  const totalH = rows.reduce((n, r) => n + r.h, 0) + gap * (rows.length - 1);
  let y = (h - totalH) / 2 + (size === 'story' ? -40 : 0);

  for (const r of rows) {
    const mine = r.who === 'me';
    const x = mine ? w - PAD - r.w : PAD;
    /* The last bubble turning brass is the whole device: it is how the
       punchline reads as the punchline. */
    const brassLast = mine && r.last;
    ctx.fillStyle = brassLast ? C.brass : mine ? C.pineLift : C.them;
    roundRect(x, y, r.w, r.h, mine ? { tl: 32, tr: 32, br: 10, bl: 32 } : { tl: 32, tr: 32, br: 32, bl: 10 });
    ctx.fill();

    ctx.fillStyle = brassLast ? C.brassInk : C.bone;
    ctx.font = brassLast ? archivo(700, 34) : archivo(500, 34);
    ctx.textBaseline = 'top';
    r.lines.forEach((t, i) => ctx.fillText(t, x + padX, y + padY + i * lh + (lh - 34) / 2 - 2));
    y += r.h + gap;
  }
  sourceLabel(d.source, w, h, 'rgba(243,241,234,.62)');
}

function drawQuote(w, h, d) {
  ctx.fillStyle = C.pine;
  ctx.fillRect(0, 0, w, h);
  ruledField(w, h);

  ctx.fillStyle = 'rgba(243,241,234,.7)';
  ctx.font = archivo(800, 24);
  ctx.textBaseline = 'top';
  tracked(d.tag || 'Essay', PAD, PAD, 0.14 * 24, 'left');

  /* One phrase may be brass; it is marked by wrapping it in asterisks. */
  const parts = [];
  String(d.quote).split(/(\*[^*]+\*)/).forEach((chunk) => {
    if (!chunk) return;
    const em = chunk.startsWith('*') && chunk.endsWith('*');
    parts.push({ text: em ? chunk.slice(1, -1) : chunk, em });
  });
  const plain = parts.map((p) => p.text).join('');

  ctx.font = spectral(600, 56);
  const lines = wrap(plain, w - PAD * 2, 24);
  const lh = 56 * 1.2;

  /* Bottom aligned, above the source label. */
  const labelRoom = size === 'story' ? (h - 1350) * 0.28 + 90 : 90;
  let y = h - PAD - labelRoom - lines.length * lh;

  /* Walk the plain lines and colour the runs that fell inside the marked
     phrase, so emphasis survives a line break. */
  let consumed = 0;
  for (const line of lines) {
    let x = PAD;
    let idx = 0;
    while (idx < line.length) {
      const abs = consumed + idx;
      let run = 0, em = false, at = 0;
      for (const p of parts) {
        if (abs >= at && abs < at + p.text.length) { em = p.em; run = at + p.text.length - abs; break; }
        at += p.text.length;
      }
      if (!run) run = line.length - idx;
      const seg = line.slice(idx, idx + run);
      ctx.fillStyle = em ? C.brass : C.bone;
      ctx.textBaseline = 'top';
      ctx.fillText(seg, x, y);
      x += ctx.measureText(seg).width;
      idx += seg.length;
    }
    consumed += line.length + 1;
    y += lh;
  }
  sourceLabel(d.source, w, h, 'rgba(243,241,234,.62)');
}

function drawTwoPanel(w, h, d) {
  const gap = 4;
  const half = (h - gap) / 2;

  /* The gap has to be painted. Leaving it as cleared canvas exports a
     transparent stripe through the middle of the card, which every platform
     then composites against its own background: white in one feed, near black
     in another. Ink makes it the same seam everywhere. */
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, w, h);

  const panels = [
    { y: 0, bg: C.sage, fg: C.sageInk, label: d.labelTop, line: d.lineTop },
    { y: half + gap, bg: C.clay, fg: C.clayInk, label: d.labelBottom, line: d.lineBottom },
  ];
  for (const p of panels) {
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, p.y, w, half);

    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = p.fg;
    ctx.font = archivo(800, 24);
    ctx.textBaseline = 'top';
    tracked(String(p.label).toUpperCase(), PAD, p.y + PAD, 0.14 * 24, 'left');
    ctx.restore();

    ctx.fillStyle = p.fg;
    ctx.font = spectral(600, 46);
    const lines = wrap(p.line, w - PAD * 2);
    const lh = 46 * 1.24;
    let y = p.y + half / 2 - (lines.length * lh) / 2 + 14;
    for (const t of lines) { ctx.fillText(t, PAD, y); y += lh; }
  }
  /* No source label: the joke does not need a footer. */
}

function drawVerse(w, h, d) {
  ctx.fillStyle = C.brass;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = C.brassInk;
  ctx.font = archivo(800, 24);
  ctx.textBaseline = 'top';
  tracked(String(d.reference).toUpperCase(), PAD, PAD, 0.16 * 24, 'left');

  /* The only template that sets the words in the display face rather than the
     reading face, which is what makes it a poster and not a pull quote. */
  ctx.font = archivoW(900, 64);
  const lines = wrap(String(d.verse).toUpperCase(), w - PAD * 2);
  const lh = 64 * 0.98;
  const blockH = lines.length * lh;
  let y = (h - blockH) / 2 - 30;
  ctx.fillStyle = C.brassInk;
  for (const t of lines) { ctx.fillText(t, PAD, y); y += lh; }

  ctx.fillStyle = 'rgba(36,26,0,.5)';
  ctx.fillRect(PAD, y + 26, 140, 3);

  ctx.save();
  ctx.globalAlpha = 0.6;
  sourceLabel(d.source, w, h, C.brassInk);
  ctx.restore();
}

/* ── read the form, draw, export ──────────────────────────────────────────── */

function readFields() {
  if (template === 'thread') {
    const rows = [...document.querySelectorAll('#f-thread .thread-row')].map((r) => ({
      who: r.querySelector('[data-who]').value,
      text: r.querySelector('[data-text]').value,
    })).filter((r) => r.text.trim());
    return { lines: rows, source: el('thread-source').value };
  }
  if (template === 'quote') {
    return { quote: el('q-line').value, tag: el('q-tag').value, source: el('q-source').value };
  }
  if (template === 'twopanel') {
    return {
      labelTop: el('tp-label1').value, lineTop: el('tp-line1').value,
      labelBottom: el('tp-label2').value, lineBottom: el('tp-line2').value,
    };
  }
  return { reference: el('v-ref').value, verse: el('v-line').value, source: el('v-source').value };
}

function draw() {
  const { w, h } = SIZES[size];
  canvas.width = w * 2;
  canvas.height = h * 2;
  canvas.style.width = w / 2 + 'px';
  canvas.style.height = h / 2 + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(2, 2);
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'left';

  const d = readFields();
  if (template === 'thread') drawThread(w, h, d);
  else if (template === 'quote') drawQuote(w, h, d);
  else if (template === 'twopanel') drawTwoPanel(w, h, d);
  else drawVerse(w, h, d);
}

function download() {
  const stamp = new Date().toISOString().slice(0, 10);
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dl-${template}-${size}-${stamp}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

function showPanel() {
  for (const id of ['f-thread', 'f-quote', 'f-twopanel', 'f-verse']) {
    el(id).hidden = id !== 'f-' + template;
  }
  document.querySelectorAll('[data-tpl]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.tpl === template)));
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.size === size)));
}

function threadCount() {
  const rows = [...document.querySelectorAll('#f-thread .thread-row')];
  const warn = el('thread-warn');
  /* Six is a warning, not a wall: four is the shape, and past six it stops
     reading as a scene, but it is his call. */
  warn.hidden = rows.length <= 6;
  el('thread-add').disabled = rows.length >= 8;
}

function addRow(who = 'them', text = '') {
  const row = document.createElement('div');
  row.className = 'thread-row';
  row.innerHTML =
    '<select data-who aria-label="Who is speaking">' +
      '<option value="them">them</option><option value="me">me</option></select>' +
    '<input data-text type="text" aria-label="Line" />' +
    '<button type="button" class="thread-del" aria-label="Remove line">&times;</button>';
  row.querySelector('[data-who]').value = who;
  row.querySelector('[data-text]').value = text;
  el('thread-rows').appendChild(row);
  threadCount();
}

function init() {
  /* Denvil's own, restored from the archive. */
  [['them', 'so what is the kingdom actually'],
   ['me', "a place where the King's will is done"],
   ['them', 'ok but where is it'],
   ['me', 'wherever you say yes']].forEach(([w, t]) => addRow(w, t));

  try {
    const saved = JSON.parse(localStorage.getItem('dl.studio') || '{}');
    if (saved.template) template = saved.template;
    if (saved.size) size = saved.size;
  } catch (e) {}

  document.querySelectorAll('[data-tpl]').forEach((b) =>
    b.addEventListener('click', () => {
      template = b.dataset.tpl; save(); showPanel(); draw();
    }));
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.addEventListener('click', () => {
      size = b.dataset.size; save(); showPanel(); draw();
    }));
  document.addEventListener('input', (e) => {
    if (e.target.closest('.studio-form')) draw();
  });
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('thread-del')) {
      e.target.closest('.thread-row').remove(); threadCount(); draw();
    }
  });
  el('thread-add').addEventListener('click', () => { addRow(); draw(); });
  el('dl').addEventListener('click', download);

  showPanel();
}

function save() {
  try { localStorage.setItem('dl.studio', JSON.stringify({ template, size })); } catch (e) {}
}

/* Nothing is drawn until the faces are actually available. */
async function boot() {
  init();
  try {
    await document.fonts.load('900 64px "Archivo"');
    await document.fonts.load('900 64px "Archivo Poster"');
    await document.fonts.load('800 24px "Archivo"');
    await document.fonts.load('500 34px "Archivo"');
    await document.fonts.load('600 56px "Spectral"');
    await document.fonts.load('600 46px "Spectral"');
    await document.fonts.ready;
  } catch (e) {}
  draw();
  el('studio-status').textContent = 'Ready';
}
boot();
