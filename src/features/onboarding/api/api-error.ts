export const ApiErrorKind = {
  Network: 'network',
  Timeout: 'timeout',
  Aborted: 'aborted',
  Http: 'http',
  Protocol: 'protocol',
  Validation: 'validation',
} as const;

type ApiErrorKind = (typeof ApiErrorKind)[keyof typeof ApiErrorKind];

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
