"use client";

import { Canvas } from "@react-three/fiber";

import { SushiModel } from "@/components/models/sushi";
import NotFoundText from "./text";

export default function CanvasExperience() {
  return (
    <Canvas className="h-full w-full absolute inset-0">
      <ambientLight intensity={Math.PI / 2} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.25}
        penumbra={1}
        decay={0}
        intensity={Math.PI}
      />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      <NotFoundText />
      <SushiModel position-z={2} rotation-z={-0.25} />
    </Canvas>
  );
}
