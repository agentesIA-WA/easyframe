/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.jsx",
  ],
  theme: {
    extend: {
        colors: {
            primary: {
                50: '#f5f7ff',
                100: '#ebf0fe',
                200: '#ced9fd',
                300: '#b1c2fb',
                400: '#7694f8',
                500: '#3b66f5',
                600: '#355cdc',
                700: '#2c4dafb',
                800: '#233d93',
                900: '#1d3278',
            },
        }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
