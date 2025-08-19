import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Progress({ value = 0, className, ...props }: { value?: number } & HTMLAttributes<HTMLDivElement>) {
	const clamped = Math.max(0, Math.min(100, value));
	return (
		<div className={clsx('w-full bg-gray-200 rounded overflow-hidden', className)} {...props}>
			<div className="bg-blue-500 h-2" style={{ width: `${clamped}%` }} />
		</div>
	);
}
