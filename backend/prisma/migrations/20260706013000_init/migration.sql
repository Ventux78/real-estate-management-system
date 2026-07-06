-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('FOR_SALE', 'FOR_RENT');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'LAND', 'OFFICE', 'SHOP', 'WAREHOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "HeatingType" AS ENUM ('NATURAL_GAS', 'ELECTRIC', 'FLOOR_HEATING', 'COAL', 'NONE', 'OTHER');

-- CreateEnum
CREATE TYPE "DeedStatus" AS ENUM ('FREEHOLD', 'CONDOMINIUM', 'FLOOR_EASEMENT', 'SHARED', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "listingType" "ListingType" NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT,
    "neighborhood" TEXT,
    "grossArea" DECIMAL(65,30),
    "netArea" DECIMAL(65,30),
    "roomCount" INTEGER,
    "livingRoomCount" INTEGER,
    "bathroomCount" INTEGER,
    "floor" INTEGER,
    "totalFloor" INTEGER,
    "buildingAge" INTEGER,
    "heatingType" "HeatingType",
    "dues" DECIMAL(65,30),
    "deedStatus" "DeedStatus",
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "videoUrl" TEXT,
    "virtualTourUrl" TEXT,
    "furnished" BOOLEAN NOT NULL DEFAULT false,
    "balcony" BOOLEAN NOT NULL DEFAULT false,
    "elevator" BOOLEAN NOT NULL DEFAULT false,
    "parking" BOOLEAN NOT NULL DEFAULT false,
    "eligibleForCredit" BOOLEAN NOT NULL DEFAULT false,
    "exchangeAvailable" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyImage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "imageUrl" VARCHAR(2048) NOT NULL,
    "publicId" VARCHAR(255) NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE INDEX "Property_city_idx" ON "Property"("city");

-- CreateIndex
CREATE INDEX "Property_district_idx" ON "Property"("district");

-- CreateIndex
CREATE INDEX "Property_price_idx" ON "Property"("price");

-- CreateIndex
CREATE INDEX "Property_listingType_idx" ON "Property"("listingType");

-- CreateIndex
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");

-- CreateIndex
CREATE INDEX "Property_isPublished_idx" ON "Property"("isPublished");

-- CreateIndex
CREATE INDEX "Property_deletedAt_idx" ON "Property"("deletedAt");

-- CreateIndex
CREATE INDEX "Property_createdById_idx" ON "Property"("createdById");

-- CreateIndex
CREATE INDEX "Property_city_listingType_isPublished_idx" ON "Property"("city", "listingType", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyImage_propertyId_displayOrder_key" ON "PropertyImage"("propertyId", "displayOrder");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial Unique Index: Only one cover image per property
CREATE UNIQUE INDEX "PropertyImage_propertyId_isCover_key"
ON "PropertyImage"("propertyId")
WHERE "isCover" = true;
