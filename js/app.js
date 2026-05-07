/**
 * js/app.js  —  Geometric Password · Unified Application
 *
 * All logic lives here: crypto engine, geometry data, canvas
 * animation, UI helpers, and event wiring. One file = zero
 * load-order issues and no module bundler required.
 *
 * Requires (loaded before this file via index.html):
 *   - qrcodejs CDN  (window.QRCode)
 *   - data/breach-dictionary.js  (window.BREACH_LIST)
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════
     CONSTANTS
  ═══════════════════════════════════════════════ */

  const CHARSETS = {
    full:  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.?',
    alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    hex:   '0123456789abcdef',
    pin:   '0123456789',
  };

  const AMBIG = /[0Oo1lI`'"]/g;

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

  // Fallback breach list (data/breach-dictionary.js loads a larger one into window.BREACH_LIST)
  const BREACH_FALLBACK = new Set([
    'password','123456','12345678','qwerty','abc123','monkey','1234567','letmein',
    'trustno1','dragon','baseball','iloveyou','master','sunshine','ashley','bailey',
    'passw0rd','shadow','123123','654321','superman','qazwsx','michael','football',
    'password1','password123','princess','welcome','admin','login','hello','charlie',
    'donald','password2','qwerty123','1q2w3e4r','abc1234','pass','test','1234',
    '12345','123456789','1234567890','000000','111111','696969','121212','222222',
    '333333','444444','555555','666666','777777','888888','999999','7777777',
    '1q2w3e','q1w2e3r4','zxcvbnm','qwertyuiop','asdfghjkl','zxcvbn',
    'pa$$w0rd','p@ssw0rd','pass@123','admin123','root','toor','alpine','raspberry',
    'changeme','default','guest','user','test123','1111','0000','11111','00000',
    '123321','112233','aaaaaa','dragon1','letmein1','welcome1','iloveyou1','monkey1',
    'master1','jessica','jennifer','thomas','robert','hunter','buster','ranger',
    'tigger','soccer','hockey','harley','dallas','yankees','joshua','maggie',
    'access','secret','P@ssw0rd','Admin1234','Passw0rd!','starwars','batman',
    'superman1','spiderman','pokemon','minecraft','fortnite','matrix','linkedin',
    'facebook','twitter','instagram','google','amazon','netflix','spotify',
    'apple123','microsoft','windows',
  ]);

  const SHAPES = ['fibonacci', 'dodecahedron', 'tetrahedron'];

  const SHAPE_METHODS = {
    fibonacci:    'Fibonacci golden spiral — angular XOR masks from spiral coordinates permute the CSPRNG stream',
    dodecahedron: 'Dodecahedron face traversal — 12 pentagon centroid spherical angles XOR-permute the CSPRNG stream',
    tetrahedron:  'Tetrahedron edge walk — 6 edge unit vectors cyclically XOR-permute the CSPRNG byte stream',
  };

  /* ═══════════════════════════════════════════════
     GEOMETRY DATA
  ═══════════════════════════════════════════════ */

  // Tetrahedron vertices (unit sphere)
  const TV = [
    [0, 1, 0],
    [0, -1 / 3,  2 * Math.sqrt(2) / 3],
    [-Math.sqrt(2 / 3), -1 / 3, -Math.sqrt(2) / 3],
    [ Math.sqrt(2 / 3), -1 / 3, -Math.sqrt(2) / 3],
  ];
  const TE = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];

  // Normalised edge direction vectors — used as XOR permutation kernel
  const TET_VECTORS = TE.map(([a, b]) => {
    const va = TV[a], vb = TV[b];
    const d  = Math.hypot(vb[0]-va[0], vb[1]-va[1], vb[2]-va[2]);
    return [(vb[0]-va[0])/d, (vb[1]-va[1])/d, (vb[2]-va[2])/d];
  });

  // Dodecahedron vertices (unit sphere)
  const DV = (function () {
    const phi = (1 + Math.sqrt(5)) / 2, ip = 1 / phi;
    const raw = [
      [1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],
      [0,ip,phi],[0,ip,-phi],[0,-ip,phi],[0,-ip,-phi],
      [ip,phi,0],[ip,-phi,0],[-ip,phi,0],[-ip,-phi,0],
      [phi,0,ip],[phi,0,-ip],[-phi,0,ip],[-phi,0,-ip],
    ];
    const r = Math.hypot(...raw[0]);
    return raw.map(p => p.map(x => x / r));
  }());

  const DE = (function () {
    const ds = [];
    for (let i = 0; i < DV.length; i++)
      for (let j = i + 1; j < DV.length; j++)
        ds.push(Math.hypot(...DV[i].map((v, k) => v - DV[j][k])));
    ds.sort((a, b) => a - b);
    const el = ds[0] * 1.05, edges = [];
    for (let i = 0; i < DV.length; i++)
      for (let j = i + 1; j < DV.length; j++)
        if (Math.hypot(...DV[i].map((v, k) => v - DV[j][k])) <= el)
          edges.push([i, j]);
    return edges;
  }());

  // 12 pentagonal faces
  const DF = [
    [0,8,10,2,16],[0,16,17,1,12],[0,12,14,4,8],
    [1,17,3,11,9],[1,9,5,14,12],[2,10,6,15,13],
    [2,13,3,17,16],[3,13,15,7,11],[4,14,5,19,18],
    [4,18,6,10,8],[5,9,11,7,19],[6,18,19,7,15],
  ];

  // Face centroids — XOR permutation kernel for dodecahedron
  const DOD_CENTROIDS = DF.map(face => {
    const c = [0, 0, 0];
    face.forEach(i => { c[0] += DV[i][0]; c[1] += DV[i][1]; c[2] += DV[i][2]; });
    return c.map(x => x / face.length);
  });

  /* ═══════════════════════════════════════════════
     CRYPTO UTILITIES
  ═══════════════════════════════════════════════ */

  function enc(s)    { return new TextEncoder().encode(String(s || '')); }
  function toHex(a)  { return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join(''); }

  function concat(...arrs) {
    const len = arrs.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(len);
    let off = 0;
    for (const a of arrs) { out.set(a, off); off += a.length; }
    return out;
  }

  async function sha256(data) {
    const input = data instanceof Uint8Array ? data : enc(data);
    return new Uint8Array(await crypto.subtle.digest('SHA-256', input));
  }

  function freshSalt() {
    const s = new Uint8Array(16);  // 128-bit CSPRNG salt
    crypto.getRandomValues(s);
    return s;
  }

  // HMAC-SHA-256 counter mode — expands master key into arbitrary-length byte stream
  async function hmacStream(masterKey, totalBytes) {
    const key = await crypto.subtle.importKey(
      'raw', masterKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const blocks = Math.ceil(totalBytes / 32);
    const stream = new Uint8Array(blocks * 32);
    for (let i = 0; i < blocks; i++) {
      const ctr = new Uint8Array(4);
      new DataView(ctr.buffer).setUint32(0, i, false);
      const blk = await crypto.subtle.sign('HMAC', key, ctr);
      stream.set(new Uint8Array(blk), i * 32);
    }
    return stream.slice(0, totalBytes);
  }

  /* ═══════════════════════════════════════════════
     GEOMETRIC XOR PERMUTATION LAYER
     Geometry scrambles an already-secure CSPRNG stream.
     Security does not depend on keeping the algorithm secret.
  ═══════════════════════════════════════════════ */

  function xorFibonacci(stream) {
    const ga = Math.PI * (3 - Math.sqrt(5));
    const out = new Uint8Array(stream.length);
    for (let i = 0; i < stream.length; i++) {
      const a    = i * ga;
      const mask = Math.abs(Math.floor(Math.cos(a) * 127 + Math.sin(a) * 128)) & 0xFF;
      out[i] = stream[i] ^ mask;
    }
    return out;
  }

  function xorTetrahedron(stream) {
    const out = new Uint8Array(stream.length);
    for (let i = 0; i < stream.length; i++) {
      const e    = TET_VECTORS[i % 6];
      const mask = Math.abs(Math.floor(e[0] * 85 + e[1] * 86 + e[2] * 85)) & 0xFF;
      out[i] = stream[i] ^ mask;
    }
    return out;
  }

  function xorDodecahedron(stream) {
    const out = new Uint8Array(stream.length);
    for (let i = 0; i < stream.length; i++) {
      const c     = DOD_CENTROIDS[i % 12];
      const phi   = Math.atan2(c[1], c[0]);
      const theta = Math.asin(Math.max(-1, Math.min(1, c[2])));
      const mask  = Math.abs(Math.floor(phi * 40.5 + theta * 81)) & 0xFF;
      out[i] = stream[i] ^ mask;
    }
    return out;
  }

  function applyPermutation(stream, shape) {
    if (shape === 'fibonacci')    return xorFibonacci(stream);
    if (shape === 'tetrahedron')  return xorTetrahedron(stream);
    return xorDodecahedron(stream);
  }

  // Rejection sampling — eliminates modulo bias
  function rejectSample(stream, charset) {
    const csLen     = charset.length;
    const threshold = 256 - (256 % csLen);
    const out       = [];
    for (let i = 0; i < stream.length; i++) {
      if (stream[i] < threshold) out.push(charset[stream[i] % csLen]);
    }
    return out;
  }

  // Encode unix timestamp as 8 bytes without BigInt/setBigUint64
  // (setBigUint64 is not supported in all browsers and throws silently on GitHub Pages)
  function tsToBytes(tsSec) {
    const b = new Uint8Array(8);
    b[4] = (tsSec >>> 24) & 0xFF;
    b[5] = (tsSec >>> 16) & 0xFF;
    b[6] = (tsSec >>>  8) & 0xFF;
    b[7] =  tsSec         & 0xFF;
    return b;
  }

  // Build master key: SHA-256(seedHash ‖ salt ‖ timestamp ‖ shapeId)
  async function buildMasterKey(seedText, salt, tsSec, shapeId) {
    const seedHash  = await sha256(seedText || '');
    const masterKey = await sha256(concat(seedHash, salt, tsToBytes(tsSec), new Uint8Array([shapeId])));
    return { seedHash, masterKey };
  }

  // Auto-select geometry from SHA-256 of seed + fresh salt — user has no control
  async function autoSelectShape(seedText) {
    const h = await sha256(seedText || '');
    const s = freshSalt();
    const k = await sha256(concat(h, s));
    return SHAPES[k[0] % SHAPES.length];
  }

  // Format a unix timestamp (plain number, seconds) as readable string
  function fmtTimestamp(tsSec) {
    const d = new Date(tsSec * 1000);
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate()) +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  /* ── Password generation pipeline ── */
  async function generatePassword(seedText, length, charset, shapeName, shapeId) {
    const salt  = freshSalt();
    const tsSec = Math.floor(Date.now() / 1000);
    const { seedHash, masterKey } = await buildMasterKey(seedText, salt, tsSec, shapeId);

    // Expand to large stream (8× length) to allow rejection sampling headroom
    let stream = applyPermutation(await hmacStream(masterKey, length * 8), shapeName);
    let chars  = rejectSample(stream, charset);

    // Extremely rare pad — only if rejection sampling falls short
    if (chars.length < length) {
      const extra   = applyPermutation(await hmacStream(masterKey, (length - chars.length) * 16), shapeName);
      chars = chars.concat(rejectSample(extra, charset));
    }

    return {
      password:     chars.slice(0, length).join(''),
      seedHashHex:  toHex(seedHash),
      saltHex:      toHex(salt),
      masterKeyHex: toHex(masterKey),
      timestamp:    fmtTimestamp(tsSec),
      shapeName,
    };
  }

  /* ── Passphrase generation pipeline ── */
  async function generatePassphrase(seedText, wordCount, shapeName, shapeId) {
    const salt  = freshSalt();
    const tsSec = Math.floor(Date.now() / 1000);
    const { seedHash, masterKey } = await buildMasterKey(seedText, salt, tsSec, shapeId);

    const raw    = await hmacStream(masterKey, wordCount * 4 + 4);
    const permed = applyPermutation(raw, shapeName);
    const view   = new DataView(permed.buffer);

    const chosen = [];
    for (let i = 0; i < wordCount; i++) {
      chosen.push(WORDS[view.getUint32(i * 4, false) % WORDS.length]);
    }
    const num = view.getUint16(wordCount * 4, false) % 90 + 10;

    return {
      password:     chosen.join('-') + '-' + num,
      seedHashHex:  toHex(seedHash),
      saltHex:      toHex(salt),
      masterKeyHex: toHex(masterKey),
      timestamp:    fmtTimestamp(tsSec),
      shapeName,
    };
  }

  /* ═══════════════════════════════════════════════
     CANVAS ANIMATION
     CV/ctx declared here as let, assigned inside
     DOMContentLoaded so getElementById never runs
     before the canvas element exists in the DOM.
  ═══════════════════════════════════════════════ */

  let CV, ctx;
  const CW = 400, CH = 400, MX = CW / 2, MY = CH / 2;
  let animHandle = null, animShape = 'fibonacci';

  function project(x, y, z, rx, ry, sc) {
    let ax = x, ay = y*Math.cos(rx) - z*Math.sin(rx), az = y*Math.sin(rx) + z*Math.cos(rx);
    let fx = ax*Math.cos(ry) + az*Math.sin(ry), fy = ay, fz = -ax*Math.sin(ry) + az*Math.cos(ry);
    const d = 4.5, f = d / (d + fz / sc);
    return { sx: fx*f*sc + MX, sy: fy*f*sc + MY };
  }

  function drawFibonacci(t) {
    const n = 55, ga = Math.PI * (3 - Math.sqrt(5)), pts = [];
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(i / n) * 165, a = i * ga + t * 0.25;
      pts.push([MX + r*Math.cos(a), MY + r*Math.sin(a)]);
    }
    ctx.strokeStyle = 'rgba(124,58,237,0.16)'; ctx.lineWidth = 0.55;
    for (let i = 1; i < pts.length; i++) {
      ctx.beginPath(); ctx.moveTo(pts[i-1][0], pts[i-1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    }
    for (let i = 0; i < pts.length; i++) {
      const r = i / pts.length;
      ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], 3.4*(1-r*0.5), 0, Math.PI*2);
      ctx.fillStyle = `rgba(124,58,237,${0.28 + r*0.52})`; ctx.fill();
    }
  }

  function drawDodecahedron(t) {
    const rx = t*0.35 + 0.3, ry = t*0.5 + 0.4, sc = 135;
    const pts = DV.map(v => project(v[0], v[1], v[2], rx, ry, sc));
    ctx.strokeStyle = 'rgba(26,27,38,0.2)'; ctx.lineWidth = 1.05;
    DE.forEach(([a, b]) => {
      ctx.beginPath(); ctx.moveTo(pts[a].sx, pts[a].sy);
      ctx.lineTo(pts[b].sx, pts[b].sy); ctx.stroke();
    });
    ctx.fillStyle = 'rgba(124,58,237,0.58)';
    pts.forEach(p => { ctx.beginPath(); ctx.arc(p.sx, p.sy, 2.8, 0, Math.PI*2); ctx.fill(); });
  }

  function drawTetrahedron(t) {
    const rx = t*0.4 + 0.2, ry = t*0.6 + 0.3, sc = 140;
    const pts = TV.map(v => project(v[0], v[1], v[2], rx, ry, sc));
    ctx.strokeStyle = 'rgba(26,27,38,0.2)'; ctx.lineWidth = 1.3;
    TE.forEach(([a, b]) => {
      ctx.beginPath(); ctx.moveTo(pts[a].sx, pts[a].sy);
      ctx.lineTo(pts[b].sx, pts[b].sy); ctx.stroke();
    });
    ctx.fillStyle = 'rgba(124,58,237,0.62)';
    pts.forEach(p => { ctx.beginPath(); ctx.arc(p.sx, p.sy, 4.5, 0, Math.PI*2); ctx.fill(); });
  }

  function runAnimation() {
    if (animHandle) cancelAnimationFrame(animHandle);
    let t = 0;
    function frame() {
      ctx.clearRect(0, 0, CW, CH);
      if      (animShape === 'fibonacci')    drawFibonacci(t);
      else if (animShape === 'dodecahedron') drawDodecahedron(t);
      else                                   drawTetrahedron(t);
      t += 0.012;
      animHandle = requestAnimationFrame(frame);
    }
    frame();
  }

  /* ═══════════════════════════════════════════════
     UI STATE
  ═══════════════════════════════════════════════ */

  let curMode       = 'password';
  let lastPwd       = '';
  let sessionHistory = [];
  let seedHashTimer  = null;

  function $id(id) { return document.getElementById(id); }

  /* ── Charset helper ── */
  function getActiveCharset() {
    const btn = document.querySelector('.cs-btn.active');
    let cs = CHARSETS[btn ? btn.dataset.cs : 'full'];
    if ($id('toggleAmbig').classList.contains('on')) cs = cs.replace(AMBIG, '');
    return cs;
  }

  /* ── Seed display ── */
  async function updateSeedUI() {
    const raw = $id('seedInput').value;
    const t   = raw.trim();
    const type = !t ? 'empty' : (!isNaN(Number(t)) && t) ? 'numeric' : 'phrase';
    $id('seedType').textContent = 'type: ' + type;

    // Debounce SHA-256 preview — runs async, not on every keypress
    clearTimeout(seedHashTimer);
    if (t) {
      seedHashTimer = setTimeout(async () => {
        const h = await sha256(t);
        $id('seedHash').textContent = 'SHA-256: ' + toHex(h).slice(0, 16) + '…';
      }, 300);
    } else {
      $id('seedHash').textContent = 'SHA-256: pending…';
    }

    // Seed strength bars
    const bits  = !t ? 0 : t.match(/^\d+$/) ? Math.min(t.length * 3, 40) : Math.min(t.length * 4, 120);
    const level = bits < 10 ? 0 : bits < 30 ? 1 : bits < 60 ? 2 : 3;
    const cols  = ['#d63030', '#e09b20', '#18a96a', '#18a96a'];
    const lbls  = ['very weak', 'weak', 'moderate', 'strong'];
    ['sb1','sb2','sb3','sb4'].forEach((id, i) =>
      $id(id).style.background = i <= level ? cols[level] : 'var(--bg2)'
    );
    $id('ssLbl').textContent = 'seed strength: ' + lbls[level];
  }

  /* ── Strength & entropy display ── */
  function formatTTC(bits) {
    const gps = 1e10, secs = Math.pow(2, bits) / gps;
    if (secs < 60)         return '<1 minute';
    if (secs < 3600)       return Math.round(secs / 60) + ' minutes';
    if (secs < 86400)      return Math.round(secs / 3600) + ' hours';
    if (secs < 31536000)   return Math.round(secs / 86400) + ' days';
    if (secs < 3.1536e13)  return Math.round(secs / 31536000).toLocaleString() + ' years';
    if (secs < 3.1536e19)  return (secs / 3.1536e13).toFixed(1) + ' million years';
    return (secs / 3.1536e19).toFixed(1) + ' trillion years';
  }

  function showStrength(pwd, csLen) {
    const bits  = Math.floor(pwd.length * Math.log2(Math.max(csLen, 2)));
    const level = bits < 40 ? 0 : bits < 60 ? 1 : bits < 90 ? 2 : 3;
    const cols  = ['#d63030', '#e09b20', '#18a96a', '#18a96a'];
    const lbls  = ['weak', 'fair', 'strong', 'very strong'];
    ['b1','b2','b3','b4'].forEach((id, i) =>
      $id(id).style.background = i <= level ? cols[level] : 'var(--bg2)'
    );
    $id('strLbl').textContent  = lbls[level];
    $id('ttcLine').textContent = 'Time to crack (10B guesses/sec): ' + formatTTC(bits);
    $id('entropyLine').textContent =
      '~' + bits + ' bits · charset: ' + csLen + ' chars · length: ' + pwd.length;
  }

  /* ── Breach check ── */
  function checkBreach(pwd) {
    const list  = window.BREACH_LIST || BREACH_FALLBACK;
    const found = list.has(pwd) || list.has(pwd.toLowerCase());
    const row   = $id('breachRow');
    row.className   = 'breach-row show ' + (found ? 'found' : 'safe');
    row.textContent = found
      ? '⚠ Found in common password dictionary — regenerate recommended'
      : '✓ Not found in common password dictionary';
  }

  /* ── Cryptographic provenance panel ── */
  function showProvenance(r) {
    $id('pSeedHash').textContent  = r.seedHashHex.slice(0, 32) + '…';
    $id('pSalt').textContent      = r.saltHex;
    $id('pTime').textContent      = r.timestamp;
    $id('pGeom').textContent      = r.shapeName;
    $id('pMasterKey').textContent = r.masterKeyHex;
    $id('provPanel').style.display = 'block';
  }

  /* ── Session history ── */
  function addHistory(pwd, shape, mode) {
    const ts  = new Date();
    const pad = n => String(n).padStart(2, '0');
    const time = pad(ts.getHours()) + ':' + pad(ts.getMinutes()) + ':' + pad(ts.getSeconds());
    sessionHistory.unshift({ pwd, shape, mode, time });
    if (sessionHistory.length > 10) sessionHistory.pop();
    renderHistory();
  }

  function renderHistory() {
    const list = $id('historyList');
    if (!sessionHistory.length) {
      list.innerHTML = '<div class="no-history">No passwords generated yet</div>';
      return;
    }
    list.innerHTML = sessionHistory.map((h, idx) => `
      <div class="history-item">
        <div class="hi-pwd">${h.pwd}</div>
        <div class="hi-right">
          <div class="hi-meta">${h.shape} · ${h.time}</div>
          <button class="hi-copy" data-idx="${idx}">Copy</button>
        </div>
      </div>`).join('');

    list.querySelectorAll('.hi-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const pwd = sessionHistory[parseInt(btn.dataset.idx, 10)].pwd;
        navigator.clipboard.writeText(pwd).then(() => {
          btn.textContent = 'Done ✓';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
        });
      });
    });
  }

  /* ── QR code ── */
  function showQR(text) {
    const box = $id('qrBox');
    box.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(box, {
        text,
        width: 200, height: 200,
        colorDark: '#1a1b26', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });
    } else {
      box.innerHTML = '<p style="font-family:monospace;font-size:11px;color:#d63030;padding:1rem;text-align:center">QR library loading…<br>Please try again.</p>';
    }
    const overlay = $id('qrOverlay');
    overlay.classList.add('open');
    overlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ═══════════════════════════════════════════════
     EVENT LISTENERS + INIT
     Wrapped in DOMContentLoaded to guarantee every
     element exists before addEventListener is called,
     regardless of where the <script> tag sits in HTML.
  ═══════════════════════════════════════════════ */

  document.addEventListener('DOMContentLoaded', function () {

    // Assign canvas references now that the DOM is ready
    CV  = document.getElementById('gc');
    ctx = CV.getContext('2d');

    // Sliders — update display immediately on every input event
    $id('lenSlider').addEventListener('input', function () {
      $id('lenVal').textContent = this.value;
    });
    $id('wordSlider').addEventListener('input', function () {
      $id('wordVal').textContent = this.value;
    });

    // Toggle ambiguous characters
    $id('toggleAmbig').addEventListener('click', function () {
      this.classList.toggle('on');
      this.setAttribute('aria-checked', this.classList.contains('on') ? 'true' : 'false');
    });

    // Mode switch
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        curMode = btn.dataset.mode;
        $id('pwdOptions').style.display = curMode === 'password'   ? 'block' : 'none';
        $id('ppOptions').style.display  = curMode === 'passphrase' ? 'block' : 'none';
      });
    });

    // Character set selection
    document.querySelectorAll('.cs-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cs-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Seed — live type feedback
    $id('seedInput').addEventListener('input', updateSeedUI);

    // Generate
    $id('genBtn').addEventListener('click', async () => {
      const btn = $id('genBtn');
      btn.disabled    = true;
      btn.textContent = 'Generating…';

      try {
        const seedText  = $id('seedInput').value.trim();
        const shapeName = await autoSelectShape(seedText);
        const shapeId   = SHAPES.indexOf(shapeName);

        // Switch canvas to the selected shape
        animShape = shapeName;
        $id('shapeLabel').textContent = shapeName;
        $id('methodText').textContent = SHAPE_METHODS[shapeName];

        let result;
        if (curMode === 'passphrase') {
          const wc = parseInt($id('wordSlider').value, 10);
          result   = await generatePassphrase(seedText, wc, shapeName, shapeId);
          showStrength(result.password, WORDS.length);
        } else {
          const cs  = getActiveCharset();
          const len = parseInt($id('lenSlider').value, 10);
          result    = await generatePassword(seedText, len, cs, shapeName, shapeId);
          showStrength(result.password, cs.length);
        }

        lastPwd = result.password;
        const out = $id('pwdOut');
        out.textContent = result.password;
        out.classList.remove('empty');
        $id('outputCard').classList.add('live');

        checkBreach(result.password);
        showProvenance(result);
        addHistory(result.password, shapeName, curMode);

      } catch (err) {
        console.error('Generation error:', err);
        const out = $id('pwdOut');
        out.textContent = 'Error: Web Crypto API requires HTTPS. See browser console for details.';
        out.classList.remove('empty');
      } finally {
        btn.disabled    = false;
        btn.textContent = 'Generate password — snapshot now';
      }
    });

    // Copy to clipboard
    $id('copyBtn').addEventListener('click', () => {
      if (!lastPwd) return;
      navigator.clipboard.writeText(lastPwd).then(() => {
        const btn = $id('copyBtn');
        btn.textContent = 'Copied ✓';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
      }).catch(() => {
        // Fallback for restrictive browsers
        const ta = document.createElement('textarea');
        ta.value = lastPwd; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      });
    });

    // QR
    $id('qrBtn').addEventListener('click', () => {
      if (!lastPwd) { alert('Generate a password first.'); return; }
      showQR(lastPwd);
    });
    $id('qrClose').addEventListener('click', () => {
      $id('qrOverlay').classList.remove('open');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') $id('qrOverlay').classList.remove('open');
    });

    // ── Init ──
    updateSeedUI();
    renderHistory();
    runAnimation();

  }); // end DOMContentLoaded

}()); // end IIFE
