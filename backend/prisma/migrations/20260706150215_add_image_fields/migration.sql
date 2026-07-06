/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `PropertyImage` table. All the data in the column will be lost.
  - Added the required column `bytes` to the `PropertyImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `format` to the `PropertyImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `height` to the `PropertyImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `PropertyImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `PropertyImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PropertyImage" DROP COLUMN "imageUrl",
ADD COLUMN     "bytes" INTEGER NOT NULL,
ADD COLUMN     "format" VARCHAR(10) NOT NULL,
ADD COLUMN     "height" INTEGER NOT NULL,
ADD COLUMN     "url" VARCHAR(2048) NOT NULL,
ADD COLUMN     "width" INTEGER NOT NULL;
