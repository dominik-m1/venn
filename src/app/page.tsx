import { OnboardingTemplate } from '@/components/templates/OnboardingTemplate';
import { OnboardingForm } from '@/components/organisms/OnboardingForm';
export default function Page() {
  return (
    <OnboardingTemplate stepLabel="Step 1 of 5">
      <OnboardingForm />
    </OnboardingTemplate>
  );
}
