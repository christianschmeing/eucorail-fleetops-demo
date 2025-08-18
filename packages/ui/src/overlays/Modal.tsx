import React from 'react';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded shadow-lg w-full max-w-lg mx-4">
        <div className="p-4 border-b flex items-center justify-between">
          {title ? <h2 className="text-base font-semibold">{title}</h2> : <span />}
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-gray-100">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer ? <div className="p-3 border-t bg-gray-50">{footer}</div> : null}
      </div>
    </div>
  );
};
