/**
 * Geometric Password — Main Application
 * app.js
 *
 * All password generation happens client-side.
 * No data is ever sent to a server.
 */

'use strict';

/* ── Constants ── */

const CHARSETS = {
  full:  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.?',
  alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  hex:   '0123456789abcdef',
  pin:   '0123456789',
};
const AMBIG = /[0Oo1lI`'"]/g;

const METHOD = {
  fibonacci:    "Golden angle spiral: each point's position along the seed rotation axis maps to a character.",
  dodecahedron: '12 pentagonal faces × 5 vertices. Vertex-to-centroid distance + azimuth → character.',
  tetrahedron:  '6 edges in order. Edge length + midpoint azimuth + elevation → character per edge.',
};

const SHAPE_LABELS = {
  fibonacci:    'fibonacci spiral',
  dodecahedron: 'dodecahedron',
  tetrahedron:  'tetrahedron',
};

const SHAPE_KEYS = { fibonacci: 1, dodecahedron: 2, tetrahedron: 3 };

const WORDS = [
  'crystal','vortex','pine','lunar','ember','frost','delta','prism','orbit','nexus',
  'zenith','quartz','cipher','vector','noble','amber','solar','flux','haven','echo',
  'tide','grove','spark','vault','drift','blaze','stone','cloud','river','peak',
  'swift','iron','dawn','gale','ridge','cliff','storm','forge','blade','crest',
  'light','mist','snow','rain','wind','fire','earth','moon','star','wave',
  'sand','rock','lake','hill','sky','leaf','seed','root','bark','moss',
  'fern','reed','vine','rose','oak','elm','ash','bay','fox','owl',
  'elk','bee','ant','cod','ram','doe','jay',
];

/* ── State ── */
let curShape = 'fibonacci';
let curMode  = 'password';
let animH    = null;
let sessionHistory = [];
let lastPwd  = '';

/* ── Canvas setup ── */
const CV = document.getElementById('gc');
const cx = CV.getContext('2d');
const CW = 400, CH = 400, MX = CW / 2, MY = CH / 2;

/* ── Hash / math utilities ── */

function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h >>> 0);
}
function hashInt(n) {
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  n = (n >> 16) ^ n;
  return Math.abs(n >>> 0);
}
function mix(...s) {
  let r = s[0];
  for (let i = 1; i < s.length; i++) r = hashInt(r ^ hashInt(s[i]));
  return Math.abs(r >>> 0);
}
function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
}
function f2i(f, n) { return Math.floor(((f % 1) + 1) % 1 * n) % n; }

/* ── Seed parsing ── */

function parseSeed(raw) {
  const t = raw.trim();
  if (!t) return { v: 0, type: 'empty', disp: '0x00000000' };
  const n = Number(t);
  if (!isNaN(n)) {
    const v = Math.abs(Math.floor(n)) >>> 0;
    return { v, type: 'numeric', disp: '0x' + v.toString(16).padStart(8, '0').toUpperCase() };
  }
  const h = hashStr(t);
  return { v: h, type: 'phrase', disp: '0x' + h.toString(16).padStart(8, '0').toUpperCase() };
}

function nowSeed() {
  const d = new Date(), ts = Math.floor(d.getTime() / 1000);
  const p = n => String(n).padStart(2, '0');
  return {
    v: ts >>> 0,
    disp: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
          ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()),
    hash: '0x' + (ts >>> 0).toString(16).padStart(8, '0').toUpperCase(),
  };
}

/* ── 3D projection ── */

function project(x, y, z, rx, ry, sc) {
  let ax = x, ay = y * Math.cos(rx) - z * Math.sin(rx), az = y * Math.sin(rx) + z * Math.cos(rx);
  let fx = ax * Math.cos(ry) + az * Math.sin(ry), fy = ay, fz = -ax * Math.sin(ry) + az * Math.cos(ry);
  const d = 4.5, f = d / (d + fz / sc);
  return { sx: fx * f * sc + MX, sy: fy * f * sc + MY };
}

/* ── Geometry data ── */

const TV = [
  [0, 1, 0],
  [0, -1/3,  2 * Math.sqrt(2) / 3],
  [-Math.sqrt(2/3), -1/3, -Math.sqrt(2) / 3],
  [ Math.sqrt(2/3), -1/3, -Math.sqrt(2) / 3],
];
const TE = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];

function mkDV() {
  const phi = (1 + Math.sqrt(5)) / 2, ip = 1 / phi;
  const v = [
    [1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],
    [0,ip,phi],[0,ip,-phi],[0,-ip,phi],[0,-ip,-phi],
    [ip,phi,0],[ip,-phi,0],[-ip,phi,0],[-ip,-phi,0],
    [phi,0,ip],[phi,0,-ip],[-phi,0,ip],[-phi,0,-ip],
  ];
  const r = Math.hypot(...v[0]);
  return v.map(p => p.map(x => x / r));
}
function mkDE(vs) {
  const ds = [];
  for (let i = 0; i < vs.length; i++)
    for (let j = i + 1; j < vs.length; j++)
      ds.push(Math.hypot(...vs[i].map((v, k) => v - vs[j][k])));
  ds.sort((a, b) => a - b);
  const el = ds[0] * 1.05, ed = [];
  for (let i = 0; i < vs.length; i++)
    for (let j = i + 1; j < vs.length; j++)
      if (Math.hypot(...vs[i].map((v, k) => v - vs[j][k])) <= el) ed.push([i, j]);
  return ed;
}
const DV = mkDV(), DE = mkDE(DV);
const DF = [
  [0,8,10,2,16],[0,16,17,1,12],[0,12,14,4,8],[1,17,3,11,9],[1,9,5,14,12],
  [2,10,6,15,13],[2,13,3,17,16],[3,13,15,7,11],[4,14,5,19,18],[4,18,6,10,8],
  [5,9,11,7,19],[6,18,19,7,15],
];
function cen(vs, face) {
  const c = [0, 0, 0];
  face.forEach(i => { c[0] += vs[i][0]; c[1] += vs[i][1]; c[2] += vs[i][2]; });
  return c.map(x => x / face.length);
}

/* ── Canvas drawing ── */

function drawFib(seed, t) {
  const n = Math.max(30, Math.min(120, seed % 100 + 35));
  const ga = Math.PI * (3 - Math.sqrt(5)), pts = [];
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(i / n) * 170, a = i * ga + t * 0.25;
    pts.push([MX + r * Math.cos(a), MY + r * Math.sin(a)]);
  }
  cx.strokeStyle = 'rgba(61,108,250,0.2)'; cx.lineWidth = 0.6;
  for (let i = 1; i < pts.length; i++) {
    cx.beginPath(); cx.moveTo(pts[i-1][0], pts[i-1][1]); cx.lineTo(pts[i][0], pts[i][1]); cx.stroke();
  }
  for (let i = 0; i < pts.length; i++) {
    const ratio = i / pts.length;
    cx.beginPath(); cx.arc(pts[i][0], pts[i][1], 3.5 * (1 - ratio * 0.5), 0, Math.PI * 2);
    cx.fillStyle = `rgba(${61 + ratio * 171},${108 - ratio * 40},${250 - ratio * 100},${0.35 + ratio * 0.5})`;
    cx.fill();
  }
}
function drawDod(seed, t) {
  const rng = lcg(seed + 7), rx = t * 0.35 + rng() * 0.2, ry = t * 0.5 + rng() * 0.3, sc = 140;
  const pts = DV.map(v => project(v[0], v[1], v[2], rx, ry, sc));
  cx.strokeStyle = 'rgba(26,27,38,0.28)'; cx.lineWidth = 1.1;
  DE.forEach(([a, b]) => { cx.beginPath(); cx.moveTo(pts[a].sx, pts[a].sy); cx.lineTo(pts[b].sx, pts[b].sy); cx.stroke(); });
  cx.fillStyle = 'rgba(61,108,250,0.65)';
  pts.forEach(p => { cx.beginPath(); cx.arc(p.sx, p.sy, 3, 0, Math.PI * 2); cx.fill(); });
}
function drawTet(seed, t) {
  const rng = lcg(seed + 1), rx = t * 0.4 + rng() * 0.2, ry = t * 0.6 + rng() * 0.3, sc = 145;
  const pts = TV.map(v => project(v[0], v[1], v[2], rx, ry, sc));
  cx.strokeStyle = 'rgba(26,27,38,0.28)'; cx.lineWidth = 1.4;
  TE.forEach(([a, b]) => { cx.beginPath(); cx.moveTo(pts[a].sx, pts[a].sy); cx.lineTo(pts[b].sx, pts[b].sy); cx.stroke(); });
  cx.fillStyle = 'rgba(232,85,62,0.7)';
  pts.forEach(p => { cx.beginPath(); cx.arc(p.sx, p.sy, 5, 0, Math.PI * 2); cx.fill(); });
}
function drawCanvas(shape, seed, t) {
  cx.clearRect(0, 0, CW, CH);
  if (shape === 'fibonacci')    drawFib(seed, t);
  else if (shape === 'dodecahedron') drawDod(seed, t);
  else                          drawTet(seed, t);
}

/* ── Password generation ── */

function genFib(cseed, len, cs) {
  const ga = Math.PI * (3 - Math.sqrt(5));
  const rng = lcg(cseed), phase = rng() * Math.PI * 2;
  const out = []; let i = 0;
  while (out.length < len) {
    const a = i * ga + phase, r = Math.sqrt((i + 1) / (len + 1));
    const x = r * Math.cos(a), y = r * Math.sin(a);
    const raw = (x * Math.cos(cseed * 0.0001) + y * Math.sin(cseed * 0.0001) + 1) / 2;
    out.push(Math.floor(raw * cs.length) % cs.length); i++;
  }
  return out.map(i => cs[i]).join('');
}
function genTet(cseed, len, cs) {
  const rng = lcg(cseed), ba = rng() * Math.PI * 2, sc = cseed % 997 + 1;
  const out = []; let cy = 0;
  while (out.length < len) {
    TE.forEach(([a, b]) => {
      if (out.length >= len) return;
      const va = TV[a], vb = TV[b];
      const el = Math.hypot(vb[0]-va[0], vb[1]-va[1], vb[2]-va[2]);
      const mx = (va[0]+vb[0])/2, my = (va[1]+vb[1])/2, mz = (va[2]+vb[2])/2;
      const az = Math.atan2(my, mx) + ba;
      const ev = Math.asin(Math.max(-1, Math.min(1, mz)));
      const v1 = (el * (sc + cy * 37)) % cs.length;
      const v2 = f2i(az / (Math.PI * 2), cs.length);
      const v3 = f2i((ev + Math.PI / 2) / Math.PI, cs.length);
      out.push(Math.floor((v1 + v2 * 7 + v3 * 13 + cy * 31) % cs.length + cs.length) % cs.length);
    });
    cy++;
  }
  return out.slice(0, len).map(i => cs[i]).join('');
}
function genDod(cseed, len, cs) {
  const rng = lcg(cseed), so = rng() * 1000;
  const out = []; let cy = 0;
  while (out.length < len) {
    DF.forEach((face, fi) => {
      if (out.length >= len) return;
      const c = cen(DV, face);
      face.forEach((vi, pos) => {
        if (out.length >= len) return;
        const v = DV[vi];
        const d1 = Math.hypot(v[0]-c[0], v[1]-c[1], v[2]-c[2]);
        const d2 = Math.hypot(...v);
        const fa = (Math.atan2(c[1], c[0]) + Math.PI) / (Math.PI * 2);
        const va = (Math.atan2(v[1]-c[1], v[0]-c[0]) + Math.PI) / (Math.PI * 2);
        const ia = pos / face.length;
        const raw = d1*137.508 + d2*(so+cy*fi*7) + fa*cs.length*3 + va*cs.length*5 + ia*cs.length;
        out.push(Math.floor(Math.abs(raw)) % cs.length);
      });
    });
    cy++;
  }
  return out.slice(0, len).map(i => cs[i]).join('');
}
function genPassphrase(cseed, wc) {
  const rng = lcg(cseed), ga = Math.PI * (3 - Math.sqrt(5)), chosen = [];
  for (let i = 0; i < wc; i++) {
    const angle = i * ga;
    const idx = Math.abs(Math.floor(Math.sin(angle * (cseed % 1000 + 1) * 0.001 + rng() * Math.PI) * WORDS.length * 5)) % WORDS.length;
    chosen.push(WORDS[idx]);
  }
  return chosen.join('-') + '-' + Math.floor(rng() * 90 + 10);
}
function generatePwd(cseed, shape, len, cs, purity) {
  if (!cs || !cs.length) return '';
  const rng = lcg(cseed + 999);
  let geom = '';
  if (shape === 'fibonacci')    geom = genFib(cseed, len, cs);
  else if (shape === 'tetrahedron') geom = genTet(cseed, len, cs);
  else                          geom = genDod(cseed, len, cs);
  if (purity >= 100) return geom;
  const rngPwd = Array.from({ length: len }, () => cs[Math.floor(rng() * cs.length)]).join('');
  const blend = Math.round(len * (purity / 100));
  return geom.slice(0, blend) + rngPwd.slice(blend);
}

/* ── UI helpers ── */

function getCS() {
  const a = document.querySelector('.cs-btn.active');
  let cs = CHARSETS[a ? a.dataset.cs : 'full'];
  if (document.getElementById('toggleAmbig').classList.contains('on')) cs = cs.replace(AMBIG, '');
  return cs;
}

function checkBreach(pwd) {
  const row = document.getElementById('breachRow');
  // window.BREACH_LIST is loaded from data/breach-dictionary.js
  const list = window.BREACH_LIST || new Set();
  const found = list.has(pwd) || list.has(pwd.toLowerCase());
  if (found) {
    row.className = 'breach-row show found';
    row.textContent = 'Found in common password dictionary — regenerate strongly recommended';
  } else {
    row.className = 'breach-row show safe';
    row.textContent = 'Not found in common password dictionary ✓';
  }
}

function ttc(bits) {
  const gps = 1e10, secs = Math.pow(2, bits) / gps;
  if (secs < 60)         return '<1 minute';
  if (secs < 3600)       return Math.round(secs / 60) + ' minutes';
  if (secs < 86400)      return Math.round(secs / 3600) + ' hours';
  if (secs < 31536000)   return Math.round(secs / 86400) + ' days';
  if (secs < 3.1536e13)  return Math.round(secs / 31536000).toLocaleString() + ' years';
  if (secs < 3.1536e19)  return (secs / 3.1536e13).toFixed(1) + ' million years';
  return (secs / 3.1536e19).toFixed(1) + ' trillion years';
}

function updateStrength(pwd, csLen) {
  const bits = Math.floor(pwd.length * Math.log2(Math.max(csLen, 2)));
  const level = bits < 40 ? 0 : bits < 60 ? 1 : bits < 90 ? 2 : 3;
  const cols = ['#d63030', '#e09b20', '#18a96a', '#18a96a'];
  const lbls = ['weak', 'fair', 'strong', 'very strong'];
  ['b1','b2','b3','b4'].forEach((id, i) => {
    document.getElementById(id).style.background = i <= level ? cols[level] : 'var(--bg2)';
  });
  document.getElementById('strLbl').textContent = lbls[level];
  document.getElementById('ttcLine').textContent = 'Time to crack (10B guesses/sec): ' + ttc(bits);
  document.getElementById('entropyLine').textContent = '~' + bits + ' bits · charset: ' + csLen + ' chars · length: ' + pwd.length;
}

function updateSeedStrength() {
  const raw = document.getElementById('seedInput').value.trim();
  const bits = !raw ? 0 : raw.match(/^\d+$/) ? Math.min(raw.length * 3, 40) : Math.min(raw.length * 4, 120);
  const level = bits < 10 ? 0 : bits < 30 ? 1 : bits < 60 ? 2 : 3;
  const cols = ['#d63030', '#e09b20', '#18a96a', '#18a96a'];
  const lbls = ['very weak', 'weak', 'moderate', 'strong'];
  ['sb1','sb2','sb3','sb4'].forEach((id, i) => {
    document.getElementById(id).style.background = i <= level ? cols[level] : 'var(--bg2)';
  });
  document.getElementById('ssLbl').textContent = 'seed strength: ' + lbls[level];
}

function updateSeedUI() {
  const p = parseSeed(document.getElementById('seedInput').value);
  document.getElementById('seedType').textContent = 'type: ' + p.type;
  document.getElementById('seedHash').textContent = 'hash: ' + p.disp;
  updateSeedStrength();
  return p;
}

function updateMethodUI() {
  document.getElementById('shapeLabel').textContent = SHAPE_LABELS[curShape];
  document.getElementById('methodText').textContent = METHOD[curShape];
}

function addHistory(pwd, shape, mode) {
  const ts = new Date(), p = n => String(n).padStart(2, '0');
  const time = p(ts.getHours()) + ':' + p(ts.getMinutes()) + ':' + p(ts.getSeconds());
  sessionHistory.unshift({ pwd, shape, mode, time });
  if (sessionHistory.length > 10) sessionHistory.pop();
  renderHistory();
}

function renderHistory() {
  const el = document.getElementById('historyList');
  if (!sessionHistory.length) {
    el.innerHTML = '<div class="no-history">No passwords generated yet</div>';
    return;
  }
  el.innerHTML = sessionHistory.map((h, idx) => `
    <div class="history-item">
      <div class="hi-pwd">${h.pwd}</div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div class="hi-meta">${h.shape} · ${h.time}</div>
        <button class="hi-copy" data-idx="${idx}">Copy</button>
      </div>
    </div>`).join('');
  el.querySelectorAll('.hi-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const pwd = sessionHistory[parseInt(btn.dataset.idx)].pwd;
      navigator.clipboard.writeText(pwd).then(() => {
        btn.textContent = 'Done'; setTimeout(() => btn.textContent = 'Copy', 1400);
      });
    });
  });
}

function showQR(text) {
  const box = document.getElementById('qrBox');
  box.innerHTML = '';
  if (typeof QRCode === 'undefined') {
    box.innerHTML = '<p style="font-family:monospace;font-size:11px;color:#d63030;padding:1rem;text-align:center">QR library still loading.<br>Please try again in a moment.</p>';
  } else {
    new QRCode(box, {
      text: text, width: 200, height: 200,
      colorDark: '#1a1b26', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  }
  const overlay = document.getElementById('qrOverlay');
  overlay.classList.add('open');
  overlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function animate() {
  if (animH) cancelAnimationFrame(animH);
  const p = parseSeed(document.getElementById('seedInput').value);
  let t = 0;
  function fr() { drawCanvas(curShape, p.v, t); t += 0.012; animH = requestAnimationFrame(fr); }
  fr();
}

/* ── Event listeners ── */

document.getElementById('lenSlider').addEventListener('input', function () {
  document.getElementById('lenVal').textContent = this.value;
});
document.getElementById('wordSlider').addEventListener('input', function () {
  document.getElementById('wordVal').textContent = this.value;
});
document.getElementById('puritySlider').addEventListener('input', function () {
  document.getElementById('purityVal').textContent = this.value + '%';
});
document.getElementById('toggleAmbig').addEventListener('click', function () {
  this.classList.toggle('on');
});

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    curMode = btn.dataset.mode;
    document.getElementById('pwdOptions').style.display = curMode === 'password' ? 'block' : 'none';
    document.getElementById('ppOptions').style.display  = curMode === 'passphrase' ? 'block' : 'none';
  });
});

document.querySelectorAll('.cs-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cs-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.querySelectorAll('.shape-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    curShape = btn.dataset.shape;
    document.getElementById('fShape').textContent = curShape;
    document.getElementById('fShapeH').textContent = '0x' + hashInt(SHAPE_KEYS[curShape]).toString(16).padStart(8, '0').toUpperCase();
    updateMethodUI();
    animate();
  });
});

document.getElementById('seedInput').addEventListener('input', () => {
  updateSeedUI(); animate();
});

document.getElementById('genBtn').addEventListener('click', () => {
  const sp    = parseSeed(document.getElementById('seedInput').value);
  const ts    = nowSeed();
  const shv   = hashInt(SHAPE_KEYS[curShape]);
  const cseed = mix(sp.v, ts.v, shv);
  const purity = parseInt(document.getElementById('puritySlider').value);

  document.getElementById('fSeed').textContent  = document.getElementById('seedInput').value.trim() || '(empty)';
  document.getElementById('fSeedH').textContent = sp.disp;
  document.getElementById('fTime').textContent  = ts.disp;
  document.getElementById('fTimeH').textContent = ts.hash;
  document.getElementById('fShape').textContent = curShape;
  document.getElementById('fShapeH').textContent = '0x' + shv.toString(16).padStart(8, '0').toUpperCase();
  document.getElementById('fCombined').textContent = '0x' + cseed.toString(16).padStart(8, '0').toUpperCase();

  let pwd = '';
  if (curMode === 'passphrase') {
    const wc = parseInt(document.getElementById('wordSlider').value);
    pwd = genPassphrase(cseed, wc);
    updateStrength(pwd, WORDS.length);
  } else {
    const cs  = getCS();
    const len = parseInt(document.getElementById('lenSlider').value);
    pwd = generatePwd(cseed, curShape, len, cs, purity);
    updateStrength(pwd, cs.length);
  }

  lastPwd = pwd;
  const out = document.getElementById('pwdOut');
  out.textContent = pwd;
  out.classList.remove('empty');
  document.getElementById('outputCard').classList.add('live');
  checkBreach(pwd);
  addHistory(pwd, curShape, curMode);
});

document.getElementById('copyBtn').addEventListener('click', () => {
  if (!lastPwd) return;
  navigator.clipboard.writeText(lastPwd).then(() => {
    const b = document.getElementById('copyBtn');
    b.textContent = 'Copied ✓'; b.classList.add('copied');
    setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('copied'); }, 1800);
  });
});

document.getElementById('qrBtn').addEventListener('click', () => {
  if (!lastPwd) { alert('Generate a password first.'); return; }
  showQR(lastPwd);
});
document.getElementById('qrClose').addEventListener('click', () => {
  document.getElementById('qrOverlay').classList.remove('open');
});

/* ── Init ── */

document.getElementById('fShape').textContent  = curShape;
document.getElementById('fShapeH').textContent = '0x' + hashInt(SHAPE_KEYS[curShape]).toString(16).padStart(8, '0').toUpperCase();
updateSeedUI();
updateMethodUI();
renderHistory();
animate();
