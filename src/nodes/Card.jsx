import { motion } from 'framer-motion';
import { Handle, Position } from 'reactflow';

// Shared shell: enter/exit animation, pulse highlight and hidden left/right handles.
export default function Card({ className, exiting, pulse, children, onClick, style }) {
  return (
    <motion.div
      className={`card ${className}${pulse ? ' card--pulse' : ''}`}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={exiting ? { opacity: 0, scale: 0.88 } : { opacity: 1, scale: 1 }}
      transition={exiting ? { duration: 0.22 } : { type: 'spring', stiffness: 260, damping: 24 }}
      onClick={onClick}
      style={style}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} className="handle" />
      {children}
      <Handle type="source" position={Position.Right} isConnectable={false} className="handle" />
      {pulse ? <span key={pulse} className="card__pulse" aria-hidden /> : null}
    </motion.div>
  );
}
