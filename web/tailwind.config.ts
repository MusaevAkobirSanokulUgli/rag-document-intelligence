import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#020617',
          900: '#0F172A',
          800: '#1E293B',
          700: '#1a2d4a',
          600: '#1e3556',
          500: '#243b55',
        },
        cyan: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06B6D4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        sky: {
          400: '#38bdf8',
          500: '#0EA5E9',
          600: '#0284c7',
        },
        surface: {
          950: '#020617',
          900: '#0F172A',
          800: '#1E293B',
          700: '#1a2d4a',
          600: '#243b55',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      backgroundImage: {
        'cyan-glow': 'radial-gradient(ellipse at center, rgba(6,182,212,0.15) 0%, transparent 70%)',
        'navy-gradient': 'linear-gradient(135deg, #0F172A 0%, #020617 100%)',
        'cyan-gradient': 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'chunk-appear': 'chunkAppear 0.3s ease-out forwards',
        'progress-fill': 'progressFill 0.5s ease-out forwards',
        'float': 'float 4s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        chunkAppear: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        progressFill: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'cyan-sm': '0 0 10px rgba(6,182,212,0.2)',
        'cyan-md': '0 0 20px rgba(6,182,212,0.3), 0 0 40px rgba(6,182,212,0.1)',
        'cyan-lg': '0 0 30px rgba(6,182,212,0.4), 0 0 60px rgba(6,182,212,0.15)',
        'sky-md': '0 0 20px rgba(14,165,233,0.3)',
        'glass': '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
}

export default config
