'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { agentAPI, policyAPI, commissionAPI } from '@/lib/api';

interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  premiumAmount: number;
  startDate: string;
  endDate: string;
  client: {
    name: string;
  };
  company: {
    name: string;
  };
  documents?: Array<{
    id: string;
    documentType: string;
    documentName: string;
    documentUrl: string;
  }>;
}

interface Commission {
  id: string;
  commissionAmount: number;
  subAgentAmount: number | null;
  status: string;
  paidDate: string | null;
  policy: {
    policyNumber: string;
    startDate: string;
    client: {
      name: string;
    };
    company: {
      name: string;
    };
  };
}

interface SubAgent {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  subAgentCode: string;
  commissionPercentage: string;
  isActive: boolean;
  createdAt: string;
  aadharNumber?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  pincode?: string;
}

export default function SubAgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [subAgent, setSubAgent] = useState<SubAgent | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'policies' | 'commissions'>('info');

  useEffect(() => {
    if (params.id) {
      fetchSubAgentData();
    }
  }, [params.id]);

  const fetchSubAgentData = async () => {
    try {
      const subAgentId = params.id as string;
      
      const [subAgentRes, policiesRes, commissionsRes] = await Promise.all([
        agentAPI.getSubAgents(),
        policyAPI.getAll({ subAgentId }),
        commissionAPI.getSubAgentCommissions(subAgentId)
      ]);

      // Find the specific sub-agent
      const subAgents = Array.isArray(subAgentRes.data.data) ? subAgentRes.data.data : [];
      const foundSubAgent = subAgents.find((sa: SubAgent) => sa.id === subAgentId);
      
      setSubAgent(foundSubAgent || null);
      setPolicies(Array.isArray(policiesRes.data.data?.policies) ? policiesRes.data.data.policies : []);
      setCommissions(Array.isArray(commissionsRes.data.data) ? commissionsRes.data.data : []);
    } catch (error) {
      console.error('Failed to fetch sub-agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this sub-agent?')) return;
    
    try {
      await agentAPI.deleteSubAgent(params.id as string);
      router.push('/dashboard/sub-agents');
    } catch (error) {
      console.error('Failed to delete sub-agent:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subAgent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-800">Sub-Agent not found</h2>
        <Link href="/dashboard/sub-agents" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Sub-Agents
        </Link>
      </div>
    );
  }

  const totalPremium = policies.reduce((sum, p) => sum + Number(p.premiumAmount), 0);
  const totalCommission = commissions.reduce((sum, c) => sum + Number(c.subAgentAmount || 0), 0);
  const paidCommission = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.subAgentAmount || 0), 0);
  const pendingCommission = totalCommission - paidCommission;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/sub-agents" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Sub-Agents
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {subAgent.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{subAgent.name}</h1>
              <p className="text-gray-600">{subAgent.subAgentCode} • {subAgent.phone}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className={subAgent.isActive ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-700 border-red-300'}
          >
            {subAgent.isActive ? '✓ Active' : '✕ Inactive'}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{policies.length}</p>
            <p className="text-sm text-gray-500">Total Policies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalPremium)}</p>
            <p className="text-sm text-gray-500">Total Premium</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paidCommission)}</p>
            <p className="text-sm text-gray-500">Paid Commission</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(pendingCommission)}</p>
            <p className="text-sm text-gray-500">Pending Commission</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-8">
          {(['info', 'policies', 'commissions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'info' && 'Information'}
              {tab === 'policies' && `Policies (${policies.length})`}
              {tab === 'commissions' && `Commission Ledger (${commissions.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoRow label="Full Name" value={subAgent.name} />
              <InfoRow label="Sub-Agent Code" value={subAgent.subAgentCode} />
              <InfoRow label="Phone" value={subAgent.phone} />
              <InfoRow label="Email" value={subAgent.email || '-'} />
              <InfoRow label="Commission %" value={`${subAgent.commissionPercentage}%`} />
              <InfoRow label="Status" value={subAgent.isActive ? 'Active' : 'Inactive'} />
              <InfoRow label="Address" value={subAgent.address || '-'} />
              <InfoRow label="City" value={subAgent.city || '-'} />
              <InfoRow label="Pincode" value={subAgent.pincode || '-'} />
              <InfoRow label="Aadhar" value={subAgent.aadharNumber || '-'} />
              <InfoRow label="PAN" value={subAgent.panNumber || '-'} />
              <InfoRow label="Joined On" value={formatDate(subAgent.createdAt)} />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900">Policies ({policies.length})</h3>
          </div>
          {policies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No policies assigned to this sub-agent
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {policies.map((policy) => (
                <div key={policy.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition">
                  {/* Main Row */}
                  <div className="p-4 bg-white hover:bg-gray-50">
                    <div className="grid grid-cols-6 gap-4 items-center">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(policy.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Policy No</p>
                        <Link 
                          href={`/dashboard/policies/${policy.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 truncate"
                        >
                          {policy.policyNumber}
                        </Link>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Client</p>
                        <p className="text-sm text-gray-900 truncate">{policy.client.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Company</p>
                        <p className="text-sm text-gray-600 truncate">{policy.company.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Type</p>
                        <p className="text-sm text-gray-600">{policy.policyType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Premium</p>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(policy.premiumAmount)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Documents Section */}
                  {policy.documents && policy.documents.length > 0 && (
                    <div className="bg-gray-50 border-t border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                        📄 Attached Documents ({policy.documents.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {policy.documents.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition text-xs font-medium text-gray-700"
                            title={`Download ${doc.documentName}`}
                          >
                            {doc.documentType === 'POLICY_PDF' || doc.documentType === 'POLICYCOPY' ? '📋' : '📑'}
                            <span className="truncate max-w-[150px]">{doc.documentName || doc.documentType}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'commissions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900">Commission Ledger ({commissions.length})</h3>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="p-4 text-center">
                <p className="text-xl font-bold text-blue-600">{formatCurrency(totalCommission)}</p>
                <p className="text-sm text-gray-600">Total Commission</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-xl font-bold text-green-600">{formatCurrency(paidCommission)}</p>
                <p className="text-sm text-gray-600">Paid</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50">
              <CardContent className="p-4 text-center">
                <p className="text-xl font-bold text-orange-600">{formatCurrency(pendingCommission)}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </CardContent>
            </Card>
          </div>

          {commissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No commission records found
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Policy No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Company</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Commission</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">Paid Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {commissions.map((commission) => (
                    <tr key={commission.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(commission.policy.startDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {commission.policy.policyNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{commission.policy.client.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{commission.policy.company.name}</td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-gray-900">
                        {formatCurrency(commission.subAgentAmount || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          commission.status === 'paid' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {commission.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {commission.paidDate ? formatDate(commission.paidDate) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  );
}
