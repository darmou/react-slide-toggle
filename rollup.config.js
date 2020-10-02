export default {
  input:  'src/library/useSlideToggle.js',
  output: {
    file: 'dist/bundle.js',
    format: 'cjs'
  },
  external: [
    'react',
    'react-dom'
  ],
}