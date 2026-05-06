/**
 * js/crypto-engine.js
 * Geometric Password — Cryptographic Engine
 *
 * Pipeline:
 *   1. SHA-256(user seed)
 *   2. crypto.getRandomValues() salt — 128-bit, unique per generation
 *   3. Master key = SHA-256(seedHash ‖ salt ‖ timestamp ‖ shape_id)
 *   4. CSPRNG stream via HMAC-SHA-256 counter mode
 *   5. Geometric XOR permutation layer
 *   6. Rejection-sampled character mapping (no modulo bias)
 */

'use strict';

/* ── Utility ── */

function encode(str) {
  return new TextEncoder().encode(str);
}

function concat(...arrays) {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

function toHex(arr) {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ── SHA-256 ── */

async function sha256bytes(data) {
  const input = data instanceof Uint8Array ? data : encode(String(data));
  const buf = await crypto.subtle.digest('SHA-256', input);
  return new Uint8Array(buf);
}

async function sha256hex(data) {
  return toHex(await sha256bytes(data));
}

/* ── CSPRNG salt ── */

function generateSalt() {
  const salt = new Uint8Array(16); // 128-bit salt
  crypto.getRandomValues(salt);
  return salt;
}

/* ── HMAC-SHA-256 counter-mode stream (KDF) ── */

async function buildCsprngStream(masterKeyBytes, totalBytes) {
  const key = await crypto.subtle.importKey(
    'raw', masterKeyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const blocks = Math.ceil(totalBytes / 32);
  const stream = new Uint8Array(blocks * 32);
  for (let i = 0; i < blocks; i++) {
    const counter = new Uint8Array(4);
    new DataView(counter.buffer).setUint32(0, i, false);
    const block = await crypto.subtle.sign('HMAC', key, counter);
    stream.set(new Uint8Array(block), i * 32);
  }
  return stream.slice(0, totalBytes);
}

/* ── Master key construction ── */

async function buildMasterKey(seedText, salt, timestamp, shapeId) {
  const seedHash  = await sha256bytes(seedText || '');
  const tsBytes   = new Uint8Array(8);
  new DataView(tsBytes.buffer).setBigUint64(0, BigInt(timestamp), false);
  const shapeBytes = new Uint8Array([shapeId]);
  const combined   = concat(seedHash, salt, tsBytes, shapeBytes);
  const masterKey  = await sha256bytes(combined);
  return { masterKey, seedHash };
}

/* ── Geometry-derived XOR permutation layer ── */

function applyFibonacciPermutation(stream) {
  const ga = Math.PI * (3 - Math.sqrt(5));
  const out = new Uint8Array(stream.length);
  for (let i = 0; i < stream.length; i++) {
    const angle = i * ga;
    const mask  = Math.abs(Math.floor(Math.cos(angle) * 127 + Math.sin(angle) * 128)) & 0xFF;
    out[i] = stream[i] ^ mask;
  }
  return out;
}

function applyTetrahedronPermutation(stream, tetVectors) {
  const out = new Uint8Array(stream.length);
  for (let i = 0; i < stream.length; i++) {
    const e    = tetVectors[i % tetVectors.length];
    const mask = Math.abs(Math.floor(e[0] * 85 + e[1] * 86 + e[2] * 85)) & 0xFF;
    out[i] = stream[i] ^ mask;
  }
  return out;
}

function applyDodecahedronPermutation(stream, centroids) {
  const out = new Uint8Array(stream.length);
  for (let i = 0; i < stream.length; i++) {
    const c    = centroids[i % centroids.length];
    const phi  = Math.atan2(c[1], c[0]);
    const theta = Math.asin(Math.max(-1, Math.min(1, c[2])));
    const mask  = Math.abs(Math.floor(phi * 40.5 + theta * 81)) & 0xFF;
    out[i] = stream[i] ^ mask;
  }
  return out;
}

function applyGeometricPermutation(stream, shapeName, geometryData) {
  switch (shapeName) {
    case 'fibonacci':    return applyFibonacciPermutation(stream);
    case 'tetrahedron':  return applyTetrahedronPermutation(stream, geometryData.tetVectors);
    case 'dodecahedron': return applyDodecahedronPermutation(stream, geometryData.dodCentroids);
    default:             return stream;
  }
}

/* ── Rejection-sampled character mapping (no modulo bias) ── */

function streamToPassword(permutedStream, length, charset) {
  const csLen     = charset.length;
  const threshold = 256 - (256 % csLen);
  const out       = [];
  for (let i = 0; i < permutedStream.length && out.length < length; i++) {
    if (permutedStream[i] < threshold) {
      out.push(charset[permutedStream[i] % csLen]);
    }
  }
  return out;
}

/* ── Geometry auto-selection (user has no control) ── */

async function selectGeometry(seedText, shapes) {
  const seedHash  = await sha256bytes(seedText || '');
  const shapeSalt = generateSalt();
  const shapeKey  = await sha256bytes(concat(seedHash, shapeSalt));
  return shapes[shapeKey[0] % shapes.length];
}

/* ── Top-level password generation ── */

async function cryptoGeneratePassword(seedText, length, charset, shapeName, shapeId, geometryData) {
  const salt      = generateSalt();
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const { masterKey, seedHash } = await buildMasterKey(seedText, salt, timestamp, shapeId);

  // Expand to a byte stream larger than needed to allow rejection sampling
  const rawStream      = await buildCsprngStream(masterKey, length * 8);
  const permutedStream = applyGeometricPermutation(rawStream, shapeName, geometryData);

  let chars = streamToPassword(permutedStream, length, charset);

  // Pad if rejection sampling didn't yield enough (extremely rare with large stream)
  if (chars.length < length) {
    const extra     = await buildCsprngStream(masterKey, (length - chars.length) * 16);
    const permExtra = applyGeometricPermutation(extra, shapeName, geometryData);
    chars = chars.concat(streamToPassword(permExtra, length - chars.length, charset));
  }

  return {
    password:     chars.slice(0, length).join(''),
    seedHashHex:  toHex(seedHash),
    saltHex:      toHex(salt),
    masterKeyHex: toHex(masterKey),
    timestamp:    new Date(Number(timestamp) * 1000).toISOString().replace('T', ' ').slice(0, 19),
    shapeName,
  };
}

/* ── Passphrase generation ── */

async function cryptoGeneratePassphrase(seedText, wordCount, words, shapeName, shapeId, geometryData) {
  const salt      = generateSalt();
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const { masterKey, seedHash } = await buildMasterKey(seedText, salt, timestamp, shapeId);

  const stream  = await buildCsprngStream(masterKey, wordCount * 4 + 4);
  const permed  = applyGeometricPermutation(stream, shapeName, geometryData);
  const view    = new DataView(permed.buffer);

  const chosen = [];
  for (let i = 0; i < wordCount; i++) {
    chosen.push(words[view.getUint32(i * 4, false) % words.length]);
  }
  const num = view.getUint16(wordCount * 4, false) % 90 + 10;

  return {
    password:     chosen.join('-') + '-' + num,
    seedHashHex:  toHex(seedHash),
    saltHex:      toHex(salt),
    masterKeyHex: toHex(masterKey),
    timestamp:    new Date(Number(timestamp) * 1000).toISOString().replace('T', ' ').slice(0, 19),
    shapeName,
  };
}

/* ── Exports (attached to window for multi-file use without bundler) ── */

window.CryptoEngine = {
  sha256hex,
  sha256bytes,
  generateSalt,
  selectGeometry,
  cryptoGeneratePassword,
  cryptoGeneratePassphrase,
};
