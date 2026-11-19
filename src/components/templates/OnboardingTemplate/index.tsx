import type { ReactNode } from 'react';
import { Stepper, type StepperStep } from '@/components/molecules/Stepper';
import styles from './onboarding-template.module.scss';

type Props = {
  steps: readonly StepperStep[];
  currentStepId: string;
  onBack: () => void;
  onNext: () => void;
  navigationDisabled: boolean;
  children: ReactNode;
};

export function OnboardingTemplate({
  steps,
  currentStepId,
  onBack,
  onNext,
  navigationDisabled,
  children,
}: Props) {
  return (
    <main className={styles['onboarding-template']}>
      <Stepper
        steps={steps}
        currentStepId={currentStepId}
        onBack={onBack}
        onNext={onNext}
        disabled={navigationDisabled}
        className={styles['onboarding-template__step']}
      />
      <section
        className={styles['onboarding-template__card']}
        aria-label="Onboarding"
      >
        {children}
      </section>
    </main>
  );
}
