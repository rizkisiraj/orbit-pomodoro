/**
 * Position math shared by Orbits (the drawn arcs) and Planet/Moon (the bodies
 * that travel along them). Keeping this in one place guarantees a planet's
 * mesh always sits exactly on its own orbit line.
 *
 * Orbit radius/speed themselves come from `~/contract/constants` — this file
 * only turns (radius, angle, inclination) into a 3D point.
 */

/** A point on a flat ring of `radius`, tilted by `inclination` radians about X. */
export function orbitPosition(
  radius: number,
  angle: number,
  inclination: number,
): [number, number, number] {
  const x = Math.cos(angle) * radius;
  const zFlat = Math.sin(angle) * radius;
  const y = zFlat * Math.sin(inclination);
  const z = zFlat * Math.cos(inclination);
  return [x, y, z];
}
