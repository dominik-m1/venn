export type StepperStep = { id: string; label: string };

type Props = {
  steps: readonly StepperStep[];
  currentStepId: string;
  className?: string;
};

export function Stepper({ steps, currentStepId, className }: Props) {
  if (steps.length === 0) return null;
  const currentStep = Math.max(
    0,
    steps.findIndex(({ id }) => id === currentStepId),
  );
  const label = `Step ${currentStep + 1} of ${steps.length}`;

  return (
    <p
      className={className}
      role="progressbar"
      aria-label="Onboarding progress"
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={currentStep + 1}
      aria-valuetext={`${label}: ${steps[currentStep].label}`}
    >
      {label}
    </p>
  );
}
