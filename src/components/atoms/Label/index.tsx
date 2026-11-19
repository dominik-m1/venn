import type { ComponentPropsWithoutRef } from 'react';
import styles from './label.module.scss';

export function Label(props: ComponentPropsWithoutRef<'label'>) {
  return <label className={styles.label} {...props} />;
}
