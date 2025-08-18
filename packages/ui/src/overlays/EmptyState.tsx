import React from 'react';

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className,
}) => {
  return (
    <div
      className={
        'flex flex-col items-center justify-center text-center p-8 gap-3 border rounded bg-white/50 ' +
        (className ?? '')
      }
    >
      {icon}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? <p className="text-sm text-gray-600 max-w-prose">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
};
