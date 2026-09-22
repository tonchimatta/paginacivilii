import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';

// Pastel triplets per tint, moving slowly behind the pressed card.
const PALETTES = {
  lavender: ['#c9caff', '#f3d6ff', '#a9c4ff'],
  pink: ['#f9cfe6', '#ffe3c7', '#d9c6ff'],
  peach: ['#fbc9a5', '#ffe89a', '#f7b8c8'],
  yellow: ['#fde68a', '#c8f0d4', '#ffd0a8'],
  sky: ['#bfdefb', '#d7ccff', '#c6f3ea'],
  mint: ['#bfeccf', '#fdf1a6', '#a9d8ff'],
  ink: ['#c9caff', '#fbc9a5', '#bfdefb'],
};

export default function GradientFill({ tint }) {
  const [c1, c2, c3] = PALETTES[tint] ?? PALETTES.lavender;
  return (
    <ShaderGradientCanvas
      style={{ position: 'absolute', inset: 0 }}
      pixelDensity={1}
      fov={45}
      pointerEvents="none"
      lazyLoad={false}
    >
      <ShaderGradient
        control="props"
        type="plane"
        animate="on"
        uSpeed={0.35}
        uStrength={3.6}
        uDensity={1.3}
        uFrequency={5.5}
        uAmplitude={1}
        positionX={-1.4}
        positionY={0}
        positionZ={0}
        rotationX={0}
        rotationY={10}
        rotationZ={50}
        cAzimuthAngle={180}
        cPolarAngle={90}
        cDistance={3.6}
        cameraZoom={1}
        color1={c1}
        color2={c2}
        color3={c3}
        reflection={0.1}
        lightType="3d"
        brightness={1.2}
        grain="off"
        enableTransition={false}
      />
    </ShaderGradientCanvas>
  );
}
