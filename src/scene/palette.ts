/**
 * Colour helpers. One hue per week (from `baseHue`), one warm→white-hot ramp
 * for the star's brightness tiers. No neon saturation — bodies stay desaturated
 * and matte; the star and bloom carry the only real "glow" in the frame.
 */
import * as THREE from 'three';

const colorCache = new Map<string, THREE.Color>();

/** Desaturated, low-key body colour derived from a hue in [0, 360). */
export function hueColor(hue: number, s = 0.42, l = 0.5): THREE.Color {
  const key = `${Math.round(hue)}:${s}:${l}`;
  let c = colorCache.get(key);
  if (!c) {
    c = new THREE.Color();
    c.setHSL((((hue % 360) + 360) % 360) / 360, s, l);
    colorCache.set(key, c);
  }
  return c;
}

/** Faint, near-neutral tint for orbit hairlines — a whisper of the week hue. */
export function orbitColor(hue: number): THREE.Color {
  return hueColor(hue, 0.18, 0.72);
}

const STAR_TIER_COLORS = [
  '#ff9d52', // tier 0 — ember
  '#ffb46a', // tier 1
  '#ffd08a', // tier 2
  '#ffe9b8', // tier 3
  '#fdf6e8', // tier 4
  '#ffffff', // tier 5 — white-hot
] as const;

export function starColorForTier(tier: number): THREE.Color {
  const idx = Math.max(0, Math.min(STAR_TIER_COLORS.length - 1, Math.round(tier)));
  return new THREE.Color(STAR_TIER_COLORS[idx]);
}

export function starRadiusForTier(tier: number): number {
  return 0.85 + Math.max(0, Math.min(5, tier)) * 0.11;
}

export function starEmissiveForTier(tier: number): number {
  return 1.1 + Math.max(0, Math.min(5, tier)) * 0.55;
}

export function starBloomIntensityForTier(tier: number): number {
  return 0.55 + Math.max(0, Math.min(5, tier)) * 0.22;
}
