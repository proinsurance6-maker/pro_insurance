'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { commissionAPI } from '@/lib/api';

interface Commission {
  id: string;
  commissionAmount: number;
  commissionRate: number;
  isPaid: boolean;
  paidAt: string | null;
  policy: {
    id: string;
    policyNumber: string;
    policyType: string;
    premiumAmount: number;
    startDate: string;
    client: {
      name: string;
    };
    company: {
      name: string;
    };
  };
}

interface CommissionSummary {
  total: number;
  paid: number;
  pending: number;
  byCompany: {
    companyName: string;
    total: number;
    paid: number;
    pending: number;
  }[];
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      const response = await commissionAPI.getAll();
      const data = response.data.data.commissions || [];
      setCommissions(data);
      
      // Calculate summary
      const total = data.reduce((sum: number, c: Commission) => sum + c.commissionAmount, 0);
      const paid = data.filter((c: Commission) => c.isPaid).reduce((sum: number, c: Commission) => sum + c.commissionAmount, 0);
      const pending = total - paid;
      
      // Group by company
      const companyMap = new Map();
      data.forEach((c: Commission) => {
        const companyName = c.policy.company.name;
        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, { companyName, total: 0, paid: 0, pending: 0 });
        }
        const entry = companyMap.get(companyName);
        entry.total += c.commissionAmount;
        if (c.isPaid) {
          entry.paid += c.commissionAmount;
        } else {
          entry.pending += c.commissionAmount;
        }
      });
      
      setSummary({
        total,
        paid,
        pending,
        byCompany: Array.from(companyMap.values())
      });
    } catch (error) {
      console.error('Failed to fetch commissions:', error);
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
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleMarkPaid = async (id: string) => {
    setMarkingPaid(id);
    try {
      await commissionAPI.markPaid(id);
      fetchCommissions();
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleBulkMarkPaid = async () => {
    const pendingIds = filteredCommissions.filter(c => !c.isPaid).map(c => c.id);
    if (pendingIds.length === 0) return;
    
    if (!confirm(`Mark ${pendingIds.length} commissions as paid?`)) return;
    
    try {
      await commissionAPI.bulkMarkPaid(pendingIds);
      fetchCommissions();
    } catch (error) {
      console.error('Failed to bulk mark as paid:', error);
    }
  };

  const companies = summary?.byCompany.map(c => c.companyName) || [];
  
  const filteredCommissions = commissions.filter(c => {
    if (filter === 'paid' && !c.isPaid) return false;
    if (filter === 'pending' && c.isPaid) return false;
    if (selectedCompany !== 'all' && c.policy.company.name !== selectedCompany) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Commissions</h1>
          <p className="text-gray-600">Track your policy commissions</p>
        </div>
        {filter === 'pending' && filteredCommissions.length > 0 && (
          <Button onClick={handleBulkMarkPaid}>
            Mark All as Paid ({filteredCommissions.filter(c => !c.isPaid).length})
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilter('all')}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-800">
                {formatCurrency(summary?.total || 0)}
              </p>
              <p className="text-sm text-gray-500">Total Commission</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilter('paid')}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(summary?.paid || 0)}
              </p>
              <p className="text-sm text-gray-500">Received</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilter('pending')}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">
                {formatCurrency(summary?.pending || 0)}
              </p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company-wise Summary */}
      {summary && summary.byCompany.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Company-wise Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-gray-600">Company</th>
                    <th className="pb-3 font-medium text-gray-600 text-right">Total</th>
                    <th className="pb-3 font-medium text-gray-600 text-right">Received</th>
                    <th className="pb-3 font-medium text-gray-600 text-right">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byCompany.map((company, idx) => (
                    <tr 
                      key={idx} 
                      className="border-b last:border-0 cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedCompany(company.companyName)}
                    >
                      <td className="py-3">{company.companyName}</td>
                      <td className="py-3 text-right">{formatCurrency(company.total)}</td>
                      <td className="py-3 text-right text-green-600">{formatCurrency(company.paid)}</td>
                      <td className="py-3 text-right text-orange-600">{formatCurrency(company.pending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {['all', 'paid', 'pending'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="all">All Companies</option>
          {companies.map((company) => (
            <option key={company} value={company}>{company}</option>
          ))}
        </select>
      </div>

      {/* Commission List */}
      {filteredCommissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No commissions found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCommissions.map((commission) => (
            <Card key={commission.id} className="hover:shadow-md transition">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`px-3 py-2 rounded-lg text-center ${
                      commission.isPaid ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      <p className="text-lg font-bold">{commission.commissionRate}%</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{commission.policy.client.name}</h3>
                      <p className="text-sm text-gray-600">{commission.policy.company.name}</p>
                      <p className="text-sm text-gray-500">
                        {commission.policy.policyNumber} • {commission.policy.policyType}
                      </p>
                      <p className="text-sm text-gray-500">
                        Premium: {formatCurrency(commission.policy.premiumAmount)} • 
                        Policy Date: {formatDate(commission.policy.startDate)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-lg">{formatCurrency(commission.commissionAmount)}</p>
                      {commission.isPaid && commission.paidAt && (
                        <p className="text-xs text-gray-500">Paid on {formatDate(commission.paidAt)}</p>
                      )}
                    </div>
                    
                    {!commission.isPaid && (
                      <Button 
                        size="sm"
                        onClick={() => handleMarkPaid(commission.id)}
                        disabled={markingPaid === commission.id}
                      >
                        {markingPaid === commission.id ? '...' : '✓ Mark Paid'}
                      </Button>
                    )}
                    
                    {commission.isPaid && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        ✓ Paid
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
