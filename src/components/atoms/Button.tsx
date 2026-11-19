import type { ComponentPropsWithoutRef } from 'react';
import styles from './Button.module.scss';
export function Button({
  children,
  ...props
}: ComponentPropsWithoutRef<'button'>) {
  return (
    <button className={styles.button} {...props}>
      {children}
    </button>
  );
}
