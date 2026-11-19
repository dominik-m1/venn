import type { ReactNode } from 'react';
import styles from './OnboardingTemplate.module.scss';
export function OnboardingTemplate({ stepLabel, children }: { stepLabel: string; children: ReactNode }) {
  return <main className={styles.page}><p className={styles.step}>{stepLabel}</p><section className={styles.card} aria-label="Onboarding">{children}</section></main>;
}
