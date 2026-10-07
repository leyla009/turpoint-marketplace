// Colours are CSS variables (hex values in globals.css). A plain 'var(--x)'
// gives Tailwind no way to apply opacity, so modifiers like bg-primary/10
// were silently dropped. This mixes the variable with transparent instead.
const v = (name) => ({ opacityValue }) =>
  opacityValue === undefined || opacityValue === '1'
    ? `var(--${name})`
    : `color-mix(in srgb, var(--${name}) calc(${opacityValue} * 100%), transparent)`;

module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: v('navy'),
        warning: v('warning'),
        'primary-hover': v('primary-hover'),
        background: v('background'),
        foreground: v('foreground'),
        card: {
          DEFAULT: v('card'),
          foreground: v('card-foreground'),
        },
        primary: {
          DEFAULT: v('primary'),
          foreground: v('primary-foreground'),
        },
        muted: {
          DEFAULT: v('muted'),
          foreground: v('muted-foreground'),
        },
        border: v('border'),
        accent: {
          DEFAULT: v('accent'),
          foreground: v('accent-foreground'),
        },
        rating: v('rating'),
        success: {
          DEFAULT: v('success'),
          foreground: v('success-foreground'),
        },
        danger: {
          DEFAULT: v('danger'),
          foreground: v('danger-foreground'),
        },
        'surface-sand': v('surface-sand'),
        'surface-moss': v('surface-moss'),
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,42,61,0.04), 0 4px 16px -4px rgba(15,42,61,0.08)',
        lift: '0 2px 4px rgba(15,42,61,0.05), 0 12px 28px -8px rgba(15,42,61,0.18)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 36s linear infinite',
      },
    },
  },
  plugins: [],
};
