'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

type FieldProps = Omit<React.ComponentProps<'input'>, 'id'> & {
  label: string;
  /** Translated error, shown under the field and announced. */
  error?: string | null;
  /** Neutral help text under the field, hidden while an error shows. */
  hint?: string;
};

/** Label above, help or error below. Error and hint are tied to the input with aria-describedby. */
export function Field({ label, error, hint, className, ...props }: FieldProps) {
  const id = useId();
  const note = error ?? hint;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? `${id}-note` : undefined}
        className={className}
        {...props}
      />
      {note && (
        <p
          id={`${id}-note`}
          role={error ? 'alert' : undefined}
          className={cn('mt-1.5 text-xs', error ? 'text-danger' : 'text-muted-foreground')}
        >
          {note}
        </p>
      )}
    </div>
  );
}

/** Password input with a real button to show or hide the value (44px target on touch). */
export function PasswordField(props: FieldProps) {
  const { t } = useT();
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Field {...props} type={shown ? 'text' : 'password'} className="pr-12 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? t('auth.password.hide') : t('auth.password.show')}
        aria-pressed={shown}
        className="absolute right-0 top-[1.625rem] grid size-11 place-items-center rounded-control text-muted-foreground transition-colors hover:text-foreground md:top-[1.625rem] md:size-10"
      >
        {shown ? <EyeOff className="size-4" strokeWidth={1.6} aria-hidden /> : <Eye className="size-4" strokeWidth={1.6} aria-hidden />}
      </button>
    </div>
  );
}
