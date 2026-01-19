'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { agentAPI, policyAPI, ledgerAPI, commissionAPI } from '@/lib/api';

interface PolicyDocument {
  id: string;
  documentType: string;
  documentName: string;
  documentUrl: string;
}

interface PolicyCommission {
  id: string;
  totalCommissionAmount: string;
  subAgentCommissionAmount: string;
  odCommissionPercent?: string;
  tpCommissionPercent?: string;
  netCommissionPercent?: string;
  subAgentOdPercent?: string;
  subAgentTpPercent?: string;
  subAgentNetPercent?: string;
  paidToSubAgent: boolean;
  paidToSubAgentDate?: string;
  remarks?: string;
}

interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  premiumAmount: string;
  odPremium?: string;
  tpPremium?: string;
  netPremium?: string;
  vehicleNumber?: string;
  startDate: string;
  endDate: string;
  client: {
    id: string;
    name: string;
    phone: string;
  };
  company: {
    id: string;
    name: string;
  };
  documents?: PolicyDocument[];
  commissions?: PolicyCommission[];
}

interface LedgerEntry {
  id: string;
  entryType: 'CREDIT' | 'DEBIT';
  amount: string;
  description: string;
  entryDate: string;
  reference?: string;
  policy?: {
    id: string;
    policyNumber: string;
  };
}

interface SubAgent {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  subAgentCode: string;
  commissionPercentage: string;
  ledgerBalance: string;
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
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'policies' | 'ledger'>('info');
  const [ledgerSubTab, setLedgerSubTab] = useState<'all' | 'receivable' | 'paid'>('all');
  
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<PolicyDocument[]>([]);
  const [selectedPolicyNumber, setSelectedPolicyNumber] = useState('');

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutDescription, setPayoutDescription] = useState('');
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Mark paid modal
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<{id: string; amount: string; policyNumber: string} | null>(null);
  const [markPaidData, setMarkPaidData] = useState({
    paidDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  useEffect(() => {
    if (params.id) {
      fetchSubAgentData();
    }
  }, [params.id]);

  const fetchSubAgentData = async () => {
    try {
      const subAgentId = params.id as string;
      
      const [subAgentRes, policiesRes] = await Promise.all([
        agentAPI.getSubAgents(),
        policyAPI.getAll({ subAgentId }),
      ]);

      const subAgents = Array.isArray(subAgentRes.data.data) ? subAgentRes.data.data : [];
      const foundSubAgent = subAgents.find((sa: SubAgent) => sa.id === subAgentId);
      
      setSubAgent(foundSubAgent || null);
      setPolicies(Array.isArray(policiesRes.data.data?.policies) ? policiesRes.data.data.policies : []);
      
      try {
        const ledgerRes = await ledgerAPI.getSubAgentLedger(subAgentId);
        setLedgerEntries(Array.isArray(ledgerRes.data.data) ? ledgerRes.data.data : []);
      } catch {
        setLedgerEntries([]);
      }
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

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutAmount || Number(payoutAmount) <= 0) return;
    
    setSubmitting(true);
    try {
      await ledgerAPI.createSubAgentPayout({
        subAgentId: params.id as string,
        amount: parseFloat(payoutAmount),
        description: payoutDescription || 'Commission Payout',
        entryDate: payoutDate,
      });
      
      setShowPayoutModal(false);
      setPayoutAmount('');
      setPayoutDescription('');
      fetchSubAgentData();
    } catch (error) {
      console.error('Failed to create payout:', error);
      alert('Failed to record payout. API may not be available yet.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommission) return;
    
    setSubmitting(true);
    try {
      await commissionAPI.markPaidToSubAgent(selectedCommission.id, {
        paidDate: markPaidData.paidDate,
        remarks: markPaidData.remarks || undefined,
      });
      
      setShowMarkPaidModal(false);
      setSelectedCommission(null);
      setMarkPaidData({ paidDate: new Date().toISOString().split('T')[0], remarks: '' });
      fetchSubAgentData();
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      alert('Failed to mark commission as paid');
    } finally {
      setSubmitting(false);
    }
  };

  const openMarkPaidModal = (commission: PolicyCommission, policyNumber: string) => {
    setSelectedCommission({
      id: commission.id,
      amount: commission.subAgentCommissionAmount,
      policyNumber,
    });
    setShowMarkPaidModal(true);
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const openDocViewer = (docs: PolicyDocument[], policyNumber: string) => {
    setSelectedDocs(docs);
    setSelectedPolicyNumber(policyNumber);
    setShowDocViewer(true);
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

  const totalPremium = policies.reduce((sum, p) => sum + Number(p.premiumAmount || 0), 0);
  const totalCommission = policies.reduce((sum, p) => {
    const commission = p.commissions?.[0];
    return sum + Number(commission?.subAgentCommissionAmount || 0);
  }, 0);
  const paidCommission = policies.reduce((sum, p) => {
    const commission = p.commissions?.[0];
    if (commission?.paidToSubAgent) {
      return sum + Number(commission?.subAgentCommissionAmount || 0);
    }
    return sum;
  }, 0);
  const pendingCommission = totalCommission - paidCommission;

  const totalCredits = ledgerEntries.filter(e => e.entryType === 'CREDIT').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalDebits = ledgerEntries.filter(e => e.entryType === 'DEBIT').reduce((sum, e) => sum + Number(e.amount), 0);
  const ledgerBalance = Number(subAgent?.ledgerBalance || 0);

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
          {(['info', 'policies', 'ledger'] as const).map((tab) => (
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
              {tab === 'ledger' && `Commission Ledger`}
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
              <InfoRow label="Status" value={subAgent.isActive ? 'Active' : 'Inactive'} />
              <InfoRow label="Ledger Balance" value={formatCurrency(ledgerBalance)} highlight={ledgerBalance < 0 ? 'red' : 'green'} />
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
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg text-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase border-b">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase border-b">Policy No</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase border-b">Client</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase border-b">Company</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase border-b">Reg. No</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase border-b">Gross</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase border-b">OD</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase border-b">TP</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase border-b">Net</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-b">OD%</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-b">TP%</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-b">Net%</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase border-b">Commission</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-b">Paid</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase border-b">Paid Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase border-b">Remark</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase border-b">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {policies.map((policy) => {
                    const commission = policy.commissions?.[0];
                    return (
                      <tr key={policy.id} className="hover:bg-gray-50 transition">
                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">{formatDate(policy.startDate)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Link href={`/dashboard/policies/${policy.id}`} className="font-medium text-blue-600 hover:text-blue-700">
                            {policy.policyNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-gray-900 max-w-[120px] truncate" title={policy.client.name}>{policy.client.name}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-[100px] truncate" title={policy.company.name}>{policy.company.name}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{policy.vehicleNumber || '-'}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(policy.premiumAmount)}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{policy.odPremium ? formatCurrency(policy.odPremium) : '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{policy.tpPremium ? formatCurrency(policy.tpPremium) : '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{policy.netPremium ? formatCurrency(policy.netPremium) : '-'}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{commission?.subAgentOdPercent ? `${commission.subAgentOdPercent}%` : '-'}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{commission?.subAgentTpPercent ? `${commission.subAgentTpPercent}%` : '-'}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{commission?.subAgentNetPercent ? `${commission.subAgentNetPercent}%` : '-'}</td>
                        <td className="px-3 py-2 text-right font-medium text-green-600">{commission ? formatCurrency(commission.subAgentCommissionAmount) : '-'}</td>
                        <td className="px-3 py-2 text-center">
                          {commission?.paidToSubAgent ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">✓ Paid</span>
                          ) : commission ? (
                            <button
                              onClick={() => openMarkPaidModal(commission, policy.policyNumber)}
                              className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition cursor-pointer"
                              title="Click to mark as paid"
                            >
                              Pending
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{commission?.paidToSubAgentDate ? formatDate(commission.paidToSubAgentDate) : '-'}</td>
                        <td className="px-3 py-2 text-gray-500 max-w-[80px] truncate" title={commission?.remarks || ''}>{commission?.remarks || '-'}</td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => window.open(`https://wa.me/91${policy.client.phone}?text=Query regarding policy ${policy.policyNumber}`, '_blank')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="WhatsApp Query"
                            >
                              💬
                            </button>
                            {policy.documents && policy.documents.length > 0 && (
                              <button
                                onClick={() => openDocViewer(policy.documents!, policy.policyNumber)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title={`View ${policy.documents.length} Documents`}
                              >
                                📄
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Ledger Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="p-4 text-center">
                <p className="text-xl font-bold text-blue-600">{formatCurrency(totalCommission)}</p>
                <p className="text-sm text-gray-600">Total Commission (Credit)</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-xl font-bold text-green-600">{formatCurrency(paidCommission)}</p>
                <p className="text-sm text-gray-600">Total Paid (Debit)</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50">
              <CardContent className="p-4 text-center">
                <p className="text-xl font-bold text-orange-600">{formatCurrency(pendingCommission)}</p>
                <p className="text-sm text-gray-600">Pending Payout</p>
              </CardContent>
            </Card>
            <Card className={pendingCommission < 0 ? 'bg-red-50' : 'bg-purple-50'}>
              <CardContent className="p-4 text-center">
                <p className={`text-xl font-bold ${pendingCommission < 0 ? 'text-red-600' : 'text-purple-600'}`}>
                  {formatCurrency(Math.abs(pendingCommission))}
                </p>
                <p className="text-sm text-gray-600">{pendingCommission < 0 ? 'Overpaid' : 'Balance Due'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Ledger Sub-Tabs */}
          <div className="border-b bg-gray-50 rounded-t-lg">
            <div className="flex space-x-1 p-1">
              {(['all', 'receivable', 'paid'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLedgerSubTab(tab)}
                  className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition ${
                    ledgerSubTab === tab 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                  }`}
                >
                  {tab === 'all' && `📊 All Policies (${policies.length})`}
                  {tab === 'receivable' && `⏳ Receivable Payout (${policies.filter(p => p.commissions?.[0] && !p.commissions[0].paidToSubAgent).length})`}
                  {tab === 'paid' && `✅ Paid Payout (${policies.filter(p => p.commissions?.[0]?.paidToSubAgent).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* All Policies Tab */}
          {ledgerSubTab === 'all' && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase border-b border-gray-600">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase border-b border-gray-600">Policy No</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase border-b border-gray-600">Client</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase border-b border-gray-600">Premium</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase border-b border-gray-600">Commission %</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase border-b border-gray-600">Commission ₹</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase border-b border-gray-600">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase border-b border-gray-600">Paid Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase border-b border-gray-600">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {policies.length === 0 ? (
                        <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No policies found</td></tr>
                      ) : (
                        policies.map((policy) => {
                          const commission = policy.commissions?.[0];
                          const isPaid = commission?.paidToSubAgent;
                          return (
                            <tr key={policy.id} className={`hover:bg-gray-50 transition ${isPaid ? 'bg-green-50/30' : ''}`}>
                              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(policy.startDate)}</td>
                              <td className="px-4 py-3 text-sm">
                                <Link href={`/dashboard/policies/${policy.id}`} className="font-medium text-blue-600 hover:text-blue-700">
                                  {policy.policyNumber}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-[150px] truncate" title={policy.client.name}>{policy.client.name}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(policy.premiumAmount)}</td>
                              <td className="px-4 py-3 text-sm text-center text-gray-600">
                                {commission?.subAgentOdPercent && commission?.subAgentTpPercent 
                                  ? `OD:${commission.subAgentOdPercent}% TP:${commission.subAgentTpPercent}%`
                                  : commission?.subAgentNetPercent 
                                  ? `${commission.subAgentNetPercent}%`
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                                {commission ? formatCurrency(commission.subAgentCommissionAmount) : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                {isPaid ? (
                                  <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">✓ Paid</span>
                                ) : commission ? (
                                  <button
                                    onClick={() => openMarkPaidModal(commission, policy.policyNumber)}
                                    className="px-3 py-1 text-xs rounded-full bg-orange-100 text-orange-700 font-medium hover:bg-orange-200 transition cursor-pointer"
                                    title="Click to mark as paid"
                                  >
                                    ⏳ Pending
                                  </button>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                {commission?.paidToSubAgentDate ? formatDate(commission.paidToSubAgentDate) : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 max-w-[120px] truncate" title={commission?.remarks || ''}>
                                {commission?.remarks || '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {policies.length > 0 && (
                      <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50 font-bold">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-sm text-gray-900 uppercase">Total</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(totalPremium)}</td>
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-sm text-right text-green-700">{formatCurrency(totalCommission)}</td>
                          <td colSpan={3}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Receivable Payout Tab */}
          {ledgerSubTab === 'receivable' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-orange-600">{policies.filter(p => p.commissions?.[0] && !p.commissions[0].paidToSubAgent).length}</span> pending payment(s) • 
                  <span className="ml-2 font-bold text-orange-600">{formatCurrency(pendingCommission)}</span> total due
                </div>
                <Button onClick={() => setShowPayoutModal(true)} className="bg-green-600 hover:bg-green-700">
                  💰 Record Payout
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-orange-600 to-orange-500 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Policy No</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Client</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Premium</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Due Amount</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase">Days Pending</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {policies.filter(p => p.commissions?.[0] && !p.commissions[0].paidToSubAgent).length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">🎉 All payments are up to date!</td></tr>
                        ) : (
                          policies.filter(p => p.commissions?.[0] && !p.commissions[0].paidToSubAgent).map((policy) => {
                            const commission = policy.commissions![0];
                            const daysPending = Math.floor((Date.now() - new Date(policy.startDate).getTime()) / (1000 * 60 * 60 * 24));
                            return (
                              <tr key={policy.id} className="hover:bg-orange-50/50 transition">
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(policy.startDate)}</td>
                                <td className="px-4 py-3 text-sm">
                                  <Link href={`/dashboard/policies/${policy.id}`} className="font-medium text-blue-600 hover:text-blue-700">
                                    {policy.policyNumber}
                                  </Link>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">{policy.client.name}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(policy.premiumAmount)}</td>
                                <td className="px-4 py-3 text-sm text-right font-bold text-orange-600">
                                  {formatCurrency(commission.subAgentCommissionAmount)}
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    daysPending > 30 ? 'bg-red-100 text-red-700' : 
                                    daysPending > 15 ? 'bg-orange-100 text-orange-700' : 
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {daysPending} days
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => openMarkPaidModal(commission, policy.policyNumber)}
                                    className="px-4 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition"
                                  >
                                    ✓ Mark Paid
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {policies.filter(p => p.commissions?.[0] && !p.commissions[0].paidToSubAgent).length > 0 && (
                        <tfoot className="bg-orange-50 font-bold">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-sm text-gray-900 uppercase">Total Receivable</td>
                            <td className="px-4 py-3 text-sm text-right text-orange-700">{formatCurrency(pendingCommission)}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Paid Payout Tab */}
          {ledgerSubTab === 'paid' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-green-600">{policies.filter(p => p.commissions?.[0]?.paidToSubAgent).length}</span> payment(s) completed • 
                <span className="ml-2 font-bold text-green-600">{formatCurrency(paidCommission)}</span> total paid
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-green-600 to-green-500 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Policy Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Policy No</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Client</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Premium</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Paid Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Paid Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Remarks</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {policies.filter(p => p.commissions?.[0]?.paidToSubAgent).length === 0 ? (
                          <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No payments made yet</td></tr>
                        ) : (
                          policies.filter(p => p.commissions?.[0]?.paidToSubAgent).map((policy) => {
                            const commission = policy.commissions![0];
                            return (
                              <tr key={policy.id} className="hover:bg-green-50/30 transition">
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(policy.startDate)}</td>
                                <td className="px-4 py-3 text-sm">
                                  <Link href={`/dashboard/policies/${policy.id}`} className="font-medium text-blue-600 hover:text-blue-700">
                                    {policy.policyNumber}
                                  </Link>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">{policy.client.name}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(policy.premiumAmount)}</td>
                                <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                                  {formatCurrency(commission.subAgentCommissionAmount)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                  {commission.paidToSubAgentDate ? formatDate(commission.paidToSubAgentDate) : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate" title={commission.remarks || ''}>
                                  {commission.remarks || '-'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button 
                                    className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg hover:bg-blue-200 transition"
                                    title="Print receipt (Coming soon)"
                                  >
                                    🖨️ Print
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {policies.filter(p => p.commissions?.[0]?.paidToSubAgent).length > 0 && (
                        <tfoot className="bg-green-50 font-bold">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-sm text-gray-900 uppercase">Total Paid</td>
                            <td className="px-4 py-3 text-sm text-right text-green-700">{formatCurrency(paidCommission)}</td>
                            <td colSpan={3}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Document Viewer Modal */}
      {showDocViewer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Policy Documents</h3>
                <p className="text-blue-100 text-sm">{selectedPolicyNumber}</p>
              </div>
              <button onClick={() => setShowDocViewer(false)} className="p-2 hover:bg-white/20 rounded-lg">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 gap-3">
                {selectedDocs.map((doc) => {
                  const isPdf = doc.documentUrl?.includes('/raw/') || doc.documentName?.toLowerCase().endsWith('.pdf');
                  const downloadUrl = doc.documentUrl?.replace('/upload/', '/upload/fl_attachment/');
                  const fileName = doc.documentName || `${doc.documentType}.pdf`;
                  
                  return (
                    <div key={doc.id} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="text-3xl">
                        {doc.documentType.includes('POLICY') ? '📋' : doc.documentType.includes('AADHAR') ? '🪪' : doc.documentType.includes('PAN') ? '💳' : doc.documentType.includes('RC') ? '🚗' : '📄'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{doc.documentName || doc.documentType}</p>
                        <p className="text-sm text-gray-500">{doc.documentType}</p>
                      </div>
                      <div className="flex gap-2">
                        <a 
                          href={doc.documentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                        >
                          👁 View
                        </a>
                        <a 
                          href={downloadUrl}
                          download={fileName}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition flex items-center gap-1"
                        >
                          ⬇ Download
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-white flex items-center justify-between rounded-t-xl">
              <h3 className="font-bold text-lg">Record Payout</h3>
              <button onClick={() => setShowPayoutModal(false)} className="p-2 hover:bg-white/20 rounded-lg">✕</button>
            </div>
            <form onSubmit={handlePayout} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <Input type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="Enter payout amount" required min="1" />
                <p className="text-xs text-gray-500 mt-1">Pending: {formatCurrency(pendingCommission)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Input type="text" value={payoutDescription} onChange={(e) => setPayoutDescription(e.target.value)} placeholder="e.g., Commission payout for Jan 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <Input type="date" value={payoutDate} onChange={(e) => setPayoutDate(e.target.value)} required />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowPayoutModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700">{submitting ? 'Recording...' : 'Record Payout'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Commission Paid Modal */}
      {showMarkPaidModal && selectedCommission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between rounded-t-xl">
              <h3 className="font-bold text-lg">✓ Mark Commission Paid</h3>
              <button onClick={() => { setShowMarkPaidModal(false); setSelectedCommission(null); }} className="p-2 hover:bg-white/20 rounded-lg">✕</button>
            </div>
            <form onSubmit={handleMarkPaid} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Policy: <span className="font-medium text-gray-900">{selectedCommission.policyNumber}</span></p>
                <p className="text-sm text-gray-600">Commission: <span className="font-bold text-green-600">{formatCurrency(selectedCommission.amount)}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid Date *</label>
                <Input 
                  type="date" 
                  value={markPaidData.paidDate} 
                  onChange={(e) => setMarkPaidData(prev => ({ ...prev, paidDate: e.target.value }))} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
                <Input 
                  type="text" 
                  value={markPaidData.remarks} 
                  onChange={(e) => setMarkPaidData(prev => ({ ...prev, remarks: e.target.value }))} 
                  placeholder="e.g., Cash payment, Bank transfer" 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowMarkPaidModal(false); setSelectedCommission(null); }} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700">{submitting ? 'Updating...' : '✓ Mark as Paid'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: 'red' | 'green' }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`font-medium ${highlight === 'red' ? 'text-red-600' : highlight === 'green' ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
