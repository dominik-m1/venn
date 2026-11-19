'use client';

import { useEffect, useRef } from 'react';
import { OnboardingTemplate } from '@/components/templates/OnboardingTemplate';
import { OnboardingForm } from '@/components/organisms/OnboardingForm';
import { OnboardingPlaceholder } from '@/components/organisms/OnboardingPlaceholder';
import { useOnboardingForm } from '@/features/onboarding';

export function OnboardingPage() {
  const form = useOnboardingForm();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [form.step.id]);

  return (
    <OnboardingTemplate steps={form.steps} currentStepId={form.step.id}>
      {!form.ready ? (
        <p role="status">Restoring your progress…</p>
      ) : form.isFirstStep ? (
        <OnboardingForm form={form} headingRef={headingRef} />
      ) : (
        <OnboardingPlaceholder
          headingRef={headingRef}
          title={form.step.label}
          isLastStep={form.isLastStep}
          onBack={form.back}
          onNext={form.next}
        />
      )}
    </OnboardingTemplate>
  );
}
