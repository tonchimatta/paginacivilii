import { motion } from 'framer-motion';

export default function Chevron({ open }) {
  return (
    <motion.span
      className="chevron"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" width="12" height="12">
        <path d="M3 8h9.5M8.5 4 12.5 8l-4 4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.span>
  );
}
