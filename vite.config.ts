import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// Served from https://gbc-youth.github.io/songbook/
export default defineConfig({
  base: '/songbook/',
  resolve: {
    // A trimmed ChordSheetJS built from source by scripts/build-chordsheetjs.sh.
    // The npm package stays installed for its TypeScript types.
    alias: { chordsheetjs: fileURLToPath(new URL('./vendor/chordsheetjs/index.js', import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Songbook',
        short_name: 'Songbook',
        description: 'Offline lyrics and chords for your worship team.',
        display: 'standalone',
        start_url: '/songbook/',
        scope: '/songbook/',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Church bundles are fetched and stored by the app itself, never by the SW cache.
        globIgnores: ['demo/**'],
        navigateFallbackDenylist: [/^\/songbook\/demo\//],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['fake-indexeddb/auto'],
  },
});
