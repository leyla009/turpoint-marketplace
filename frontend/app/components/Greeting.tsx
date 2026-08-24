'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if ([1, 2].includes(code)) return '🌤️';
  if (code === 3) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '';
}

function timeGreeting(hour: number): string {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Greeting() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [emoji, setEmoji] = useState('');

  useEffect(() => {
    setMounted(true);

    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true`
          );
          const data = await res.json();
          setEmoji(weatherEmoji(data?.current_weather?.weathercode ?? -1));
        } catch {
          // silent fail — greeting still shows without the emoji
        }
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

  if (!mounted) {
    return <p className="text-emerald-100/90 text-sm font-medium mb-1 h-5" />;
  }

  const greeting = timeGreeting(new Date().getHours());
  const firstName = user?.name?.split(' ')[0];

  return (
    <p className="text-emerald-100/90 text-sm font-medium mb-1 tracking-wide">
      {greeting}{firstName ? `, ${firstName}` : ''} {emoji}
    </p>
  );
}