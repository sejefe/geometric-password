/**
 * js/canvas.js
 * Geometric Password — Canvas Animation
 *
 * Renders the animated 3D geometry previews on the <canvas> element.
 * Uses the geometry data from geometry.js.
 */

'use strict';

const CV = document.getElementById('gc');
const cx = CV.getContext('2d');
const CW = 400, CH = 400, MX = CW / 2, MY = CH / 2;

let _animHandle = null;
let _currentShape = 'fibonacci';

/* ── Helpers ── */

function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
}

function project3D(x, y, z, rx, ry, sc) {
  let ax = x, ay = y * Math.cos(rx) - z * Math.sin(rx), az = y * Math.sin(rx) + z * Math.cos(rx);
  let fx = ax * Math.cos(ry) + az * Math.sin(ry), fy = ay, fz = -ax * Math.sin(ry) + az * Math.cos(ry);
  const d = 4.5, f = d / (d + fz / sc);
  return { sx: fx * f * sc + MX, sy: fy * f * sc + MY };
}

/* ── Draw routines ── */

function drawFibonacci(t) {
  const { TE: _TE } = window.Geometry; // unused but confirms geometry.js loaded
  const n = 60, ga = Math.PI * (3 - Math.sqrt(5)), pts = [];
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt(i / n) * 170, a = i * ga + t * 0.25;
    pts.push([MX + r * Math.cos(a), MY + r * Math.sin(a)]);
  }
  cx.strokeStyle = 'rgba(124,58,237,0.18)'; cx.lineWidth = 0.6;
  for (let i = 1; i < pts.length; i++) {
    cx.beginPath(); cx.moveTo(pts[i-1][0], pts[i-1][1]);
    cx.lineTo(pts[i][0], pts[i][1]); cx.stroke();
  }
  for (let i = 0; i < pts.length; i++) {
    const ratio = i / pts.length;
    cx.beginPath(); cx.arc(pts[i][0], pts[i][1], 3.5 * (1 - ratio * 0.5), 0, Math.PI * 2);
    cx.fillStyle = `rgba(124,58,237,${0.3 + ratio * 0.5})`;
    cx.fill();
  }
}

function drawDodecahedron(t) {
  const { DV, DE } = window.Geometry;
  const rx = t * 0.35 + 0.3, ry = t * 0.5 + 0.4, sc = 140;
  const pts = DV.map(v => project3D(v[0], v[1], v[2], rx, ry, sc));
  cx.strokeStyle = 'rgba(26,27,38,0.22)'; cx.lineWidth = 1.1;
  DE.forEach(([a, b]) => {
    cx.beginPath(); cx.moveTo(pts[a].sx, pts[a].sy);
    cx.lineTo(pts[b].sx, pts[b].sy); cx.stroke();
  });
  cx.fillStyle = 'rgba(124,58,237,0.6)';
  pts.forEach(p => { cx.beginPath(); cx.arc(p.sx, p.sy, 3, 0, Math.PI * 2); cx.fill(); });
}

function drawTetrahedron(t) {
  const { TV, TE } = window.Geometry;
  const rx = t * 0.4 + 0.2, ry = t * 0.6 + 0.3, sc = 145;
  const pts = TV.map(v => project3D(v[0], v[1], v[2], rx, ry, sc));
  cx.strokeStyle = 'rgba(26,27,38,0.22)'; cx.lineWidth = 1.4;
  TE.forEach(([a, b]) => {
    cx.beginPath(); cx.moveTo(pts[a].sx, pts[a].sy);
    cx.lineTo(pts[b].sx, pts[b].sy); cx.stroke();
  });
  cx.fillStyle = 'rgba(124,58,237,0.65)';
  pts.forEach(p => { cx.beginPath(); cx.arc(p.sx, p.sy, 5, 0, Math.PI * 2); cx.fill(); });
}

function drawShape(shape, t) {
  cx.clearRect(0, 0, CW, CH);
  if      (shape === 'fibonacci')    drawFibonacci(t);
  else if (shape === 'dodecahedron') drawDodecahedron(t);
  else                               drawTetrahedron(t);
}

/* ── Animation loop ── */

function startAnimation(shape) {
  if (_animHandle) cancelAnimationFrame(_animHandle);
  _currentShape = shape || _currentShape;
  let t = 0;
  function frame() {
    drawShape(_currentShape, t);
    t += 0.012;
    _animHandle = requestAnimationFrame(frame);
  }
  frame();
}

function setAnimationShape(shape) {
  _currentShape = shape;
}

/* ── Export ── */

window.Canvas = { startAnimation, setAnimationShape };
