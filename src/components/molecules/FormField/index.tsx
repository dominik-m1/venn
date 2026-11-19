import type { ComponentPropsWithRef } from 'react';
import { FieldMessage } from '@/components/atoms/FieldMessage';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import styles from './form-field.module.scss';

type Props = ComponentPropsWithRef<'input'> & {
  id: string;
  label: string;
  error?: string;
  message?: string;
  /** ID of feedback rendered separately from this field. */
  feedbackId?: string;
};

export function FormField({
  id,
  label,
  error,
  message,
  feedbackId,
  'aria-describedby': description,
  ...props
}: Props) {
  const messageId = feedbackId ?? `${id}-message`;
  const describedBy =
    [description, error || message ? messageId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={styles['form-field']}>
      <Label htmlFor={id}>{label}</Label>
      <div className={styles['form-field__control']}>
        <Input
          {...props}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        {!feedbackId && (
          <div className={styles['form-field__message']}>
            <FieldMessage id={messageId} error={Boolean(error)}>
              {error ?? message}
            </FieldMessage>
          </div>
        )}
      </div>
    </div>
  );
}
