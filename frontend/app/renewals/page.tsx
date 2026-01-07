'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { renewalAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { AlertCircle, CheckCircle, Calendar } from 'lucide-react';

export default function RenewalsPage() {
  const router = useRouter();
  const [renewals, setRenewals] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'renewed'>('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadRenewals();
  }, [filter]);

  const loadRenewals = async () => {
    try {
      let res;
      if (filter === 'upcoming') {
        res = await renewalAPI.getUpcoming();
      } else {
        res = await renewalAPI.getAll();
      }
      
      let data = res.data.data;
      
      if (filter === 'renewed') {
        data = data.filter((r: any) => r.isRenewed);
      } else if (filter === 'upcoming') {
        data = data.filter((r: any) => !r.isRenewed);
      }
      
      setRenewals(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load renewals:', error);
      setLoading(false);
    }
  };

  const markAsRenewed = async (id: number) => {
    try {
      await renewalAPI.markAsRenewed(String(id), {});
      loadRenewals();
    } catch (error) {
      console.error('Failed to mark as renewed:', error);
    }
  };

  const getDaysUntilRenewal = (renewalDate: string) => {
    const today = new Date();
    const renewal = new Date(renewalDate);
    const diffTime = renewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyBadge = (days: number) => {
    if (days < 0) return 'bg-red-100 text-red-800';
    if (days <= 7) return 'bg-orange-100 text-orange-800';
    if (days <= 30) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const upcomingCount = renewals.filter(r => !r.isRenewed && getDaysUntilRenewal(r.renewalDate) >= 0).length;
  const overdueCount = renewals.filter(r => !r.isRenewed && getDaysUntilRenewal(r.renewalDate) < 0).length;
  const renewedCount = renewals.filter(r => r.isRenewed).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Renewals</h1>
          <Button onClick={() => router.push('/dashboard')}>Dashboard</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Upcoming Renewals
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingCount}</div>
              <p className="text-xs text-gray-500 mt-1">Due within 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Overdue Renewals
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
              <p className="text-xs text-gray-500 mt-1">Needs immediate attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Completed Renewals
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{renewedCount}</div>
              <p className="text-xs text-gray-500 mt-1">Successfully renewed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex gap-4">
          <Button
            onClick={() => setFilter('upcoming')}
            variant={filter === 'upcoming' ? 'default' : 'outline'}
          >
            Upcoming
          </Button>
          <Button
            onClick={() => setFilter('renewed')}
            variant={filter === 'renewed' ? 'default' : 'outline'}
          >
            Renewed
          </Button>
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
          >
            All
          </Button>
        </div>

        {/* Renewals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Renewal List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Policy Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Renewal Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Days Until
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {renewals.map((renewal) => {
                    const daysUntil = getDaysUntilRenewal(renewal.renewalDate);
                    return (
                      <tr key={renewal.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {renewal.policy?.policyNumber || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {renewal.policy?.customerName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {renewal.company?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(renewal.renewalDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getUrgencyBadge(daysUntil)}`}>
                            {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renewal.isRenewed ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Renewed
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {!renewal.isRenewed && (
                            <Button
                              onClick={() => markAsRenewed(renewal.id)}
                            >
                              Mark Renewed
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
