import { createApp } from './app';
import { env } from '@/config';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │  🚀 Gayrimenkul API başlatıldı          │
  │  Port    : ${env.PORT}                       │
  │  Ortam   : ${env.NODE_ENV}               │
  │  Sağlık  : http://localhost:${env.PORT}/api/v1/health │
  └─────────────────────────────────────────┘
  `);
});

// Graceful shutdown — SIGTERM (docker stop, K8s) için
process.on('SIGTERM', () => {
  console.log('SIGTERM alındı. Server kapatılıyor...');
  server.close(() => {
    console.log('HTTP server kapatıldı.');
    process.exit(0);
  });
});

// Unhandled promise rejection koruması
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
  server.close(() => process.exit(1));
});
