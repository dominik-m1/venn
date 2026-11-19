import type { ReactNode } from 'react';
import styles from './field-message.module.scss';
export function FieldMessage({
  id,
  children,
  error = false,
}: {
  id: string;
  children?: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      id={id}
      aria-live="polite"
      aria-atomic="true"
      className={`${styles.message} ${error ? styles.error : ''}`}
    >
      {children}
    </p>
  );
}
