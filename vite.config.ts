import inject from '@rollup/plugin-inject';
import { wasm } from '@rollup/plugin-wasm';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  base: './',
  define: {
    global: 'globalThis',
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
  },
  plugins: [
    topLevelAwait({
      promiseExportName: '__tla',
      promiseImportName: (index) => `__tla_${index}`,
    }),
    wasm(),
    react(),
  ],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: false,
          buffer: true,
        }),
      ],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      plugins: [inject({ Buffer: ['buffer', 'Buffer'] })],
    },
  },
});
