"use client";

import { Canvas } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { SushiModel } from "@/components/models/sushi";

export default function CanvasExperience() {
  return (
    <Canvas>
      <ambientLight intensity={Math.PI / 2} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.25}
        penumbra={1}
        decay={0}
        intensity={Math.PI}
      />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      <Text
        color="white"
        anchorX="center"
        anchorY="middle"
        fontSize={8}
        position-z={0}
      >
        404
      </Text>
      <SushiModel scale={2} position-z={2} />
    </Canvas>
  );
}
