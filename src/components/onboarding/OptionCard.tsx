import { cn } from '@/lib/utils';

/** A radio shown as a selectable card. The native input stays in the DOM so arrow keys and screen readers work. */
export function OptionCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-inner border p-4 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foreground',
        checked ? 'border-foreground bg-raised' : 'border-field hover:bg-hover',
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid size-4 shrink-0 place-items-center rounded-pill border',
          checked ? 'border-foreground' : 'border-field',
        )}
      >
        {checked && <span className="size-2 rounded-pill bg-foreground" />}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
