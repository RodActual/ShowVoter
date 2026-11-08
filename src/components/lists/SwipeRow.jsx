import React, { useRef, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';

const THRESHOLD = 96; // px of horizontal travel that commits the action
const LOCK = 10; // px before we decide whether the gesture is horizontal or vertical

// Swipe left → onSwipeLeft, swipe right → onSwipeRight (optional). Vertical scrolling always wins:
// the row only follows the finger once the gesture is clearly horizontal (touch-action: pan-y).
// Swipes are shortcuts; the same actions live in the detail sheet for keyboard and screen readers.
const SwipeRow = ({ children, onSwipeLeft, onSwipeRight, leftLabel = 'Delete', rightLabel = 'Watched' }) => {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const start = useRef(null);
  const mode = useRef(null); // null | 'h' | 'v'
  const moved = useRef(false);

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
    mode.current = null;
    moved.current = false;
    setAnimating(false);
  };

  const onPointerMove = (e) => {
    if (!start.current) return;
    const ddx = e.clientX - start.current.x;
    const ddy = e.clientY - start.current.y;
    if (!mode.current) {
      if (Math.abs(ddx) < LOCK && Math.abs(ddy) < LOCK) return;
      mode.current = Math.abs(ddx) > Math.abs(ddy) ? 'h' : 'v';
      if (mode.current === 'h') e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    if (mode.current !== 'h') return;
    moved.current = true;
    const limited = !onSwipeRight && ddx > 0 ? 0 : ddx;
    setDx(Math.max(-160, Math.min(160, limited)));
  };

  const finish = () => {
    if (!start.current) return;
    start.current = null;
    setAnimating(true);
    if (dx <= -THRESHOLD) onSwipeLeft?.();
    else if (dx >= THRESHOLD && onSwipeRight) onSwipeRight();
    setDx(0);
  };

  // Swallow the click that ends a swipe so it doesn't also open the sheet.
  const onClickCapture = (e) => {
    if (moved.current) {
      e.stopPropagation();
      e.preventDefault();
      moved.current = false;
    }
  };

  const showRight = dx > 0;
  const committed = Math.abs(dx) >= THRESHOLD;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {dx !== 0 && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 flex items-center px-5 font-semibold text-white ${showRight ? 'justify-start bg-green-700' : 'justify-end bg-red-700'} ${committed ? '' : 'opacity-80'}`}
        >
          {showRight
            ? <span className="flex items-center gap-2"><Check size={20} /> {rightLabel}</span>
            : <span className="flex items-center gap-2">{leftLabel} <Trash2 size={20} /></span>}
        </div>
      )}
      <div
        className={`relative touch-pan-y select-none ${animating ? 'transition-transform duration-200' : ''}`}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeRow;
