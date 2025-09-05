import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default [
  // Development build (unminified)
  {
    input: 'src/SimJS.ts',
    output: {
      file: 'dist/simjs.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      })
    ]
  },
  // Production build (minified)
  {
    input: 'src/SimJS.ts',
    output: {
      file: 'dist/simjs.min.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      terser()
    ]
  },
  // UMD build for browser usage
  {
    input: 'src/SimJS.ts',
    output: {
      file: 'dist/simjs.umd.js',
      format: 'umd',
      name: 'SimJS',
      sourcemap: true
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      })
    ]
  },
  // UMD minified build
  {
    input: 'src/SimJS.ts',
    output: {
      file: 'dist/simjs.umd.min.js',
      format: 'umd',
      name: 'SimJS',
      sourcemap: true
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false
      }),
      terser()
    ]
  }
]; 