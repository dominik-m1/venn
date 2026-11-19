import type { ComponentPropsWithRef } from 'react';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { FieldMessage } from '@/components/atoms/FieldMessage';
import styles from './form-field.module.scss';

type Props = ComponentPropsWithRef<'input'> & {
  id: string;
  label: string;
  error?: string;
  message?: string;
};
export function FormField({
  id,
  label,
  error,
  message,
  'aria-describedby': description,
  ...props
}: Props) {
  const messageId = `${id}-message`;
  const describedBy =
    [description, error || message ? messageId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div className={styles.field}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      />
      <FieldMessage id={messageId} error={Boolean(error)}>
        {error ?? message}
      </FieldMessage>
    </div>
  );
}
