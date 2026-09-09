'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page was superseded by /dashboard, whose panel handles both
// creating and editing an operator profile in one place (no separate
// profile route anymore). Kept as a redirect rather than deleted outright,
// in case anything still links here.
export default function BecomeOperatorRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
