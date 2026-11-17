import { useState, type ReactNode } from 'react';
import { previousCheckpoint } from '../../engine/calculate';
import { yearLabel } from '../dates';
import { useT } from '../i18n/locale';
import { useOpenProfile } from '../storage/sessionContext';
import { HoldingsStep } from './HoldingsStep';
import { PricesStep } from './PricesStep';
import { Steps, type Step } from './Steps';

export function CheckpointFlow({
  checkpointId,
  review,
}: {
  checkpointId: string;
  review: (nav: { goPrices: () => void; goHoldings: () => void }) => ReactNode;
}) {
  const t = useT().checkpoint;
  const { profile } = useOpenProfile();
  const [step, setStep] = useState<Step>('prices');
  const checkpoint = profile.checkpoints.find((c) => c.id === checkpointId);
  if (!checkpoint) throw new Error(`Unknown checkpoint ${checkpointId}`);
  const previous = previousCheckpoint(profile, checkpoint);
  const go = (s: Step) => () => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  return (
    <main className="screen">
      <div className="stack">
        <h1>{t.title(yearLabel(checkpoint.date, profile.settings.dateDisplay))}</h1>
        <Steps current={step} />
      </div>
      {step === 'prices' && (
        <>
          <PricesStep checkpoint={checkpoint} previous={previous} />
          <div className="actions">
            <button className="btn" type="button" onClick={go('holdings')}>
              {t.toHoldings}
            </button>
          </div>
        </>
      )}
      {step === 'holdings' && (
        <>
          <HoldingsStep checkpoint={checkpoint} previous={previous} />
          <div className="actions">
            <button className="btn quiet" type="button" onClick={go('prices')}>
              {t.toPrices}
            </button>
            <button className="btn" type="button" onClick={go('review')}>
              {t.toReview}
            </button>
          </div>
        </>
      )}
      {step === 'review' && review({ goPrices: go('prices'), goHoldings: go('holdings') })}
    </main>
  );
}
