import { AlertCircle } from 'lucide-react';

/** Form-level error. Solid danger text on the raised tone, announced to screen readers. */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-inner border border-hairline bg-raised p-3.5 text-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.8} aria-hidden />
      <p>{children}</p>
    </div>
  );
}
