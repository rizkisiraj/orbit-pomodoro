/**
 * Locked cinematic camera. Slow auto-orbit (~1 revolution / 4 minutes) with a
 * gentle elevation sway. Pushes in slightly toward the forming protoplanet
 * during focus, eases back out on completion. No user control (no OrbitControls).
 *
 * Frozen entirely when `cinematic` is false (prefers-reduced-motion) or when
 * `thumbnail` is set (static framing for archive grid cells).
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { orbitRadius } from '~/contract/constants';
import { orbitPosition } from './orbitMath';

const REVOLUTION_S = 240;
const ELEVATION_PERIOD_S = 95;

export interface CameraRigProps {
  outerRadius: number;
  focusProgress: number | null;
  nextIndex: number;
  cinematic?: boolean;
  thumbnail?: boolean;
}

export function CameraRig({
  outerRadius,
  focusProgress,
  nextIndex,
  cinematic = true,
  thumbnail = false,
}: CameraRigProps) {
  const { camera } = useThree();
  const angleRef = useRef(0.6);
  const pushRef = useRef(0);
  const focusTargetRadius = orbitRadius(nextIndex);

  const baseDistance = useMemo(
    () => Math.max(9, outerRadius * 1.6 + 4),
    [outerRadius],
  );

  useFrame((state, delta) => {
    if (thumbnail) {
      camera.position.set(0, baseDistance * 0.55, baseDistance * 0.95);
      camera.lookAt(0, 0, 0);
      return;
    }

    if (cinematic) {
      angleRef.current += (Math.PI * 2 * delta) / REVOLUTION_S;
    }
    const elevation =
      Math.sin(state.clock.elapsedTime * ((Math.PI * 2) / ELEVATION_PERIOD_S)) * 0.12 + 0.28;

    const wantPush = focusProgress != null ? 1 : 0;
    pushRef.current = THREE.MathUtils.damp(pushRef.current, wantPush, 1.4, delta);

    const distance = THREE.MathUtils.lerp(baseDistance, baseDistance * 0.68, pushRef.current);
    const [x, , z] = orbitPosition(distance, angleRef.current, 0);
    const y = distance * elevation * 0.35;
    camera.position.set(x, y, z);

    if (focusProgress != null) {
      const [tx, ty, tz] = orbitPosition(focusTargetRadius, angleRef.current * 0.4, 0.02);
      const target = new THREE.Vector3(tx, ty, tz).lerp(new THREE.Vector3(0, 0, 0), 1 - pushRef.current * 0.5);
      camera.lookAt(target);
    } else {
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}
