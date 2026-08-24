import { ReactNode } from 'react';

export default function PageContainer({
  children,
  maxWidth = 'max-w-2xl',
  className = '',
}: {
  children: ReactNode;
  maxWidth?: string;
  className?: string;
}) {
  return (
    <div className={`min-h-full px-4 sm:px-6 py-6 ${maxWidth} mx-auto pb-24 md:pb-6 ${className}`}>
      {children}
    </div>
  );
}
