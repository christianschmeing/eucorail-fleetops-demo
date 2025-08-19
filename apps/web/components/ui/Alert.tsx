import { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

export function Alert({ className, children, ...props }: { className?: string; children?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={clsx('rounded-lg border p-3 flex items-start gap-2', className)} {...props}>
			{children}
		</div>
	);
}

export function AlertDescription({ children, className, ...props }: { children?: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={clsx('text-sm', className)} {...props}>
			{children}
		</div>
	);
}
