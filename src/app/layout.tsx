import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.scss';
export const metadata: Metadata = { title: 'Onboarding Form', description: 'Submit your personal and business details.' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
