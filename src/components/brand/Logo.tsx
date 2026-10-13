import { cn } from '@/lib/utils';

/**
 * Pijar mark: geometry copied from Asset/pijar-logo-D.svg (cropped viewBox only), colors from the tokens.
 * `size` is the mark height in px. `wordmark` adds lowercase "pijar" in Outfit.
 */
export function Logo({
  size = 28,
  wordmark = false,
  className,
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-ink', className)}>
      <svg
        viewBox="40 47 276 256"
        height={size}
        width={(size * 276) / 256}
        role={wordmark ? undefined : 'img'}
        aria-label={wordmark ? undefined : 'Pijar'}
        aria-hidden={wordmark ? true : undefined}
        className="shrink-0"
      >
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="15">
          <path d="M155 96 105 142" className="stroke-ink" />
          <path d="M94 196 159 251" className="stroke-ink" />
          <path d="M208 102 252 143" className="stroke-amber" />
          <path d="M252 209 212 242" className="stroke-amber" />
        </g>
        <g className="fill-ink">
          <circle cx="179" cy="83" r="33" />
          <circle cx="76" cy="178" r="33" />
          <circle cx="179" cy="266" r="33" />
        </g>
        <circle cx="280" cy="178" r="33" className="fill-amber" />
      </svg>
      {wordmark && (
        <span
          className="font-display font-semibold leading-none tracking-[-0.04em]"
          style={{ fontSize: size * 0.82 }}
        >
          pijar
        </span>
      )}
    </span>
  );
}
