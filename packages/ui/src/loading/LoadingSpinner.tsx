import React from 'react';

export type LoadingSpinnerProps = {
  size?: number;
  className?: string;
  label?: string;
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 24, className, label }) => {
  const dimension = `${size}px`;
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin text-accent"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
};
