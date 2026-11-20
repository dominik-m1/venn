export const CorporationStatus = {
  Idle: 'idle',
  Checking: 'checking',
  Valid: 'valid',
  Invalid: 'invalid',
  Unavailable: 'unavailable',
} as const;

export type CorporationCheck =
  | {
      status:
        | typeof CorporationStatus.Idle
        | typeof CorporationStatus.Checking
        | typeof CorporationStatus.Valid;
      number: string;
    }
  | {
      status:
        typeof CorporationStatus.Invalid | typeof CorporationStatus.Unavailable;
      number: string;
      message: string;
    };

export const SubmissionStatus = {
  Idle: 'idle',
  Validating: 'validating',
  Submitting: 'submitting',
  Error: 'error',
  Success: 'success',
} as const;

// Confirmed success is derived from the draft, rather than stored twice.
export type SubmissionState =
  | {
      status:
        | typeof SubmissionStatus.Idle
        | typeof SubmissionStatus.Validating
        | typeof SubmissionStatus.Submitting;
    }
  | { status: typeof SubmissionStatus.Error; message: string };
