import React from 'react';
import { cn } from '../utils/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className,
}) => {
  const defaultIcon = (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="text-eucorail-gray-400 mb-4">{icon || defaultIcon}</div>
      <h3 className="text-lg font-medium text-eucorail-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-eucorail-gray-600 text-center max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-eucorail-primary-500 text-white rounded-md hover:bg-eucorail-primary-600 transition-colors text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};


