module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: 'var(--navy)',
        warning: 'var(--warning)',
        'primary-hover': 'var(--primary-hover)',
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
