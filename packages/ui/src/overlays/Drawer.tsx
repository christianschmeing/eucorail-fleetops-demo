import React from 'react';

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: 'right' | 'left' | 'bottom';
  title?: string;
  children: React.ReactNode;
};

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  side = 'right',
  title,
  children,
}) => {
  if (!open) return null;
  const sideClasses =
    side === 'bottom'
      ? 'inset-x-0 bottom-0 w-full max-h-[90vh]'
      : side === 'left'
        ? 'inset-y-0 left-0 w-[420px]'
        : 'inset-y-0 right-0 w-[420px]';
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        className={`absolute bg-white shadow-xl ${sideClasses} flex flex-col`}
        style={{ transition: 'transform 0.2s ease' }}
      >
        <div className="p-4 border-b flex items-center justify-between">
          {title ? <h2 className="text-base font-semibold">{title}</h2> : <span />}
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-gray-100">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
