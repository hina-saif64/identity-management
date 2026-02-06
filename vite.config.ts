import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';
  
  return {
    server: {
      port: 3001, // Frontend on 3001
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3002', // Backend on 3002
          changeOrigin: true,
          secure: false
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@components': path.resolve(__dirname, './components'),
        '@features': path.resolve(__dirname, './features'),
        '@modules': path.resolve(__dirname, './modules'),
        '@services': path.resolve(__dirname, './services'),
        '@hooks': path.resolve(__dirname, './hooks'),
        '@types': path.resolve(__dirname, './types.ts'),
        stream: 'stream-browserify',
        events: 'events',
        util: 'util',
        buffer: 'buffer',
      }
    },
    optimizeDeps: {
      include: ['stream-browserify', 'react', 'react-dom', 'lucide-react']
    },
    build: {
      // Bundle optimization for production
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk for stable dependencies
            vendor: ['react', 'react-dom'],
            // UI components chunk
            ui: ['lucide-react'],
            // Feature-specific chunks
            dashboard: ['./components/Dashboard/EnhancedDashboard'],
            navigation: ['./components/Navigation/NavigationCategories'],
            notifications: ['./components/Notifications/NotificationSystem'],
            // Module chunks for lazy loading
            'ca-exclusions': ['./features/ca-exclusions/index'],
            'device-inventory': ['./features/unified-device-inventory/index'],
            'access-intelligence': ['./modules/access-intelligence/ui/AccessDashboard']
          }
        }
      },
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
      // Enable source maps in development only
      sourcemap: !isProduction,
      // Minification settings
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      } : undefined
    }
  };
});
