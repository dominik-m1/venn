import type { ReactNode } from 'react';
import styles from './field-message.module.scss';

type Props = {
  id: string;
  children?: ReactNode;
  error?: boolean;
};

export function FieldMessage({ id, children, error = false }: Props) {
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
