import { useLayoutEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// Bezier wire whose ends stay pinned to the handles while its control points trail behind
// on an underdamped spring. When the layout moves the nodes, the wire bends, overshoots a
// little and settles: the "elastic" feel, without letting node positions drift.
const WIRE_SPRING = { stiffness: 140, damping: 11, mass: 0.9 };

export default function SpringEdge({ id, sourceX, sourceY, targetX, targetY, data }) {
  const variant = data?.variant ?? 'tree';

  const sx = useMotionValue(sourceX);
  const sy = useMotionValue(sourceY);
  const tx = useMotionValue(targetX);
  const ty = useMotionValue(targetY);
  const c1y = useSpring(sourceY, WIRE_SPRING);
  const c2y = useSpring(targetY, WIRE_SPRING);

  useLayoutEffect(() => {
    sx.set(sourceX);
    sy.set(sourceY);
    tx.set(targetX);
    ty.set(targetY);
    c1y.set(sourceY);
    c2y.set(targetY);
  }, [sourceX, sourceY, targetX, targetY, sx, sy, tx, ty, c1y, c2y]);

  const d = useTransform([sx, sy, tx, ty, c1y, c2y], ([x1, y1, x2, y2, k1, k2]) => {
    const dx = Math.max(Math.abs(x2 - x1) * 0.5, 40);
    return `M ${x1},${y1} C ${x1 + dx},${k1} ${x2 - dx},${k2} ${x2},${y2}`;
  });

  const exiting = data?.exiting;

  return (
    <motion.g
      className={`wire wire--${variant}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: exiting ? 0.2 : 0.45 }}
    >
      <motion.path id={id} d={d} className="wire__line react-flow__edge-path" fill="none" />
    </motion.g>
  );
}
