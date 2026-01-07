'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { subBrokerAPI, policyAPI, commissionAPI, companyAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Download, TrendingUp, Users, Building2 } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalPolicies: 0,
    totalBrokers: 0,
    topBrokers: [] as Array<{ name: string; commission: number; policies: number }>,
    topCompanies: [] as Array<{ name: string; policies: number; commission: number }>,
    monthlyGrowth: [] as Array<{ month: string; policies: number; revenue: number }>,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || role !== 'admin') {
      router.push('/login');
      return;
    }
    
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [brokersRes, policiesRes, commissionsRes, companiesRes] = await Promise.all([
        subBrokerAPI.getAll(),
        policyAPI.getAll(),
        commissionAPI.getAll(),
        companyAPI.getAll(),
      ]);

      const brokers = brokersRes.data.data;
      const policies = policiesRes.data.data;
      const commissions = commissionsRes.data.data;
      const companies = companiesRes.data.data;

      // Total revenue
      const totalRevenue = commissions.reduce(
        (sum: number, c: any) => sum + parseFloat(c.commissionAmount),
        0
      );

      // Top brokers by commission
      const brokerStats = new Map();
      commissions.forEach((c: any) => {
        const brokerId = c.subBrokerId;
        const broker = brokers.find((b: any) => b.id === brokerId);
        if (broker) {
          const existing = brokerStats.get(brokerId) || { name: broker.name, commission: 0, policies: 0 };
          existing.commission += parseFloat(c.commissionAmount);
          existing.policies += 1;
          brokerStats.set(brokerId, existing);
        }
      });
      const topBrokers = Array.from(brokerStats.values())
        .sort((a, b) => b.commission - a.commission)
        .slice(0, 5);

      // Top companies by policies
      const companyStats = new Map();
      policies.forEach((p: any) => {
        const companyId = p.companyId;
        const company = companies.find((c: any) => c.id === companyId);
        if (company) {
          const existing = companyStats.get(companyId) || { name: company.name, policies: 0, commission: 0 };
          existing.policies += 1;
          
          const policyCommissions = commissions.filter((c: any) => c.policyId === p.id);
          policyCommissions.forEach((c: any) => {
            existing.commission += parseFloat(c.commissionAmount);
          });
          
          companyStats.set(companyId, existing);
        }
      });
      const topCompanies = Array.from(companyStats.values())
        .sort((a, b) => b.policies - a.policies)
        .slice(0, 5);

      // Monthly growth (last 6 months)
      const monthlyGrowth = getMonthlyGrowth(policies, commissions);

      setAnalytics({
        totalRevenue,
        totalPolicies: policies.length,
        totalBrokers: brokers.length,
        topBrokers,
        topCompanies,
        monthlyGrowth,
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setLoading(false);
    }
  };

  const getMonthlyGrowth = (policies: any[], commissions: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const last6Months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = months[date.getMonth()];
      
      const monthPolicies = policies.filter((p: any) => {
        const pDate = new Date(p.createdAt);
        return pDate.getMonth() === date.getMonth() && pDate.getFullYear() === date.getFullYear();
      });

      const monthCommissions = commissions.filter((c: any) => {
        const cDate = new Date(c.createdAt);
        return cDate.getMonth() === date.getMonth() && cDate.getFullYear() === date.getFullYear();
      });

      const revenue = monthCommissions.reduce(
        (sum: number, c: any) => sum + parseFloat(c.commissionAmount),
        0
      );

      last6Months.push({
        month: monthName,
        policies: monthPolicies.length,
        revenue,
      });
    }

    return last6Months;
  };

  const exportReport = () => {
    const rows = [
      ['System Analytics Report'],
      ['Generated on:', new Date().toLocaleDateString()],
      [''],
      ['Overall Metrics'],
      ['Total Revenue', formatCurrency(analytics.totalRevenue)],
      ['Total Policies', analytics.totalPolicies],
      ['Total Sub-Brokers', analytics.totalBrokers],
      [''],
      ['Top Performing Brokers'],
      ['Broker Name', 'Commission', 'Policies'],
      ...analytics.topBrokers.map(b => [b.name, formatCurrency(b.commission), b.policies]),
      [''],
      ['Top Insurance Companies'],
      ['Company Name', 'Policies', 'Commission'],
      ...analytics.topCompanies.map(c => [c.name, c.policies, formatCurrency(c.commission)]),
      [''],
      ['Monthly Growth'],
      ['Month', 'Policies', 'Revenue'],
      ...analytics.monthlyGrowth.map(m => [m.month, m.policies, formatCurrency(m.revenue)]),
    ];

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">System Analytics</h1>
          <div className="flex gap-4">
            <Button onClick={exportReport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button onClick={() => router.push('/admin/dashboard')}>Dashboard</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
              <p className="text-xs text-gray-500 mt-1">All time commission</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Policies
              </CardTitle>
              <Building2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalPolicies}</div>
              <p className="text-xs text-gray-500 mt-1">Across all brokers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Brokers
              </CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalBrokers}</div>
              <p className="text-xs text-gray-500 mt-1">Sub-brokers in system</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Growth */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Monthly Growth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Policies
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.monthlyGrowth.map((item, index) => {
                    const maxRevenue = Math.max(...analytics.monthlyGrowth.map(m => m.revenue));
                    const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {item.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.policies}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Top Brokers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Brokers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topBrokers.map((broker, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{broker.name}</div>
                      <div className="text-sm text-gray-500">{broker.policies} policies</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(broker.commission)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Companies */}
          <Card>
            <CardHeader>
              <CardTitle>Top Insurance Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topCompanies.map((company, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{company.name}</div>
                      <div className="text-sm text-gray-500">{company.policies} policies</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">
                        {formatCurrency(company.commission)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
