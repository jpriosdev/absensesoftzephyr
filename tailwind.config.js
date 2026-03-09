/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

module.exports = {
    content: [
      './pages/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
      './styles/**/*.css',
    ],
    theme: {
      extend: {
        // Abstracta official brand color palette
        colors: {
          gray: colors.gray,
          slate: colors.slate,
          'executive': {
            50: '#f8f6fd',
            100: '#d3c0ff',
            200: '#ab98e5',
            300: '#9980db',
            400: '#8768d1',
            500: '#754bde', // Abstracta primary purple
            600: '#5f3bb8',
            700: '#492c92',
            800: '#3c1464', // Abstracta dark purple
            900: '#2a0e46',
          },
          'abstracta-cyan': {
            50: '#e6f9ff',
            100: '#b3ebff',
            200: '#80ddff',
            300: '#6ed6ff',
            400: '#5acdff', // Abstracta cyan
            500: '#47c4ff',
            600: '#35b0e6',
            700: '#2899cc',
            800: '#1d7aa3',
            900: '#125b7a',
          },
          'orange': {
            50: '#fff5e6',
            100: '#ffe0b3',
            200: '#ffcb80',
            300: '#ffb541', // Abstracta orange light
            400: '#ff8700', // Abstracta orange
            500: '#e67a00',
            600: '#cc6d00',
            700: '#b35f00',
            800: '#995200',
            900: '#804500',
          },
          'success': {
            50: '#e8fcf3',
            100: '#b8f5d9',
            200: '#88eebf',
            300: '#61e8ab',
            400: '#3ae29b', // Abstracta success
            500: '#2ec985',
            600: '#26a86e',
            700: '#1e8758',
            800: '#176641',
            900: '#0f452b',
          },
          'warning': {
            50: '#fef8e8',
            100: '#fdeab8',
            200: '#fbdc88',
            300: '#fad067',
            400: '#f9bc46', // Abstracta warn
            500: '#e0a73f',
            600: '#c79238',
            700: '#ae7d31',
            800: '#95682a',
            900: '#7c5323',
          },
          'danger': {
            50: '#feeef2',
            100: '#fcc8d7',
            200: '#f9a2bb',
            300: '#f57198',
            400: '#f1406b', // Abstracta error
            500: '#d93a5f',
            600: '#c13353',
            700: '#a92d47',
            800: '#91263b',
            900: '#79202f',
          }
        },
        fontFamily: {
          'executive': ['Sora', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
          'display': ['Sora', 'sans-serif'],
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-in-out',
          'slide-up': 'slideUp 0.3s ease-out',
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          }
        }
      },
    },
    plugins: [],
  }

  