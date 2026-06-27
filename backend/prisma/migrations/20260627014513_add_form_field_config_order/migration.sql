-- AlterTable
ALTER TABLE "form_field_configs" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "form_field_configs_order_idx" ON "form_field_configs"("order");
