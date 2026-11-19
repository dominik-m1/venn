import type { ComponentPropsWithRef, ReactNode } from 'react';
import styles from './icon-button.module.scss';

type Props = ComponentPropsWithRef<'button'> & {
  'aria-label': string;
  children: ReactNode;
};

export function IconButton({
  children,
  className = '',
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      {...props}
      type={type}
      className={`${styles['icon-button']} ${className}`}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
