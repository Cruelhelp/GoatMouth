import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import { resolve } from 'path';

export default defineConfig({
  root: './public',
  publicDir: 'assets',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        admin: resolve(__dirname, 'public/admin.html'),
        voting: resolve(__dirname, 'public/voting.html'),
        market: resolve(__dirname, 'public/market.html'),
        profile: resolve(__dirname, 'public/profile.html'),
        deposit: resolve(__dirname, 'public/deposit.html'),
        earn: resolve(__dirname, 'public/earn.html'),
        contact: resolve(__dirname, 'public/contact.html'),
        terms: resolve(__dirname, 'public/terms.html'),
        privacy: resolve(__dirname, 'public/privacy.html'),
        howItWorks: resolve(__dirname, 'public/how-it-works.html')
      },
      output: {
        manualChunks(id) {
          // Vendor chunks - separate node_modules
          if (id.includes('node_modules')) {
            if (id.includes('dompurify')) {
              return 'vendor-dompurify';
            }
            if (id.includes('supabase')) {
              return 'vendor-supabase';
            }
            return 'vendor';
          }

          // Admin page chunk
          if (id.includes('admin')) {
            return 'page-admin';
          }

          // Shared utilities
          if (id.includes('shared-components') || id.includes('sanitize-helper')) {
            return 'utils';
          }
        }
      }
    },
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn', 'console.error']
      }
    },
    // Source maps for debugging (disable in production)
    sourcemap: false,
    // Asset optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    cssCodeSplit: true,
    // Chunk size warnings
    chunkSizeWarningLimit: 500
  },
  server: {
    port: 3000,
    open: true,
    cors: true
  },
  preview: {
    port: 4173
  },
  plugins: [
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          title: 'GoatMouth - Prediction Market'
        }
      }
    })
  ],
  // Resolve aliases for cleaner imports (for future SPA conversion)
  resolve: {
    alias: {
      '@': '/js',
      '@css': '/css',
      '@assets': '/assets'
    }
  }
});
