import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // ─── 1. Admin User ───────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gayrimenkul.com' },
    update: {
      // Yeniden seed çalıştırıldığında hash güncellenir
      passwordHash: '$2a$12$2hu2LDLAHzQCEVq7sckwKebOzOlx5Y/uOgtVEt.UQ5Kg4HUnBPVKS',
    },
    create: {
      username: 'admin',
      email: 'admin@gayrimenkul.com',
      // bcrypt hash — şifre: admin123 (salt rounds: 12)
      // Sprint 3.1'de login testi için geçerli hash
      passwordHash:
        '$2a$12$2hu2LDLAHzQCEVq7sckwKebOzOlx5Y/uOgtVEt.UQ5Kg4HUnBPVKS',
      isActive: true,
    },
  });

  // ─── 2. Properties ───────────────────────────────────────────────────────────
  const property1 = await prisma.property.upsert({
    where: { slug: 'satilik-3-plus-1-daire-istanbul' },
    update: { deletedAt: null, isPublished: true },
    create: {
      slug: 'satilik-3-plus-1-daire-istanbul',
      title: 'Satılık 3+1 Daire - İstanbul Kadıköy',
      listingType: 'FOR_SALE',
      propertyType: 'APARTMENT',
      price: 2500000,
      city: 'İstanbul',
      district: 'Kadıköy',
      address: 'Moda Caddesi No:1',
      roomCount: 3,
      livingRoomCount: 1,
      isPublished: true,
      createdById: admin.id,
    },
  });

  const property2 = await prisma.property.upsert({
    where: { slug: 'kiralik-2-plus-1-daire-ankara' },
    update: { deletedAt: null, isPublished: true },
    create: {
      slug: 'kiralik-2-plus-1-daire-ankara',
      title: 'Kiralık 2+1 Daire - Ankara Çankaya',
      listingType: 'FOR_RENT',
      propertyType: 'APARTMENT',
      price: 15000,
      city: 'Ankara',
      district: 'Çankaya',
      address: 'Atatürk Bulvarı No:1',
      roomCount: 2,
      livingRoomCount: 1,
      isPublished: true,
      createdById: admin.id,
    },
  });


  // ─── 3. PropertyImages ────────────────────────────────────────────────────────
  await prisma.propertyImage.upsert({
    where: {
      propertyId_displayOrder: {
        propertyId: property1.id,
        displayOrder: 1,
      },
    },
    update: {},
    create: {
      propertyId: property1.id,
      url: 'https://res.cloudinary.com/demo/image/upload/sample_kadikoy_daire.jpg',
      publicId: 'sample_kadikoy_daire',
      width: 1920,
      height: 1080,
      format: 'jpg',
      bytes: 250000,
      displayOrder: 1,
      isCover: true,
    },
  });

  await prisma.propertyImage.upsert({
    where: {
      propertyId_displayOrder: {
        propertyId: property2.id,
        displayOrder: 1,
      },
    },
    update: {},
    create: {
      propertyId: property2.id,
      url: 'https://res.cloudinary.com/demo/image/upload/sample_cankaya_daire.jpg',
      publicId: 'sample_cankaya_daire',
      width: 1920,
      height: 1080,
      format: 'jpg',
      bytes: 250000,
      displayOrder: 1,
      isCover: true,
    },
  });

  // ─── 4. Summary ──────────────────────────────────────────────────────────────
  const userCount = await prisma.user.count();
  const propertyCount = await prisma.property.count();
  const imageCount = await prisma.propertyImage.count();

  console.log(
    `Seed tamamlandı:\n` +
      `  Kullanıcı: ${userCount}\n` +
      `  İlan:      ${propertyCount}\n` +
      `  Görsel:    ${imageCount}`,
  );
}

export { main as seed };

main()
  .catch((error: unknown) => {
    console.error('Seed hatası:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
