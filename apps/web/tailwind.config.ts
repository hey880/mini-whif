import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background tokens
        background: '#0A0E14',
        'surface-dim': '#111318',
        'surface-default': '#1A1D25',
        'surface-bright': '#1F2937',
        'surface-container-lowest': '#0D1117',
        'surface-container-low': '#111318',
        'surface-container': '#1A1D25',
        'surface-container-high': '#1F2937',
        'surface-container-highest': '#2E353F',

        // Primary (Purple/Violet)
        primary: '#842BD2',
        'on-primary': '#FFFFFF',
        'primary-container': '#6B1FB0',
        'on-primary-container': '#F0E5FF',
        'primary-fixed': '#E6D5FF',
        'primary-fixed-dim': '#D0B8FF',
        'on-primary-fixed': '#2B0052',
        'on-primary-fixed-variant': '#5A1A9C',

        // Secondary (Blue/Cyan)
        secondary: '#3B82F6',
        'on-secondary': '#FFFFFF',
        'secondary-container': '#1E3A8A',
        'on-secondary-container': '#DBEAFE',
        'secondary-fixed': '#BFDBFE',
        'secondary-fixed-dim': '#93C5FD',
        'on-secondary-fixed': '#0C2340',
        'on-secondary-fixed-variant': '#1E40AF',

        // Tertiary (Pink/Magenta)
        tertiary: '#EC4899',
        'on-tertiary': '#FFFFFF',
        'tertiary-container': '#BE185D',
        'on-tertiary-container': '#FCE7F3',
        'tertiary-fixed': '#F9A8D4',
        'tertiary-fixed-dim': '#F472B6',
        'on-tertiary-fixed': '#500724',
        'on-tertiary-fixed-variant': '#9F1239',

        // Error (Red)
        error: '#EF4444',
        'on-error': '#FFFFFF',
        'error-container': '#991B1B',
        'on-error-container': '#FEE2E2',

        // Neutral (Gray)
        'on-surface': '#E4E7EB',
        'on-surface-variant': '#9CA3AF',
        outline: '#6B7280',
        'outline-variant': '#374151',
        'inverse-surface': '#E4E7EB',
        'inverse-on-surface': '#111318',
        'inverse-primary': '#842BD2',

        // State layers
        'scrim': '#000000',
        'shadow': '#000000',
      },
      fontFamily: {
        display: ['var(--font-sora)', 'system-ui', 'sans-serif'],
        headline: ['var(--font-sora)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        label: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-large': ['57px', { lineHeight: '64px', letterSpacing: '-0.25px', fontWeight: '600' }],
        'display-medium': ['45px', { lineHeight: '52px', letterSpacing: '0px', fontWeight: '600' }],
        'display-small': ['36px', { lineHeight: '44px', letterSpacing: '0px', fontWeight: '600' }],
        'headline-large': ['32px', { lineHeight: '40px', letterSpacing: '0px', fontWeight: '600' }],
        'headline-medium': ['28px', { lineHeight: '36px', letterSpacing: '0px', fontWeight: '600' }],
        'headline-small': ['24px', { lineHeight: '32px', letterSpacing: '0px', fontWeight: '600' }],
        'title-large': ['22px', { lineHeight: '28px', letterSpacing: '0px', fontWeight: '500' }],
        'title-medium': ['16px', { lineHeight: '24px', letterSpacing: '0.15px', fontWeight: '500' }],
        'title-small': ['14px', { lineHeight: '20px', letterSpacing: '0.1px', fontWeight: '500' }],
        'body-large': ['16px', { lineHeight: '24px', letterSpacing: '0.5px', fontWeight: '400' }],
        'body-medium': ['14px', { lineHeight: '20px', letterSpacing: '0.25px', fontWeight: '400' }],
        'body-small': ['12px', { lineHeight: '16px', letterSpacing: '0.4px', fontWeight: '400' }],
        'label-large': ['14px', { lineHeight: '20px', letterSpacing: '0.1px', fontWeight: '500' }],
        'label-medium': ['12px', { lineHeight: '16px', letterSpacing: '0.5px', fontWeight: '500' }],
        'label-small': ['11px', { lineHeight: '16px', letterSpacing: '0.5px', fontWeight: '500' }],
      },
      spacing: {
        'container-padding': '20px',
        'card-gap': '16px',
        'gutter': '24px',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(132, 43, 210, 0.5)',
        'glow-secondary': '0 0 20px rgba(59, 130, 246, 0.5)',
        'glow-tertiary': '0 0 20px rgba(236, 72, 153, 0.5)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        'glass': '24px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
