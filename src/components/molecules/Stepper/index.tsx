import { IconButton } from '@/components/atoms/IconButton';
import styles from './stepper.module.scss';

export type StepperStep = { id: string; label: string };

type Props = {
  steps: readonly StepperStep[];
  currentStepId: string;
  onBack: () => void;
  onNext: () => void;
  disabled?: boolean;
  className?: string;
};

export function Stepper({
  steps,
  currentStepId,
  onBack,
  onNext,
  disabled = false,
  className,
}: Props) {
  if (steps.length === 0) return null;
  const currentStep = Math.max(
    0,
    steps.findIndex(({ id }) => id === currentStepId),
  );
  const label = `Step ${currentStep + 1} of ${steps.length}`;

  return (
    <div className={[styles.stepper, className].filter(Boolean).join(' ')}>
      <IconButton
        aria-label="Previous step"
        disabled={disabled || currentStep === 0}
        onClick={onBack}
      >
        ←
      </IconButton>
      <p
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={currentStep + 1}
        aria-valuetext={`${label}: ${steps[currentStep].label}`}
      >
        {label}
      </p>
      <IconButton
        aria-label="Next step"
        disabled={disabled || currentStep === steps.length - 1}
        onClick={onNext}
      >
        →
      </IconButton>
    </div>
  );
}
