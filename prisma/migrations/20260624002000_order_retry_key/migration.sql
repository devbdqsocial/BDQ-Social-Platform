ALTER TABLE "Order" ADD COLUMN "clientOrderKey" TEXT;

CREATE UNIQUE INDEX "Order_clientOrderKey_key" ON "Order" ("clientOrderKey");
