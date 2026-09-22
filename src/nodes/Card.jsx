import { Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Handle, Position } from 'reactflow';
import { useMapActions } from '../graph/actions.js';

// three.js is heavy: load the gradient only the first time a card is pressed.
const GradientFill = lazy(() => import('./GradientFill.jsx'));

// Shared shell: enter/exit animation, pressed state (moving gradient), pulse highlight
// and hidden left/right handles.
export default function Card({ id, className, tint, active, exiting, pulse, children, onClick }) {
  const actions = useMapActions();

  return (
    <motion.div
      className={`card ${className} tint-${tint}${active ? ' is-active' : ''}${pulse ? ' card--pulse' : ''}`}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={exiting ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.985 }}
      transition={exiting ? { duration: 0.2 } : { type: 'spring', stiffness: 300, damping: 26 }}
      onClick={(e) => {
        actions.activate(id);
        onClick?.(e);
      }}
    >
      <AnimatePresence>
        {active ? (
          <motion.div
            key="gradient"
            className="card__gradient"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            aria-hidden
          >
            <Suspense fallback={null}>
              <GradientFill tint={tint} />
            </Suspense>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <Handle type="target" position={Position.Left} isConnectable={false} className="handle" />
      <div className="card__content">{children}</div>
      <Handle type="source" position={Position.Right} isConnectable={false} className="handle" />
      {pulse ? <span key={pulse} className="card__pulse" aria-hidden /> : null}
    </motion.div>
  );
}
