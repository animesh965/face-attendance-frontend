import * as THREE from "three";
import { ThreeCanvas } from "./ThreeCanvas";

function facePoint(u: number, v: number) {
  // Rough parametric head: ellipsoid flattened at the back, tapered chin.
  const theta = u * Math.PI * 2;
  const phi = v * Math.PI;
  const taper = 1 - 0.35 * Math.pow(Math.max(0, Math.cos(phi)), 2) * (phi > Math.PI / 2 ? 1 : 0);
  const x = Math.sin(phi) * Math.cos(theta) * 1.05 * taper;
  const y = Math.cos(phi) * 1.35;
  const z = Math.sin(phi) * Math.sin(theta) * (Math.sin(theta) > 0 ? 0.95 : 0.7) * taper;
  return new THREE.Vector3(x, y, z);
}

/** Animated 3D face point-cloud with a travelling scan plane. */
export function FaceScanScene({
  className,
  tone = "primary",
}: {
  className?: string | undefined;
  tone?: "primary" | "warning";
}) {
  return (
    <ThreeCanvas
      className={className}
      setup={({ scene, camera }) => {
        camera.position.set(0, 0, 4.4);

        const positions: number[] = [];
        for (let i = 0; i < 4200; i++) {
          const p = facePoint(Math.random(), Math.random());
          positions.push(p.x, p.y, p.z);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        const color = tone === "warning" ? 0xf5b83d : 0x4b8bf5;
        const points = new THREE.Points(
          geo,
          new THREE.PointsMaterial({ color, size: 0.022, transparent: true, opacity: 0.85 }),
        );
        scene.add(points);

        const wire = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.75, 2),
          new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.12 }),
        );
        scene.add(wire);

        const ringGeo = new THREE.RingGeometry(1.25, 1.32, 96);
        const ring = new THREE.Mesh(
          ringGeo,
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
        );
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);

        return (t) => {
          points.rotation.y = Math.sin(t * 0.35) * 0.5;
          points.rotation.x = Math.sin(t * 0.25) * 0.08;
          wire.rotation.y = t * 0.18;
          wire.rotation.x = t * 0.08;
          ring.position.y = Math.sin(t * 0.9) * 1.35;
          ring.rotation.z = t * 0.4;
          (ring.material as THREE.MeshBasicMaterial).opacity =
            0.25 + 0.3 * Math.abs(Math.cos(t * 0.9));
        };
      }}
    />
  );
}