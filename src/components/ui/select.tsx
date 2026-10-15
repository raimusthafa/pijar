'use client';

import * as React from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Pijar Custom Select dropdown component powered by @base-ui/react/select.
 * Provides accessible keyboard navigation, typeahead, responsive layout,
 * and token-only styling with no raw browser styling or blue tints.
 */
export function Select({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
  placeholder,
  disabled,
}: SelectProps) {
  const selectedOption = options.find((o) => o.value === value);

  return (
    <BaseSelect.Root
      value={value ?? null}
      onValueChange={(val) => {
        if (typeof val === 'string') {
          onValueChange(val);
        }
      }}
      disabled={disabled}
    >
      <BaseSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          'pj-press flex h-11 w-full items-center justify-between gap-2 rounded-control border border-field bg-raised px-3 text-sm text-foreground outline-none transition-colors duration-150 md:h-10 md:max-w-xs',
          'focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left font-normal text-foreground">
          {selectedOption ? selectedOption.label : (placeholder ?? '')}
        </span>
        <BaseSelect.Icon className="shrink-0 text-muted-foreground">
          <ChevronsUpDown className="size-4" strokeWidth={1.75} aria-hidden />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>

      <BaseSelect.Portal>
        <BaseSelect.Positioner alignItemWithTrigger={false} side="bottom" sideOffset={6} align="start" collisionPadding={8} className="z-50 outline-none">
          <BaseSelect.Popup
            style={{ transformOrigin: 'var(--transform-origin)' }}
            className={cn(
              'max-h-80 w-[max(var(--anchor-width,320px),320px)] min-w-[280px] max-w-[min(400px,calc(100vw-2rem))] overflow-y-auto rounded-inner border border-hairline-strong bg-raised p-1.5 outline-none',
              'transition-[transform,opacity] duration-150 ease-out-pj',
              'data-starting-style:opacity-0 data-starting-style:scale-97 data-ending-style:opacity-0 data-ending-style:scale-97',
              'motion-reduce:transition-opacity motion-reduce:transform-none',
            )}
          >
            <BaseSelect.List className="flex flex-col gap-1 outline-none">
              {options.map((opt) => (
                <BaseSelect.Item
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  className={cn(
                    'pj-press relative flex min-h-11 cursor-pointer select-none items-center justify-between gap-2.5 rounded-control px-3 py-2 text-left outline-none transition-colors duration-100',
                    'hover:bg-hover focus:bg-hover data-highlighted:bg-hover',
                    'data-selected:bg-surface-strong font-normal text-foreground',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <BaseSelect.ItemText className="text-sm font-medium leading-snug text-foreground line-clamp-2">
                      {opt.label}
                    </BaseSelect.ItemText>
                    {opt.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {opt.description}
                      </p>
                    )}
                  </div>
                  <BaseSelect.ItemIndicator className="shrink-0 text-foreground">
                    <Check className="size-4" strokeWidth={2} aria-hidden />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
