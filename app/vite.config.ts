import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

 


export default defineConfig({
  base: './',
  server: {
    port: 5173,                     // порт фронта
    allowedHosts: ['.ngrok-free.dev'], // чтобы ngrok не ругался
    proxy: {
      // все запросы, начинающиеся с /api, перенаправляются на бэкенд
      '/api': {
        target: 'http://localhost:3000', // адрес твоего бэкенда
        changeOrigin: true,
        
      },
    },
  },
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          'vendor-katex': ['katex', 'react-katex'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-state': ['zustand'],
        },
      },
    },
  },
});



