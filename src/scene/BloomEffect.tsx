/**
 * Bloom is the only post-processing effect in this scene (PRD §6/§7) — no DOF,
 * no chromatic aberration.
 *
 * DECIDED: this is the permanent implementation. `@react-three/postprocessing`
 * was originally in package.json but its required peer `postprocessing` never
 * was, so it could not resolve at build time. Since the scene needs exactly one
 * effect, this uses three.js's own `examples/jsm/postprocessing` passes
 * (EffectComposer, RenderPass, UnrealBloomPass, OutputPass) — they ship inside
 * the already-installed `three` package and cost no extra dependency. The
 * unused `@react-three/postprocessing` has been removed from package.json.
 *
 * `useFrame(..., 1)` with non-zero priority is what hands r3f's per-frame
 * render call to this composer; without it nothing would draw.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface BloomEffectProps {
  /** Bloom strength, tied to star tier so brighter tiers glow more. */
  intensity: number;
}

export function BloomEffect({ intensity }: BloomEffectProps) {
  const { gl, scene, camera, size } = useThree();
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    // (resolution, strength, radius, threshold). The threshold is a LUMINANCE
    // cutoff: anything dimmer than this never blooms. It must sit below the
    // star's emissive intensity (see palette.starEmissiveForTier) or the star
    // renders as a flat disc. Radius is wide for a soft halo rather than a
    // tight rim — "restraint plus one precise glow", PRD §6.
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      intensity,
      0.85,
      0.55,
    );
    bloomPassRef.current = bloom;
    c.addPass(bloom);
    c.addPass(new OutputPass());
    return c;
    // Recreated only when the renderer/scene/camera identity changes — size and
    // intensity are applied imperatively below without rebuilding the chain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
    const pixelRatio = gl.getPixelRatio();
    composer.setPixelRatio(pixelRatio);
  }, [composer, gl, size]);

  useEffect(() => {
    if (bloomPassRef.current) bloomPassRef.current.strength = intensity;
  }, [intensity]);

  useEffect(() => () => composer.dispose(), [composer]);

  // Non-zero priority hands r3f's per-frame render call to us.
  useFrame(() => {
    composer.render();
  }, 1);

  return null;
}
