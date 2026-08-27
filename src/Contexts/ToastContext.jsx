import { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    ({ message, type = "success", duration = 3000 }) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => remove(id), duration);
      return id;
    },
    [remove]
  );

  const toast = useCallback(
    (message, opts) => add({ message, ...opts }),
    [add]
  );

  toast.success = (message, opts) =>
    add({ message, type: "success", ...opts });
  toast.error = (message, opts) =>
    add({ message, type: "error", ...opts });
  toast.info = (message, opts) =>
    add({ message, type: "info", ...opts });

  const icons = {
    success: "check_circle",
    error: "error",
    info: "info",
  };

  const colors = {
    success: "bg-primary text-white",
    error: "bg-error text-white",
    info: "bg-inverse-surface text-inverse-on-surface",
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg backdrop-blur-md animate-fade-in-up ${colors[t.type] || colors.info}`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {icons[t.type] || icons.info}
            </span>
            <span className="font-label-md text-sm">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
