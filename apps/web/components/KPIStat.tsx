import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function KPIStat({
  label,
  value,
  trend,
  className,
  ...props
}: { label: string; value: string; trend?: 'up'|'down'|'flat'; } & HTMLAttributes<HTMLDivElement>) {
  const trendColor = trend === 'up' ? 'text-euco-accent2' : trend === 'down' ? 'text-euco-danger' : 'text-euco-muted';
  const trendSymbol = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '■';
  return (
    <div className={clsx('rounded-xl bg-black/30 px-4 py-3', className)} {...props}>
      <div className="text-xs text-euco-muted">{label}</div>
      <div className="flex items-center gap-2">
        <div className="text-xl font-semibold">{value}</div>
        <div className={clsx('text-xs', trendColor)}>{trendSymbol}</div>
      </div>
    </div>
  );
}


