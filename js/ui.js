/**
 * js/ui.js
 * Geometric Password — UI Helpers
 *
 * All DOM manipulation, rendering, and display logic.
 * No cryptographic or geometric operations here.
 */

'use strict';

/* ── Character sets ── */

const CHARSETS = {
  full:  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.?',
  alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  hex:   '0123456789abcdef',
  pin:   '0123456789',
};
const AMBIG = /[0Oo1lI`'"]/g;

/* ── Passphrase wordlist ── */

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

/* ── Breach dictionary (also loaded from data/breach-dictionary.js) ── */

const BREACH_FALLBACK = new Set([
  'password','123456','12345678','qwerty','abc123','monkey','letmein','trustno1',
  'dragon','baseball','iloveyou','master','sunshine','passw0rd','shadow','123123',
  '654321','superman','michael','football','password1','password123','princess',
  'welcome','admin','login','hello','charlie','1234','12345','123456789',
  '000000','111111','696969','7777777','zxcvbnm','pa$$w0rd','p@ssw0rd',
  'admin123','root','changeme','default','guest','test123',
]);

function getBreachList() {
  return window.BREACH_LIST || BREACH_FALLBACK;
}

/* ── DOM helpers ── */

function el(id) { return document.getElementById(id); }

function getActiveCharset() {
  const btn = document.querySelector('.cs-btn.active');
  let cs = CHARSETS[btn ? btn.dataset.cs : 'full'];
  if (el('toggleAmbig').classList.contains('on')) cs = cs.replace(AMBIG, '');
  return cs;
}

/* ── Seed display ── */

async function updateSeedDisplay() {
  const raw  = el('seedInput').value;
  const t    = raw.trim();
  const type = !t ? 'empty' : (!isNaN(Number(t)) && t) ? 'numeric' : 'phrase';
  el('seedType').textContent = 'type: ' + type;

  if (t) {
    const h = await window.CryptoEngine.sha256hex(t);
    el('seedHash').textContent = 'SHA-256: ' + h.slice(0, 16) + '…';
  } else {
    el('seedHash').textContent = 'SHA-256: pending…';
  }
  updateSeedStrength(raw);
}

function updateSeedStrength(raw) {
  const t    = (raw || '').trim();
  const bits = !t ? 0 : t.match(/^\d+$/) ? Math.min(t.length * 3, 40) : Math.min(t.length * 4, 120);
  const level = bits < 10 ? 0 : bits < 30 ? 1 : bits < 60 ? 2 : 3;
  const cols  = ['#d63030', '#e09b20', '#18a96a', '#18a96a'];
  const lbls  = ['very weak', 'weak', 'moderate', 'strong'];
  ['sb1','sb2','sb3','sb4'].forEach((id, i) => {
    el(id).style.background = i <= level ? cols[level] : 'var(--bg2)';
  });
  el('ssLbl').textContent = 'seed strength: ' + lbls[level];
}

/* ── Strength + entropy display ── */

function formatTTC(bits) {
  const gps  = 1e10;
  const secs = Math.pow(2, bits) / gps;
  if (secs < 60)         return '<1 minute';
  if (secs < 3600)       return Math.round(secs / 60) + ' minutes';
  if (secs < 86400)      return Math.round(secs / 3600) + ' hours';
  if (secs < 31536000)   return Math.round(secs / 86400) + ' days';
  if (secs < 3.1536e13)  return Math.round(secs / 31536000).toLocaleString() + ' years';
  if (secs < 3.1536e19)  return (secs / 3.1536e13).toFixed(1) + ' million years';
  return (secs / 3.1536e19).toFixed(1) + ' trillion years';
}

function updateStrengthDisplay(pwd, charsetSize) {
  const bits  = Math.floor(pwd.length * Math.log2(Math.max(charsetSize, 2)));
  const level = bits < 40 ? 0 : bits < 60 ? 1 : bits < 90 ? 2 : 3;
  const cols  = ['#d63030', '#e09b20', '#18a96a', '#18a96a'];
  const lbls  = ['weak', 'fair', 'strong', 'very strong'];
  ['b1','b2','b3','b4'].forEach((id, i) => {
    el(id).style.background = i <= level ? cols[level] : 'var(--bg2)';
  });
  el('strLbl').textContent   = lbls[level];
  el('ttcLine').textContent  = 'Time to crack (10B guesses/sec): ' + formatTTC(bits);
  el('entropyLine').textContent =
    '~' + bits + ' bits · charset: ' + charsetSize + ' chars · length: ' + pwd.length;
}

/* ── Breach check ── */

function checkBreach(pwd) {
  const list  = getBreachList();
  const found = list.has(pwd) || list.has(pwd.toLowerCase());
  const row   = el('breachRow');
  if (found) {
    row.className   = 'breach-row show found';
    row.textContent = 'Found in common password dictionary — regenerate strongly recommended';
  } else {
    row.className   = 'breach-row show safe';
    row.textContent = 'Not found in common password dictionary ✓';
  }
}

/* ── Provenance panel ── */

function showProvenance(result) {
  el('pSeedHash').textContent  = result.seedHashHex.slice(0, 32) + '…';
  el('pSalt').textContent      = result.saltHex;
  el('pTime').textContent      = result.timestamp;
  el('pGeom').textContent      = result.shapeName;
  el('pMasterKey').textContent = result.masterKeyHex;
  el('provPanel').style.display = 'block';
}

/* ── Session history ── */

let _history = [];

function addHistory(pwd, shape, mode) {
  const ts   = new Date();
  const pad  = n => String(n).padStart(2, '0');
  const time = pad(ts.getHours()) + ':' + pad(ts.getMinutes()) + ':' + pad(ts.getSeconds());
  _history.unshift({ pwd, shape, mode, time });
  if (_history.length > 10) _history.pop();
  renderHistory();
}

function renderHistory() {
  const list = el('historyList');
  if (!_history.length) {
    list.innerHTML = '<div class="no-history">No passwords generated yet</div>';
    return;
  }
  list.innerHTML = _history.map((h, idx) => `
    <div class="history-item">
      <div class="hi-pwd">${h.pwd}</div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div class="hi-meta">${h.shape} · ${h.time}</div>
        <button class="hi-copy" data-idx="${idx}">Copy</button>
      </div>
    </div>`).join('');
  list.querySelectorAll('.hi-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const pwd = _history[parseInt(btn.dataset.idx)].pwd;
      navigator.clipboard.writeText(pwd).then(() => {
        btn.textContent = 'Done';
        setTimeout(() => btn.textContent = 'Copy', 1400);
      });
    });
  });
}

/* ── QR code ── */

function showQRCode(text) {
  const box = el('qrBox');
  box.innerHTML = '';
  if (typeof QRCode === 'undefined') {
    box.innerHTML = '<p style="font-family:monospace;font-size:11px;color:#d63030;padding:1rem;text-align:center">QR library loading…<br>Try again in a moment.</p>';
  } else {
    new QRCode(box, {
      text,
      width: 200,
      height: 200,
      colorDark: '#1a1b26',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  }
  const overlay = el('qrOverlay');
  overlay.classList.add('open');
  overlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ── Export ── */

window.UI = {
  CHARSETS,
  WORDS,
  el,
  getActiveCharset,
  updateSeedDisplay,
  updateStrengthDisplay,
  checkBreach,
  showProvenance,
  addHistory,
  renderHistory,
  showQRCode,
};
