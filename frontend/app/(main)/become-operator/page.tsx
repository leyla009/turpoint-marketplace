'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page was superseded by /dashboard/profile, which handles both
// creating and editing an operator profile in one place. Kept as a
// redirect rather than deleted outright, in case anything still links here.
export default function BecomeOperatorRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/profile');
  }, [router]);
  return null;
}
