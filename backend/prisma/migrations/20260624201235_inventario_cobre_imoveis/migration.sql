-- DropForeignKey
ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_patrimonioId_fkey";

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "imovelId" TEXT,
ALTER COLUMN "patrimonioId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "inventory_items_imovelId_idx" ON "inventory_items"("imovelId");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "patrimonios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imoveis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
