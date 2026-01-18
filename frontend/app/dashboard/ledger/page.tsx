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
  client?: {
    id: string;
    name: string;
    phone: string;
  };
  policy?: {
    id: string;
    policyNumber: string;
  };
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface PendingCollection {
  clientId: string;
  clientName: string;
  clientPhone: string;
  totalPending: number;
  entriesCount: number;
}

interface SubAgent {
  id: string;
  name: string;
  phone: string;
  subAgentCode: string;
  ledgerBalance: string;
  isActive: boolean;
  _count?: {
    policies: number;
  };
}

interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  premiumAmount: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  client: {
    id: string;
    name: string;
    phone: string;
  };
  company: {
    id: string;
    name: string;
  };
  subAgent?: {
    id: string;
    name: string;
  };
  broker?: {
    id: string;
    name: string;
  };
  commissions?: Array<{
    id: string;
    totalCommissionAmount: string;
    receivedFromCompany: boolean;
    receivedDate?: string;
  }>;
}

export default function LedgerPage() {
  const searchParams = useSearchParams();
  const preSelectedClientId = searchParams.get('clientId');
  
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [pendingCollections, setPendingCollections] = useState<PendingCollection[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'subagents'>('all');
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [search, setSearch] = useState('');
  
  // Add entry form
  const [showAddModal, setShowAddModal] = useState(false);
  const [entryType, setEntryType] = useState<'debit' | 'credit'>('credit');
  const [formData, setFormData] = useState({
    clientId: preSelectedClientId || '',
    amount: '',
    description: '',
    entryDate: new Date().toISOString().split('T')[0],
    policyId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Sub-agent payout modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedSubAgent, setSelectedSubAgent] = useState<SubAgent | null>(null);
  const [payoutData, setPayoutData] = useState({
    amount: '',
    description: '',
    entryDate: new Date().toISOString().split('T')[0],
  });

  // Action dropdown state
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenActionId(null);
    if (openActionId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openActionId]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [entriesRes, pendingRes, clientsRes, subAgentsRes, policiesRes] = await Promise.all([
        ledgerAPI.getAll(),
        ledgerAPI.getPending(),
        clientAPI.getAll(),
        agentAPI.getSubAgents(),
        policyAPI.getAll()
      ]);
      
      // Handle different response structures
      const entriesData = entriesRes.data.data?.entries || entriesRes.data.data || [];
      const pendingData = pendingRes.data.data?.clients || pendingRes.data.data || [];
      const clientsData = clientsRes.data.data?.clients || clientsRes.data.data || [];
      const subAgentsData = subAgentsRes.data.data || [];
      const policiesData = policiesRes.data.data?.policies || policiesRes.data.data || [];
      
      setEntries(Array.isArray(entriesData) ? entriesData : []);
      setPendingCollections(Array.isArray(pendingData) ? pendingData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setSubAgents(Array.isArray(subAgentsData) ? subAgentsData : []);
      setPolicies(Array.isArray(policiesData) ? policiesData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setEntries([]);
      setPendingCollections([]);
      setClients([]);
      setSubAgents([]);
      setPolicies([]);
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

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (entryType === 'debit') {
        await ledgerAPI.createDebit({
          clientId: formData.clientId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          entryDate: new Date(formData.entryDate),
          policyId: formData.policyId || undefined,
        });
      } else {
        await ledgerAPI.createCollection({
          clientId: formData.clientId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          entryDate: new Date(formData.entryDate),
        });
      }
      
      setShowAddModal(false);
      setFormData({
        clientId: '',
        amount: '',
        description: '',
        entryDate: new Date().toISOString().split('T')[0],
        policyId: '',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to add entry:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubAgentPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubAgent || !payoutData.amount) return;
    
    setSubmitting(true);
    try {
      await ledgerAPI.createSubAgentPayout({
        subAgentId: selectedSubAgent.id,
        amount: parseFloat(payoutData.amount),
        description: payoutData.description || 'Commission Payout',
        entryDate: payoutData.entryDate,
      });
      
      setShowPayoutModal(false);
      setSelectedSubAgent(null);
      setPayoutData({
        amount: '',
        description: '',
        entryDate: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (error) {
      console.error('Failed to create payout:', error);
      alert('Failed to record payout');
    } finally {
      setSubmitting(false);
    }
  };

  // Mark commission as received from company
  const handleMarkPaid = async (commissionId: string) => {
    try {
      await commissionAPI.markPaid(commissionId);
      fetchData(); // Refresh all data
      setOpenActionId(null);
    } catch (error) {
      console.error('Failed to mark paid:', error);
      alert('Failed to update status');
    }
  };

  // Filter policies by paid status
  const filteredPolicies = policies.filter(policy => {
    // Search filter
    const matchesSearch = !search || 
      policy.policyNumber.toLowerCase().includes(search.toLowerCase()) ||
      policy.client.name.toLowerCase().includes(search.toLowerCase()) ||
      policy.company.name.toLowerCase().includes(search.toLowerCase());
    
    // Paid status filter
    const commission = policy.commissions?.[0];
    const isPaid = commission?.receivedFromCompany || false;
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'paid' && isPaid) ||
      (filter === 'pending' && !isPaid);
    
    return matchesSearch && matchesFilter;
  });

  const filteredEntries = entries.filter(entry => {
    if (filter === 'all') return true;
    return entry.entryType.toLowerCase() === filter;
  });

  const totalDebit = entries
    .filter(e => e.entryType === 'DEBIT')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  
  const totalCredit = entries
    .filter(e => e.entryType === 'CREDIT')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  
  const balance = totalDebit - totalCredit;

  // Commission summary from policies
  const totalCommission = policies.reduce((sum, p) => {
    const comm = p.commissions?.[0];
    return sum + (comm ? Number(comm.totalCommissionAmount) : 0);
  }, 0);

  const receivedCommission = policies.reduce((sum, p) => {
    const comm = p.commissions?.[0];
    return sum + (comm?.receivedFromCompany ? Number(comm.totalCommissionAmount) : 0);
  }, 0);

  const pendingCommission = totalCommission - receivedCommission;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ledger / Khata</h1>
          <p className="text-gray-600">Manage client payments and collections</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600">Total Commission</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalCommission)}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-green-600">Received (जमा)</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(receivedCommission)}</p>
          </CardContent>
        </Card>
        <Card className={pendingCommission > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}>
          <CardContent className="p-4">
            <p className={`text-sm ${pendingCommission > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
              Pending (बाकी)
            </p>
            <p className={`text-2xl font-bold ${pendingCommission > 0 ? 'text-orange-700' : 'text-gray-700'}`}>
              {formatCurrency(pendingCommission)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-3 border-b-2 font-medium text-sm ${
              activeTab === 'all' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Entries
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-3 border-b-2 font-medium text-sm ${
              activeTab === 'pending' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Collections ({pendingCollections.length})
          </button>
          <button
            onClick={() => setActiveTab('subagents')}
            className={`py-3 border-b-2 font-medium text-sm ${
              activeTab === 'subagents' 
                ? 'border-purple-600 text-purple-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 Sub-Agents ({subAgents.length})
          </button>
        </div>
      </div>

      {/* All Entries Tab */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Input
              type="text"
              placeholder="Search by policy number, client, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-80"
            />
            <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
              {(['all', 'pending', 'paid'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition ${
                    filter === f 
                      ? 'bg-white shadow text-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {f === 'pending' ? 'Pending (बाकी)' : f === 'paid' ? 'Received (जमा)' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Policies Table */}
          {filteredPolicies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No policies found
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Premium</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPolicies.map((policy) => {
                    const commission = policy.commissions?.[0];
                    const isPaid = commission?.receivedFromCompany || false;
                    
                    return (
                      <tr key={policy.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(policy.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-blue-600">{policy.policyNumber}</div>
                          <div className="text-xs text-gray-500">{policy.policyType}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{policy.client.name}</div>
                          <div className="text-xs text-gray-500">{policy.client.phone}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {policy.company.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {formatCurrency(Number(policy.premiumAmount))}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                          {commission ? formatCurrency(Number(commission.totalCommissionAmount)) : '₹0'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isPaid 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {isPaid ? '✓ Received' : '⏳ Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap relative">
                          {commission && !isPaid && (
                            <div className="relative">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionId(openActionId === commission.id ? null : commission.id);
                                }}
                                className="text-xs"
                              >
                                Action ▾
                              </Button>
                              {openActionId === commission.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkPaid(commission.id);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                                  >
                                    ✓ Mark as Received
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          {isPaid && (
                            <span className="text-xs text-gray-500">
                              {commission?.receivedDate ? formatDate(commission.receivedDate) : '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr className="font-semibold">
                    <td colSpan={5} className="px-4 py-3 text-sm text-gray-700">Total</td>
                    <td className="px-4 py-3 text-sm text-blue-700">{formatCurrency(totalCommission)}</td>
                    <td colSpan={2} className="px-4 py-3 text-sm">
                      <span className="text-green-600">{formatCurrency(receivedCommission)}</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-orange-600">{formatCurrency(pendingCommission)}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pending Collections Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingCollections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                🎉 No pending collections! All clients are up to date.
              </CardContent>
            </Card>
          ) : (
            pendingCollections.map((item) => (
              <Card key={item.clientId} className="hover:shadow-md transition cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.clientName}</p>
                      <p className="text-sm text-gray-500">{item.clientPhone} • {item.entriesCount} entries</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-600">{formatCurrency(item.totalPending)}</p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, clientId: item.clientId }));
                          setEntryType('credit');
                          setShowAddModal(true);
                        }}
                      >
                        Collect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Sub-Agents Tab */}
      {activeTab === 'subagents' && (
        <div className="space-y-4">
          {/* Sub-Agent Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <p className="text-sm text-purple-600">Total Sub-Agents</p>
                <p className="text-2xl font-bold text-purple-700">{subAgents.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <p className="text-sm text-green-600">Total Payable</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(subAgents.filter(s => Number(s.ledgerBalance) > 0).reduce((sum, s) => sum + Number(s.ledgerBalance), 0))}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <p className="text-sm text-orange-600">Advance Given</p>
                <p className="text-2xl font-bold text-orange-700">
                  {formatCurrency(Math.abs(subAgents.filter(s => Number(s.ledgerBalance) < 0).reduce((sum, s) => sum + Number(s.ledgerBalance), 0)))}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sub-Agents List */}
          {subAgents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No sub-agents found. Add sub-agents from the Sub-Agents page.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {subAgents.map((subAgent) => {
                const balance = Number(subAgent.ledgerBalance || 0);
                const isPayable = balance > 0;
                const isAdvance = balance < 0;
                
                return (
                  <Card key={subAgent.id} className="hover:shadow-md transition">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {subAgent.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <Link href={`/dashboard/sub-agents/${subAgent.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                              {subAgent.name}
                            </Link>
                            <p className="text-sm text-gray-500">{subAgent.subAgentCode} • {subAgent.phone}</p>
                            <p className="text-xs text-gray-400">{subAgent._count?.policies || 0} policies</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className={`text-lg font-bold ${isPayable ? 'text-green-600' : isAdvance ? 'text-orange-600' : 'text-gray-600'}`}>
                              {isPayable ? '+' : isAdvance ? '-' : ''}{formatCurrency(Math.abs(balance))}
                            </p>
                            <p className="text-xs text-gray-500">
                              {isPayable ? 'Payable' : isAdvance ? 'Advance' : 'Settled'}
                            </p>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedSubAgent(subAgent);
                              setPayoutData(prev => ({
                                ...prev,
                                amount: isPayable ? balance.toString() : '',
                              }));
                              setShowPayoutModal(true);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            💸 Pay
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Add Ledger Entry</span>
                <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddEntry} className="space-y-4">
                {/* Entry Type Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setEntryType('credit')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                      entryType === 'credit' 
                        ? 'bg-green-500 text-white' 
                        : 'text-gray-600'
                    }`}
                  >
                    💰 Collection (जमा)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType('debit')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                      entryType === 'debit' 
                        ? 'bg-red-500 text-white' 
                        : 'text-gray-600'
                    }`}
                  >
                    📝 Debit (उधार)
                  </button>
                </div>

                {/* Client Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={entryType === 'credit' ? 'e.g., Cash received' : 'e.g., Premium for LIC policy'}
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={formData.entryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, entryDate: e.target.value }))}
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !formData.clientId || !formData.amount}
                    className={`flex-1 ${entryType === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {submitting ? 'Saving...' : entryType === 'credit' ? 'Add Collection' : 'Add Debit'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sub-Agent Payout Modal */}
      {showPayoutModal && selectedSubAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
              <CardTitle className="flex justify-between items-center">
                <span>💸 Pay Sub-Agent</span>
                <button onClick={() => { setShowPayoutModal(false); setSelectedSubAgent(null); }} className="text-white/80 hover:text-white">
                  ✕
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{selectedSubAgent.name}</p>
                <p className="text-sm text-gray-500">{selectedSubAgent.subAgentCode} • {selectedSubAgent.phone}</p>
                <p className={`text-sm font-medium mt-1 ${Number(selectedSubAgent.ledgerBalance) > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  Balance: {formatCurrency(Math.abs(Number(selectedSubAgent.ledgerBalance)))} 
                  {Number(selectedSubAgent.ledgerBalance) > 0 ? ' (Payable)' : Number(selectedSubAgent.ledgerBalance) < 0 ? ' (Advance)' : ''}
                </p>
              </div>
              
              <form onSubmit={handleSubAgentPayout} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={payoutData.amount}
                    onChange={(e) => setPayoutData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Input
                    value={payoutData.description}
                    onChange={(e) => setPayoutData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Commission payout for Jan 2026"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={payoutData.entryDate}
                    onChange={(e) => setPayoutData(prev => ({ ...prev, entryDate: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowPayoutModal(false); setSelectedSubAgent(null); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !payoutData.amount}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? 'Processing...' : '💸 Pay Now'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
