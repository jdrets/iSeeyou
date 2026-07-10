import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex h-5 items-center rounded-full border px-2 text-xs font-semibold leading-none transition-colors',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-primary/90 text-primary-foreground shadow-sm shadow-cta/10',
                secondary:
                    'border-transparent bg-white/10 text-secondary-foreground backdrop-blur-sm',
                destructive:
                    'border-transparent bg-destructive/90 text-destructive-foreground',
                outline: 'border-transparent bg-white/5 text-foreground',
                success: 'border-transparent bg-cta/15 text-cta backdrop-blur-sm',
                error: 'border-transparent bg-destructive/15 text-red-400 backdrop-blur-sm',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <span
            className={cn(badgeVariants({ variant }), className)}
            {...props}
        />
    );
}

export { Badge, badgeVariants };
