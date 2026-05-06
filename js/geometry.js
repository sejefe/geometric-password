/**
 * js/geometry.js
 * Geometric Password — Geometry Data & Permutation Kernels
 *
 * Provides the mathematical geometry used by the permutation layer
 * and exposed for canvas rendering.
 */

'use strict';

/* ── Tetrahedron ── */

const TV = [
  [0, 1, 0],
  [0, -1 / 3,  2 * Math.sqrt(2) / 3],
  [-Math.sqrt(2 / 3), -1 / 3, -Math.sqrt(2) / 3],
  [ Math.sqrt(2 / 3), -1 / 3, -Math.sqrt(2) / 3],
];

const TE = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];

// Normalised edge direction vectors used as XOR permutation kernel
const TET_VECTORS = TE.map(([a, b]) => {
  const va = TV[a], vb = TV[b];
  const d  = Math.hypot(vb[0]-va[0], vb[1]-va[1], vb[2]-va[2]);
  return [(vb[0]-va[0])/d, (vb[1]-va[1])/d, (vb[2]-va[2])/d];
});

/* ── Dodecahedron ── */

function buildDodecahedronVertices() {
  const phi = (1 + Math.sqrt(5)) / 2, ip = 1 / phi;
  const raw = [
    [1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],
    [-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],
    [0,ip,phi],[0,ip,-phi],[0,-ip,phi],[0,-ip,-phi],
    [ip,phi,0],[ip,-phi,0],[-ip,phi,0],[-ip,-phi,0],
    [phi,0,ip],[phi,0,-ip],[-phi,0,ip],[-phi,0,-ip],
  ];
  const r = Math.hypot(...raw[0]);
  return raw.map(p => p.map(x => x / r));
}

function buildDodecahedronEdges(verts) {
  const dists = [];
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++)
      dists.push(Math.hypot(...verts[i].map((v, k) => v - verts[j][k])));
  dists.sort((a, b) => a - b);
  const el = dists[0] * 1.05, edges = [];
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++)
      if (Math.hypot(...verts[i].map((v, k) => v - verts[j][k])) <= el)
        edges.push([i, j]);
  return edges;
}

const DV = buildDodecahedronVertices();
const DE = buildDodecahedronEdges(DV);

// Hard-coded face vertex indices (12 pentagonal faces)
const DF = [
  [0,8,10,2,16],[0,16,17,1,12],[0,12,14,4,8],
  [1,17,3,11,9],[1,9,5,14,12],[2,10,6,15,13],
  [2,13,3,17,16],[3,13,15,7,11],[4,14,5,19,18],
  [4,18,6,10,8],[5,9,11,7,19],[6,18,19,7,15],
];

// Face centroids used as XOR permutation kernel
const DOD_CENTROIDS = DF.map(face => {
  const c = [0, 0, 0];
  face.forEach(i => { c[0] += DV[i][0]; c[1] += DV[i][1]; c[2] += DV[i][2]; });
  return c.map(x => x / face.length);
});

/* ── Shape metadata ── */

const SHAPES = ['fibonacci', 'dodecahedron', 'tetrahedron'];

const SHAPE_METHODS = {
  fibonacci:
    'Fibonacci golden spiral — angular positions of spiral points modulate the CSPRNG stream via XOR permutation',
  dodecahedron:
    'Dodecahedron face traversal — 12 pentagon face centroids provide spherical XOR masks across the CSPRNG stream',
  tetrahedron:
    'Tetrahedron edge walk — 6 edge unit vectors XOR-permute the CSPRNG byte stream cyclically',
};

/* ── Bundled geometry data for the crypto engine ── */

const GEOMETRY_DATA = {
  tetVectors:   TET_VECTORS,
  dodCentroids: DOD_CENTROIDS,
};

/* ── Export ── */

window.Geometry = {
  TV, TE, TET_VECTORS,
  DV, DE, DF, DOD_CENTROIDS,
  SHAPES,
  SHAPE_METHODS,
  GEOMETRY_DATA,
};
