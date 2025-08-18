import React from 'react';

type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
};

type ToastContextValue = {
  toasts: ToastMessage[];
  push: (msg: Omit<ToastMessage, 'id'>) => void;
  remove: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
  const push = (msg: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, ...msg }]);
    setTimeout(() => remove(id), 4000);
  };
  const remove = (id: string) => setToasts((t) => t.filter((m) => m.id !== id));
  const value = React.useMemo(() => ({ toasts, push, remove }), [toasts]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const Toast: React.FC<ToastMessage & { onClose?: () => void }> = ({
  title,
  description,
  variant = 'default',
  onClose,
}) => {
  const color =
    variant === 'success'
      ? 'bg-ok text-white'
      : variant === 'warning'
        ? 'bg-warn text-white'
        : variant === 'danger'
          ? 'bg-crit text-white'
          : 'bg-gray-800 text-white';
  return (
    <div role="status" className={`rounded shadow px-3 py-2 ${color}`}>
      <div className="font-semibold">{title}</div>
      {description ? <div className="text-sm opacity-90">{description}</div> : null}
      {onClose ? (
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-1 right-1 opacity-70 hover:opacity-100"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
};
