'use client';

import { Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { FULL_COUNT, QUICK_COUNT } from '@/lib/onboarding/goals';
import { Button } from '@/components/ui/button';
import { OptionCard } from './OptionCard';

export type LearningStyle = 'text' | 'video';

export function StyleStep({
  style,
  onStyle,
  count,
  onCount,
  saving,
  onBack,
  onSubmit,
}: {
  style: LearningStyle;
  onStyle: (s: LearningStyle) => void;
  count: number;
  onCount: (n: number) => void;
  saving: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const { t } = useT();

  return (
    <>
      <h1 tabIndex={-1} className="text-h3 outline-none">{t('onboarding.style.title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('onboarding.style.subtitle')}</p>

      <fieldset className="mt-7" disabled={saving}>
        <legend className="mb-2 text-sm font-medium">{t('onboarding.style.legend')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <OptionCard name="style" value="text" checked={style === 'text'} onChange={() => onStyle('text')} title={t('onboarding.style.text')} description={t('onboarding.style.text.desc')} />
          <OptionCard name="style" value="video" checked={style === 'video'} onChange={() => onStyle('video')} title={t('onboarding.style.video')} description={t('onboarding.style.video.desc')} />
        </div>
      </fieldset>

      <fieldset className="mt-6" disabled={saving}>
        <legend className="mb-2 text-sm font-medium">{t('onboarding.style.length.legend')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <OptionCard name="count" value="quick" checked={count === QUICK_COUNT} onChange={() => onCount(QUICK_COUNT)} title={t('onboarding.style.length.quick')} description={t('onboarding.style.length.quick.desc')} />
          <OptionCard name="count" value="full" checked={count === FULL_COUNT} onChange={() => onCount(FULL_COUNT)} title={t('onboarding.style.length.full')} description={t('onboarding.style.length.full.desc')} />
        </div>
      </fieldset>

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" size="lg" onClick={onBack} disabled={saving}>
          {t('onboarding.back')}
        </Button>
        <Button size="lg" onClick={onSubmit} disabled={saving} aria-busy={saving}>
          {saving && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
          {saving ? t('onboarding.style.submitting') : t('onboarding.style.submit')}
        </Button>
      </div>
    </>
  );
}
