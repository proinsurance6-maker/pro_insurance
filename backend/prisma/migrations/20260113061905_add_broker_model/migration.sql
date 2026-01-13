-- AlterTable
ALTER TABLE "commissions" ADD COLUMN     "broker_commission_amount" DECIMAL(12,2),
ADD COLUMN     "broker_id" UUID;

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "broker_id" UUID;

-- CreateTable
CREATE TABLE "brokers" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brokers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brokers_agent_id_idx" ON "brokers"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "brokers_agent_id_name_key" ON "brokers"("agent_id", "name");

-- CreateIndex
CREATE INDEX "commissions_broker_id_idx" ON "commissions"("broker_id");

-- AddForeignKey
ALTER TABLE "brokers" ADD CONSTRAINT "brokers_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
