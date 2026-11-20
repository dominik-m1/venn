'use client';

import type { ComponentProps, Ref } from 'react';
import { Button } from '@/components/atoms/Button';
import { FieldMessage } from '@/components/atoms/FieldMessage';
import { FormField } from '@/components/molecules/FormField';
import {
  CorporationStatus,
  type FieldName,
  type OnboardingFormController,
  SubmissionStatus,
} from '@/features/onboarding';
import styles from './onboarding-form.module.scss';

type Props = {
  form: OnboardingFormController;
  headingRef?: Ref<HTMLHeadingElement>;
};

const titleId = 'onboarding-title';
const corporationFeedbackId = 'corporationNumber-message';
const corporationVerifiedMessage = 'Corporation number verified.';
const submissionSuccessMessage =
  'Your details have been submitted successfully.';

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
    (remote.status === CorporationStatus.Invalid ||
    remote.status === CorporationStatus.Unavailable
      ? remote.message
      : undefined);
  const corporationMessage =
    remote.status === CorporationStatus.Checking
      ? 'Checking corporation number…'
      : remote.status === CorporationStatus.Valid
        ? corporationVerifiedMessage
        : undefined;
  const buttonText =
    form.submitStatus === SubmissionStatus.Validating
      ? 'Validating…'
      : form.submitStatus === SubmissionStatus.Submitting
        ? 'Submitting…'
        : form.submitStatus === SubmissionStatus.Success
          ? 'Continue'
          : 'Submit';

  return (
    <form
      noValidate
      onSubmit={form.submit}
      aria-labelledby={titleId}
      aria-busy={form.busy}
      className={styles['onboarding-form']}
    >
      <h1
        ref={headingRef}
        id={titleId}
        className={styles['onboarding-form__heading']}
        tabIndex={-1}
      >
        Onboarding Form
      </h1>
      <div className={styles['onboarding-form__names']}>
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
      <div className={styles['onboarding-form__submission']}>
        <FormField
          {...field('corporationNumber')}
          label="Corporation Number"
          type="text"
          autoComplete="off"
          spellCheck={false}
          error={corporationError}
          message={corporationMessage}
          feedbackId={corporationFeedbackId}
          aria-busy={remote.status === CorporationStatus.Checking}
        />
        <div
          className={styles['onboarding-form__feedback']}
          data-reserved-messages={`${corporationVerifiedMessage}\n${submissionSuccessMessage}`}
        >
          <div className={styles['onboarding-form__messages']}>
            <FieldMessage
              id={corporationFeedbackId}
              error={Boolean(corporationError)}
            >
              {corporationError ?? corporationMessage}
            </FieldMessage>
            <p role="alert" className={styles['onboarding-form__error']}>
              {form.formError}
            </p>
            <p role="status" className={styles['onboarding-form__success']}>
              {form.submitStatus === SubmissionStatus.Success
                ? submissionSuccessMessage
                : ''}
            </p>
          </div>
        </div>
        <Button type="submit" disabled={form.busy}>
          {buttonText}
          <span aria-hidden="true">→</span>
        </Button>
      </div>
    </form>
  );
}
