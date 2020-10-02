import {terser} from 'rollup-plugin-terser';

export default {
  input: 'src/library/useSlideToggle.js',
  output: [
    {
      file: 'dist/bundle.js',
      format: 'cjs'
    },
    {
      file: 'dist/bundle.min.js',
      format: 'iife',
      name: 'version',
      plugins: [terser()]
    }
  ],
}
