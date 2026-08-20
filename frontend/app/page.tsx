'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<string>('checking...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Network response was not ok');
      })
      .then((data) => setHealthStatus(data.status || 'ok'))
      .catch(() => setHealthStatus('error connecting to backend'));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Task 4 Homepage</h1>
      <p className="text-xl">
        API status: <span className="font-semibold text-blue-600">{healthStatus}</span>
      </p>
    </main>
  );
}
