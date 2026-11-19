'use client';

import type { ComponentProps, Ref } from 'react';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import type {
  FieldName,
  OnboardingFormController,
} from '@/features/onboarding';
import styles from './onboarding-form.module.scss';

type Props = {
  form: OnboardingFormController;
  headingRef?: Ref<HTMLHeadingElement>;
};

export function OnboardingForm({ form, headingRef }: Props) {
  const field = (
    name: FieldName,
  ): Omit<ComponentProps<typeof FormField>, 'label'> => ({
    id: name,
    name,
    required: true,
    value: form.values[name],
    disabled: form.busy,
    error: form.fieldErrors[name],
    onChange: (event) => form.change(name, event.target.value),
    onBlur: () => form.blur(name),
    ref: (element) => {
      form.inputs.current[name] = element;
    },
  });
  const remote = form.corporationCheck;
  const corporationError =
    form.fieldErrors.corporationNumber ??
    (remote.status === 'invalid' || remote.status === 'unavailable'
      ? remote.message
      : undefined);
  const corporationMessage =
    remote.status === 'checking'
      ? 'Checking corporation number…'
      : remote.status === 'valid'
        ? 'Corporation number verified.'
        : undefined;
  const buttonText =
    form.submitStatus === 'validating'
      ? 'Validating…'
      : form.submitStatus === 'submitting'
        ? 'Submitting…'
        : form.submitStatus === 'success'
          ? 'Continue'
          : 'Submit';

  return (
    <form
      noValidate
      onSubmit={form.submit}
      aria-labelledby="onboarding-title"
      aria-busy={form.busy}
      className={styles.form}
    >
      <h1
        ref={headingRef}
        id="onboarding-title"
        className={styles.heading}
        tabIndex={-1}
      >
        Onboarding Form
      </h1>
      <div className={styles.names}>
        <FormField
          {...field('firstName')}
          label="First Name"
          autoComplete="given-name"
        />
        <FormField
          {...field('lastName')}
          label="Last Name"
          autoComplete="family-name"
        />
      </div>
      <FormField
        {...field('phone')}
        label="Phone Number"
        type="tel"
        autoComplete="tel"
      />
      <FormField
        {...field('corporationNumber')}
        label="Corporation Number"
        type="text"
        autoComplete="off"
        spellCheck={false}
        error={corporationError}
        message={corporationMessage}
        aria-busy={remote.status === 'checking'}
      />
      <p role="alert" className={styles.error}>
        {form.formError}
      </p>
      <p role="status" className={styles.success}>
        {form.submitStatus === 'success'
          ? 'Your details have been submitted successfully.'
          : ''}
      </p>
      <Button type="submit" disabled={form.busy}>
        {buttonText}
        <span aria-hidden="true">→</span>
      </Button>
    </form>
  );
}
