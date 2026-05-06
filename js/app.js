/**
 * js/app.js
 * Geometric Password — Application Orchestrator
 *
 * Wires up all modules: CryptoEngine, Geometry, Canvas, UI.
 * Handles all user interactions and event listeners.
 *
 * Dependencies (loaded before this file via index.html):
 *   - js/crypto-engine.js  → window.CryptoEngine
 *   - js/geometry.js       → window.Geometry
 *   - js/canvas.js         → window.Canvas
 *   - js/ui.js             → window.UI
 *   - data/breach-dictionary.js → window.BREACH_LIST
 */

'use strict';

/* ── App state ── */

let curMode = 'password';
let lastPwd = '';

/* ── Convenience aliases ── */

const { CryptoEngine, Geometry, Canvas, UI } = window;
const el = UI.el;

/* ── Slider live updates ── */

el('lenSlider').addEventListener('input', function () {
  el('lenVal').textContent = this.value;
});

el('wordSlider').addEventListener('input', function () {
  el('wordVal').textContent = this.value;
});

/* ── Toggle: exclude ambiguous characters ── */

el('toggleAmbig').addEventListener('click', function () {
  this.classList.toggle('on');
  this.setAttribute('aria-checked', this.classList.contains('on') ? 'true' : 'false');
});

/* ── Mode switching (Password / Passphrase) ── */

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    curMode = btn.dataset.mode;
    el('pwdOptions').style.display = curMode === 'password'   ? 'block' : 'none';
    el('ppOptions').style.display  = curMode === 'passphrase' ? 'block' : 'none';
  });
});

/* ── Character set selection ── */

document.querySelectorAll('.cs-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cs-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ── Seed input: live hash preview + strength indicator ── */

el('seedInput').addEventListener('input', () => {
  UI.updateSeedDisplay();
});

/* ── Generate button ── */

el('genBtn').addEventListener('click', async () => {
  const btn = el('genBtn');
  btn.disabled = true;
  btn.textContent = 'Generating…';

  try {
    const seedText = el('seedInput').value.trim();

    // Crypto engine picks the geometry — user has no control
    const shapeName = await CryptoEngine.selectGeometry(seedText, Geometry.SHAPES);
    const shapeId   = Geometry.SHAPES.indexOf(shapeName);

    // Update canvas and label
    Canvas.setAnimationShape(shapeName);
    el('shapeLabel').textContent = shapeName;
    el('methodText').textContent = Geometry.SHAPE_METHODS[shapeName];

    let result;

    if (curMode === 'passphrase') {
      const wordCount = parseInt(el('wordSlider').value);
      result = await CryptoEngine.cryptoGeneratePassphrase(
        seedText, wordCount, UI.WORDS, shapeName, shapeId, Geometry.GEOMETRY_DATA
      );
      UI.updateStrengthDisplay(result.password, UI.WORDS.length);

    } else {
      const charset = UI.getActiveCharset();
      const length  = parseInt(el('lenSlider').value);
      result = await CryptoEngine.cryptoGeneratePassword(
        seedText, length, charset, shapeName, shapeId, Geometry.GEOMETRY_DATA
      );
      UI.updateStrengthDisplay(result.password, charset.length);
    }

    // Display the password
    lastPwd = result.password;
    const out = el('pwdOut');
    out.textContent = result.password;
    out.classList.remove('empty');
    el('outputCard').classList.add('live');

    // Post-generation checks and displays
    UI.checkBreach(result.password);
    UI.showProvenance(result);
    UI.addHistory(result.password, shapeName, curMode);

  } catch (err) {
    console.error('Generation error:', err);
    const out = el('pwdOut');
    out.textContent = 'Error: Web Crypto API unavailable. Ensure the site is served over HTTPS.';
    out.classList.remove('empty');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate password — snapshot now';
  }
});

/* ── Copy to clipboard ── */

el('copyBtn').addEventListener('click', () => {
  if (!lastPwd) return;
  navigator.clipboard.writeText(lastPwd).then(() => {
    const btn = el('copyBtn');
    btn.textContent = 'Copied ✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 1800);
  }).catch(() => {
    // Fallback for browsers that block clipboard without user gesture
    const ta = document.createElement('textarea');
    ta.value = lastPwd;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
});

/* ── QR code ── */

el('qrBtn').addEventListener('click', () => {
  if (!lastPwd) { alert('Generate a password first.'); return; }
  UI.showQRCode(lastPwd);
});

el('qrClose').addEventListener('click', () => {
  el('qrOverlay').classList.remove('open');
});

/* ── Keyboard: Escape closes QR overlay ── */

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') el('qrOverlay').classList.remove('open');
});

/* ── Init ── */

UI.updateSeedDisplay();
UI.renderHistory();
Canvas.startAnimation('fibonacci');
