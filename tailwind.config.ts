import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        md: '2rem',
        lg: '2.5rem',
        xl: '3rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1200px',
        '2xl': '1200px',
      },
    },
    extend: {
      screens: {
        // Mobile-first breakpoints otimizados
        xs: '320px',    // Mobile portrait small
        sm: '480px',    // Mobile landscape
        md: '768px',    // Tablet portrait
        lg: '1024px',   // Tablet landscape / Desktop small
        xl: '1280px',   // Desktop medium
        '2xl': '1440px', // Desktop large
        '3xl': '1920px', // Desktop extra large
        // Breakpoints específicos para orientação
        'portrait': { 'raw': '(orientation: portrait)' },
        'landscape': { 'raw': '(orientation: landscape)' },
        // Breakpoints para altura
        'h-sm': { 'raw': '(max-height: 640px)' },
        'h-md': { 'raw': '(max-height: 800px)' },
        // Breakpoints para touch devices
        'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
        'no-touch': { 'raw': '(hover: hover) and (pointer: fine)' },
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      spacing: {
        // Responsive spacing system
        'touch': '48px',     // Mobile button height
        'touch-sm': '44px',  // Tablet button height
        'touch-md': '40px',  // Desktop button height
        'safe': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
      },
      fontSize: {
        // Responsive typography with clamp()
        'xs': ['clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)', { lineHeight: '1.5' }],
        'sm': ['clamp(0.875rem, 0.8rem + 0.375vw, 1rem)', { lineHeight: '1.5' }],
        'base': ['clamp(1rem, 0.9rem + 0.5vw, 1.125rem)', { lineHeight: '1.5' }],
        'lg': ['clamp(1.125rem, 1rem + 0.625vw, 1.25rem)', { lineHeight: '1.4' }],
        'xl': ['clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)', { lineHeight: '1.4' }],
        '2xl': ['clamp(1.5rem, 1.3rem + 1vw, 1.875rem)', { lineHeight: '1.3' }],
        '3xl': ['clamp(1.875rem, 1.6rem + 1.375vw, 2.25rem)', { lineHeight: '1.2' }],
        '4xl': ['clamp(2.25rem, 1.9rem + 1.75vw, 3rem)', { lineHeight: '1.1' }],
        '5xl': ['clamp(3rem, 2.5rem + 2.5vw, 3.75rem)', { lineHeight: '1' }],
      },
      minHeight: {
        'touch': '48px',
        'touch-sm': '44px',
        'touch-md': '40px',
      },
      minWidth: {
        'touch': '48px',
        'touch-sm': '44px',
        'touch-md': '40px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Plugin para utilitários responsivos customizados
    function({ addUtilities, theme }: any) {
      const newUtilities = {
        // Visibilidade responsiva
        '.mobile-only': {
          '@apply block md:hidden': {},
        },
        '.tablet-only': {
          '@apply hidden md:block lg:hidden': {},
        },
        '.desktop-only': {
          '@apply hidden lg:block': {},
        },
        '.mobile-tablet': {
          '@apply block lg:hidden': {},
        },
        '.tablet-desktop': {
          '@apply hidden md:block': {},
        },
        
        // Botões responsivos
        '.btn-responsive': {
          '@apply inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed': {},
          'min-height': theme('spacing.touch'),
          'min-width': theme('spacing.touch'),
          'padding': '12px 20px',
          'font-size': '16px',
          'border-radius': '8px',
          '@media (min-width: 768px)': {
            'min-height': theme('spacing.touch-sm'),
            'min-width': theme('spacing.touch-sm'),
            'padding': '10px 24px',
            'font-size': '15px',
            'border-radius': '6px',
          },
          '@media (min-width: 1024px)': {
            'min-height': theme('spacing.touch-md'),
            'min-width': theme('spacing.touch-md'),
            'padding': '8px 20px',
            'font-size': '14px',
            'border-radius': '4px',
          },
        },
        
        // Container responsivo
        '.container-responsive': {
          '@apply w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16': {},
          'max-width': '1200px',
        },
        
        // Grid responsivo
        '.grid-responsive': {
          '@apply grid gap-4 sm:gap-6 md:gap-8': {},
          'grid-template-columns': '1fr',
          '@media (min-width: 768px)': {
            'grid-template-columns': 'repeat(2, 1fr)',
          },
          '@media (min-width: 1024px)': {
            'grid-template-columns': 'repeat(3, 1fr)',
          },
        },
        
        // Spacing responsivo
        '.space-responsive': {
          '@apply space-y-4 sm:space-y-6 md:space-y-8': {},
        },
        
        // Touch targets
        '.touch-target': {
          'min-height': '48px',
          'min-width': '48px',
          '@media (min-width: 768px)': {
            'min-height': '44px',
            'min-width': '44px',
          },
          '@media (min-width: 1024px)': {
            'min-height': '40px',
            'min-width': '40px',
          },
        },
        
        // Form elements responsivos
        '.form-input-responsive': {
          '@apply w-full px-3 py-3 sm:px-4 sm:py-3 md:px-4 md:py-2 text-base sm:text-sm border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-colors': {},
        },
        
        '.form-label-responsive': {
          '@apply block text-sm sm:text-sm font-medium text-foreground mb-2': {},
        },
        
        // Safe area para dispositivos com notch
        '.safe-top': {
          'padding-top': 'env(safe-area-inset-top)',
        },
        '.safe-bottom': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
        '.safe-left': {
          'padding-left': 'env(safe-area-inset-left)',
        },
        '.safe-right': {
          'padding-right': 'env(safe-area-inset-right)',
        },
        
        // Sistema de grid responsivo avançado
        '.grid-auto-fit': {
          'grid-template-columns': 'repeat(auto-fit, minmax(280px, 1fr))',
        },
        '.grid-auto-fill': {
          'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
        },
        '.grid-masonry': {
          'column-count': '1',
          'column-gap': '1rem',
          '@media (min-width: 640px)': {
            'column-count': '2',
          },
          '@media (min-width: 1024px)': {
            'column-count': '3',
          },
        },
        
        // Flexbox responsivo
        '.flex-responsive': {
          'display': 'flex',
          'flex-direction': 'column',
          'gap': '1rem',
          '@media (min-width: 768px)': {
            'flex-direction': 'row',
            'gap': '1.5rem',
          },
        },
        
        // Aspect ratio responsivo
        '.aspect-responsive': {
          'aspect-ratio': '16/9',
          '@media (max-width: 768px)': {
            'aspect-ratio': '4/3',
          },
        },
        
        // Texto responsivo com clamp
        '.text-fluid-xs': {
          'font-size': 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
          'line-height': '1.5',
        },
        '.text-fluid-sm': {
          'font-size': 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
          'line-height': '1.5',
        },
        '.text-fluid-base': {
          'font-size': 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',
          'line-height': '1.5',
        },
        '.text-fluid-lg': {
          'font-size': 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',
          'line-height': '1.4',
        },
        '.text-fluid-xl': {
          'font-size': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
          'line-height': '1.4',
        },
        '.text-fluid-2xl': {
          'font-size': 'clamp(1.5rem, 1.3rem + 1vw, 1.875rem)',
          'line-height': '1.3',
        },
        '.text-fluid-3xl': {
          'font-size': 'clamp(1.875rem, 1.6rem + 1.375vw, 2.25rem)',
          'line-height': '1.2',
        },
        
        // Spacing responsivo com clamp
        '.space-fluid-xs': {
          'gap': 'clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem)',
        },
        '.space-fluid-sm': {
          'gap': 'clamp(0.75rem, 0.6rem + 0.75vw, 1rem)',
        },
        '.space-fluid-md': {
          'gap': 'clamp(1rem, 0.8rem + 1vw, 1.5rem)',
        },
        '.space-fluid-lg': {
          'gap': 'clamp(1.5rem, 1.2rem + 1.5vw, 2rem)',
        },
        '.space-fluid-xl': {
          'gap': 'clamp(2rem, 1.6rem + 2vw, 3rem)',
        },
        
        // Padding responsivo
        '.p-fluid-xs': {
          'padding': 'clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem)',
        },
        '.p-fluid-sm': {
          'padding': 'clamp(0.75rem, 0.6rem + 0.75vw, 1rem)',
        },
        '.p-fluid-md': {
          'padding': 'clamp(1rem, 0.8rem + 1vw, 1.5rem)',
        },
        '.p-fluid-lg': {
          'padding': 'clamp(1.5rem, 1.2rem + 1.5vw, 2rem)',
        },
        '.p-fluid-xl': {
          'padding': 'clamp(2rem, 1.6rem + 2vw, 3rem)',
        },
        
        // Margin responsivo
        '.m-fluid-xs': {
          'margin': 'clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem)',
        },
        '.m-fluid-sm': {
          'margin': 'clamp(0.75rem, 0.6rem + 0.75vw, 1rem)',
        },
        '.m-fluid-md': {
          'margin': 'clamp(1rem, 0.8rem + 1vw, 1.5rem)',
        },
        '.m-fluid-lg': {
          'margin': 'clamp(1.5rem, 1.2rem + 1.5vw, 2rem)',
        },
        '.m-fluid-xl': {
          'margin': 'clamp(2rem, 1.6rem + 2vw, 3rem)',
        },
        
        // Container responsivo aprimorado
        '.container-fluid': {
          'width': '100%',
          'max-width': '100vw',
          'margin-left': 'auto',
          'margin-right': 'auto',
          'padding-left': 'clamp(1rem, 0.5rem + 2.5vw, 2rem)',
          'padding-right': 'clamp(1rem, 0.5rem + 2.5vw, 2rem)',
          '@media (min-width: 640px)': {
            'padding-left': 'clamp(1.5rem, 1rem + 2.5vw, 2.5rem)',
            'padding-right': 'clamp(1.5rem, 1rem + 2.5vw, 2.5rem)',
          },
          '@media (min-width: 1024px)': {
            'max-width': '1200px',
            'padding-left': '2rem',
            'padding-right': '2rem',
          },
        },
        
        // Card responsivo
        '.card-responsive': {
          'background': 'hsl(var(--card))',
          'border': '1px solid hsl(var(--border))',
          'border-radius': 'clamp(0.5rem, 0.3rem + 1vw, 0.75rem)',
          'padding': 'clamp(1rem, 0.8rem + 1vw, 1.5rem)',
          'box-shadow': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          'transition': 'all 0.2s ease-in-out',
          '@media (min-width: 768px)': {
            'border-radius': 'clamp(0.75rem, 0.5rem + 1vw, 1rem)',
            'padding': 'clamp(1.5rem, 1.2rem + 1.5vw, 2rem)',
          },
        },
        
        // Button responsivo aprimorado
        '.btn-responsive': {
          'display': 'inline-flex',
          'align-items': 'center',
          'justify-content': 'center',
          'border-radius': 'clamp(0.375rem, 0.25rem + 0.625vw, 0.5rem)',
          'font-weight': '500',
          'transition': 'all 0.2s ease-in-out',
          'cursor': 'pointer',
          'border': 'none',
          'outline': 'none',
          'min-height': 'clamp(2.5rem, 2rem + 2.5vw, 2.75rem)',
          'min-width': 'clamp(2.5rem, 2rem + 2.5vw, 2.75rem)',
          'padding': 'clamp(0.5rem, 0.375rem + 0.625vw, 0.75rem) clamp(1rem, 0.75rem + 1.25vw, 1.5rem)',
          'font-size': 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
          '@media (min-width: 768px)': {
            'min-height': 'clamp(2.25rem, 1.75rem + 2.5vw, 2.5rem)',
            'min-width': 'clamp(2.25rem, 1.75rem + 2.5vw, 2.5rem)',
            'padding': 'clamp(0.375rem, 0.25rem + 0.625vw, 0.625rem) clamp(0.875rem, 0.625rem + 1.25vw, 1.25rem)',
            'font-size': 'clamp(0.8125rem, 0.75rem + 0.3125vw, 0.9375rem)',
          },
        },
        
        // Form responsivo
        '.form-responsive': {
          'display': 'flex',
          'flex-direction': 'column',
          'gap': 'clamp(1rem, 0.8rem + 1vw, 1.5rem)',
          '@media (min-width: 768px)': {
            'flex-direction': 'row',
            'gap': 'clamp(1.5rem, 1.2rem + 1.5vw, 2rem)',
          },
        },
        
        // Input responsivo
        '.input-responsive': {
          'width': '100%',
          'padding': 'clamp(0.75rem, 0.625rem + 0.625vw, 1rem)',
          'border': '1px solid hsl(var(--border))',
          'border-radius': 'clamp(0.375rem, 0.25rem + 0.625vw, 0.5rem)',
          'font-size': 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
          'background': 'hsl(var(--background))',
          'color': 'hsl(var(--foreground))',
          'transition': 'all 0.2s ease-in-out',
          'outline': 'none',
          '&:focus': {
            'border-color': 'hsl(var(--ring))',
            'box-shadow': '0 0 0 2px hsl(var(--ring) / 0.2)',
          },
        },
        
        // Table responsivo
        '.table-responsive': {
          'width': '100%',
          'overflow-x': 'auto',
          'border-collapse': 'collapse',
          'border-spacing': '0',
          '& th, & td': {
            'padding': 'clamp(0.5rem, 0.375rem + 0.625vw, 0.75rem)',
            'text-align': 'left',
            'border-bottom': '1px solid hsl(var(--border))',
            'font-size': 'clamp(0.75rem, 0.6875rem + 0.3125vw, 0.875rem)',
          },
          '& th': {
            'font-weight': '600',
            'background': 'hsl(var(--muted))',
          },
        },
        
        // Modal responsivo
        '.modal-responsive': {
          'position': 'fixed',
          'top': '50%',
          'left': '50%',
          'transform': 'translate(-50%, -50%)',
          'width': 'clamp(320px, 90vw, 500px)',
          'max-height': 'clamp(400px, 80vh, 600px)',
          'background': 'hsl(var(--background))',
          'border-radius': 'clamp(0.5rem, 0.3rem + 1vw, 0.75rem)',
          'box-shadow': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          'z-index': '50',
          '@media (min-width: 768px)': {
            'width': 'clamp(500px, 50vw, 600px)',
            'max-height': 'clamp(500px, 70vh, 700px)',
          },
        },
        
        // Navigation responsivo
        '.nav-responsive': {
          'display': 'flex',
          'flex-direction': 'column',
          'gap': 'clamp(0.5rem, 0.375rem + 0.625vw, 0.75rem)',
          '@media (min-width: 768px)': {
            'flex-direction': 'row',
            'gap': 'clamp(0.75rem, 0.5rem + 1.25vw, 1rem)',
          },
        },
        
        // Sidebar responsivo
        '.sidebar-responsive': {
          'width': '100%',
          'height': '100vh',
          'background': 'hsl(var(--background))',
          'border-right': '1px solid hsl(var(--border))',
          '@media (min-width: 1024px)': {
            'width': 'clamp(250px, 15vw, 300px)',
            'position': 'fixed',
            'left': '0',
            'top': '0',
            'z-index': '40',
          },
        },
        
        // Header responsivo
        '.header-responsive': {
          'position': 'sticky',
          'top': '0',
          'z-index': '50',
          'background': 'hsl(var(--background) / 0.8)',
          'backdrop-filter': 'blur(8px)',
          'border-bottom': '1px solid hsl(var(--border))',
          'padding': 'clamp(0.75rem, 0.5rem + 1.25vw, 1rem)',
          '@media (min-width: 768px)': {
            'padding': 'clamp(1rem, 0.75rem + 1.25vw, 1.25rem)',
          },
        },
      }
      
      addUtilities(newUtilities)
    },
  ],
}

export default config