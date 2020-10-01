import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs';

export default {
  input: 'src/library/SlideToggle.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es',
  },
  "options": {
    sourceMap: 'inline',
    output: {
      format: 'es'
    }
  },
  plugins: [
    resolve(),
    commonJS({
      include: 'node_modules/**'
    })
  ]
}
