/**
 * Unit tests for src/lib/prisma.ts — PrismaClient Singleton
 *
 * Requirements: 9.1, 9.2, 9.3, 9.5, 9.6
 *
 * NOTE: src/lib/prisma.ts does not exist yet; these tests are written to verify
 * the behaviour once that module is implemented.
 *
 * Strategy:
 *  - Mock the generated PrismaClient so no real DB connection is attempted.
 *  - Use jest.isolateModules() / jest.resetModules() to re-import the module
 *    fresh for each NODE_ENV scenario.
 *  - Spy on process.exit and console.error to verify error-handling paths.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type PrismaModule = { prisma: { $disconnect: jest.Mock; $connect: jest.Mock } };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Loads a fresh copy of src/lib/prisma in an isolated module registry so that
 * changes to process.env.NODE_ENV or global.__prisma are respected.
 */
async function loadPrismaModule(nodeEnv: string): Promise<PrismaModule> {
  // Save and override NODE_ENV
  const originalEnv = process.env['NODE_ENV'];
  process.env['NODE_ENV'] = nodeEnv;

  let mod: PrismaModule;

  jest.isolateModules(() => {
    // Re-apply the mock inside the isolated registry
    jest.mock('@prisma/client', () => {
      const disconnect = jest.fn().mockResolvedValue(undefined);
      const connect = jest.fn().mockResolvedValue(undefined);
      const MockPrismaClient = jest.fn().mockImplementation(() => ({
        $disconnect: disconnect,
        $connect: connect,
      }));
      return { PrismaClient: MockPrismaClient };
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('../../../src/lib/prisma') as PrismaModule;
  });

  // Restore NODE_ENV
  process.env['NODE_ENV'] = originalEnv;

  return mod!;
}

// ─── Global mock setup ────────────────────────────────────────────────────────

// We declare the mock at the top level so it applies to all tests.
// Individual tests may override behaviour via mockReturnValue / mockRejectedValue.
jest.mock('@prisma/client', () => {
  const disconnect = jest.fn().mockResolvedValue(undefined);
  const connect = jest.fn().mockResolvedValue(undefined);
  const MockPrismaClient = jest.fn().mockImplementation(() => ({
    $disconnect: disconnect,
    $connect: connect,
  }));
  return { PrismaClient: MockPrismaClient };
});

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('PrismaClient Singleton — src/lib/prisma.ts', () => {
  let originalNodeEnv: string | undefined;
  let exitSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    originalNodeEnv = process.env['NODE_ENV'];

    // Prevent process.exit from actually killing the test process
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((_code?: string | number | null | undefined) => {
        return undefined as never;
      });

    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Clean up any global prisma leftover between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).__prisma;
  });

  afterEach(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
    jest.restoreAllMocks();
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).__prisma;
    // Remove all signal handlers added by prisma.ts during this test to
    // prevent them from leaking into subsequent tests.
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Requirement 9.2 — development: same instance is returned via global reuse
  // ══════════════════════════════════════════════════════════════════════════
  describe('NODE_ENV=development — singleton via global.__prisma', () => {
    it('should return the same prisma instance on repeated imports', async () => {
      process.env['NODE_ENV'] = 'development';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).__prisma;

      let firstInstance: unknown;
      let secondInstance: unknown;

      jest.isolateModules(() => {
        jest.mock('@prisma/client', () => {
          const MockPrismaClient = jest.fn().mockImplementation(() => ({
            $disconnect: jest.fn().mockResolvedValue(undefined),
            $connect: jest.fn().mockResolvedValue(undefined),
          }));
          return { PrismaClient: MockPrismaClient };
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        firstInstance = (require('../../../src/lib/prisma') as PrismaModule).prisma;
      });

      // Module registry is fresh, but global.__prisma should carry over
      jest.isolateModules(() => {
        jest.mock('@prisma/client', () => {
          const MockPrismaClient = jest.fn().mockImplementation(() => ({
            $disconnect: jest.fn().mockResolvedValue(undefined),
            $connect: jest.fn().mockResolvedValue(undefined),
          }));
          return { PrismaClient: MockPrismaClient };
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        secondInstance = (require('../../../src/lib/prisma') as PrismaModule).prisma;
      });

      // Both imports must resolve to the exact same object reference
      expect(firstInstance).toBe(secondInstance);
    });

    it('should attach the prisma instance to global.__prisma in development', async () => {
      process.env['NODE_ENV'] = 'development';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).__prisma;

      jest.isolateModules(() => {
        jest.mock('@prisma/client', () => {
          const MockPrismaClient = jest.fn().mockImplementation(() => ({
            $disconnect: jest.fn().mockResolvedValue(undefined),
            $connect: jest.fn().mockResolvedValue(undefined),
          }));
          return { PrismaClient: MockPrismaClient };
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../../../src/lib/prisma');
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).__prisma).toBeDefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Requirement 9.3 — production: NOT attached to global
  // ══════════════════════════════════════════════════════════════════════════
  describe('NODE_ENV=production — singleton NOT on global', () => {
    it('should NOT attach prisma to global.__prisma in production', async () => {
      process.env['NODE_ENV'] = 'production';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).__prisma;

      jest.isolateModules(() => {
        jest.mock('@prisma/client', () => {
          const MockPrismaClient = jest.fn().mockImplementation(() => ({
            $disconnect: jest.fn().mockResolvedValue(undefined),
            $connect: jest.fn().mockResolvedValue(undefined),
          }));
          return { PrismaClient: MockPrismaClient };
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../../../src/lib/prisma');
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).__prisma).toBeUndefined();
    });

    it('should still export a valid prisma instance in production', () => {
      process.env['NODE_ENV'] = 'production';

      let exported: unknown;
      jest.isolateModules(() => {
        jest.mock('@prisma/client', () => {
          const MockPrismaClient = jest.fn().mockImplementation(() => ({
            $disconnect: jest.fn().mockResolvedValue(undefined),
            $connect: jest.fn().mockResolvedValue(undefined),
          }));
          return { PrismaClient: MockPrismaClient };
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        exported = (require('../../../src/lib/prisma') as PrismaModule).prisma;
      });

      expect(exported).toBeDefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Requirement 9.5 — SIGTERM / SIGINT handlers call $disconnect()
  // ══════════════════════════════════════════════════════════════════════════
  describe('Signal handlers — SIGTERM and SIGINT', () => {
    it('should call $disconnect() when SIGTERM is received', async () => {
      process.env['NODE_ENV'] = 'production';

      let disconnectMock: jest.Mock | undefined;

      jest.isolateModules(() => {
        disconnectMock = jest.fn().mockResolvedValue(undefined);
        jest.mock('@prisma/client', () => {
          const MockPrismaClient = jest.fn().mockImplementation(() => ({
            $disconnect: disconnectMock,
            $connect: jest.fn().mockResolvedValue(undefined),
          }));
          return { PrismaClient: MockPrismaClient };
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../../../src/lib/prisma');
      });

      // Emit the signal synchronously (process.emit is synchronous for signal listeners)
      process.emit('SIGTERM');

      // Allow async $disconnect() to settle
      await new Promise(resolve => setImmediate(resolve));

      expect(disconnectMock).toHaveBeenCalled();
    });

    it('should call $disconnect() when SIGINT is received', async () => {
      process.env['NODE_ENV'] = 'production';

      let disconnectMock: jest.Mock | undefined;

      jest.isolateModules(() => {
        disconnectMock = jest.fn().mockResolvedValue(undefined);
        jest.mock('@prisma/client', () => {
          const MockPrismaClient = jest.fn().mockImplementation(() => ({
            $disconnect: disconnectMock,
            $connect: jest.fn().mockResolvedValue(undefined),
          }));
          return { PrismaClient: MockPrismaClient };
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../../../src/lib/prisma');
      });

      process.emit('SIGINT');

      await new Promise(resolve => setImmediate(resolve));

      expect(disconnectMock).toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Requirement 9.6 — $disconnect() failure: console.error + process.exit(1)
  // ══════════════════════════════════════════════════════════════════════════
  describe('$disconnect() error handling', () => {
    it('should call console.error when $disconnect() throws', async () => {
      process.env['NODE_ENV'] = 'production';
      const dbError = new Error('DB disconnect failed');

      jest.isolateModules(() => {
        jest.mock('@prisma/client', () => {
          const MockPrismaClient = jest.fn().mockImplementation(() => ({
            $disconnect: jest.fn().mockRejectedValue(dbError),
            $connect: jest.fn().mockResolvedValue(undefined),
          }));
          return { PrismaClient: MockPrismaClient };
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../../../src/lib/prisma');
      });

      process.emit('SIGTERM');

      // Wait for the rejected promise chain to resolve
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should call process.exit(1) when $disconnect() throws', async () => {
      process.env['NODE_ENV'] = 'production';
      const dbError = new Error('DB disconnect failed');

      jest.isolateModules(() => {
        jest.mock('@prisma/client', () => {
          const MockPrismaClient = jest.fn().mockImplementation(() => ({
            $disconnect: jest.fn().mockRejectedValue(dbError),
            $connect: jest.fn().mockResolvedValue(undefined),
          }));
          return { PrismaClient: MockPrismaClient };
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../../../src/lib/prisma');
      });

      process.emit('SIGTERM');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should NOT call process.exit(1) when $disconnect() succeeds', async () => {
      process.env['NODE_ENV'] = 'production';

      jest.isolateModules(() => {
        jest.mock('@prisma/client', () => {
          const MockPrismaClient = jest.fn().mockImplementation(() => ({
            $disconnect: jest.fn().mockResolvedValue(undefined),
            $connect: jest.fn().mockResolvedValue(undefined),
          }));
          return { PrismaClient: MockPrismaClient };
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../../../src/lib/prisma');
      });

      process.emit('SIGTERM');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Requirement 9.1 & 9.4 — exports a named `prisma` singleton
  // ══════════════════════════════════════════════════════════════════════════
  describe('Module export shape', () => {
    it('should export a named `prisma` property', () => {
      process.env['NODE_ENV'] = 'test';

      let exported: unknown;
      jest.isolateModules(() => {
        jest.mock('@prisma/client', () => {
          const MockPrismaClient = jest.fn().mockImplementation(() => ({
            $disconnect: jest.fn().mockResolvedValue(undefined),
            $connect: jest.fn().mockResolvedValue(undefined),
          }));
          return { PrismaClient: MockPrismaClient };
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('../../../src/lib/prisma') as PrismaModule;
        exported = mod.prisma;
      });

      expect(exported).toBeDefined();
      expect(exported).not.toBeNull();
    });

    it('exported prisma should have a $disconnect method', () => {
      process.env['NODE_ENV'] = 'test';

      let exported: PrismaModule['prisma'] | undefined;
      jest.isolateModules(() => {
        jest.mock('@prisma/client', () => {
          const MockPrismaClient = jest.fn().mockImplementation(() => ({
            $disconnect: jest.fn().mockResolvedValue(undefined),
            $connect: jest.fn().mockResolvedValue(undefined),
          }));
          return { PrismaClient: MockPrismaClient };
        });
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        exported = (require('../../../src/lib/prisma') as PrismaModule).prisma;
      });

      expect(typeof exported?.$disconnect).toBe('function');
    });
  });
});
