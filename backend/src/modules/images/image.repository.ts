import { prisma } from '@/lib/prisma';
import { PropertyImage, Prisma } from '@/generated/prisma-client';
import { ReorderImageDto } from './image.types';

export const imageRepository = {
  async findByPropertyId(propertyId: string): Promise<PropertyImage[]> {
    return prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: { displayOrder: 'asc' },
    });
  },

  async findById(id: string): Promise<PropertyImage | null> {
    return prisma.propertyImage.findUnique({
      where: { id },
    });
  },

  async createMany(data: Prisma.PropertyImageCreateManyInput[]): Promise<void> {
    await prisma.propertyImage.createMany({
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.propertyImage.delete({
      where: { id },
    });
  },

  async setCoverTransaction(propertyId: string, id: string): Promise<void> {
    await prisma.$transaction([
      prisma.propertyImage.updateMany({
        where: { propertyId },
        data: { isCover: false },
      }),
      prisma.propertyImage.update({
        where: { id },
        data: { isCover: true },
      }),
    ]);
  },

  async updateOrders(propertyId: string, orders: ReorderImageDto[]): Promise<void> {
    // We run updates in a transaction to ensure atomicity
    const queries = orders.map((order) =>
      prisma.propertyImage.update({
        where: { id: order.id, propertyId }, // ensure the image belongs to the property
        data: { displayOrder: order.displayOrder },
      })
    );

    // Some databases might complain about unique constraint on displayOrder during bulk update
    // Prisma usually handles this sequentially in a transaction, but it could fail if swapping directly.
    // However, if we do it in a transaction, it should be fine. Wait, if it fails due to unique constraint,
    // we might need to temporarily unset them.
    // Wait, we have @@unique([propertyId, displayOrder]). This will definitely fail in Postgres during standard row-by-row updates if it conflicts with an existing row mid-transaction, UNLESS the constraint is DEFERRABLE. Prisma does not support deferrable constraints out of the box easily.
    // So to be safe, we will first shift them to negative values, then positive.
    const tempQueries = orders.map((order) =>
      prisma.propertyImage.update({
        where: { id: order.id, propertyId },
        data: { displayOrder: -order.displayOrder - 1000 },
      })
    );

    await prisma.$transaction([...tempQueries, ...queries]);
  },
};
