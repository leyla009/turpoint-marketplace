'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Home() {
  const [status, setStatus] = useState('checking...');

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unreachable'));
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">TurPoint</h1>
      <p className="text-dusk/70 max-w-md">
        Azərbaycanda tur operatorları və istifadəçiləri birləşdirən marketplace.
      </p>
      <div className="mt-6 rounded-full border border-dusk/20 px-4 py-2 text-sm">
        API status:{' '}
        <span className={status === 'ok' ? 'text-clay font-medium' : 'text-red-600 font-medium'}>
          {status}
        </span>
      </div>
    </main>
  );
}
