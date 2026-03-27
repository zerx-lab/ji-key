import * as React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--color-text-dim)] select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 flex items-center text-[var(--color-text-muted)] pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-10 bg-[var(--color-surface)] text-[var(--color-text)]',
              'border border-[var(--color-border)] rounded-[var(--radius-md)]',
              'px-3 py-2 text-sm',
              'placeholder:text-[var(--color-text-muted)]',
              'transition-colors duration-150',
              'hover:border-[var(--color-border-hover)]',
              'focus:outline-none focus:border-[var(--color-accent)]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              error && 'border-[var(--color-error)] focus:border-[var(--color-error)]',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 flex items-center text-[var(--color-text-muted)] pointer-events-none">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-[var(--color-error)] mt-0.5">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{hint}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
