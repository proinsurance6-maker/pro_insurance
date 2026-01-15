-- AlterTable
ALTER TABLE "agents" ADD COLUMN "otp" TEXT,
ADD COLUMN "otp_expiry" TIMESTAMP(3);
