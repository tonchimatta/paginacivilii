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
  const swallowClick = useRef(false); // the click ending a long press
  const swallowUntil = useRef(0); // clicks belonging to a double tap, however late they come
  const pendingTap = useRef(null); // touch: the tap's click, held until no second tap comes
  const replaying = useRef(false);

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

  // Double tap frames the card.
  // Touch: a tap's click is held for DOUBLE_TAP_MS and only then replayed. If the card
  // opened its branches on the first tap, the layout would re-centre it and the camera
  // would start moving, so the second tap would land somewhere else (on a child just being
  // born). Taps are read from pointerup, since the browser may not send the second click.
  // Mouse: clicks act at once; a double click undoes what its first click did (see frame).
  const onPointerUp = (e) => {
    cancelPress();
    if (e.pointerType === 'mouse' || e.target.closest('a, button')) return;
    const last = lastTouchTap.current;
    if (last && e.timeStamp - last.at < DOUBLE_TAP_MS && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30) {
      lastTouchTap.current = null;
      clearTimeout(pendingTap.current);
      pendingTap.current = null;
      // Clicks of this double tap that the browser delivers late must not act either.
      swallowUntil.current = e.timeStamp + 450;
      actions.frame(id);
      return;
    }
    lastTouchTap.current = { at: e.timeStamp, x: e.clientX, y: e.clientY };
  };

  const onClickCapture = (e) => {
    if (replaying.current) return;
    if (swallowClick.current || e.timeStamp < swallowUntil.current) {
      swallowClick.current = false;
      e.stopPropagation();
      return;
    }
    if (e.target.closest('a, button')) return;
    if (pointerType.current !== 'mouse') {
      e.stopPropagation();
      const target = e.target;
      clearTimeout(pendingTap.current);
      pendingTap.current = setTimeout(() => {
        pendingTap.current = null;
        replaying.current = true;
        target.click();
        replaying.current = false;
      }, DOUBLE_TAP_MS);
      return;
    }
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
