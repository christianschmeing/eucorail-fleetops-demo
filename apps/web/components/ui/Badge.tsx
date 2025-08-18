import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { HTMLAttributes } from 'react';

const badgeVariants = cva('inline-flex items-center rounded-xl px-2 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      ok: 'bg-euco-accent text-black',
      warn: 'bg-euco-warn text-black',
      danger: 'bg-euco-danger text-white',
      muted: 'bg-white/10 text-euco-muted',
    },
  },
  defaultVariants: { variant: 'muted' },
});

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={clsx(badgeVariants({ variant }), className)} {...props} />;
}
