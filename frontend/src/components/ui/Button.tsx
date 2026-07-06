import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 focus:ring-brand-400',
      secondary: 'bg-[#121212] text-white hover:bg-[#1E1E1E] active:bg-slate-300 focus:ring-slate-500',
      outline: 'border border-[#333333] bg-transparent hover:bg-[#121212] text-[#A1A1AA] focus:ring-slate-500',
      ghost: 'bg-transparent hover:bg-[#121212] text-[#A1A1AA] focus:ring-slate-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

