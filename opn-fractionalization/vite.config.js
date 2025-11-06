import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Development server configuration
  server: {
  proxy: {
    '/api/huggingface': {
      target: 'https://api-inference.huggingface.co',  // Keep this for now
      changeOrigin: true,
      rewrite: (path) => {
        // Update the rewrite to use the new router
        const newPath = path.replace('/api/huggingface', '');
        console.log('Rewriting path:', path, '->', newPath);
        return newPath;
      },
      secure: false,
      configure: (proxy, options) => {
        proxy.on('proxyReq', (proxyReq, req, res) => {
          const apiKey = 'hf_lRFmiWsDfTgYYhFrtGHGrrerfrFr'; // Your actual key
          proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
          
          // Override the host to the new endpoint
          proxyReq.setHeader('host', 'api-inference.huggingface.co');
        });
      }
    }
  }
},
  
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate source maps for debugging (optional)
    sourcemap: false,
    
    // Optimize bundle size
    minify: 'terser',
    
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ethers-vendor': ['ethers'],
          'ui-vendor': ['lucide-react']
        }
      }
    },
    
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  
  // Define global constants
  define: {
    'process.env': {}
  },
  
  // Preview server configuration
  preview: {
    port: 3000,
    host: true
  }
})