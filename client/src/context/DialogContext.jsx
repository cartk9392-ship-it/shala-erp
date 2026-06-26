import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const DialogContext = createContext(null);

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside DialogProvider');
  return ctx;
};

export const DialogProvider = ({ children }) => {
  // ── Toast state ─────────────────────────────────────────
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Confirm state ────────────────────────────────────────
  const [confirmState, setConfirmState] = useState(null);
  const resolveRef = useRef(null);

  const showConfirm = useCallback(({ title, message, confirmText = 'Confirm', danger = false }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({ title, message, confirmText, danger });
    });
  }, []);

  const handleConfirmResolve = useCallback((result) => {
    setConfirmState(null);
    if (resolveRef.current) resolveRef.current(result);
  }, []);

  return (
    <DialogContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* ── Toast Container (Top Right on Desktop, Top Center on Mobile) ── */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[9999] flex flex-col gap-3 items-center sm:items-end pointer-events-none w-full max-w-sm px-4 sm:px-0">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>

      {/* ── Confirm Dialog ── */}
      {confirmState && (
        <ConfirmDialogUI state={confirmState} onResolve={handleConfirmResolve} />
      )}
    </DialogContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────
// Toast Item Component
// ─────────────────────────────────────────────────────────────
const typeConfig = {
  success: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    progressBg: 'bg-emerald-500',
    border: 'border-emerald-100',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  error: {
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    progressBg: 'bg-rose-500',
    border: 'border-rose-100',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    progressBg: 'bg-amber-500',
    border: 'border-amber-100',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  info: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    progressBg: 'bg-blue-500',
    border: 'border-blue-100',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
      </svg>
    ),
  },
};

const ToastItem = ({ toast, onClose }) => {
  const cfg = typeConfig[toast.type] || typeConfig.info;
  return (
    <div
      className={`
        pointer-events-auto flex flex-col rounded-2xl relative overflow-hidden
        bg-white/95 backdrop-blur-md border ${cfg.border} shadow-[0_10px_30px_rgba(0,0,0,0.06)]
        text-slate-800 text-sm font-medium max-w-sm w-full
        transition-all duration-300 ease-in-out hover:scale-[1.02]
        animate-[slideIn_0.3s_cubic-bezier(0.16,1,0.3,1)]
      `}
      style={{ animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div className="flex items-center gap-3.5 px-5 py-4">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${cfg.iconBg} ${cfg.iconColor} shadow-inner`}>
          {cfg.icon}
        </div>
        <span className="flex-1 leading-snug font-semibold text-slate-700">{toast.message}</span>
        <button
          onClick={() => onClose(toast.id)}
          className="text-slate-400 hover:text-slate-600 transition-colors ml-1 p-1 hover:bg-slate-55 rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Dynamic progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-50">
        <div 
          className={`h-full ${cfg.progressBg} animate-[shrinkWidth_linear_forwards]`}
          style={{ animationDuration: `${toast.duration || 3500}ms` }}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Confirm Dialog Component
// ─────────────────────────────────────────────────────────────
const ConfirmDialogUI = ({ state, onResolve }) => {
  const { title, message, confirmText, danger } = state;
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 animate-[popIn_0.2s_ease-out]"
        style={{ animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Icon Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${danger ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'} shadow-sm`}>
            {danger ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 leading-snug">{title}</h3>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Confirmation Required</p>
          </div>
        </div>

        {/* Content */}
        {message && (
          <div className="bg-slate-50/50 rounded-2xl p-4 mb-6 border border-slate-100/50">
            <p className="text-sm text-slate-600 leading-relaxed font-medium">{message}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => onResolve(false)}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onResolve(true)}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all shadow-sm ${
              danger
                ? 'bg-rose-500 hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/20 active:scale-95'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-95'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
