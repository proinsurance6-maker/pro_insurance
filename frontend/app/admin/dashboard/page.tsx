'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { subBrokerAPI, companyAPI, policyAPI, commissionAPI } from '@/lib/api';
import { Users, Building2, FileText, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalBrokers: 0,
    totalCompanies: 0,
    totalPolicies: 0,
    totalCommissions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
    
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [brokersRes, companiesRes, policiesRes, commissionsRes] = await Promise.all([
        subBrokerAPI.getAll(),
        companyAPI.getAll(),
        policyAPI.getAll(),
        commissionAPI.getAll(),
      ]);

      setStats({
        totalBrokers: brokersRes.data.data.length,
        totalCompanies: companiesRes.data.data.length,
        totalPolicies: policiesRes.data.data.length,
        totalCommissions: commissionsRes.data.data.reduce(
          (sum: number, c: any) => sum + parseFloat(c.commissionAmount),
          0
        ),
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Sub-Brokers
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBrokers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Insurance Companies
              </CardTitle>
              <Building2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Policies
              </CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPolicies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Commissions
              </CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{stats.totalCommissions.toLocaleString('en-IN')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                className="h-24"
                variant="outline"
                onClick={() => router.push('/admin/brokers')}
              >
                <div className="flex flex-col items-center">
                  <Users className="h-8 w-8 mb-2" />
                  <span>Manage Sub-Brokers</span>
                </div>
              </Button>

              <Button
                className="h-24"
                variant="outline"
                onClick={() => router.push('/admin/companies')}
              >
                <div className="flex flex-col items-center">
                  <Building2 className="h-8 w-8 mb-2" />
                  <span>Manage Companies</span>
                </div>
              </Button>

              <Button
                className="h-24"
                variant="outline"
                onClick={() => router.push('/admin/bulk-upload')}
              >
                <div className="flex flex-col items-center">
                  <FileText className="h-8 w-8 mb-2" />
                  <span>Bulk Upload Policies</span>
                </div>
              </Button>

              <Button
                className="h-24"
                variant="outline"
                onClick={() => router.push('/admin/commission-rules')}
              >
                <div className="flex flex-col items-center">
                  <DollarSign className="h-8 w-8 mb-2" />
                  <span>Commission Rules</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Link */}
        <Card>
          <CardHeader>
            <CardTitle>Reports & Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => router.push('/admin/analytics')}
            >
              View System Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
