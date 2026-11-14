import React from 'react';
import { CheckIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export interface ConsentBoxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  details?: string;
  className?: string;
  disabled?: boolean;
}

export function ConsentBox({
  id,
  checked,
  onChange,
  label,
  details,
  className = '',
  disabled = false,
}: ConsentBoxProps) {
  return (
    <div
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={cn(
        'w-full p-4 rounded-control bg-fill border border-hairline-subtle flex items-start gap-3.5 transition-colors duration-150 cursor-pointer select-none',
        'hover:bg-trough/50',
        disabled && 'opacity-60 cursor-not-allowed hover:bg-fill',
        className
      )}
    >
      {/* 20px Custom Checkbox */}
      <button
        type="button"
        role="checkbox"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(!checked);
        }}
        className={cn(
          'w-5 h-5 rounded-[6px] shrink-0 mt-0.5 flex items-center justify-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
          checked
            ? 'bg-accent border-accent text-white shadow-sm'
            : 'bg-card border border-input-border text-transparent hover:border-accent'
        )}
      >
        <CheckIcon size={13} className={checked ? 'opacity-100' : 'opacity-0'} />
      </button>

      {/* Label & Caption Disclosure */}
      <div className="flex-1">
        <label
          htmlFor={id}
          className="block font-sans font-bold text-sm text-ink cursor-pointer leading-snug"
        >
          {label}
        </label>
        {details && (
          <p className="font-sans text-xs text-text-secondary leading-relaxed mt-1">
            {details}
          </p>
        )}
      </div>
    </div>
  );
}
