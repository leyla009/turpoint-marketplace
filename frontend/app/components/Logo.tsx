import Link from 'next/link';
import { MapPin } from 'lucide-react';

// The TurPoint wordmark: a teal map-pin glyph beside the name. `tone`
// switches the text color for dark surfaces (footer, operator sidebar,
// photo panels) - the pin itself stays brand teal everywhere.
export default function Logo({
  tone = 'dark',
  size = 'md',
  href = '/',
}: {
  tone?: 'dark' | 'light';
  size?: 'sm' | 'md';
  href?: string;
}) {
  const icon = size === 'sm' ? 18 : 22;
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 shrink-0 rounded-md">
      <MapPin size={icon} strokeWidth={2.4} className="text-primary fill-primary/15" />
      <span
        className={`font-extrabold tracking-tight leading-none ${size === 'sm' ? 'text-base' : 'text-xl'} ${
          tone === 'light' ? 'text-white' : 'text-navy'
        }`}
      >
        TurPoint
      </span>
    </Link>
  );
}
