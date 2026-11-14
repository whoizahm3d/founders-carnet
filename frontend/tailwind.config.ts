import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF9F7',
        fill: '#F1F0EE',
        card: '#FFFFFF',
        trough: '#E8E6E1',
        ink: {
          DEFAULT: '#0A0A0A',
          raised: '#171717',
          border: '#262626',
        },
        accent: {
          DEFAULT: '#B15F2C',
          deep: '#964E22',
          wash: '#F8EDE5',
          soft: '#D48B5D',
        },
        text: {
          primary: '#0A0A0A',
          secondary: '#52525B',
          muted: '#71717A',
        },
        hairline: {
          DEFAULT: '#E2DFD9',
          subtle: '#ECEAE5',
          row: '#E6E5E2',
        },
        disabled: {
          DEFAULT: '#E3E2DF',
        },
        input: {
          border: '#8D8D8D',
        },
        status: {
          success: '#047857',
          'success-wash': '#ECFDF5',
          warning: '#B45309',
          'warning-wash': '#FFFBEB',
          error: '#B91C1C',
          'error-wash': '#FEF2F2',
        },
      },
      fontFamily: {
        sans: ['var(--font-hanken)', 'sans-serif'],
        serif: ['var(--font-instrument)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
        '5xl': ['48px', { lineHeight: '52px' }],
        '6xl': ['60px', { lineHeight: '64px' }],
        '7xl': ['72px', { lineHeight: '76px' }],
        '8xl': ['96px', { lineHeight: '100px' }],
      },
      borderRadius: {
        control: '12px',
        card: '24px',
        pill: '9999px',
      },
      spacing: {
        '0': '0px',
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      boxShadow: {
        glass: '0 8px 24px rgba(10,10,10,0.06)',
        'modal-elevation': '0 16px 36px -8px rgba(10,10,10,0.12)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.04)',
      },
      backdropBlur: {
        glass: '12px',
      },
    },
  },
  plugins: [],
};

export default config;
