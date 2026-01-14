'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { policyAPI } from '@/lib/api';

interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  motorPolicyType?: string;
  premiumAmount: string;
  sumAssured: string;
  startDate: string;
  endDate: string;
  vehicleNumber?: string;
  createdAt: string;
  client: {
    id: string;
    name: string;
    phone: string;
  };
  company: {
    id: string;
    name: string;
    code: string;
  };
  subAgent?: {
    id: string;
    name: string;
  };
  commissions?: Array<{
    totalCommissionAmount: string;
    agentCommissionAmount: string;
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
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [policyType, setPolicyType] = useState('All');
  const [companyId, setCompanyId] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'expired'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [policiesRes, companiesRes] = await Promise.all([
        policyAPI.getAll({ limit: 100 }),
        policyAPI.getCompanies()
      ]);
      setPolicies(policiesRes.data.data.policies || []);
      setCompanies(companiesRes.data.data || []);
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
    
    // Status filter
    const expired = isExpired(policy.endDate);
    const matchesStatus = 
      status === 'all' ||
      (status === 'active' && !expired) ||
      (status === 'expired' && expired);
    
    // Date filter
    const policyDate = new Date(policy.startDate);
    const matchesFromDate = !fromDate || policyDate >= new Date(fromDate);
    const matchesToDate = !toDate || policyDate <= new Date(toDate);
    
    return matchesSearch && matchesType && matchesCompany && matchesStatus && matchesFromDate && matchesToDate;
  });

  const resetFilters = () => {
    setSearch('');
    setPolicyType('All');
    setCompanyId('');
    setStatus('all');
    setFromDate('');
    setToDate(new Date().toISOString().split('T')[0]);
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
      {/* Header with Quick Add Buttons */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Policies</h1>
            <p className="text-sm text-gray-500">{policies.length} total policies</p>
          </div>
          
          {/* Quick Add Buttons - Probus Style */}
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/policies/new?type=motor">
              <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                Add Motor
              </button>
            </Link>
            <Link href="/dashboard/policies/new?type=travel">
              <button className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition">
                Add Travel
              </button>
            </Link>
            <Link href="/dashboard/policies/new?type=health">
              <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition">
                Add Health
              </button>
            </Link>
            <Link href="/dashboard/policies/new?type=life">
              <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition">
                Add Life
              </button>
            </Link>
            <Link href="/dashboard/policies/new">
              <button className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition">
                Add Other
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters Section - Probus Style */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <FilterIcon className="w-4 h-4" />
            Filters
          </h2>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showFilters ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showFilters && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* From Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* To Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Policy Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                <select
                  value={policyType}
                  onChange={(e) => setPolicyType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {POLICY_TYPES.map(type => (
                    <option key={type} value={type}>{type === 'All' ? 'ALL' : type}</option>
                  ))}
                </select>
              </div>
              
              {/* Company */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'all' | 'active' | 'expired')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">ALL</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              
              {/* Search */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Policy, Client, Vehicle..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Filter Actions */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition"
              >
                Reset
              </button>
              <div className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">
                📊 Total: {filteredPolicies.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Section - Probus Style */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Policy Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Premium</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Commission</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Start Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">End Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
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
                  return (
                    <tr key={policy.id} className="hover:bg-gray-50 transition">
                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/policies/${policy.id}`}>
                            <button className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition" title="View">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </Link>
                          <Link href={`/dashboard/policies/${policy.id}/edit`}>
                            <button className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition" title="Edit">
                              <EditIcon className="w-4 h-4" />
                            </button>
                          </Link>
                        </div>
                      </td>
                      
                      {/* Policy Number */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{policy.policyNumber}</div>
                        {policy.vehicleNumber && (
                          <div className="text-xs text-gray-500">{policy.vehicleNumber}</div>
                        )}
                      </td>
                      
                      {/* Client */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{policy.client.name}</div>
                        <div className="text-xs text-gray-500">{policy.client.phone}</div>
                      </td>
                      
                      {/* Company */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{policy.company.code || policy.company.name.slice(0, 10)}</div>
                      </td>
                      
                      {/* Product */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{policy.policyType.replace(' Insurance', '')}</div>
                        {policy.motorPolicyType && (
                          <div className="text-xs text-gray-500">{policy.motorPolicyType}</div>
                        )}
                      </td>
                      
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          expired 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {expired ? 'Expired' : 'Active'}
                        </span>
                      </td>
                      
                      {/* Premium */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(policy.premiumAmount)}</div>
                      </td>
                      
                      {/* Commission */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {commission ? formatCurrency(commission.agentCommissionAmount) : '-'}
                        </div>
                      </td>
                      
                      {/* Start Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(policy.startDate)}</div>
                      </td>
                      
                      {/* End Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={`text-sm ${expired ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {formatDate(policy.endDate)}
                        </div>
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
