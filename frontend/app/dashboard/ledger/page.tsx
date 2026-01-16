'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ledgerAPI, clientAPI } from '@/lib/api';

interface LedgerEntry {
  id: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  entryDate: string;
  client: {
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

export default function LedgerPage() {
  const searchParams = useSearchParams();
  const preSelectedClientId = searchParams.get('clientId');
  
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [pendingCollections, setPendingCollections] = useState<PendingCollection[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'add'>('all');
  const [filter, setFilter] = useState<'all' | 'debit' | 'credit'>('all');
  
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [entriesRes, pendingRes, clientsRes] = await Promise.all([
        ledgerAPI.getAll(),
        ledgerAPI.getPending(),
        clientAPI.getAll()
      ]);
      setEntries(entriesRes.data.data || []);
      setPendingCollections(pendingRes.data.data || []);
      setClients(clientsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
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
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-red-600">Total Debit (उधार)</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(totalDebit)}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-green-600">Total Credit (जमा)</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalCredit)}</p>
          </CardContent>
        </Card>
        <Card className={balance > 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}>
          <CardContent className="p-4">
            <p className={`text-sm ${balance > 0 ? 'text-orange-600' : 'text-blue-600'}`}>
              {balance > 0 ? 'Pending Collection (बाकी)' : 'Advance (अग्रिम)'}
            </p>
            <p className={`text-2xl font-bold ${balance > 0 ? 'text-orange-700' : 'text-blue-700'}`}>
              {formatCurrency(Math.abs(balance))}
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
        </div>
      </div>

      {/* All Entries Tab */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
            {(['all', 'debit', 'credit'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition ${
                  filter === f 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {f === 'debit' ? 'Debit (उधार)' : f === 'credit' ? 'Credit (जमा)' : 'All'}
              </button>
            ))}
          </div>

          {/* Entries List */}
          {filteredEntries.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No entries found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <Card key={entry.id} className="hover:shadow-md transition">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          entry.entryType === 'DEBIT' 
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-green-100 text-green-600'
                        }`}>
                          {entry.entryType === 'DEBIT' ? '↑' : '↓'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{entry.client.name}</p>
                          <p className="text-sm text-gray-500">{entry.description}</p>
                          {entry.policy && (
                            <p className="text-xs text-gray-400">Policy: {entry.policy.policyNumber}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          entry.entryType === 'DEBIT' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {entry.entryType === 'DEBIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(entry.entryDate)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
