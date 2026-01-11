'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { agentAPI, renewalAPI } from '@/lib/api';

interface DashboardStats {
  totalClients: number;
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  totalCommission: number;
  pendingCommission: number;
  pendingCollection: number;
  renewalsDue30Days: number;
}

interface UpcomingRenewal {
  id: string;
  renewalDate: string;
  policy: {
    policyNumber: string;
    client: {
      name: string;
      phone: string;
    };
    company: {
      name: string;
    };
    premiumAmount: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingRenewals, setUpcomingRenewals] = useState<UpcomingRenewal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, renewalsRes] = await Promise.all([
        agentAPI.getDashboard(),
        renewalAPI.getUpcoming(7)
      ]);
      
      setStats(dashboardRes.data.data.stats);
      setUpcomingRenewals(renewalsRes.data.data.renewals?.slice(0, 5) || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={stats?.totalClients || 0}
          icon={<UsersIcon />}
          color="blue"
          href="/dashboard/clients"
        />
        <StatCard
          title="Active Policies"
          value={stats?.activePolicies || 0}
          icon={<DocumentIcon />}
          color="green"
          href="/dashboard/policies"
        />
        <StatCard
          title="Renewals Due"
          value={stats?.renewalsDue30Days || 0}
          icon={<CalendarIcon />}
          color="orange"
          href="/dashboard/renewals"
        />
        <StatCard
          title="Pending Collection"
          value={formatCurrency(stats?.pendingCollection || 0)}
          icon={<WalletIcon />}
          color="red"
          href="/dashboard/ledger"
        />
      </div>

      {/* Commission Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <p className="text-blue-100 text-sm">Total Premium</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(stats?.totalPremium || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <p className="text-green-100 text-sm">Total Commission</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(stats?.totalCommission || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
          <CardContent className="p-6">
            <p className="text-yellow-100 text-sm">Pending Commission</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(stats?.pendingCommission || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Upcoming Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link 
              href="/dashboard/clients/new"
              className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
                <PlusUserIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">Add Client</span>
            </Link>
            <Link 
              href="/dashboard/policies/new"
              className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                <PlusDocIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">Add Policy</span>
            </Link>
            <Link 
              href="/dashboard/ledger"
              className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-2">
                <CollectIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">Collect Payment</span>
            </Link>
            <Link 
              href="/dashboard/renewals"
              className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-2">
                <RenewalIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">View Renewals</span>
            </Link>
          </CardContent>
        </Card>

        {/* Upcoming Renewals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Upcoming Renewals (7 days)</CardTitle>
            <Link href="/dashboard/renewals" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingRenewals.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No renewals due in next 7 days</p>
            ) : (
              <div className="space-y-3">
                {upcomingRenewals.map((renewal) => (
                  <div key={renewal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{renewal.policy.client.name}</p>
                      <p className="text-sm text-gray-500">
                        {renewal.policy.company.name} • {renewal.policy.policyNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-orange-600">{formatDate(renewal.renewalDate)}</p>
                      <p className="text-sm text-gray-500">{formatCurrency(renewal.policy.premiumAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'red';
  href: string;
}

function StatCard({ title, value, icon, color, href }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{title}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Icon Components
function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function PlusUserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function PlusDocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CollectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function RenewalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
