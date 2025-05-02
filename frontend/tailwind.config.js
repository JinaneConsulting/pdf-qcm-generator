/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			// Ajout des couleurs du logo QuizzAi
  			quizzai: {
  				orange: '#f7931e',
  				red: '#ed1c24',
  				purple: '#92278f',
  				blue: '#29abe2',
  				gradient: 'linear-gradient(135deg, #f7931e, #ed1c24, #92278f, #29abe2)'
  			},
        // Ajout de la couleur bleu-25 (bleu extrêmement clair)
        'blue-25': '#f0f7ff',
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		// Ajout de classes pour le dégradé du logo
  		backgroundImage: {
  			'quizzai-gradient': 'linear-gradient(135deg, #f7931e, #ed1c24, #92278f, #29abe2)'
  		}
  	}
  },
  plugins: [import("tailwindcss-animate")],
}