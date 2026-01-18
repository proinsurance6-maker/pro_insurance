'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ledgerAPI, clientAPI, agentAPI, policyAPI, commissionAPI } from '@/lib/api';

interface LedgerEntry {
  id: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  entryDate: string;
  client?: { id: string; name: string; phone: string; };
  subAgent?: { id: string; name: string; };
  policy?: { id: string; policyNumber: string; };
}

interface Client { id: string; name: string; phone: string; }

interface SubAgent {
  id: string;
  name: string;
  phone: string;
  subAgentCode: string;
  ledgerBalance: string;
  isActive: boolean;
  _count?: { policies: number; };
}

interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  premiumAmount: string;
  createdAt: string;
  client: { id: string; name: string; phone: string; };
  company: { id: string; name: string; };
  subAgent?: { id: string; name: string; subAgentCode?: string; };
  commissions?: Array<{
    id: string;
    totalCommissionAmount: string;
    agentCommissionAmount: string;
    subAgentCommissionAmount?: string;
    receivedFromCompany: boolean;
    receivedDate?: string;
    paidToSubAgent?: boolean;
    paidToSubAgentDate?: string;
  }>;
}

type LedgerTab = 'overview' | 'client-khata' | 'subagent-khata' | 'commission-status';

export default function LedgerPage() {
  const searchParams = useSearchParams();
  const preSelectedClientId = searchParams.get('clientId');
  
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LedgerTab>('overview');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'client-debit' | 'client-credit' | 'subagent-credit'>('client-credit');
  const [formData, setFormData] = useState({
    clientId: preSelectedClientId || '',
    subAgentId: '',
    amount: '',
    description: '',
    entryDate: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [entriesRes, clientsRes, subAgentsRes, policiesRes] = await Promise.all([
        ledgerAPI.getAll(),
        clientAPI.getAll(),
        agentAPI.getSubAgents(),
        policyAPI.getAll({ limit: 500 })
      ]);
      
      const entriesData = entriesRes.data.data?.entries || entriesRes.data.data || [];
      const clientsData = clientsRes.data.data?.clients || clientsRes.data.data || [];
      const subAgentsData = subAgentsRes.data.data || [];
      const policiesData = policiesRes.data.data?.policies || policiesRes.data.data || [];
      
      setEntries(Array.isArray(entriesData) ? entriesData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setSubAgents(Array.isArray(subAgentsData) ? subAgentsData : []);
      setPolicies(Array.isArray(policiesData) ? policiesData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Calculations
  const clientEntries = entries.filter(e => e.client);
  const clientTotalDebit = clientEntries.filter(e => e.entryType === 'DEBIT').reduce((sum, e) => sum + Number(e.amount), 0);
  const clientTotalCredit = clientEntries.filter(e => e.entryType === 'CREDIT').reduce((sum, e) => sum + Number(e.amount), 0);
  const clientPendingCollection = clientTotalDebit - clientTotalCredit;

  const totalCommission = policies.reduce((sum, p) => sum + Number(p.commissions?.[0]?.totalCommissionAmount || 0), 0);
  const receivedCommission = policies.filter(p => p.commissions?.[0]?.receivedFromCompany).reduce((sum, p) => sum + Number(p.commissions?.[0]?.totalCommissionAmount || 0), 0);
  const pendingFromCompany = totalCommission - receivedCommission;
  
  const totalSubAgentCommission = policies.reduce((sum, p) => sum + Number(p.commissions?.[0]?.subAgentCommissionAmount || 0), 0);
  const paidToSubAgentCommission = policies.filter(p => p.commissions?.[0]?.paidToSubAgent).reduce((sum, p) => sum + Number(p.commissions?.[0]?.subAgentCommissionAmount || 0), 0);
  const pendingToSubAgent = totalSubAgentCommission - paidToSubAgentCommission;

  const totalPayableToSubAgents = subAgents.filter(s => Number(s.ledgerBalance) > 0).reduce((sum, s) => sum + Number(s.ledgerBalance), 0);
  const totalAdvanceToSubAgents = Math.abs(subAgents.filter(s => Number(s.ledgerBalance) < 0).reduce((sum, s) => sum + Number(s.ledgerBalance), 0));

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (modalType === 'client-debit') {
        await ledgerAPI.createDebit({
          clientId: formData.clientId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          entryDate: new Date(formData.entryDate),
        });
      } else if (modalType === 'client-credit') {
        await ledgerAPI.createCollection({
          clientId: formData.clientId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          entryDate: new Date(formData.entryDate),
        });
      } else if (modalType === 'subagent-credit') {
        await ledgerAPI.createSubAgentPayout({
          subAgentId: formData.subAgentId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          entryDate: formData.entryDate,
        });
      }
      
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to add entry:', error);
      alert('Failed to add entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReceived = async (commissionId: string) => {
    try {
      await commissionAPI.markPaid(commissionId);
      fetchData();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const handleMarkPaidToSubAgent = async (commissionId: string) => {
    try {
      await commissionAPI.markPaidToSubAgent(commissionId);
      fetchData();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({ clientId: '', subAgentId: '', amount: '', description: '', entryDate: new Date().toISOString().split('T')[0] });
  };

  const openModal = (type: typeof modalType) => {
    setModalType(type);
    resetForm();
    setShowAddModal(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📒 Advanced Ledger System</h1>
        <p className="text-gray-600">Complete financial tracking - Clients, Sub-Agents & Commissions</p>
      </div>

      {/* Tabs */}
      <div className="border-b overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'client-khata', label: '👤 Client Khata' },
            { id: 'subagent-khata', label: '👥 Sub-Agent Khata' },
            { id: 'commission-status', label: '💰 Commission Status' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as LedgerTab)}
              className={`px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600 bg-blue-50' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className={clientPendingCollection > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${clientPendingCollection > 0 ? 'bg-red-100' : 'bg-green-100'}`}>👤</div>
                  <div>
                    <p className="text-sm text-gray-600">Client से बाकी</p>
                    <p className={`text-xl font-bold ${clientPendingCollection > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(clientPendingCollection))}
                    </p>
                    <p className="text-xs text-gray-500">{clientPendingCollection > 0 ? 'Collection Due' : 'Advance Paid'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={pendingFromCompany > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${pendingFromCompany > 0 ? 'bg-orange-100' : 'bg-green-100'}`}>🏢</div>
                  <div>
                    <p className="text-sm text-gray-600">Company से Pending</p>
                    <p className={`text-xl font-bold ${pendingFromCompany > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(pendingFromCompany)}
                    </p>
                    <p className="text-xs text-gray-500">Commission Not Received</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={totalPayableToSubAgents > 0 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${totalPayableToSubAgents > 0 ? 'bg-purple-100' : 'bg-gray-100'}`}>👥</div>
                  <div>
                    <p className="text-sm text-gray-600">Sub-Agent को देना</p>
                    <p className={`text-xl font-bold ${totalPayableToSubAgents > 0 ? 'text-purple-600' : 'text-gray-600'}`}>
                      {formatCurrency(totalPayableToSubAgents)}
                    </p>
                    <p className="text-xs text-gray-500">Commission Due</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={totalAdvanceToSubAgents > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${totalAdvanceToSubAgents > 0 ? 'bg-blue-100' : 'bg-gray-100'}`}>💸</div>
                  <div>
                    <p className="text-sm text-gray-600">Sub-Agent से वापसी</p>
                    <p className={`text-xl font-bold ${totalAdvanceToSubAgents > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                      {formatCurrency(totalAdvanceToSubAgents)}
                    </p>
                    <p className="text-xs text-gray-500">Advance Recovery</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader><CardTitle className="text-lg">⚡ Quick Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button onClick={() => openModal('client-debit')} variant="outline" className="flex flex-col h-auto py-4 border-red-200 hover:bg-red-50">
                  <span className="text-2xl mb-1">📝</span>
                  <span className="text-xs">Client को उधार</span>
                  <span className="text-[10px] text-gray-500">Premium Due</span>
                </Button>
                <Button onClick={() => openModal('client-credit')} variant="outline" className="flex flex-col h-auto py-4 border-green-200 hover:bg-green-50">
                  <span className="text-2xl mb-1">💰</span>
                  <span className="text-xs">Client से जमा</span>
                  <span className="text-[10px] text-gray-500">Payment Received</span>
                </Button>
                <Button onClick={() => openModal('subagent-credit')} variant="outline" className="flex flex-col h-auto py-4 border-purple-200 hover:bg-purple-50">
                  <span className="text-2xl mb-1">💸</span>
                  <span className="text-xs">Sub-Agent को Payment</span>
                  <span className="text-[10px] text-gray-500">Commission Paid</span>
                </Button>
                <Button onClick={() => setActiveTab('commission-status')} variant="outline" className="flex flex-col h-auto py-4 border-blue-200 hover:bg-blue-50">
                  <span className="text-2xl mb-1">📋</span>
                  <span className="text-xs">Commission Status</span>
                  <span className="text-[10px] text-gray-500">Mark Received/Paid</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
                <CardTitle className="text-base">👤 Client Ledger Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="px-4 py-3 text-gray-600">Total Premium Due (Debit)</td><td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(clientTotalDebit)}</td></tr>
                    <tr className="border-b"><td className="px-4 py-3 text-gray-600">Total Received (Credit)</td><td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(clientTotalCredit)}</td></tr>
                    <tr className="bg-gray-50"><td className="px-4 py-3 font-medium">{clientPendingCollection >= 0 ? 'Pending Collection' : 'Advance Balance'}</td><td className={`px-4 py-3 text-right font-bold ${clientPendingCollection >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>{formatCurrency(Math.abs(clientPendingCollection))}</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-t-lg">
                <CardTitle className="text-base">👥 Sub-Agent Ledger Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="px-4 py-3 text-gray-600">Total Commission Earned</td><td className="px-4 py-3 text-right font-semibold text-purple-600">{formatCurrency(totalSubAgentCommission)}</td></tr>
                    <tr className="border-b"><td className="px-4 py-3 text-gray-600">Commission Paid</td><td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(paidToSubAgentCommission)}</td></tr>
                    <tr className="border-b"><td className="px-4 py-3 text-gray-600">Commission Pending</td><td className="px-4 py-3 text-right font-semibold text-orange-600">{formatCurrency(pendingToSubAgent)}</td></tr>
                    <tr className="bg-gray-50"><td className="px-4 py-3 font-medium">Net Payable</td><td className="px-4 py-3 text-right font-bold text-purple-600">{formatCurrency(totalPayableToSubAgents)}</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Client Khata Tab */}
      {activeTab === 'client-khata' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">👤 Client Payment Ledger</h3>
            <div className="flex gap-2">
              <Button onClick={() => openModal('client-debit')} size="sm" className="bg-red-600 hover:bg-red-700">+ उधार (Debit)</Button>
              <Button onClick={() => openModal('client-credit')} size="sm" className="bg-green-600 hover:bg-green-700">+ जमा (Credit)</Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit (उधार)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit (जमा)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {clientEntries.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No entries. Add debit/credit entries above.</td></tr>
                    ) : (
                      clientEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(entry.entryDate)}</td>
                          <td className="px-4 py-3 font-medium">{entry.client?.name || 'N/A'}</td>
                          <td className="px-4 py-3 text-gray-600">{entry.description}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{entry.policy?.policyNumber || '-'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600">{entry.entryType === 'DEBIT' ? formatCurrency(entry.amount) : '-'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600">{entry.entryType === 'CREDIT' ? formatCurrency(entry.amount) : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-gray-100 font-semibold">
                    <tr>
                      <td colSpan={4} className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(clientTotalDebit)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatCurrency(clientTotalCredit)}</td>
                    </tr>
                    <tr className="bg-gray-200">
                      <td colSpan={4} className="px-4 py-3 font-bold">{clientPendingCollection >= 0 ? 'Net Pending Collection' : 'Net Advance'}</td>
                      <td colSpan={2} className={`px-4 py-3 text-right font-bold text-lg ${clientPendingCollection >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>{formatCurrency(Math.abs(clientPendingCollection))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sub-Agent Khata Tab */}
      {activeTab === 'subagent-khata' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">👥 Sub-Agent Commission Ledger</h3>
            <Button onClick={() => openModal('subagent-credit')} size="sm" className="bg-purple-600 hover:bg-purple-700">+ Pay Sub-Agent</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subAgents.map((subAgent) => {
              const balance = Number(subAgent.ledgerBalance || 0);
              const subAgentPolicies = policies.filter(p => p.subAgent?.id === subAgent.id);
              const totalEarned = subAgentPolicies.reduce((sum, p) => sum + Number(p.commissions?.[0]?.subAgentCommissionAmount || 0), 0);
              const paidComm = subAgentPolicies.filter(p => p.commissions?.[0]?.paidToSubAgent).reduce((sum, p) => sum + Number(p.commissions?.[0]?.subAgentCommissionAmount || 0), 0);
              
              return (
                <Card key={subAgent.id} className="hover:shadow-lg transition">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold">{subAgent.name.charAt(0)}</div>
                        <div>
                          <Link href={`/dashboard/sub-agents/${subAgent.id}`} className="font-medium text-gray-900 hover:text-purple-600">{subAgent.name}</Link>
                          <p className="text-xs text-gray-500">{subAgent.subAgentCode}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${balance > 0 ? 'bg-green-100 text-green-700' : balance < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {balance > 0 ? 'Payable' : balance < 0 ? 'Advance' : 'Settled'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Total Earned:</span><span className="font-medium">{formatCurrency(totalEarned)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Paid:</span><span className="font-medium text-green-600">{formatCurrency(paidComm)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Pending:</span><span className="font-medium text-orange-600">{formatCurrency(totalEarned - paidComm)}</span></div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-medium">Balance:</span>
                        <span className={`font-bold ${balance > 0 ? 'text-purple-600' : balance < 0 ? 'text-red-600' : 'text-gray-600'}`}>{balance >= 0 ? '+' : ''}{formatCurrency(balance)}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { setFormData(prev => ({ ...prev, subAgentId: subAgent.id, amount: balance > 0 ? balance.toString() : '' })); setModalType('subagent-credit'); setShowAddModal(true); }}>💸 Pay</Button>
                      <Link href={`/dashboard/sub-agents/${subAgent.id}`} className="flex-1"><Button size="sm" variant="outline" className="w-full text-xs">📋 Details</Button></Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Commission Status Tab */}
      {activeTab === 'commission-status' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">💰 Commission Status Tracker</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{formatCurrency(totalCommission)}</p><p className="text-sm text-gray-600">Total Commission</p></CardContent></Card>
            <Card className="bg-green-50 border-green-200"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{formatCurrency(receivedCommission)}</p><p className="text-sm text-gray-600">Received from Company</p></CardContent></Card>
            <Card className="bg-orange-50 border-orange-200"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">{formatCurrency(pendingFromCompany)}</p><p className="text-sm text-gray-600">Pending from Company</p></CardContent></Card>
            <Card className="bg-purple-50 border-purple-200"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-purple-600">{formatCurrency(pendingToSubAgent)}</p><p className="text-sm text-gray-600">Due to Sub-Agents</p></CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sub-Agent</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">From Company</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">To Sub-Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {policies.slice(0, 50).map((policy) => {
                      const commission = policy.commissions?.[0];
                      const isReceived = commission?.receivedFromCompany;
                      const isPaidToSub = commission?.paidToSubAgent;
                      const hasSubAgent = !!policy.subAgent;
                      
                      return (
                        <tr key={policy.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 whitespace-nowrap text-gray-600">{formatDate(policy.createdAt)}</td>
                          <td className="px-3 py-3 whitespace-nowrap"><span className="font-medium text-blue-600">{policy.policyNumber}</span></td>
                          <td className="px-3 py-3">{policy.client.name}</td>
                          <td className="px-3 py-3 text-gray-600 max-w-[150px] truncate">{policy.company.name}</td>
                          <td className="px-3 py-3">{policy.subAgent ? <span className="text-purple-600">{policy.subAgent.name}</span> : <span className="text-gray-400">Direct</span>}</td>
                          <td className="px-3 py-3 text-right font-semibold">{formatCurrency(Number(commission?.totalCommissionAmount || 0))}</td>
                          <td className="px-3 py-3 text-center">
                            {commission ? (isReceived ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Received</span>
                            ) : (
                              <button onClick={() => handleMarkReceived(commission.id)} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer">⏳ Pending</button>
                            )) : '-'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {!hasSubAgent ? <span className="text-gray-400 text-xs">N/A</span> : commission ? (isPaidToSub ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Paid</span>
                            ) : (
                              <button onClick={() => handleMarkPaidToSubAgent(commission.id)} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer">⏳ Due</button>
                            )) : '-'}
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
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className={`rounded-t-lg text-white ${modalType === 'client-debit' ? 'bg-red-500' : modalType === 'client-credit' ? 'bg-green-500' : 'bg-purple-500'}`}>
              <CardTitle className="flex justify-between items-center">
                <span>{modalType === 'client-debit' ? '📝 Client को उधार (Debit)' : modalType === 'client-credit' ? '💰 Client से जमा (Credit)' : '💸 Sub-Agent को Payment'}</span>
                <button onClick={() => setShowAddModal(false)} className="text-white/80 hover:text-white">✕</button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddEntry} className="space-y-4">
                {(modalType === 'client-debit' || modalType === 'client-credit') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client <span className="text-red-500">*</span></label>
                    <select value={formData.clientId} onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                      <option value="">Select client</option>
                      {clients.map((client) => <option key={client.id} value={client.id}>{client.name} ({client.phone})</option>)}
                    </select>
                  </div>
                )}

                {modalType === 'subagent-credit' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Agent <span className="text-red-500">*</span></label>
                    <select value={formData.subAgentId} onChange={(e) => setFormData(prev => ({ ...prev, subAgentId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                      <option value="">Select sub-agent</option>
                      {subAgents.map((sa) => <option key={sa.id} value={sa.id}>{sa.name} - Balance: {formatCurrency(Number(sa.ledgerBalance))}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                  <Input type="number" value={formData.amount} onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))} placeholder="Enter amount" required min="1" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                  <Input value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder={modalType === 'client-debit' ? 'e.g., Premium for policy XYZ' : modalType === 'client-credit' ? 'e.g., Cash payment received' : 'e.g., Commission payment'} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <Input type="date" value={formData.entryDate} onChange={(e) => setFormData(prev => ({ ...prev, entryDate: e.target.value }))} />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" disabled={submitting} className={`flex-1 ${modalType === 'client-debit' ? 'bg-red-600 hover:bg-red-700' : modalType === 'client-credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}>{submitting ? 'Saving...' : 'Add Entry'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
