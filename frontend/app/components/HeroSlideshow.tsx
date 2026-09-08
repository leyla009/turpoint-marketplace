'use client';

import { useEffect, useState } from 'react';

// Background photo slideshow behind the homepage hero - cross-fades to the
// next photo every 5 seconds. All 5 images are pre-rendered (opacity
// toggled, not swapped in/out of the DOM) so nothing needs to reload
// mid-cycle and the fade itself is a plain CSS transition.
const SLIDES = ['/pictures/U1.jpg', '/pictures/U2.avif', '/pictures/U3.jpg', '/pictures/U4.jpg'];
const SLIDE_DURATION_MS = 5000;

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_DURATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {SLIDES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </div>
  );
}
