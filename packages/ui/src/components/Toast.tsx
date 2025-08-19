import React, { useEffect } from 'react';
import { cn } from '../utils/cn';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  description,
  duration = 5000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const typeStyles = {
    success: 'bg-green-50 text-green-700 border-green-500',
    error: 'bg-red-50 text-red-700 border-red-500',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-500',
    info: 'bg-blue-50 text-blue-700 border-blue-500',
  } as const;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  } as const;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-md',
        typeStyles[type]
      )}
    >
      <span className="text-xl">{icons[type]}</span>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm mt-1 opacity-90">{description}</p>}
      </div>
      <button onClick={() => onClose(id)} className="text-xl hover:opacity-70 transition-opacity">
        ×
      </button>
    </div>
  );
};


