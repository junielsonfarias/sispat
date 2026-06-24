-- CreateEnum
CREATE TYPE "TipoPosse" AS ENUM ('proprio', 'cessao', 'comodato');

-- AlterTable
ALTER TABLE "imoveis" ADD COLUMN     "tipo_posse" "TipoPosse" NOT NULL DEFAULT 'proprio';

-- AlterTable
ALTER TABLE "patrimonios" ADD COLUMN     "tipo_posse" "TipoPosse" NOT NULL DEFAULT 'proprio';
