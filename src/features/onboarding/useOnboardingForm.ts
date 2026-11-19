import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ApiError,
  checkCorporationNumber,
  submitProfileDetails,
} from './onboarding.api';
import {
  fieldNames,
  type CorporationCheck,
  type FieldName,
  type FormValues,
  type FieldErrors,
  type SubmitStatus,
} from './onboarding.types';
import {
  validateField,
  validateForm,
  toProfileDetailsRequest,
} from './validation';

const emptyValues: FormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  corporationNumber: '',
};
const idleCheck: CorporationCheck = { status: 'idle', number: '', version: 0 };
type PendingCheck = {
  number: string;
  version: number;
  controller: AbortController;
  promise: Promise<CorporationCheck | null>;
};

export function useOnboardingForm() {
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [corporationCheck, setCorporationCheck] =
    useState<CorporationCheck>(idleCheck);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [formError, setFormError] = useState('');
  const valuesRef = useRef(values);
  const version = useRef(0);
  const pending = useRef<PendingCheck | null>(null);
  const postController = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const succeeded = useRef(false);
  const focusCorporation = useRef(false);
  const mounted = useRef(false);
  const inputs = useRef<Partial<Record<FieldName, HTMLInputElement | null>>>(
    {},
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      version.current += 1;
      pending.current?.controller.abort();
      pending.current = null;
      postController.current?.abort();
    };
  }, []);

  function change(field: FieldName, value: string) {
    if (locked.current) return;
    valuesRef.current = { ...valuesRef.current, [field]: value };
    setValues(valuesRef.current);
    succeeded.current = false;
    setSubmitStatus('idle');
    setFormError('');
    if (field === 'corporationNumber') {
      version.current += 1;
      pending.current?.controller.abort();
      pending.current = null;
      setCorporationCheck({
        status: 'idle',
        number: value,
        version: version.current,
      });
    }
  }

  function verifyCorporation(): Promise<CorporationCheck | null> {
    const number = valuesRef.current.corporationNumber;
    const currentVersion = version.current;
    const active = pending.current;
    if (active?.number === number && active.version === currentVersion)
      return active.promise;
    const controller = new AbortController();
    const checking: CorporationCheck = {
      status: 'checking',
      number,
      version: currentVersion,
    };
    setCorporationCheck(checking);
    const isCurrent = () =>
      mounted.current &&
      version.current === currentVersion &&
      !controller.signal.aborted;
    const promise = (async (): Promise<CorporationCheck | null> => {
      try {
        const result = await checkCorporationNumber(number, controller.signal);
        if (!isCurrent()) return null;
        const state: CorporationCheck = {
          ...checking,
          status: result.valid ? 'valid' : 'invalid',
          message: result.valid ? undefined : result.message,
        };
        setCorporationCheck(state);
        return state;
      } catch (error) {
        if (
          !isCurrent() ||
          (error instanceof ApiError && error.kind === 'aborted')
        )
          return null;
        const state: CorporationCheck = {
          ...checking,
          status: 'unavailable',
          message:
            'We could not verify this corporation number. Please try again.',
        };
        setCorporationCheck(state);
        return state;
      } finally {
        if (pending.current?.controller === controller) pending.current = null;
      }
    })();
    pending.current = { number, version: currentVersion, controller, promise };
    return promise;
  }

  function blur(field: FieldName) {
    if (locked.current || succeeded.current) return;
    const error = validateField(field, valuesRef.current[field]);
    setFieldErrors((previous) => ({ ...previous, [field]: error }));
    if (field === 'corporationNumber' && !error) void verifyCorporation();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || succeeded.current) return;
    locked.current = true;
    const snapshot = { ...valuesRef.current };
    const errors = validateForm(snapshot);
    setFieldErrors(errors);
    setFormError('');
    const firstInvalid = fieldNames.find((field) => errors[field]);
    if (firstInvalid) {
      locked.current = false;
      setSubmitStatus('idle');
      inputs.current[firstInvalid]?.focus();
      return;
    }
    setSubmitStatus('validating');
    try {
      const result = await verifyCorporation();
      if (!mounted.current) return;
      if (
        !result ||
        result.status !== 'valid' ||
        result.version !== version.current
      ) {
        focusCorporation.current = true;
        setSubmitStatus('idle');
        return;
      }
      setSubmitStatus('submitting');
      const controller = new AbortController();
      postController.current = controller;
      await submitProfileDetails(
        toProfileDetailsRequest(snapshot),
        controller.signal,
      );
      if (!mounted.current) return;
      succeeded.current = true;
      setSubmitStatus('success');
    } catch (error) {
      if (!mounted.current) return;
      const message =
        error instanceof ApiError && error.kind === 'validation'
          ? error.message
          : 'We could not confirm your submission. It may have been received. Check before submitting again.';
      setFormError(message);
      setSubmitStatus('error');
    } finally {
      locked.current = false;
      postController.current = null;
    }
  }

  const busy = submitStatus === 'validating' || submitStatus === 'submitting';
  useEffect(() => {
    if (!busy && focusCorporation.current) {
      focusCorporation.current = false;
      inputs.current.corporationNumber?.focus();
    }
  }, [busy]);

  return {
    values,
    fieldErrors,
    corporationCheck,
    submitStatus,
    formError,
    busy,
    change,
    blur,
    submit,
    inputs,
  };
}
