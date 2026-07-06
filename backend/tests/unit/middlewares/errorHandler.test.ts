import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { AppError } from '@/common/errors/AppError';

// ── Mock @/config so we can control env.NODE_ENV per test ──
const mockEnv = { NODE_ENV: 'development' as 'development' | 'test' | 'production' };

jest.mock('@/config', () => ({
  env: mockEnv,
}));

// Import AFTER the mock is registered
import { errorHandler } from '@/middlewares/errorHandler';

// ── Helper: create minimal mock req/res/next ──
function buildMocks() {
  const req = {} as Request;

  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  // We need res.status().json() chain: wire them up properly
  (res.status as jest.Mock).mockReturnValue(res);

  const next = jest.fn() as NextFunction;

  return { req, res, next, status, json };
}

// ── Helper: build a real ZodError ──
function buildZodError(): ZodError {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });
  const result = schema.safeParse({ name: 123, age: 'not-a-number' });
  if (!result.success) {
    return result.error;
  }
  throw new Error('Expected ZodError was not produced');
}

// ══════════════════════════════════════════════════════════════
// 1. ZodError handling
// ══════════════════════════════════════════════════════════════
describe('errorHandler — ZodError', () => {
  beforeEach(() => {
    mockEnv.NODE_ENV = 'development';
  });

  it('should respond with 400 status', () => {
    const { req, res, next } = buildMocks();
    const zodErr = buildZodError();

    errorHandler(zodErr, req, res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(400);
  });

  it('should set success: false', () => {
    const { req, res, next } = buildMocks();
    const zodErr = buildZodError();

    errorHandler(zodErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.success).toBe(false);
  });

  it('should set error.code to VALIDATION_ERROR', () => {
    const { req, res, next } = buildMocks();
    const zodErr = buildZodError();

    errorHandler(zodErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should include fieldErrors in details', () => {
    const { req, res, next } = buildMocks();
    const zodErr = buildZodError();

    errorHandler(zodErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.details).toBeDefined();
    expect(typeof body.error.details).toBe('object');
  });

  it('should include message field', () => {
    const { req, res, next } = buildMocks();
    const zodErr = buildZodError();

    errorHandler(zodErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(typeof body.error.message).toBe('string');
    expect(body.error.message.length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════
// 2. AppError handling
// ══════════════════════════════════════════════════════════════
describe('errorHandler — AppError', () => {
  beforeEach(() => {
    mockEnv.NODE_ENV = 'development';
  });

  it('should respond with the AppError statusCode', () => {
    const { req, res, next } = buildMocks();
    const appErr = new AppError('Kayıt bulunamadı.', 404, 'NOT_FOUND');

    errorHandler(appErr, req, res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(404);
  });

  it('should reflect the correct error code', () => {
    const { req, res, next } = buildMocks();
    const appErr = new AppError('Yetkisiz erişim.', 401, 'UNAUTHORIZED');

    errorHandler(appErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reflect the correct message', () => {
    const { req, res, next } = buildMocks();
    const appErr = new AppError('Kayıt çakışması.', 409, 'CONFLICT');

    errorHandler(appErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.message).toBe('Kayıt çakışması.');
  });

  it('should set success: false', () => {
    const { req, res, next } = buildMocks();
    const appErr = new AppError('Yasak.', 403, 'FORBIDDEN');

    errorHandler(appErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.success).toBe(false);
  });

  it('in development: should include details when AppError has details', () => {
    mockEnv.NODE_ENV = 'development';
    const { req, res, next } = buildMocks();
    const extraDetails = { field: 'email', reason: 'already in use' };
    const appErr = new AppError('Çakışma.', 409, 'CONFLICT', extraDetails);

    errorHandler(appErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.details).toEqual(extraDetails);
  });

  it('in production: should hide details even when AppError has details', () => {
    mockEnv.NODE_ENV = 'production';
    const { req, res, next } = buildMocks();
    const extraDetails = { field: 'email', reason: 'already in use' };
    const appErr = new AppError('Çakışma.', 409, 'CONFLICT', extraDetails);

    errorHandler(appErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.details).toBeUndefined();
  });

  it('in development: should not include details when AppError has no details', () => {
    mockEnv.NODE_ENV = 'development';
    const { req, res, next } = buildMocks();
    const appErr = new AppError('Bulunamadı.', 404, 'NOT_FOUND');

    errorHandler(appErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.details).toBeUndefined();
  });

  it('in production: should not include details when AppError has no details', () => {
    mockEnv.NODE_ENV = 'production';
    const { req, res, next } = buildMocks();
    const appErr = new AppError('Bulunamadı.', 404, 'NOT_FOUND');

    errorHandler(appErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.details).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
// 3. Unknown Error handling
// ══════════════════════════════════════════════════════════════
describe('errorHandler — Unknown Error', () => {
  beforeEach(() => {
    mockEnv.NODE_ENV = 'development';
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should respond with 500 status', () => {
    const { req, res, next } = buildMocks();
    const unknownErr = new Error('Something went wrong');

    errorHandler(unknownErr, req, res, next);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(500);
  });

  it('should set error.code to INTERNAL_SERVER_ERROR', () => {
    const { req, res, next } = buildMocks();
    const unknownErr = new Error('Unexpected failure');

    errorHandler(unknownErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should set success: false', () => {
    const { req, res, next } = buildMocks();
    const unknownErr = new Error('Unexpected failure');

    errorHandler(unknownErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.success).toBe(false);
  });

  it('should call console.error to log the unexpected error', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { req, res, next } = buildMocks();
    const unknownErr = new Error('Silent failure');

    errorHandler(unknownErr, req, res, next);

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('in development: should include stack trace in response', () => {
    mockEnv.NODE_ENV = 'development';
    const { req, res, next } = buildMocks();
    const unknownErr = new Error('Stack visible in dev');

    errorHandler(unknownErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.stack).toBeDefined();
    expect(typeof body.error.stack).toBe('string');
  });

  it('in production: should hide stack trace from response', () => {
    mockEnv.NODE_ENV = 'production';
    const { req, res, next } = buildMocks();
    const unknownErr = new Error('Stack hidden in prod');

    errorHandler(unknownErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.stack).toBeUndefined();
  });

  it('in test: should include stack trace (non-production)', () => {
    mockEnv.NODE_ENV = 'test';
    const { req, res, next } = buildMocks();
    const unknownErr = new Error('Stack visible in test');

    errorHandler(unknownErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error.stack).toBeDefined();
  });

  it('should include a human-readable message', () => {
    const { req, res, next } = buildMocks();
    const unknownErr = new Error('Unexpected');

    errorHandler(unknownErr, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(typeof body.error.message).toBe('string');
    expect(body.error.message.length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════
// 4. Response shape invariant
// ══════════════════════════════════════════════════════════════
describe('errorHandler — response shape invariant', () => {
  beforeEach(() => {
    mockEnv.NODE_ENV = 'development';
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const errorCases: Array<{ label: string; error: () => Error }> = [
    { label: 'ZodError', error: buildZodError },
    { label: 'AppError 404', error: () => new AppError('Not found', 404, 'NOT_FOUND') },
    { label: 'AppError 401', error: () => new AppError('Unauthorized', 401, 'UNAUTHORIZED') },
    { label: 'Unknown Error', error: () => new Error('Generic error') },
  ];

  it.each(errorCases)(
    '$label: response always has success, error.code, and error.message',
    ({ error }) => {
      const { req, res, next } = buildMocks();

      errorHandler(error(), req, res, next);

      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(typeof body.error.code).toBe('string');
      expect(body.error.code.length).toBeGreaterThan(0);
      expect(typeof body.error.message).toBe('string');
      expect(body.error.message.length).toBeGreaterThan(0);
    }
  );
});
