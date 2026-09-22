import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Handle, Position } from 'reactflow';
import { useMapActions } from '../graph/actions.js';

const DOUBLE_TAP_MS = 320;

// Shared shell: enter/exit animation, pressed state (card takes its header colour),
// double tap to frame the card, pulse highlight and hidden left/right handles.
export default function Card({ id, className, tint, active, exiting, pulse, children, onClick }) {
  const actions = useMapActions();
  const lastTap = useRef(0);

  // Double tap is detected by hand: iOS Safari does not fire dblclick reliably. The second
  // tap is swallowed before it reaches the card's own handlers, so a topic opened by the
  // first tap is not closed again.
  const onClickCapture = (e) => {
    if (e.target.closest('a, button')) return;
    const now = e.timeStamp;
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      e.stopPropagation();
      lastTap.current = 0;
      actions.frame(id);
      return;
    }
    lastTap.current = now;
  };

  return (
    <motion.div
      className={`card ${className} tint-${tint}${active ? ' is-active' : ''}${pulse ? ' card--pulse' : ''}`}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={exiting ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.985 }}
      transition={exiting ? { duration: 0.2 } : { type: 'spring', stiffness: 300, damping: 26 }}
      onClickCapture={onClickCapture}
      onClick={(e) => {
        actions.activate(id);
        onClick?.(e);
      }}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} className="handle" />
      <div className="card__content">{children}</div>
      <Handle type="source" position={Position.Right} isConnectable={false} className="handle" />
      {pulse ? <span key={pulse} className="card__pulse" aria-hidden /> : null}
    </motion.div>
  );
}
