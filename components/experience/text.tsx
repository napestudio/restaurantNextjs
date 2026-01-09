"use client";

import { useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
export default function NotFoundText() {
  const { viewport } = useThree();
  const responsiveFontSize = viewport.width / 2;
  const responsiveMaxWidth = viewport.width / 2;
  return (
    <Text
      color="white"
      anchorX="center"
      anchorY="middle"
      fontWeight={700}
      fontSize={responsiveFontSize}
      maxWidth={responsiveMaxWidth}
      position-z={0}
    >
      404
    </Text>
  );
}
