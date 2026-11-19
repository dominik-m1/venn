import type { ComponentPropsWithRef } from 'react';
import styles from './Input.module.scss';

export function Input({ className = '', ...props }: ComponentPropsWithRef<'input'>) {
  return <input className={`${styles.input} ${className}`} {...props} />;
}
