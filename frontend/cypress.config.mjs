import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:51730',
    supportFile: false,
    video: false,
  },
});
