/**
 * Integration Test: Database Connection
 *
 * Bu test dosyası gerçek bir PostgreSQL bağlantısı kurar ve doğrular.
 * CI/CD ortamında çalışabilmesi için DATABASE_URL ortam değişkeni gereklidir.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

import { PrismaClient } from '@/generated/prisma-client';

// Guard: DATABASE_URL tanımlı değilse testi anlamlı bir hatayla sonlandır
if (!process.env['DATABASE_URL']) {
  throw new Error(
    '[database.test.ts] DATABASE_URL ortam değişkeni tanımlı değil. ' +
      'Bu integration testi gerçek bir PostgreSQL bağlantısı gerektirir. ' +
      '.env dosyanızda DATABASE_URL değerini ayarlayın.',
  );
}

const prisma = new PrismaClient();

describe('Database Connection', () => {
  /**
   * Requirement 11.1, 11.2:
   * beforeAll içinde $connect() çağrılır.
   * Başarıyla tamamlanırsa bağlantı doğrulanmış olur.
   */
  beforeAll(async () => {
    await prisma.$connect();
  });

  /**
   * Requirement 11.4:
   * Test tamamlandıktan sonra bağlantı kapatılır.
   */
  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Requirement 11.1, 11.2:
   * $connect() başarıyla çözümlenirse bağlantı kurulmuş demektir.
   * beforeAll içinde $connect() çağrıldığından burada hata yoksa test geçer.
   */
  it('should connect to database successfully', async () => {
    // $connect() beforeAll'da başarıyla tamamlandı — bu noktaya geldik demek
    // bağlantı kuruldu. Ek doğrulama için bir komut çalıştırabiliriz:
    // $queryRaw ile de doğrulanmış olur, ancak bu test yalnızca connect doğrular.
    let connectError: unknown = null;

    try {
      // Bağlantı zaten açık; tekrar açmaya çalışmak zararsızdır
      await prisma.$connect();
    } catch (err) {
      connectError = err;
    }

    expect(connectError).toBeNull();
  });

  /**
   * Requirement 11.1, 11.2:
   * Ham SQL sorgusu ile veritabanının yanıt verdiğini doğrula.
   * SELECT 1 her PostgreSQL veritabanında çalışır.
   */
  it('should execute a raw SELECT 1 query', async () => {
    const result = await prisma.$queryRaw<Array<{ value: number }>>`SELECT 1 as value`;

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);

    const row = result[0];
    expect(row).toBeDefined();
    // PostgreSQL INTEGER'ı JavaScript'te number olarak döner
    expect(Number(row?.value)).toBe(1);
  });
});
