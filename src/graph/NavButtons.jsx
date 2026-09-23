import { AnimatePresence, motion } from 'framer-motion';
import { stepLabel } from './navigation.js';

// ← / → on the left and right edges of the map. Each shows where it goes; a button
// disappears when there is nowhere to go (← at the tab's root, → after the last card).
export default function NavButtons({ back, forward, onNavigate }) {
  return (
    <>
      <NavButton side="back" step={back} onNavigate={onNavigate} />
      <NavButton side="forward" step={forward} onNavigate={onNavigate} />
    </>
  );
}

function NavButton({ side, step, onNavigate }) {
  const label = stepLabel(step, side);
  return (
    <AnimatePresence>
      {step ? (
        <motion.button
          key={side}
          type="button"
          className={`nav nav--${side}${step.via === 'up' ? ' nav--level' : ''}`}
          initial={{ opacity: 0, x: side === 'back' ? -12 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: side === 'back' ? -12 : 12 }}
          transition={{ duration: 0.18 }}
          onClick={() => onNavigate(step)}
          aria-label={`${label.kicker}: ${label.name}`}
        >
          <span className="nav__arrow" aria-hidden>
            <svg viewBox="0 0 16 16" width="16" height="16">
              <path
                d={side === 'back' ? 'M13 8H3.5M7.5 4 3.5 8l4 4' : 'M3 8h9.5M8.5 4l4 4-4 4'}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="nav__text">
            <span className="nav__kicker">{label.kicker}</span>
            <span className="nav__name">{label.name}</span>
          </span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
