import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Handle, Position } from 'reactflow';
import { useMapActions } from '../graph/actions.js';

const DOUBLE_TAP_MS = 320;
const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 8;

// Shared shell: enter/exit animation, pressed state (card takes its header colour),
// double tap to frame the card, long press / right click menu, pulse highlight and hidden
// left/right handles.
export default function Card({ id, className, tint, active, exiting, pulse, children, onClick, onLongPress }) {
  const actions = useMapActions();
  const pointerType = useRef('mouse');
  const lastClick = useRef(0);
  const lastTouchTap = useRef(null); // { at, x, y }
  const press = useRef(null); // { timer, x, y }
  const swallowClick = useRef(false);

  const cancelPress = () => {
    clearTimeout(press.current?.timer);
    press.current = null;
  };

  // Long press opens the card's menu; the click that ends it must not also toggle the card.
  const onPointerDown = (e) => {
    pointerType.current = e.pointerType;
    if (!onLongPress || e.button !== 0 || e.target.closest('a, button')) return;
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
  };

  const onPointerMove = (e) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_TOLERANCE) cancelPress();
  };

  // Double tap frames the card. On touch the browser may swallow the second tap's click
  // altogether, so touch taps are read from pointerup; mouse double clicks from clicks.
  // Whatever the first tap did (open or close branches) is undone by the frame action.
  const onPointerUp = (e) => {
    cancelPress();
    if (e.pointerType === 'mouse' || e.target.closest('a, button')) return;
    const last = lastTouchTap.current;
    if (last && e.timeStamp - last.at < DOUBLE_TAP_MS && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30) {
      lastTouchTap.current = null;
      // If the browser does send the second click, it must not toggle again.
      swallowClick.current = true;
      setTimeout(() => (swallowClick.current = false), 450);
      actions.frame(id);
      return;
    }
    lastTouchTap.current = { at: e.timeStamp, x: e.clientX, y: e.clientY };
  };

  const onClickCapture = (e) => {
    if (swallowClick.current) {
      swallowClick.current = false;
      e.stopPropagation();
      return;
    }
    if (pointerType.current !== 'mouse' || e.target.closest('a, button')) return;
    if (e.timeStamp - lastClick.current < DOUBLE_TAP_MS) {
      e.stopPropagation();
      lastClick.current = 0;
      actions.frame(id);
      return;
    }
    lastClick.current = e.timeStamp;
  };

  const onContextMenu = onLongPress
    ? (e) => {
        e.preventDefault();
        cancelPress();
        onLongPress(e.clientX, e.clientY);
      }
    : undefined;

  return (
    <motion.div
      className={`card ${className}${onLongPress ? ' has-menu' : ''} tint-${tint}${active ? ' is-active' : ''}${pulse ? ' card--pulse' : ''}`}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={exiting ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.985 }}
      transition={exiting ? { duration: 0.2 } : { type: 'spring', stiffness: 300, damping: 26 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
      onContextMenu={onContextMenu}
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
