-- AlterTable
ALTER TABLE "sub_agents" ADD COLUMN     "kyc_documents" TEXT,
ADD COLUMN     "kyc_status" TEXT NOT NULL DEFAULT 'PENDING';
