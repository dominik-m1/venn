import type { ReactNode } from 'react';
import { Stepper, type StepperStep } from '@/components/molecules/Stepper';
import styles from './onboarding-template.module.scss';

type Props = {
  steps: readonly StepperStep[];
  currentStepId: string;
  children: ReactNode;
};

export function OnboardingTemplate({ steps, currentStepId, children }: Props) {
  return (
    <main className={styles.page}>
      <Stepper
        steps={steps}
        currentStepId={currentStepId}
        className={styles.step}
      />
      <section className={styles.card} aria-label="Onboarding">
        {children}
      </section>
    </main>
  );
}
