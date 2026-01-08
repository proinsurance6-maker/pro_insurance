'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { policyAPI, clientAPI } from '@/lib/api';

interface Company {
  id: string;
  name: string;
  code: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

const POLICY_TYPES = [
  'Life Insurance',
  'Health Insurance',
  'Motor Insurance',
  'Term Insurance',
  'ULIP',
  'Endowment',
  'Money Back',
  'Pension Plan',
  'Child Plan',
  'Travel Insurance',
  'Home Insurance',
  'Other'
];

const PAYMENT_MODES = ['yearly', 'half-yearly', 'quarterly', 'monthly', 'single'];

export default function NewPolicyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedClientId = searchParams.get('clientId');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: preSelectedClientId || '',
    clientName: '',
    companyId: '',
    policyNumber: '',
    policyType: '',
    sumAssured: '',
    premiumAmount: '',
    paymentMode: 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    commissionRate: '',
    holderName: '',
    remarks: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Auto-calculate end date based on start date and payment mode
    if (formData.startDate) {
      const startDate = new Date(formData.startDate);
      startDate.setFullYear(startDate.getFullYear() + 1);
      setFormData(prev => ({
        ...prev,
        endDate: startDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.startDate]);

  const fetchData = async () => {
    try {
      const [companiesRes, clientsRes] = await Promise.all([
        policyAPI.getCompanies(),
        clientAPI.getAll()
      ]);
      setCompanies(companiesRes.data.data || []);
      setClients(clientsRes.data.data || []);
      
      // Set pre-selected client name
      if (preSelectedClientId) {
        const client = clientsRes.data.data?.find((c: Client) => c.id === preSelectedClientId);
        if (client) {
          setFormData(prev => ({ ...prev, clientName: client.name }));
          setClientSearch(client.name);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({ ...prev, clientId: client.id, clientName: client.name }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.phone.includes(clientSearch)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await policyAPI.create({
        clientId: formData.clientId,
        companyId: formData.companyId,
        policyNumber: formData.policyNumber,
        policyType: formData.policyType,
        sumAssured: parseFloat(formData.sumAssured) || 0,
        premiumAmount: parseFloat(formData.premiumAmount),
        paymentMode: formData.paymentMode,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        commissionRate: parseFloat(formData.commissionRate) || 0,
        holderName: formData.holderName || undefined,
        remarks: formData.remarks || undefined,
      });
      router.push('/dashboard/policies');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/policies" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Back to Policies
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Add New Policy</h1>
        <p className="text-gray-600">Enter policy details below</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Client Selection */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Client Details</h3>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Client <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                    setFormData(prev => ({ ...prev, clientId: '', clientName: '' }));
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder="Search client by name or phone..."
                  required
                />
                {showClientDropdown && clientSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <div className="p-3 text-gray-500 text-center">
                        No clients found. <Link href="/dashboard/clients/new" className="text-blue-600">Add new</Link>
                      </div>
                    ) : (
                      filteredClients.slice(0, 5).map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleClientSelect(client)}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-gray-500">{client.phone}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {formData.clientId && (
                  <p className="text-sm text-green-600 mt-1">✓ Client selected: {formData.clientName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Policy Holder Name (if different from client)
                </label>
                <Input
                  name="holderName"
                  value={formData.holderName}
                  onChange={handleChange}
                  placeholder="Leave empty if same as client"
                />
              </div>
            </div>

            {/* Policy Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Policy Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="companyId"
                    value={formData.companyId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Policy Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="policyNumber"
                    value={formData.policyNumber}
                    onChange={handleChange}
                    placeholder="e.g., POL123456"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Policy Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="policyType"
                    value={formData.policyType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select type</option>
                    {POLICY_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode} className="capitalize">
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sum Assured (₹)
                  </label>
                  <Input
                    type="number"
                    name="sumAssured"
                    value={formData.sumAssured}
                    onChange={handleChange}
                    placeholder="e.g., 1000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Premium Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    name="premiumAmount"
                    value={formData.premiumAmount}
                    onChange={handleChange}
                    placeholder="e.g., 25000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission Rate (%)
                </label>
                <Input
                  type="number"
                  name="commissionRate"
                  value={formData.commissionRate}
                  onChange={handleChange}
                  placeholder="e.g., 15"
                  step="0.01"
                  max="100"
                />
                {formData.premiumAmount && formData.commissionRate && (
                  <p className="text-sm text-green-600 mt-1">
                    Expected commission: ₹{(parseFloat(formData.premiumAmount) * parseFloat(formData.commissionRate) / 100).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Any additional notes..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.clientId || !formData.companyId || !formData.policyNumber}
                className="flex-1"
              >
                {loading ? 'Saving...' : 'Save Policy'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
