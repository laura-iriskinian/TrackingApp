import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// L'app est publiée par GitHub Pages dans le dossier nextrep/ du dépôt,
// à côté de l'ancienne app qui reste à la racine.
export default defineConfig({
  base: './',
  build: { outDir: '../nextrep', emptyOutDir: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // enregistré dans src/lib/update.ts
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'NextRep',
        short_name: 'NextRep',
        description: 'Suivi de séances, de progression et de mensurations.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#F4F5F7',
        theme_color: '#F4F5F7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], cleanupOutdatedCaches: true, clientsClaim: true, skipWaiting: true },
    }),
  ],
})
