import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(() => {});

// show({ message, tone: 'info' | 'error' | 'success', action: { label, onClick }, duration })
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(({ message, tone = 'info', action, duration = 4000 }) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, message, tone, action }]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toneClass = { info: 'bg-gray-700', success: 'bg-green-800', error: 'bg-red-800' };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`${toneClass[t.tone]} text-white rounded-lg shadow-xl px-4 py-3 flex items-center gap-3 max-w-md w-full pointer-events-auto`}
          >
            <span className="flex-1 text-sm">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => { t.action.onClick(); dismiss(t.id); }}
                className="font-bold text-sm underline underline-offset-2 min-h-11 px-2"
              >
                {t.action.label}
              </button>
            )}
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-gray-200 min-h-11 min-w-11">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
