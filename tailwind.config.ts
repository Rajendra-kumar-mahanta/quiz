import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#050F24',
        surface: {
          DEFAULT: '#0B2040',
          dark: '#071632',
          light: '#13346B',
          card: '#0A1A36',
          border: '#1E3A6E',
          accent: '#18386B'
        },
        cyber: {
          cyan: '#00D9FF',
          violet: '#8B5CF6',
          blue: '#2997FF',
          green: '#10B981',
          red: '#EF4444',
          amber: '#F59E0B',
          gold: '#FFD700',
          silver: '#C0C0C0',
          bronze: '#CD7F32'
        }
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(135deg, #00D9FF 0%, #8B5CF6 100%)',
        'cyber-card': 'linear-gradient(180deg, rgba(11, 32, 64, 0.8) 0%, rgba(7, 22, 50, 0.9) 100%)',
        'cyber-glow': 'radial-gradient(circle at 50% 0%, rgba(0, 217, 255, 0.15) 0%, transparent 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 8s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(0, 217, 255, 0.2), 0 0 20px rgba(139, 92, 246, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 217, 255, 0.5), 0 0 40px rgba(139, 92, 246, 0.4)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}
export default config
