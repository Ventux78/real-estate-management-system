/**
 * PrismaClient Singleton
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 *
 * - In development: reuses global.__prisma to survive Hot Reload (ts-node-dev)
 *   without exhausting the connection pool.
 * - In all other environments: keeps the instance in module scope.
 * - Registers SIGTERM / SIGINT handlers to gracefully disconnect.
 *   If $disconnect() fails, logs the error and exits with code 1.
 */

import { PrismaClient } from '@prisma/client';

// Extend the NodeJS global type so TypeScript accepts global.__prisma
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// ─── Singleton factory ────────────────────────────────────────────────────────

function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

// Requirement 9.2: In development, reuse the global instance across HMR cycles.
// Requirement 9.3: In production (and test), keep the instance in module scope only.
export const prisma: PrismaClient =
  process.env['NODE_ENV'] === 'development'
    ? (global.__prisma ?? (global.__prisma = createPrismaClient()))
    : createPrismaClient();

// ─── Graceful shutdown handlers ───────────────────────────────────────────────

/**
 * Requirement 9.5 & 9.6:
 * On SIGTERM or SIGINT, close the database connection.
 * If the disconnect fails, log the error and exit with code 1.
 */
async function gracefulShutdown(signal: string): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (err) {
    // Requirement 9.6: never silently swallow the error
    console.error(`[prisma] Failed to disconnect on ${signal}:`, err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
