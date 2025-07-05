import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	screens: {
  		'4xs': '280px',
  		'3.5xs': '320px',
  		'3xs': '375px',
  		'2xs': '414px',
  		xs: '520px',
  		sm: '640px',
  		sm2: '724px',
  		md: '768px',
  		md2: '896px',
  		md3: '984px',
  		lg: '1024px',
  		lg2: '1158px',
  		xl: '1280px',
  		'1.5xl': '1348px',
  		'2xl': '1536px',
  		'3xl': '1820px'
  	},
  	extend: {
  		colors: {
  			primary: {
  				'50': '#f0f9ff',
  				'100': '#e0f2fe',
  				'200': '#bae6fd',
  				'300': '#7dd3fc',
  				'400': '#38bdf8',
  				'500': '#0ea5e9',
  				'600': '#0284c7',
  				'700': '#0369a1',
  				'800': '#075985',
  				'900': '#0c4a6e',
  				'950': '#082f49',
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				'50': '#fdf4ff',
  				'100': '#fae8ff',
  				'200': '#f5d0fe',
  				'300': '#f0abfc',
  				'400': '#e879f9',
  				'500': '#d946ef',
  				'600': '#c026d3',
  				'700': '#a21caf',
  				'800': '#86198f',
  				'900': '#701a75',
  				'950': '#4a044e',
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			accent: {
  				'50': '#f0fdfa',
  				'100': '#ccfbf1',
  				'200': '#99f6e4',
  				'300': '#5eead4',
  				'400': '#2dd4bf',
  				'500': '#14b8a6',
  				'600': '#0d9488',
  				'700': '#0f766e',
  				'800': '#115e59',
  				'900': '#134e4a',
  				'950': '#042f2e',
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			dark: {
  				'50': '#f8fafc',
  				'100': '#f1f5f9',
  				'200': '#e2e8f0',
  				'300': '#cbd5e1',
  				'400': '#94a3b8',
  				'500': '#64748b',
  				'600': '#475569',
  				'700': '#334155',
  				'800': '#1e293b',
  				'900': '#0f172a',
  				'950': '#020617'
  			},
  			success: {
  				'50': '#f0fdf4',
  				'100': '#dcfce7',
  				'200': '#bbf7d0',
  				'300': '#86efac',
  				'400': '#4ade80',
  				'500': '#22c55e',
  				'600': '#16a34a',
  				'700': '#15803d',
  				'800': '#166534',
  				'900': '#14532d',
  				'950': '#052e16'
  			},
  			warning: {
  				'50': '#fffbeb',
  				'100': '#fef3c7',
  				'200': '#fde68a',
  				'300': '#fcd34d',
  				'400': '#fbbf24',
  				'500': '#f59e0b',
  				'600': '#d97706',
  				'700': '#b45309',
  				'800': '#92400e',
  				'900': '#78350f',
  				'950': '#451a03'
  			},
  			error: {
  				'50': '#fef2f2',
  				'100': '#fee2e2',
  				'200': '#fecaca',
  				'300': '#fca5a5',
  				'400': '#f87171',
  				'500': '#ef4444',
  				'600': '#dc2626',
  				'700': '#b91c1c',
  				'800': '#991b1b',
  				'900': '#7f1d1d',
  				'950': '#450a0a'
  			},
  			brand: {
  				blue: '#0ea5e9',
  				purple: '#8b5cf6',
  				cyan: '#06b6d4',
  				emerald: '#10b981',
  				amber: '#f59e0b',
  				rose: '#f43f5e'
  			},
  			glass: {
  				light: 'rgba(255, 255, 255, 0.1)',
  				dark: 'rgba(0, 0, 0, 0.1)',
  				blur: 'rgba(255, 255, 255, 0.05)'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		backgroundImage: {
  			'custom-gradient': 'linear-gradient(180deg, #147EDF, #0047CA)',
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
  			'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  			'gradient-secondary': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  			'gradient-accent': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  			'gradient-success': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  			'gradient-warning': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  			'gradient-error': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  			'gradient-dark': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  			'gradient-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
  			'gradient-neon': 'linear-gradient(135deg, #00d4ff 0%, #0099cc 50%, #006699 100%)',
  			'gradient-cosmic': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
  		},
  		animation: {
  			'fade-in': 'fadeIn 0.5s ease-in-out',
  			'fade-in-up': 'fadeInUp 0.5s ease-out',
  			'fade-in-down': 'fadeInDown 0.5s ease-out',
  			'slide-in-left': 'slideInLeft 0.5s ease-out',
  			'slide-in-right': 'slideInRight 0.5s ease-out',
  			'scale-in': 'scaleIn 0.3s ease-out',
  			'bounce-in': 'bounceIn 0.6s ease-out',
  			'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			float: 'float 3s ease-in-out infinite',
  			glow: 'glow 2s ease-in-out infinite alternate',
  			shimmer: 'shimmer 2s linear infinite',
  			'gradient-x': 'gradient-x 15s ease infinite',
  			'gradient-y': 'gradient-y 15s ease infinite',
  			'gradient-xy': 'gradient-xy 15s ease infinite'
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			fadeInUp: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			fadeInDown: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(-20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			slideInLeft: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateX(-20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			slideInRight: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateX(20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			scaleIn: {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.9)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			bounceIn: {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.3)'
  				},
  				'50%': {
  					opacity: '1',
  					transform: 'scale(1.05)'
  				},
  				'70%': {
  					transform: 'scale(0.9)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0px)'
  				},
  				'50%': {
  					transform: 'translateY(-10px)'
  				}
  			},
  			glow: {
  				'0%': {
  					boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)'
  				},
  				'100%': {
  					boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)'
  				}
  			},
  			shimmer: {
  				'0%': {
  					transform: 'translateX(-100%)'
  				},
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			},
  			'gradient-x': {
  				'0%, 100%': {
  					'background-size': '200% 200%',
  					'background-position': 'left center'
  				},
  				'50%': {
  					'background-size': '200% 200%',
  					'background-position': 'right center'
  				}
  			},
  			'gradient-y': {
  				'0%, 100%': {
  					'background-size': '200% 200%',
  					'background-position': 'center top'
  				},
  				'50%': {
  					'background-size': '200% 200%',
  					'background-position': 'center bottom'
  				}
  			},
  			'gradient-xy': {
  				'0%, 100%': {
  					'background-size': '400% 400%',
  					'background-position': 'left center'
  				},
  				'50%': {
  					'background-size': '200% 200%',
  					'background-position': 'right center'
  				}
  			}
  		},
  		backdropBlur: {
  			xs: '2px'
  		},
  		boxShadow: {
  			glow: '0 0 20px rgba(59, 130, 246, 0.5)',
  			'glow-lg': '0 0 40px rgba(59, 130, 246, 0.3)',
  			neon: '0 0 5px rgba(0, 212, 255, 0.5), 0 0 10px rgba(0, 212, 255, 0.3)',
  			'neon-lg': '0 0 10px rgba(0, 212, 255, 0.5), 0 0 20px rgba(0, 212, 255, 0.3)',
  			glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  			'glass-lg': '0 16px 64px 0 rgba(31, 38, 135, 0.37)'
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'JetBrains Mono',
  				'monospace'
  			],
  			display: [
  				'Poppins',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
