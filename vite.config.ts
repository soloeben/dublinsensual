import path from 'path';
import { defineConfig } from 'vite';


export default defineConfig({
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          input: {
            index: path.resolve(__dirname, 'index.html'),
            tickets: path.resolve(__dirname, 'tickets.html'),
            venue: path.resolve(__dirname, 'venue.html'),
            lineup: path.resolve(__dirname, 'lineup.html'),
            schedule: path.resolve(__dirname, 'schedule.html'),
            faq: path.resolve(__dirname, 'faq.html'),
            sponsorship: path.resolve(__dirname, 'sponsorship.html'),
            guestDancers: path.resolve(__dirname, 'guest-dancers.html'),
            model: path.resolve(__dirname, 'model.html'),
          },
        },
      },
      plugins: [],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
});
