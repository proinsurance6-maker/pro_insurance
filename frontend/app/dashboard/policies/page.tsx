'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { policyAPI } from '@/lib/api';

interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  policySource?: string;
  motorPolicyType?: string;
  premiumAmount: string;
  odPremium?: string;
  tpPremium?: string;
  netPremium?: string;
  sumAssured: string;
  premiumFrequency: string;
  startDate: string;
  endDate: string;
  vehicleNumber?: string;
  holderName?: string;
  planName?: string;
  remarks?: string;
  createdAt: string;
  client: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  company: {
    id: string;
    name: string;
    code: string;
  };
  subAgent?: {
    id: string;
    name: string;
    subAgentCode: string;
  };
  broker?: {
    id: string;
    name: string;
  };
  commissions?: Array<{
    totalCommissionAmount: string;
    agentCommissionAmount: string;
    subAgentCommissionAmount?: string;
    odCommissionPercent?: string;
    tpCommissionPercent?: string;
    netCommissionPercent?: string;
  }>;
  documents?: Array<{
    id: string;
    documentType: string;
    documentUrl: string;
    documentName: string;
  }>;
}

interface Company {
  id: string;
  name: string;
  code: string;
}

const POLICY_TYPES = [
  'All',
  'Motor Insurance',
  'Health Insurance',
  'Life Insurance',
  'Term Insurance',
  'Travel Insurance',
  'Home Insurance',
  'Other'
];

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [subAgents, setSubAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [policyType, setPolicyType] = useState('All');
  const [companyId, setCompanyId] = useState('');
  const [brokerId, setBrokerId] = useState('');
  const [subAgentId, setSubAgentId] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'expired'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [viewDocsModal, setViewDocsModal] = useState<Policy | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const promises: Promise<any>[] = [
        policyAPI.getAll({ limit: 100 }),
        policyAPI.getCompanies()
      ];
      
      // Fetch brokers and sub-agents
      const brokerPromise = import('@/lib/api').then(m => m.brokerAPI.getAll().catch(() => ({ data: { data: [] } })));
      const subAgentPromise = import('@/lib/api').then(m => m.agentAPI.getSubAgents().catch(() => ({ data: { data: [] } })));
      
      const [policiesRes, companiesRes, brokersRes, subAgentsRes] = await Promise.all([
        ...promises,
        brokerPromise,
        subAgentPromise
      ]);
      
      setPolicies(policiesRes.data.data.policies || []);
      setCompanies(companiesRes.data.data || []);
      setBrokers(brokersRes.data.data || []);
      setSubAgents(subAgentsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD
  const parseDateInput = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
    }
    return dateStr;
  };

  // Format YYYY-MM-DD to DD/MM/YYYY for display
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateStr;
  };

  const downloadExcel = () => {
    const headers = ['Date', 'Client Name', 'Mobile', 'Email', 'Reg No', 'Policy No', 'Type', 'Premium', 'Company', 'Status'];
    const rows = filteredPolicies.map(p => [
      formatDate(p.createdAt),
      p.client.name,
      p.client.phone,
      p.client.email || '-',
      p.vehicleNumber || '-',
      p.policyNumber,
      p.policyType,
      p.premiumAmount,
      p.company.name,
      isExpired(p.endDate) ? 'Expired' : 'Active'
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policies-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const isExpired = (endDate: string) => new Date(endDate) < new Date();

  const filteredPolicies = policies.filter(policy => {
    // Search filter
    const matchesSearch = !search || 
      policy.policyNumber.toLowerCase().includes(search.toLowerCase()) ||
      policy.client.name.toLowerCase().includes(search.toLowerCase()) ||
      policy.company.name.toLowerCase().includes(search.toLowerCase()) ||
      policy.vehicleNumber?.toLowerCase().includes(search.toLowerCase());
    
    // Policy type filter
    const matchesType = policyType === 'All' || policy.policyType === policyType;
    
    // Company filter
    const matchesCompany = !companyId || policy.company.id === companyId;
    
    // Broker filter
    const matchesBroker = !brokerId || policy.broker?.id === brokerId;
    
    // SubAgent filter
    const matchesSubAgent = !subAgentId || policy.subAgent?.id === subAgentId;
    
    // Status filter
    const expired = isExpired(policy.endDate);
    const matchesStatus = 
      status === 'all' ||
      (status === 'active' && !expired) ||
      (status === 'expired' && expired);
    
    // Date filter (based on entry date - createdAt)
    const entryDate = new Date(policy.createdAt);
    const matchesFromDate = !fromDate || entryDate >= new Date(fromDate);
    const matchesToDate = !toDate || entryDate <= new Date(toDate);
    
    return matchesSearch && matchesType && matchesCompany && matchesBroker && matchesSubAgent && matchesStatus && matchesFromDate && matchesToDate;
  });

  const resetFilters = () => {
    setSearch('');
    setPolicyType('All');
    setCompanyId('');
    setBrokerId('');
    setSubAgentId('');
    setStatus('all');
    setFromDate('');
    setToDate('');
  };

  const handleDelete = async (id: string) => {
    try {
      await policyAPI.delete(id);
      setPolicies(policies.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete policy');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Section - Probus Style */}
      <div className="bg-white rounded border border-gray-300">
        <div className="px-3 py-2 border-b border-gray-300 flex items-center justify-between bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </h2>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {showFilters ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showFilters && (
          <div className="p-2.5 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2">
              {/* Entry From Date */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Entry From Date</label>
                <input
                  type="text"
                  value={formatDateForDisplay(fromDate)}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only numbers and /
                    const cleaned = value.replace(/[^0-9/]/g, '');
                    // Auto-format as user types
                    if (cleaned.length === 10) {
                      setFromDate(parseDateInput(cleaned));
                    } else {
                      setFromDate(parseDateInput(cleaned));
                    }
                  }}
                  placeholder="DD/MM/YYYY"
                  maxLength={10}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              
              {/* Entry To Date */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Entry To Date</label>
                <input
                  type="text"
                  value={formatDateForDisplay(toDate)}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cleaned = value.replace(/[^0-9/]/g, '');
                    if (cleaned.length === 10) {
                      setToDate(parseDateInput(cleaned));
                    } else {
                      setToDate(parseDateInput(cleaned));
                    }
                  }}
                  placeholder="DD/MM/YYYY"
                  maxLength={10}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              
              {/* Policy Type */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Product</label>
                <select
                  value={policyType}
                  onChange={(e) => setPolicyType(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white"
                >
                  {POLICY_TYPES.map(type => (
                    <option key={type} value={type}>{type === 'All' ? 'ALL' : type}</option>
                  ))}
                </select>
              </div>
              
              {/* Company */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Company</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">All</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Broker */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Broker</label>
                <select
                  value={brokerId}
                  onChange={(e) => setBrokerId(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">All</option>
                  {brokers.map(broker => (
                    <option key={broker.id} value={broker.id}>{broker.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Sub-Agent */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Sub-Agent</label>
                <select
                  value={subAgentId}
                  onChange={(e) => setSubAgentId(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">All</option>
                  {subAgents.map(sa => (
                    <option key={sa.id} value={sa.id}>{sa.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Status */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'all' | 'active' | 'expired')}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="all">ALL</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              
              {/* Search */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Policy, Client, Vehicle..."
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Filter Actions & Quick Add Buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-200">
              <button
                onClick={resetFilters}
                className="px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded hover:bg-orange-600 transition"
              >
                Reset
              </button>
              <div className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                📊 Total: {filteredPolicies.length}
              </div>
              <button
                onClick={downloadExcel}
                className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition flex items-center gap-1"
              >
                📥 Export
              </button>
              
              {/* Quick Add Buttons */}
              <div className="flex flex-wrap gap-1.5 ml-auto">
                <Link href="/dashboard/policies/new?type=motor">
                  <button className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-medium rounded hover:bg-blue-700 transition">
                    + Motor
                  </button>
                </Link>
                <Link href="/dashboard/policies/new?type=travel">
                  <button className="px-2.5 py-1 bg-teal-600 text-white text-[10px] font-medium rounded hover:bg-teal-700 transition">
                    + Travel
                  </button>
                </Link>
                <Link href="/dashboard/policies/new?type=health">
                  <button className="px-2.5 py-1 bg-green-600 text-white text-[10px] font-medium rounded hover:bg-green-700 transition">
                    + Health
                  </button>
                </Link>
                <Link href="/dashboard/policies/new?type=life">
                  <button className="px-2.5 py-1 bg-purple-600 text-white text-[10px] font-medium rounded hover:bg-purple-700 transition">
                    + Life
                  </button>
                </Link>
                <Link href="/dashboard/policies/new">
                  <button className="px-2.5 py-1 bg-gray-600 text-white text-[10px] font-medium rounded hover:bg-gray-700 transition">
                    + Other
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Section - Probus Style Professional Grid */}
      <div className="bg-white rounded border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="policy-table min-w-full">
            <thead>
              <tr>
                <th>Action</th>
                <th>Entry Date</th>
                <th>Client Name</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Registration No</th>
                <th>Policy No</th>
                <th>Fresh/Renewal/Port</th>
                <th>Policy Segment</th>
                <th>Case Type</th>
                <th>Insurer Name</th>
                <th>Plan Name</th>
                <th>PPT</th>
                <th>PT</th>
                <th className="text-right">Gross Premium</th>
                <th className="text-right">OD Premium</th>
                <th className="text-right">TP Premium</th>
                <th className="text-right">Net Premium</th>
                <th className="text-right">Payable Premium</th>
                <th>Broker Name</th>
                <th>OD Rate</th>
                <th>TP Rate</th>
                <th>Net Rate</th>
                <th className="text-right">Received Payout</th>
                <th className="text-right">TDS</th>
                <th className="text-right">Net Payout</th>
                <th>Sub-Agent</th>
                <th>OD Rate</th>
                <th>TP Rate</th>
                <th>Net Rate</th>
                <th className="text-right">Paid Payout</th>
                <th>Status</th>
                <th>Documents</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={35} className="px-4 py-12 text-center">
                    <DocumentIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No policies found</h3>
                    <p className="text-gray-500 mb-4">
                      {search || policyType !== 'All' ? 'Try different filters' : 'Get started by adding your first policy'}
                    </p>
                    <Link href="/dashboard/policies/new">
                      <Button>Add Policy</Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((policy) => {
                  const expired = isExpired(policy.endDate);
                  const commission = policy.commissions?.[0];
                  const docsCount = policy.documents?.length || 0;
                  const totalCommission = commission ? Number(commission.totalCommissionAmount || 0) : 0;
                  const agentCommission = commission ? Number(commission.agentCommissionAmount || 0) : 0;
                  const tdsAmount = agentCommission * 0.05; // 5% TDS
                  const netAmount = agentCommission - tdsAmount;
                  const commissionPercent = Number(policy.premiumAmount) > 0 
                    ? ((totalCommission / Number(policy.premiumAmount)) * 100).toFixed(2)
                    : '0';
                  
                  return (
                    <tr key={policy.id}>
                      {/* Action */}
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Link href={`/dashboard/policies/${policy.id}`}>
                            <button className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition" title="View">
                              <EyeIcon className="w-3 h-3" />
                            </button>
                          </Link>
                          <Link href={`/dashboard/policies/${policy.id}/edit`}>
                            <button className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition" title="Edit">
                              <EditIcon className="w-3 h-3" />
                            </button>
                          </Link>
                          <button 
                            onClick={() => setViewDocsModal(policy)}
                            className="p-1 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 transition" 
                            title="View Documents"
                          >
                            <DocumentIcon className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(policy.id)}
                            className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition" 
                            title="Delete"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      
                      {/* Date */}
                      <td className="whitespace-nowrap">
                        {formatDate(policy.createdAt)}
                      </td>
                      
                      {/* Client Name */}
                      <td className="whitespace-nowrap font-medium">
                        {policy.client.name}
                      </td>
                      
                      {/* Mobile */}
                      <td className="whitespace-nowrap">
                        {policy.client.phone}
                      </td>
                      
                      {/* Email */}
                      <td className="whitespace-nowrap">
                        {policy.client.email || '-'}
                      </td>
                      
                      {/* Registration No */}
                      <td className="whitespace-nowrap font-medium">
                        {policy.vehicleNumber || '-'}
                      </td>
                      
                      {/* Policy No */}
                      <td className="whitespace-nowrap">
                        <span className="text-blue-600 font-semibold">{policy.policyNumber}</span>
                      </td>
                      
                      {/* Fresh/Renewal/Port */}
                      <td className="whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                          {policy.policySource || 'Fresh'}
                        </span>
                      </td>
                      
                      {/* Policy Segment */}
                      <td className="whitespace-nowrap">
                        {policy.policyType.replace(' Insurance', '')}
                      </td>
                      
                      {/* Case Type */}
                      <td className="whitespace-nowrap">
                        {policy.policyType === 'Motor Insurance' ? policy.motorPolicyType : 'Net'}
                      </td>
                      
                      {/* Insurer Name */}
                      <td className="whitespace-nowrap font-medium">
                        {policy.company.name}
                      </td>
                      
                      {/* Plan Name */}
                      <td className="whitespace-nowrap max-w-[120px] truncate" title={policy.planName || '-'}>
                        {policy.planName || '-'}
                      </td>
                      
                      {/* PPT */}
                      <td className="whitespace-nowrap capitalize">
                        {policy.premiumFrequency === 'yearly' ? '1' : '-'}
                      </td>
                      
                      {/* PT */}
                      <td className="whitespace-nowrap">1</td>
                      
                      {/* Gross Premium */}
                      <td className="whitespace-nowrap text-right font-semibold">
                        {formatCurrency(policy.premiumAmount)}
                      </td>
                      
                      {/* OD Premium */}
                      <td className="whitespace-nowrap text-right">
                        {policy.odPremium ? formatCurrency(policy.odPremium) : '-'}
                      </td>
                      
                      {/* TP Premium */}
                      <td className="whitespace-nowrap text-right">
                        {policy.tpPremium ? formatCurrency(policy.tpPremium) : '-'}
                      </td>
                      
                      {/* Net Premium */}
                      <td className="whitespace-nowrap text-right">
                        {policy.netPremium ? formatCurrency(policy.netPremium) : formatCurrency(policy.premiumAmount)}
                      </td>
                      
                      {/* Payable Premium */}
                      <td className="whitespace-nowrap text-right">
                        {formatCurrency(policy.premiumAmount)}
                      </td>
                      
                      {/* Broker Name */}
                      <td className="whitespace-nowrap">
                        {policy.broker?.name || '-'}
                      </td>
                      
                      {/* OD Rate */}
                      <td className="whitespace-nowrap">
                        {commission?.odCommissionPercent ? `${commission.odCommissionPercent}%` : '-'}
                      </td>
                      
                      {/* TP Rate */}
                      <td className="whitespace-nowrap">
                        {commission?.tpCommissionPercent ? `${commission.tpCommissionPercent}%` : '-'}
                      </td>
                      
                      {/* Net Rate */}
                      <td className="whitespace-nowrap">
                        {commission?.netCommissionPercent ? `${commission.netCommissionPercent}%` : commissionPercent ? `${commissionPercent}%` : '-'}
                      </td>
                      
                      {/* Received Payout (Agent Commission) */}
                      <td className="whitespace-nowrap text-right font-semibold text-green-600">
                        {commission ? formatCurrency(commission.agentCommissionAmount) : '-'}
                      </td>
                      
                      {/* TDS */}
                      <td className="whitespace-nowrap text-right text-red-600">
                        {commission ? formatCurrency(tdsAmount) : '-'}
                      </td>
                      
                      {/* Net Payout (After TDS) */}
                      <td className="whitespace-nowrap text-right font-semibold text-green-700">
                        {commission ? formatCurrency(netAmount) : '-'}
                      </td>
                      
                      {/* Sub-Agent */}
                      <td className="whitespace-nowrap">
                        {policy.subAgent?.name || '-'}
                      </td>
                      
                      {/* Sub-Agent OD Rate */}
                      <td className="whitespace-nowrap">
                        -
                      </td>
                      
                      {/* Sub-Agent TP Rate */}
                      <td className="whitespace-nowrap">
                        -
                      </td>
                      
                      {/* Sub-Agent Net Rate */}
                      <td className="whitespace-nowrap">
                        -
                      </td>
                      
                      {/* Paid Payout (Sub-Agent Commission) */}
                      <td className="whitespace-nowrap text-right text-blue-600">
                        {commission?.subAgentCommissionAmount ? formatCurrency(commission.subAgentCommissionAmount) : '-'}
                      </td>
                      
                      {/* Status */}
                      <td className="whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          commission ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {commission ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      
                      {/* Documents */}
                      <td className="whitespace-nowrap text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          docsCount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {docsCount > 0 ? `✓ ${docsCount}` : '✗'}
                        </span>
                      </td>
                      
                      {/* Remark */}
                      <td className="max-w-[120px] truncate" title={policy.remarks || '-'}>
                        {policy.remarks || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filteredPolicies.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredPolicies.length} of {policies.length} policies
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Items per page:</span>
              <select className="px-2 py-1 text-sm border border-gray-300 rounded bg-white">
                <option>10</option>
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* View Documents Modal */}
      {viewDocsModal && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden relative z-[10000]">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">View Uploaded documents</h2>
              <button
                onClick={() => setViewDocsModal(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {[
                  { label: 'Policy Pdf', type: 'POLICY_PDF' },
                  { label: 'Client Pdf', type: 'POLICYCOPY' },
                  { label: 'Mandate Pdf', type: 'AADHARFRONT' },
                  { label: 'Proposer Form Pdf', type: 'AADHARBACK' },
                  { label: 'Illustration Form Pdf', type: 'PANCARD' },
                  { label: 'Payout Proof Pdf', type: 'CANCELCHEQUE' }
                ].map((doc) => {
                  const document = viewDocsModal.documents?.find(d => d.documentType === doc.type);
                  return (
                    <div key={doc.type} className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm font-medium text-gray-700">{doc.label}</span>
                      {document ? (
                        <a
                          href={document.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          {document.documentName}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full relative z-[10000]">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this policy? This action cannot be undone.</p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
