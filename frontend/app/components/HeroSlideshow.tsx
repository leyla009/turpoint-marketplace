'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const SLIDE_DURATION_MS = 10000;

// Filenames under frontend/public/pictures/.
const SLIDES = [
  { src: '/pictures/1.webp', alt: 'Baku Old City at sunset, with the Flame Towers in the background' },
  { src: '/pictures/2.webp', alt: 'Baku skyline and Flame Towers at night' },
  { src: '/pictures/3.jpeg', alt: 'Susa (Shusha) fortress walls' },
  { src: '/pictures/4.jpeg', alt: 'Green mountain valley in the Caucasus' },
  { src: '/pictures/5.jpg', alt: 'Snow-covered forest and gondola lift' },
];

// Full-bleed background slideshow for the homepage hero - crosses fades
// between SLIDES on a fixed interval, loops forever. Sits behind the nav
// (via the -mt-16 overlap in page.tsx) and behind the greeting/search bar
// content, with a dark gradient scrim on top so white text stays legible
// regardless of which photo is showing.
export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {SLIDES.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          fill
          priority={i === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-1000 ease-in-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/10" />
    </div>
  );
}
