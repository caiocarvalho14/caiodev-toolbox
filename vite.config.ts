// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt', // não atualiza sozinho — avisa o usuário e deixa ele decidir
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],

      // ativa o service worker também no `npm run dev`, útil pra testar offline sem build
      devOptions: {
        enabled: true,
        type: 'module',
      },

      manifest: {
        name: 'caioodev-toolbox',
        short_name: 'toolbox',
        description: 'desenvolvido por caio carvalho',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      workbox: {
        // precacheia os assets do build (JS, CSS, HTML) — é isso que faz o
        // app abrir offline mesmo sem nenhuma requisição de rede
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        runtimeCaching: [
          {
            // GETs no Supabase (rotas, dados) — tenta rede primeiro, cai pro
            // cache se não responder a tempo. NÃO cobre POST/PATCH (auth,
            // inserts), que o workbox não intercepta por padrão.
            urlPattern: ({ url, request }) =>
              url.hostname.endsWith('.supabase.co') && request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 1 dia
            },
          },
        ],
      },
    }),
  ],
})