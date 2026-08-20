import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'App',
  description: 'Task 4 Application Base',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
