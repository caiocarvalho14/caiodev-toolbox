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

        // Sem cache de respostas do Supabase aqui: os dados offline ficam no IndexedDB do app
        // (registros, sessão, rotas e cargos). Um cache do service worker devolveria respostas
        // antigas quando a rede falha, o app acharia que está online e gravaria dados velhos.
        // O app espera o servidor por no máximo 2s (src/lib/conexao.ts) e segue com os dados locais.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})