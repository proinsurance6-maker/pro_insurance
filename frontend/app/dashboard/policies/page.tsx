'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { policyAPI } from '@/lib/api';

interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  premiumAmount: number;
  sumAssured: number;
  status: string;
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
    code: string;
  };
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const response = await policyAPI.getAll();
      setPolicies(response.data.data.policies || []);
    } catch (error) {
      console.error('Failed to fetch policies:', error);
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
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = 
      policy.policyNumber.toLowerCase().includes(search.toLowerCase()) ||
      policy.client.name.toLowerCase().includes(search.toLowerCase()) ||
      policy.company.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'active' && policy.status === 'active') ||
      (filter === 'expired' && policy.status === 'expired');
    
    return matchesSearch && matchesFilter;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Policies</h1>
          <p className="text-gray-600">{policies.length} total policies</p>
        </div>
        <Link href="/dashboard/policies/new">
          <Button className="w-full sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Policy
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search by policy number, client, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['all', 'active', 'expired'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition ${
                filter === f 
                  ? 'bg-white shadow text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Policies List */}
      {filteredPolicies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DocumentIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No policies found</h3>
            <p className="text-gray-500 mb-4">
              {search || filter !== 'all' ? 'Try different filters' : 'Get started by adding your first policy'}
            </p>
            {!search && filter === 'all' && (
              <Link href="/dashboard/policies/new">
                <Button>Add Policy</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPolicies.map((policy) => (
            <Link key={policy.id} href={`/dashboard/policies/${policy.id}`}>
              <Card className="hover:shadow-md transition cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold shrink-0">
                        {policy.company.code?.slice(0, 2) || 'IN'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{policy.policyNumber}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            policy.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {policy.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{policy.client.name}</p>
                        <p className="text-sm text-gray-500">{policy.company.name} • {policy.policyType}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(policy.premiumAmount)}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(policy.startDate)} - {formatDate(policy.endDate)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
