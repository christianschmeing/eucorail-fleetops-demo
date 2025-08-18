import { clsx } from 'clsx';

export function StatusChip({ status, label }: { status: 'OK' | 'WARN' | 'CRIT'; label?: string }) {
  const color =
    status === 'CRIT'
      ? 'bg-euco-danger text-white'
      : status === 'WARN'
        ? 'bg-euco-warn text-black'
        : 'bg-euco-accent text-black';
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-semibold',
        color
      )}
    >
      <span
        className={clsx(
          'w-2 h-2 rounded-full',
          status === 'CRIT' ? 'bg-white' : status === 'WARN' ? 'bg-black' : 'bg-black/70'
        )}
      />
      {label ?? status}
    </span>
  );
}
