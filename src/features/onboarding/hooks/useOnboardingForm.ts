import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  fieldNames,
  type FieldName,
  type FormValues,
  type FieldErrors,
} from '../model/onboarding.types';
import { useCorporationVerification } from './useCorporationVerification';
import { useOnboardingSubmission } from './useOnboardingSubmission';
import { validateField, validateForm } from '../model/validation';

const emptyValues: FormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  corporationNumber: '',
};

export function useOnboardingForm() {
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const valuesRef = useRef(values);
  const inputs = useRef<Partial<Record<FieldName, HTMLInputElement | null>>>(
    {},
  );
  const corporation = useCorporationVerification();
  const submission = useOnboardingSubmission(corporation.verify);
  const { verificationFailed } = submission;

  // This runs after the rejected verification has re-enabled the input.
  useEffect(() => {
    if (verificationFailed) inputs.current.corporationNumber?.focus();
  }, [verificationFailed]);

  function change(field: FieldName, value: string) {
    if (!submission.canEdit()) return;

    valuesRef.current = { ...valuesRef.current, [field]: value };
    setValues(valuesRef.current);
    submission.reset();
    if (field === 'corporationNumber') corporation.reset(value);
  }

  function blur(field: FieldName) {
    if (!submission.canSubmit()) return;

    const error = validateField(field, valuesRef.current[field]);
    setFieldErrors((previous) => ({ ...previous, [field]: error }));
    if (field === 'corporationNumber' && !error)
      void corporation.verify(valuesRef.current.corporationNumber);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submission.canSubmit()) return;

    const snapshot = { ...valuesRef.current };
    const errors = validateForm(snapshot);
    setFieldErrors(errors);
    submission.reset();

    const firstInvalid = fieldNames.find((field) => errors[field]);
    if (firstInvalid) {
      inputs.current[firstInvalid]?.focus();
      return;
    }

    await submission.submit(snapshot);
  }

  return {
    values,
    fieldErrors,
    corporationCheck: corporation.check,
    submitStatus: submission.status,
    formError: submission.error,
    busy: submission.busy,
    change,
    blur,
    submit,
    inputs,
  };
}
