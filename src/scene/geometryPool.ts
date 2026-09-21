/**
 * Shared geometry pool.
 *
 * Every planet / moon / star mesh in the scene reuses one of these BufferGeometry
 * instances instead of constructing its own. Geometry is unit-radius (radius 1)
 * and scaled per-mesh via `mesh.scale`, so one GPU buffer serves every body of a
 * given detail level regardless of how many planets exist.
 *
 * Four icosahedron LODs, per PRD §7:
 *   LOD0 — moons (tiny, detail 0, 20 tris)
 *   LOD1 — planet detail 1 (80 tris)
 *   LOD2 — planet detail 2 (320 tris)
 *   LOD3 — star (detail 3, 1280 tris; there is only ever one star)
 */
import * as THREE from 'three';

export const ICOSA_LOD0 = new THREE.IcosahedronGeometry(1, 0);
export const ICOSA_LOD1 = new THREE.IcosahedronGeometry(1, 1);
export const ICOSA_LOD2 = new THREE.IcosahedronGeometry(1, 2);
export const ICOSA_LOD3 = new THREE.IcosahedronGeometry(1, 3);

/** Planet detail is 1 or 2 per the contract; anything else clamps into range. */
export function icosaForDetail(detail: number): THREE.IcosahedronGeometry {
  return detail >= 2 ? ICOSA_LOD2 : ICOSA_LOD1;
}

/** Shared unit ring geometry for ringed planets (inner 1.4, outer 2.0 of body radius). */
export const RING_GEOMETRY = new THREE.RingGeometry(1.5, 2.1, 48);

/** Shared unit sphere for the star's soft halo billboard. */
export const HALO_GEOMETRY = new THREE.PlaneGeometry(1, 1);
