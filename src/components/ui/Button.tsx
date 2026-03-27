import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--color-accent)] text-black font-semibold',
    'hover:bg-[var(--color-accent-dim)]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
  secondary: [
    'bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)]',
    'hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface)]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
  outline: [
    'bg-transparent text-[var(--color-text)] border border-[var(--color-border)]',
    'hover:border-[var(--color-text-dim)] hover:text-[var(--color-text)]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--color-text-dim)]',
    'hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
  danger: [
    'bg-[var(--color-error)] text-white font-semibold',
    'hover:opacity-90',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-[var(--radius-sm)]',
  md: 'h-10 px-4 text-sm rounded-[var(--radius-md)]',
  lg: 'h-12 px-6 text-base rounded-[var(--radius-md)]',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          'font-medium transition-all duration-150',
          'select-none whitespace-nowrap',
          'focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  },
)

Button.displayName = 'Button'
