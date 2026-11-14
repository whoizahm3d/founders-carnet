import { forwardRef } from 'react';
import { AlertCircleIcon, ChevronDownIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/* ---------- Text input ---------- */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightIcon, className, id, disabled, ...rest }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-sans text-sm font-semibold text-text tracking-wide"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-text-secondary">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full h-11 md:h-11 px-3.5 rounded-control bg-card text-ink font-sans text-sm border border-input-border transition-colors duration-150',
              'placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent-wash',
              'disabled:bg-disabled disabled:text-text-muted disabled:border-hairline disabled:cursor-not-allowed',
              error && 'border-status-error focus:border-status-error focus:ring-status-error-wash pr-10',
              leftIcon && 'pl-10',
              rightIcon && !error && 'pr-10',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...rest}
          />

          {error && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-status-error">
              <AlertCircleIcon size={18} />
            </div>
          )}

          {!error && rightIcon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-text-secondary">
              {rightIcon}
            </div>
          )}
        </div>

        {hint && !error && (
          <p id={`${inputId}-hint`} className="font-sans text-xs text-text-muted leading-tight">
            {hint}
          </p>
        )}

        {error && (
          <p
            id={`${inputId}-error`}
            className="font-sans text-xs font-medium text-status-error leading-tight"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* ---------- Textarea ---------- */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, id, disabled, ...rest }, ref) => {
    const inputId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-sans text-sm font-semibold text-text tracking-wide"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            'w-full p-3.5 rounded-control bg-card text-ink font-sans text-sm border border-input-border transition-colors duration-150',
            'placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent-wash',
            'disabled:bg-disabled disabled:text-text-muted disabled:border-hairline disabled:cursor-not-allowed resize-y min-h-[96px]',
            error && 'border-status-error focus:border-status-error focus:ring-status-error-wash',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />

        {hint && !error && (
          <p id={`${inputId}-hint`} className="font-sans text-xs text-text-muted leading-tight">
            {hint}
          </p>
        )}

        {error && (
          <p
            id={`${inputId}-error`}
            className="font-sans text-xs font-medium text-status-error leading-tight"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

/* ---------- Select ---------- */
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, placeholder, options, className, id, disabled, ...rest }, ref) => {
    const inputId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-sans text-sm font-semibold text-text tracking-wide"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full h-11 md:h-11 px-3.5 pr-10 rounded-control bg-card text-ink font-sans text-sm border border-input-border appearance-none cursor-pointer transition-colors duration-150',
              'focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent-wash',
              'disabled:bg-disabled disabled:text-text-muted disabled:border-hairline disabled:cursor-not-allowed',
              error && 'border-status-error focus:border-status-error focus:ring-status-error-wash',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="absolute right-3.5 pointer-events-none text-text-secondary">
            <ChevronDownIcon size={16} />
          </div>
        </div>

        {hint && !error && (
          <p id={`${inputId}-hint`} className="font-sans text-xs text-text-muted leading-tight">
            {hint}
          </p>
        )}

        {error && (
          <p
            id={`${inputId}-error`}
            className="font-sans text-xs font-medium text-status-error leading-tight"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
