'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

// Legacy URL, kept as a redirect in case anything still links here. The
// account type is chosen at signup, so: operator accounts go to /dashboard
// (whose panel creates/edits the operator profile), everyone else goes to
// the operator signup that the Nav and Footer "Become an operator" links use.
export default function BecomeOperatorRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    router.replace(user?.account_type === 'operator' ? '/dashboard' : '/login?mode=signup&account_type=operator');
  }, [loading, user, router]);
  return null;
}
