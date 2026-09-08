module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        clay: '#C95E18',
        dusk: '#1B3D2F',
        sand: '#EFE7D8',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        border: 'var(--border)',
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        rating: 'var(--rating)',
        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--success-foreground)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          foreground: 'var(--danger-foreground)',
        },
        'surface-sand': 'var(--surface-sand)',
        'surface-moss': 'var(--surface-moss)',
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
