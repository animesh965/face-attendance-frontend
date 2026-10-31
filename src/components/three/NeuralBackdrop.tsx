import * as THREE from "three";
import { ThreeCanvas } from "./ThreeCanvas";

/** Slow-drifting particle lattice used as an ambient header backdrop. */
export function NeuralBackdrop({ className }: { className?: string | undefined }) {
  return (
    <ThreeCanvas
      className={className}
      setup={({ scene, camera }) => {
        camera.position.z = 6;
        const count = 900;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 18;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const pts = new THREE.Points(
          geo,
          new THREE.PointsMaterial({ color: 0x6aa2ff, size: 0.05, transparent: true, opacity: 0.55 }),
        );
        scene.add(pts);

        const grid = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(3.2, 1)),
          new THREE.LineBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: 0.18 }),
        );
        scene.add(grid);

        return (t) => {
          pts.rotation.y = t * 0.05;
          pts.rotation.x = Math.sin(t * 0.15) * 0.1;
          grid.rotation.y = -t * 0.09;
          grid.rotation.z = t * 0.04;
        };
      }}
    />
  );
}