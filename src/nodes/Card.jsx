import { motion } from 'framer-motion';
import { Handle, Position } from 'reactflow';
import { useMapActions } from '../graph/actions.js';

// Shared shell: enter/exit animation, pressed state (card takes its header colour),
// pulse highlight and hidden left/right handles.
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
      <Handle type="target" position={Position.Left} isConnectable={false} className="handle" />
      <div className="card__content">{children}</div>
      <Handle type="source" position={Position.Right} isConnectable={false} className="handle" />
      {pulse ? <span key={pulse} className="card__pulse" aria-hidden /> : null}
    </motion.div>
  );
}
