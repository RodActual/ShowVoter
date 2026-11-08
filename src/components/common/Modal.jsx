import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

// Accessible dialog: Esc and backdrop close it, focus stays inside and returns to the
// opener on close, and the page behind doesn't scroll.
const Modal = ({ title, onClose, children, maxWidth = 'max-w-2xl', padded = true }) => {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Captured during the first render, before autoFocus moves focus into the dialog.
  const openerRef = useRef(typeof document !== 'undefined' ? document.activeElement : null);

  useEffect(() => {
    const opener = openerRef.current;
    const panel = panelRef.current;
    const first = panel?.querySelector('[autofocus], input, select') || panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center sm:p-4 z-50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-gray-800 w-full ${maxWidth} max-h-[92vh] overflow-y-auto border border-gray-700 rounded-t-2xl sm:rounded-lg shadow-xl outline-none ${padded ? 'p-5' : ''}`}
      >
        <div className={`flex justify-between items-start gap-3 ${padded ? 'mb-4' : 'p-3 bg-gray-900 border-b border-gray-700'}`}>
          <h2 id={titleId} className="text-lg sm:text-xl font-bold text-white leading-snug">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -m-2 p-2 min-w-11 min-h-11 flex items-center justify-center text-gray-300 hover:text-white rounded-lg"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
