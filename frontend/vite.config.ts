import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        // Giữ nguyên tiền tố /api/v1 vì backend phục vụ ngay dưới đường dẫn đó (không rewrite)
        '/api/v1': {
          target: env.VITE_API_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})