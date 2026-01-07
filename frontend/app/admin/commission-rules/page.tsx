'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { commissionRuleAPI, companyAPI } from '@/lib/api';

export default function CommissionRulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    companyId: '',
    policyType: 'health',
    tierRules: [
      { minPremium: 0, maxPremium: 50000, rate: 5 },
      { minPremium: 50001, maxPremium: 100000, rate: 7 },
      { minPremium: 100001, maxPremium: null, rate: 10 },
    ],
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || role !== 'admin') {
      router.push('/login');
      return;
    }
    
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesRes, companiesRes] = await Promise.all([
        commissionRuleAPI.getAll(),
        companyAPI.getAll(),
      ]);
      setRules(rulesRes.data.data);
      setCompanies(companiesRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await commissionRuleAPI.create({
        ...formData,
        companyId: parseInt(formData.companyId),
      });
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this commission rule?')) return;
    
    try {
      await commissionRuleAPI.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const updateTier = (index: number, field: string, value: any) => {
    const newTiers = [...formData.tierRules];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setFormData({ ...formData, tierRules: newTiers });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Commission Rules</h1>
          <div className="flex gap-4">
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Add Rule'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Rule Form */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add Commission Rule</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Insurance Company
                    </label>
                    <select
                      required
                      value={formData.companyId}
                      onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Policy Type
                    </label>
                    <select
                      value={formData.policyType}
                      onChange={(e) => setFormData({ ...formData, policyType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="health">Health</option>
                      <option value="life">Life</option>
                      <option value="motor">Motor</option>
                      <option value="term">Term</option>
                    </select>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Commission Tiers</h4>
                  {formData.tierRules.map((tier, index) => (
                    <div key={index} className="grid grid-cols-3 gap-4 mb-3">
                      <Input
                        type="number"
                        placeholder="Min Premium"
                        value={tier.minPremium}
                        onChange={(e) => updateTier(index, 'minPremium', parseInt(e.target.value))}
                      />
                      <Input
                        type="number"
                        placeholder="Max Premium (optional)"
                        value={tier.maxPremium || ''}
                        onChange={(e) => updateTier(index, 'maxPremium', e.target.value ? parseInt(e.target.value) : null)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Rate %"
                        value={tier.rate}
                        onChange={(e) => updateTier(index, 'rate', parseFloat(e.target.value))}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button type="submit">Create Rule</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Rules List */}
        <Card>
          <CardHeader>
            <CardTitle>All Commission Rules ({rules.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {rule.company?.name} - {rule.policyType}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Status: {rule.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(rule.id)}
                    >
                      Delete
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Min Premium
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Max Premium
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Commission Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rule.tierRules.map((tier: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm">₹{tier.minPremium.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2 text-sm">
                              {tier.maxPremium ? `₹${tier.maxPremium.toLocaleString('en-IN')}` : 'No limit'}
                            </td>
                            <td className="px-4 py-2 text-sm font-semibold">{tier.rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
