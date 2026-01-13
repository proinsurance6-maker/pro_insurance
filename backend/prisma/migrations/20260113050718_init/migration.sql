-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AGENT', 'SUB_AGENT', 'CLIENT');

-- CreateEnum
CREATE TYPE "TeamMode" AS ENUM ('SOLO', 'TEAM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "PolicySource" AS ENUM ('RENEWAL', 'SWITCH', 'NEW');

-- CreateEnum
CREATE TYPE "PaymentBy" AS ENUM ('AGENT', 'SUB_AGENT', 'CLIENT');

-- CreateEnum
CREATE TYPE "MotorPolicyType" AS ENUM ('COMPREHENSIVE', 'OD_ONLY', 'TP_ONLY');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAAR', 'PAN', 'RC', 'POLICY_PDF', 'OTHER');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" UUID NOT NULL,
    "agent_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "pin" TEXT,
    "password_hash" TEXT,
    "address" TEXT,
    "pan_number" TEXT,
    "aadhaar_number" TEXT,
    "bank_details" JSONB,
    "team_mode" "TeamMode" NOT NULL DEFAULT 'SOLO',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_agents" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "sub_agent_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "pan_number" TEXT,
    "commission_percentage" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "ledger_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "client_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "date_of_birth" DATE,
    "pan_number" TEXT,
    "aadhaar_number" TEXT,
    "pending_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "date_of_birth" DATE,
    "pan_number" TEXT,
    "aadhaar_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trial_start_date" DATE NOT NULL,
    "trial_end_date" DATE NOT NULL,
    "current_period_start" DATE,
    "current_period_end" DATE,
    "monthly_amount" DECIMAL(10,2) NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_method" TEXT NOT NULL,
    "transaction_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL,
    "policy_number" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "sub_agent_id" UUID,
    "client_id" UUID NOT NULL,
    "family_member_id" UUID,
    "policy_type" TEXT NOT NULL,
    "motor_policy_type" TEXT,
    "plan_name" TEXT,
    "policy_source" "PolicySource" NOT NULL DEFAULT 'NEW',
    "previous_policy_id" UUID,
    "sum_assured" DECIMAL(15,2),
    "premium_amount" DECIMAL(12,2) NOT NULL,
    "od_premium" DECIMAL(12,2),
    "tp_premium" DECIMAL(12,2),
    "net_premium" DECIMAL(12,2),
    "premium_frequency" TEXT NOT NULL DEFAULT 'yearly',
    "premium_paid_by" "PaymentBy" NOT NULL DEFAULT 'CLIENT',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "issue_date" DATE,
    "vehicle_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "policy_document_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "sub_agent_id" UUID,
    "company_id" UUID NOT NULL,
    "total_commission_percent" DECIMAL(5,2) NOT NULL,
    "total_commission_amount" DECIMAL(12,2) NOT NULL,
    "od_commission_percent" DECIMAL(5,2),
    "od_commission_amount" DECIMAL(12,2),
    "tp_commission_percent" DECIMAL(5,2),
    "tp_commission_amount" DECIMAL(12,2),
    "net_commission_percent" DECIMAL(5,2),
    "net_commission_amount" DECIMAL(12,2),
    "renewal_commission_percent" DECIMAL(5,2),
    "agent_commission_amount" DECIMAL(12,2) NOT NULL,
    "sub_agent_commission_amount" DECIMAL(12,2),
    "sub_agent_share_percent" DECIMAL(5,2),
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "received_from_company" BOOLEAN NOT NULL DEFAULT false,
    "received_date" DATE,
    "paid_to_sub_agent" BOOLEAN NOT NULL DEFAULT false,
    "paid_to_sub_agent_date" DATE,
    "commission_type" TEXT NOT NULL DEFAULT 'new_business',
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "sub_agent_id" UUID,
    "client_id" UUID,
    "policy_id" UUID,
    "entry_type" "LedgerType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "entry_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renewals" (
    "id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "renewal_date" DATE NOT NULL,
    "reminder_30_days_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_30_days_sent_at" TIMESTAMP(3),
    "reminder_15_days_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_15_days_sent_at" TIMESTAMP(3),
    "reminder_7_days_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_7_days_sent_at" TIMESTAMP(3),
    "reminder_1_day_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_1_day_sent_at" TIMESTAMP(3),
    "whatsapp_sent" BOOLEAN NOT NULL DEFAULT false,
    "renewal_status" TEXT NOT NULL DEFAULT 'pending',
    "renewal_action" TEXT,
    "renewed_at" TIMESTAMP(3),
    "renewed_policy_id" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "agent_id" UUID,
    "client_id" UUID,
    "family_member_id" UUID,
    "policy_id" UUID,
    "document_type" "DocumentType" NOT NULL,
    "document_name" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliations" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "statement_month" DATE NOT NULL,
    "expected_amount" DECIMAL(12,2) NOT NULL,
    "received_amount" DECIMAL(12,2) NOT NULL,
    "difference_amount" DECIMAL(12,2) NOT NULL,
    "is_disputed" BOOLEAN NOT NULL DEFAULT false,
    "dispute_remarks" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "agent_id" UUID,
    "client_id" UUID,
    "purpose" TEXT NOT NULL DEFAULT 'login',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agents_agent_code_key" ON "agents"("agent_code");

-- CreateIndex
CREATE UNIQUE INDEX "agents_email_key" ON "agents"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agents_phone_key" ON "agents"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "sub_agents_sub_agent_code_key" ON "sub_agents"("sub_agent_code");

-- CreateIndex
CREATE INDEX "sub_agents_agent_id_idx" ON "sub_agents"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_client_code_key" ON "clients"("client_code");

-- CreateIndex
CREATE INDEX "clients_agent_id_idx" ON "clients"("agent_id");

-- CreateIndex
CREATE INDEX "clients_phone_idx" ON "clients"("phone");

-- CreateIndex
CREATE INDEX "family_members_client_id_idx" ON "family_members"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_agent_id_key" ON "subscriptions"("agent_id");

-- CreateIndex
CREATE INDEX "payments_subscription_id_idx" ON "payments"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_companies_name_key" ON "insurance_companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_companies_code_key" ON "insurance_companies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "policies_policy_number_key" ON "policies"("policy_number");

-- CreateIndex
CREATE INDEX "policies_company_id_idx" ON "policies"("company_id");

-- CreateIndex
CREATE INDEX "policies_agent_id_idx" ON "policies"("agent_id");

-- CreateIndex
CREATE INDEX "policies_client_id_idx" ON "policies"("client_id");

-- CreateIndex
CREATE INDEX "policies_end_date_idx" ON "policies"("end_date");

-- CreateIndex
CREATE INDEX "policies_status_idx" ON "policies"("status");

-- CreateIndex
CREATE INDEX "commissions_policy_id_idx" ON "commissions"("policy_id");

-- CreateIndex
CREATE INDEX "commissions_agent_id_idx" ON "commissions"("agent_id");

-- CreateIndex
CREATE INDEX "commissions_payment_status_idx" ON "commissions"("payment_status");

-- CreateIndex
CREATE INDEX "ledger_entries_agent_id_idx" ON "ledger_entries"("agent_id");

-- CreateIndex
CREATE INDEX "ledger_entries_sub_agent_id_idx" ON "ledger_entries"("sub_agent_id");

-- CreateIndex
CREATE INDEX "ledger_entries_client_id_idx" ON "ledger_entries"("client_id");

-- CreateIndex
CREATE INDEX "ledger_entries_entry_date_idx" ON "ledger_entries"("entry_date");

-- CreateIndex
CREATE INDEX "renewals_policy_id_idx" ON "renewals"("policy_id");

-- CreateIndex
CREATE INDEX "renewals_renewal_date_idx" ON "renewals"("renewal_date");

-- CreateIndex
CREATE INDEX "renewals_renewal_status_idx" ON "renewals"("renewal_status");

-- CreateIndex
CREATE INDEX "documents_agent_id_idx" ON "documents"("agent_id");

-- CreateIndex
CREATE INDEX "documents_client_id_idx" ON "documents"("client_id");

-- CreateIndex
CREATE INDEX "documents_family_member_id_idx" ON "documents"("family_member_id");

-- CreateIndex
CREATE INDEX "reconciliations_agent_id_idx" ON "reconciliations"("agent_id");

-- CreateIndex
CREATE INDEX "reconciliations_company_id_idx" ON "reconciliations"("company_id");

-- CreateIndex
CREATE INDEX "reconciliations_statement_month_idx" ON "reconciliations"("statement_month");

-- CreateIndex
CREATE INDEX "otp_codes_phone_idx" ON "otp_codes"("phone");

-- CreateIndex
CREATE INDEX "otp_codes_code_idx" ON "otp_codes"("code");

-- AddForeignKey
ALTER TABLE "sub_agents" ADD CONSTRAINT "sub_agents_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "insurance_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_sub_agent_id_fkey" FOREIGN KEY ("sub_agent_id") REFERENCES "sub_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_sub_agent_id_fkey" FOREIGN KEY ("sub_agent_id") REFERENCES "sub_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "insurance_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_sub_agent_id_fkey" FOREIGN KEY ("sub_agent_id") REFERENCES "sub_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renewals" ADD CONSTRAINT "renewals_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "insurance_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
