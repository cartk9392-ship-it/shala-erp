// ============================================================
// PushNotificationButton.jsx
// "Enable Notifications" button with animated state management
// Drop this anywhere — Teacher Dashboard, Admin Settings, etc.
// ============================================================

import React, { useState } from 'react';
import { Bell, BellOff, BellRing, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

const PushNotificationButton = ({ compact = false }) => {
  const { status, error, subscribe, unsubscribe, triggerTestNotification } = usePushNotifications();
  const [showInfo, setShowInfo] = useState(false);

  // ── Config for each state ────────────────────────────────
  const stateConfig = {
    unsupported: {
      label: 'Notifications N/A',
      sublabel: 'Not supported in this browser',
      icon: <BellOff className="w-4 h-4" />,
      style: 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed',
      action: null,
    },
    default: {
      label: 'Enable Notifications',
      sublabel: 'Get instant notice alerts',
      icon: <Bell className="w-4 h-4" />,
      style: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300',
      action: subscribe,
    },
    loading: {
      label: 'Setting up...',
      sublabel: 'Please wait',
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      style: 'bg-blue-50 text-blue-400 border-blue-200 cursor-wait',
      action: null,
    },
    subscribed: {
      label: 'Notifications On',
      sublabel: 'Tap to turn off',
      icon: <BellRing className="w-4 h-4 animate-[wiggle_1s_ease-in-out_once]" />,
      style: 'bg-green-50 hover:bg-red-50 text-green-700 hover:text-red-600 border-green-200 hover:border-red-200',
      action: unsubscribe,
    },
    denied: {
      label: 'Notifications Blocked',
      sublabel: 'Allow in browser settings',
      icon: <AlertCircle className="w-4 h-4" />,
      style: 'bg-amber-50 text-amber-700 border-amber-200 cursor-pointer',
      action: () => setShowInfo(true),
    },
    error: {
      label: 'Setup Failed',
      sublabel: 'Tap to retry',
      icon: <AlertCircle className="w-4 h-4" />,
      style: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200',
      action: subscribe,
    },
  };

  const cfg = stateConfig[status] || stateConfig.default;

  // ── Compact mode (just an icon button, e.g. in navbar) ──
  if (compact) {
    return (
      <button
        onClick={cfg.action || undefined}
        disabled={!cfg.action}
        title={cfg.label}
        className={`
          relative p-2 rounded-xl border transition-all duration-200 
          active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400
          ${cfg.style}
        `}
      >
        {cfg.icon}
        {status === 'subscribed' && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" />
        )}
      </button>
    );
  }

  // ── Full button ──────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={cfg.action || undefined}
        disabled={!cfg.action || status === 'loading'}
        className={`
          flex items-center gap-2.5 px-4 py-2.5 rounded-xl border
          text-sm font-semibold transition-all duration-200
          active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400
          ${cfg.style}
        `}
      >
        <span className="shrink-0">{cfg.icon}</span>
        <span className="flex flex-col items-start leading-tight text-left">
          <span>{cfg.label}</span>
          {cfg.sublabel && (
            <span className="text-[10px] font-normal opacity-70">{cfg.sublabel}</span>
          )}
        </span>
        {status === 'subscribed' && (
          <CheckCircle2 className="w-4 h-4 ml-auto text-green-500 shrink-0" />
        )}
      </button>

      {/* Error message */}
      {status === 'error' && error && (
        <p className="text-xs text-red-500 px-1">{error}</p>
      )}

      {/* Test button — only visible when subscribed */}
      {status === 'subscribed' && (
        <button
          onClick={triggerTestNotification}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 px-1 transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
          Send a test notification
        </button>
      )}

      {/* "How to enable" info panel for denied state */}
      {showInfo && (
        <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
          <strong>How to allow notifications:</strong>
          <ol className="mt-1 ml-3 list-decimal space-y-0.5">
            <li>Click the 🔒 lock icon in your browser's address bar</li>
            <li>Find "Notifications" and set it to "Allow"</li>
            <li>Refresh the page</li>
          </ol>
          <button
            onClick={() => setShowInfo(false)}
            className="mt-2 text-amber-600 hover:text-amber-800 underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default PushNotificationButton;
