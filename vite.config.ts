import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ command }) => ({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    // Only run the router plugin during build to bypass the dev HMR bug
    command === 'build' && tanstackRouter({
      routeFileIgnorePrefix: '-',
      autoCodeSplitting: false,
    }),
    tanstackStart(),
    react(),
  ].filter(Boolean),
  define: {
    __VELORA_SUPABASE_URL__: JSON.stringify(process.env.VELORA_SUPABASE_URL ?? ""),
    __VELORA_SUPABASE_ANON_KEY__: JSON.stringify(process.env.VELORA_SUPABASE_ANON_KEY ?? ""),
  },
}))