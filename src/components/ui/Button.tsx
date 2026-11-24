import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/src/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 active:bg-indigo-800',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200/80',
        outline:
          'border border-slate-200/90 bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900',
        ghost: 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900',
        destructive: 'bg-red-600 text-white shadow-xs hover:bg-red-700',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9.5 px-4 text-sm',
        lg: 'h-11 px-5 text-sm',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
