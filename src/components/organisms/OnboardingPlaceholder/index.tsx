import type { Ref } from 'react';
import { Button } from '@/components/atoms/Button';
import styles from './onboarding-placeholder.module.scss';

type Props = {
  headingRef?: Ref<HTMLHeadingElement>;
  title: string;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
};

export function OnboardingPlaceholder({
  headingRef,
  title,
  isLastStep,
  onBack,
  onNext,
}: Props) {
  return (
    <div className={styles.placeholder}>
      <h1 ref={headingRef} tabIndex={-1}>
        {title}
      </h1>
      <p>This step is not available yet.</p>
      <Button type="button" onClick={onBack}>
        Back
      </Button>
      {!isLastStep && (
        <Button type="button" onClick={onNext}>
          Continue <span aria-hidden="true">→</span>
        </Button>
      )}
    </div>
  );
}
