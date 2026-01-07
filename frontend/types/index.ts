export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUB_BROKER';
  brokerCode: string;
  phone?: string;
  joiningDate: string;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

export interface Policy {
  id: string;
  policyNumber: string;
  companyId: string;
  subBrokerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  policyType: string;
  premiumAmount: number;
  startDate: string;
  endDate: string;
  status: string;
  company?: Company;
  subBroker?: {
    id: string;
    name: string;
    brokerCode: string;
  };
  commissions?: Commission[];
  renewals?: Renewal[];
}

export interface Commission {
  id: string;
  policyId: string;
  commissionPercentage: number;
  commissionAmount: number;
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  paymentDate?: string;
  policy?: Policy;
  company?: Company;
}

export interface Renewal {
  id: string;
  policyId: string;
  renewalDate: string;
  renewalStatus: 'pending' | 'completed' | 'lapsed';
  policy?: Policy;
}

export interface CommissionRule {
  id: string;
  companyId: string;
  policyType: string;
  tierRules: Array<{
    minPremium: number;
    maxPremium: number | null;
    rate: number;
  }>;
  effectiveFrom: string;
  effectiveTo?: string;
  company?: Company;
}

export interface DashboardStats {
  totalPolicies: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  upcomingRenewals: number;
}
