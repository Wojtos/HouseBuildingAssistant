// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Required for middleware to run on all routes
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    react(),
    tailwind(),
  ],
  server: {
    port: 4001,
    host: true,
  },
  vite: {
    preview: {
      allowedHosts: ['homebuild-frontend.fly.dev'],
    },
  },
});
