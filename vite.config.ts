import {defineConfig} from 'vite';
export default defineConfig({
  server:{host:'127.0.0.1',port:5188},
  preview:{host:'127.0.0.1',port:5189},
  build:{rollupOptions:{output:{manualChunks(id){if(id.includes('node_modules/three'))return 'three';}}}},
});
