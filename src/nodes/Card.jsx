import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Handle, Position } from 'reactflow';
import { useMapActions } from '../graph/actions.js';

const DOUBLE_TAP_MS = 320;
const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 8;

// Shared shell: enter/exit animation, pressed state (card takes its header colour),
// double tap to frame the card, pulse highlight and hidden left/right handles.
export default function Card({ id, className, tint, active, exiting, pulse, children, onClick, onLongPress }) {
  const actions = useMapActions();
  const lastTap = useRef(0);
  const press = useRef(null); // { timer, x, y }
  const swallowClick = useRef(false);

  // Long press (touch) or right click (mouse) opens the card's menu. The click that ends a
  // long press must not also toggle the card.
  const cancelPress = () => {
    clearTimeout(press.current?.timer);
    press.current = null;
  };
  const pressHandlers = onLongPress
    ? {
        onPointerDown: (e) => {
          if (e.button !== 0 || e.target.closest('a, button')) return;
          const { clientX: x, clientY: y } = e;
          cancelPress();
          press.current = {
            x,
            y,
            timer: setTimeout(() => {
              press.current = null;
              swallowClick.current = true;
              onLongPress(x, y);
            }, LONG_PRESS_MS),
          };
        },
        onPointerMove: (e) => {
          const p = press.current;
          if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_TOLERANCE) cancelPress();
        },
        onPointerUp: cancelPress,
        onPointerCancel: cancelPress,
        onPointerLeave: cancelPress,
        onContextMenu: (e) => {
          e.preventDefault();
          cancelPress();
          onLongPress(e.clientX, e.clientY);
        },
      }
    : {};

  // Double tap is detected by hand: iOS Safari does not fire dblclick reliably. The second
  // tap is swallowed before it reaches the card's own handlers, so a topic opened by the
  // first tap is not closed again.
  const onClickCapture = (e) => {
    if (swallowClick.current) {
      swallowClick.current = false;
      e.stopPropagation();
      return;
    }
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
      className={`card ${className}${onLongPress ? ' has-menu' : ''} tint-${tint}${active ? ' is-active' : ''}${pulse ? ' card--pulse' : ''}`}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={exiting ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.985 }}
      transition={exiting ? { duration: 0.2 } : { type: 'spring', stiffness: 300, damping: 26 }}
      onClickCapture={onClickCapture}
      {...pressHandlers}
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
