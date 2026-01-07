'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { policyAPI, commissionAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, PieChart, BarChart3, Download } from 'lucide-react';

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalPolicies: 0,
    policyByType: {} as Record<string, number>,
    policyByCompany: {} as Record<string, number>,
    monthlyCommission: [] as Array<{ month: string; amount: number }>,
    totalCommission: 0,
    avgPolicyValue: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [policiesRes, commissionsRes] = await Promise.all([
        policyAPI.getAll(),
        commissionAPI.getAll(),
      ]);

      const policies = policiesRes.data.data;
      const commissions = commissionsRes.data.data;

      // Policy by type
      const policyByType: Record<string, number> = {};
      policies.forEach((p: any) => {
        policyByType[p.policyType] = (policyByType[p.policyType] || 0) + 1;
      });

      // Policy by company
      const policyByCompany: Record<string, number> = {};
      policies.forEach((p: any) => {
        const company = p.company?.name || 'Unknown';
        policyByCompany[company] = (policyByCompany[company] || 0) + 1;
      });

      // Monthly commission (last 6 months)
      const monthlyCommission = getMonthlyCommission(commissions);

      // Total commission
      const totalCommission = commissions.reduce(
        (sum: number, c: any) => sum + parseFloat(c.commissionAmount),
        0
      );

      // Average policy value
      const avgPolicyValue = policies.length > 0
        ? policies.reduce((sum: number, p: any) => sum + parseFloat(p.premiumAmount), 0) / policies.length
        : 0;

      setAnalytics({
        totalPolicies: policies.length,
        policyByType,
        policyByCompany,
        monthlyCommission,
        totalCommission,
        avgPolicyValue,
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setLoading(false);
    }
  };

  const getMonthlyCommission = (commissions: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const last6Months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = months[date.getMonth()];
      const year = date.getFullYear();
      
      const monthCommissions = commissions.filter((c: any) => {
        const cDate = new Date(c.createdAt);
        return cDate.getMonth() === date.getMonth() && cDate.getFullYear() === year;
      });

      const total = monthCommissions.reduce(
        (sum: number, c: any) => sum + parseFloat(c.commissionAmount),
        0
      );

      last6Months.push({
        month: `${monthName} ${year}`,
        amount: total,
      });
    }

    return last6Months;
  };

  const exportToCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Policies', analytics.totalPolicies],
      ['Total Commission', formatCurrency(analytics.totalCommission)],
      ['Average Policy Value', formatCurrency(analytics.avgPolicyValue)],
      [''],
      ['Policy Type Breakdown'],
      ...Object.entries(analytics.policyByType).map(([type, count]) => [type, count]),
      [''],
      ['Company Breakdown'],
      ...Object.entries(analytics.policyByCompany).map(([company, count]) => [company, count]),
      [''],
      ['Monthly Commission'],
      ...analytics.monthlyCommission.map((m) => [m.month, formatCurrency(m.amount)]),
    ];

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
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
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <div className="flex gap-4">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => router.push('/dashboard')}>Dashboard</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Commission Earned
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.totalCommission)}</div>
              <p className="text-xs text-gray-500 mt-1">Lifetime earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Policies
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalPolicies}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Policy Value
              </CardTitle>
              <PieChart className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.avgPolicyValue)}</div>
              <p className="text-xs text-gray-500 mt-1">Average premium</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Commission Trend */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Commission Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.monthlyCommission.map((item, index) => {
                const maxAmount = Math.max(...analytics.monthlyCommission.map(m => m.amount));
                const percentage = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                
                return (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{item.month}</span>
                      <span className="text-gray-600">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Policy Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Policy Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics.policyByType).map(([type, count]) => {
                  const percentage = analytics.totalPolicies > 0
                    ? ((count as number) / analytics.totalPolicies) * 100
                    : 0;
                  
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium capitalize">{type}</span>
                        <span className="text-gray-600">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Company Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Policies by Company</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics.policyByCompany)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 5)
                  .map(([company, count]) => {
                    const percentage = analytics.totalPolicies > 0
                      ? ((count as number) / analytics.totalPolicies) * 100
                      : 0;
                    
                    return (
                      <div key={company}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{company}</span>
                          <span className="text-gray-600">
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
