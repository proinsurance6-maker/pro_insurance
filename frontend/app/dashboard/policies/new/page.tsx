'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { policyAPI, clientAPI, agentAPI } from '@/lib/api';

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

interface SubAgent {
  id: string;
  name: string;
  subAgentCode: string;
  commissionPercentage: string;
}

type EntryMode = 'manual' | 'scan' | 'excel';

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

const MOTOR_POLICY_TYPES = [
  { value: 'COMPREHENSIVE', label: 'Comprehensive (OD + TP)' },
  { value: 'OD_ONLY', label: 'OD Only (Own Damage)' },
  { value: 'TP_ONLY', label: 'TP Only (Third Party)' }
];

const PAYMENT_MODES = ['yearly', 'half-yearly', 'quarterly', 'monthly', 'single'];

export default function NewPolicyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedClientId = searchParams.get('clientId');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  
  const [entryMode, setEntryMode] = useState<EntryMode>('manual');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  
  // New client form data
  const [newClientData, setNewClientData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [creatingClient, setCreatingClient] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: preSelectedClientId || '',
    clientName: '',
    companyId: '',
    policyNumber: '',
    policyType: '',
    motorPolicyType: '', // COMPREHENSIVE, OD_ONLY, TP_ONLY
    planName: '',
    sumAssured: '',
    premiumAmount: '',
    // Motor premium breakdown
    odPremium: '',
    tpPremium: '',
    netPremium: '',
    paymentMode: 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    // Commission fields
    commissionRate: '',
    odCommissionRate: '',
    tpCommissionRate: '',
    netCommissionRate: '',
    renewalCommissionRate: '',
    // Sub-agent
    subAgentId: '',
    holderName: '',
    vehicleNumber: '',
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
      const [companiesRes, clientsRes, subAgentsRes] = await Promise.all([
        policyAPI.getCompanies(),
        clientAPI.getAll(),
        agentAPI.getSubAgents()
      ]);
      setCompanies(Array.isArray(companiesRes.data.data) ? companiesRes.data.data : []);
      setClients(clientsRes.data.data?.clients || []);
      setSubAgents(subAgentsRes.data.data || []);
      
      // Set pre-selected client name
      if (preSelectedClientId) {
        const client = clientsRes.data.data?.clients?.find((c: Client) => c.id === preSelectedClientId);
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

  // Create new client inline
  const handleCreateClient = async () => {
    if (!newClientData.name || !newClientData.phone) {
      setError('Client name and phone are required');
      return;
    }
    setCreatingClient(true);
    try {
      const response = await clientAPI.create(newClientData);
      const newClient = response.data.data;
      // Add to list and select
      setClients(prev => [newClient, ...prev]);
      setFormData(prev => ({ ...prev, clientId: newClient.id, clientName: newClient.name }));
      setClientSearch(newClient.name);
      setShowNewClientForm(false);
      setShowClientDropdown(false);
      setNewClientData({ name: '', phone: '', email: '', address: '' });
      setSuccess('✅ New client created and selected');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create client');
    } finally {
      setCreatingClient(false);
    }
  };

  // Calculate total commission for motor policies
  const calculateTotalCommission = () => {
    const isMotor = formData.policyType === 'Motor Insurance';
    if (isMotor && formData.motorPolicyType === 'COMPREHENSIVE') {
      const odComm = (parseFloat(formData.odPremium) || 0) * (parseFloat(formData.odCommissionRate) || 0) / 100;
      const tpComm = (parseFloat(formData.tpPremium) || 0) * (parseFloat(formData.tpCommissionRate) || 0) / 100;
      return odComm + tpComm;
    } else if (isMotor && formData.motorPolicyType === 'OD_ONLY') {
      return (parseFloat(formData.odPremium) || 0) * (parseFloat(formData.odCommissionRate) || 0) / 100;
    } else if (isMotor && formData.motorPolicyType === 'TP_ONLY') {
      return (parseFloat(formData.tpPremium) || 0) * (parseFloat(formData.tpCommissionRate) || 0) / 100;
    } else {
      // Other policies - Net based
      return (parseFloat(formData.netPremium || formData.premiumAmount) || 0) * (parseFloat(formData.netCommissionRate || formData.commissionRate) || 0) / 100;
    }
  };

  // Get selected sub-agent commission share
  const getSubAgentShare = () => {
    if (!formData.subAgentId) return null;
    const subAgent = subAgents.find(sa => sa.id === formData.subAgentId);
    if (!subAgent) return null;
    const totalComm = calculateTotalCommission();
    const subAgentPercent = parseFloat(subAgent.commissionPercentage) || 0;
    return {
      subAgentAmount: (totalComm * subAgentPercent) / 100,
      agentAmount: totalComm - (totalComm * subAgentPercent) / 100,
      subAgentPercent
    };
  };

  // Handle document scan/upload
  const handleDocumentScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setError('');
    setSuccess('');

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setScannedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload for OCR processing
      const formDataUpload = new FormData();
      formDataUpload.append('document', file);
      
      const response = await policyAPI.scanDocument(formDataUpload);
      const extractedData = response.data.data;

      // Fill form with extracted data
      if (extractedData) {
        setFormData(prev => ({
          ...prev,
          policyNumber: extractedData.policyNumber || prev.policyNumber,
          policyType: extractedData.policyType || prev.policyType,
          planName: extractedData.planName || prev.planName,
          sumAssured: extractedData.sumAssured?.toString() || prev.sumAssured,
          premiumAmount: extractedData.premiumAmount?.toString() || prev.premiumAmount,
          startDate: extractedData.startDate || prev.startDate,
          endDate: extractedData.endDate || prev.endDate,
          holderName: extractedData.holderName || prev.holderName,
          vehicleNumber: extractedData.vehicleNumber || prev.vehicleNumber,
        }));

        // Try to match company
        if (extractedData.companyName) {
          const matchedCompany = companies.find(c => 
            c.name.toLowerCase().includes(extractedData.companyName.toLowerCase()) ||
            extractedData.companyName.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchedCompany) {
            setFormData(prev => ({ ...prev, companyId: matchedCompany.id }));
          }
        }

        // Build success message with extracted fields
        const extractedFields = [];
        if (extractedData.policyNumber) extractedFields.push('Policy No');
        if (extractedData.companyName) extractedFields.push('Company');
        if (extractedData.holderName) extractedFields.push('Holder Name');
        if (extractedData.premiumAmount) extractedFields.push('Premium');
        if (extractedData.startDate) extractedFields.push('Dates');
        
        setSuccess(`✅ Extracted: ${extractedFields.join(', ')}. Please verify details.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to scan document. Please try again or enter manually.');
    } finally {
      setScanning(false);
    }
  };

  // Handle Excel import
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError('');
    setSuccess('');
    setExcelFileName(file.name);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await policyAPI.parseExcel(formDataUpload);
      const policies = response.data.data.policies || [];
      
      if (policies.length > 0) {
        setExcelData(policies);
        setSuccess(`✅ Found ${policies.length} policies in Excel. Review and import below.`);
      } else {
        setError('No valid policies found in Excel file. Check column headers.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to parse Excel file.');
    } finally {
      setImporting(false);
    }
  };

  // Bulk import from Excel
  const handleBulkImport = async () => {
    if (excelData.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const response = await policyAPI.bulkCreate(excelData);
      setSuccess(`✅ Successfully imported ${response.data.data.created} policies!`);
      setExcelData([]);
      setTimeout(() => router.push('/dashboard/policies'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to import policies.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const isMotor = formData.policyType === 'Motor Insurance';
      await policyAPI.create({
        clientId: formData.clientId,
        companyId: formData.companyId,
        policyNumber: formData.policyNumber,
        policyType: formData.policyType,
        motorPolicyType: isMotor ? formData.motorPolicyType : undefined,
        sumAssured: parseFloat(formData.sumAssured) || 0,
        premiumAmount: parseFloat(formData.premiumAmount),
        // Motor premium breakdown
        odPremium: isMotor ? parseFloat(formData.odPremium) || undefined : undefined,
        tpPremium: isMotor ? parseFloat(formData.tpPremium) || undefined : undefined,
        netPremium: parseFloat(formData.netPremium) || undefined,
        paymentMode: formData.paymentMode,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        // Commission rates
        commissionRate: parseFloat(formData.commissionRate) || 0,
        odCommissionRate: isMotor ? parseFloat(formData.odCommissionRate) || undefined : undefined,
        tpCommissionRate: isMotor ? parseFloat(formData.tpCommissionRate) || undefined : undefined,
        netCommissionRate: parseFloat(formData.netCommissionRate) || undefined,
        renewalCommissionRate: parseFloat(formData.renewalCommissionRate) || undefined,
        // Sub-agent
        subAgentId: formData.subAgentId || undefined,
        holderName: formData.holderName || undefined,
        vehicleNumber: isMotor ? formData.vehicleNumber : undefined,
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
        <p className="text-gray-600">Choose how you want to add policy details</p>
      </div>

      {/* Entry Mode Selection */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => { setEntryMode('manual'); setError(''); setSuccess(''); }}
          className={`p-4 rounded-lg border-2 transition-all ${
            entryMode === 'manual' 
              ? 'border-blue-500 bg-blue-50 text-blue-700' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-1">✏️</div>
          <div className="font-medium text-sm">Manual</div>
          <div className="text-xs text-gray-500">Type details</div>
        </button>
        
        <button
          onClick={() => { setEntryMode('scan'); setError(''); setSuccess(''); }}
          className={`p-4 rounded-lg border-2 transition-all ${
            entryMode === 'scan' 
              ? 'border-blue-500 bg-blue-50 text-blue-700' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-1">📷</div>
          <div className="font-medium text-sm">Scan Document</div>
          <div className="text-xs text-gray-500">Auto-fill from image</div>
        </button>
        
        <button
          onClick={() => { setEntryMode('excel'); setError(''); setSuccess(''); }}
          className={`p-4 rounded-lg border-2 transition-all ${
            entryMode === 'excel' 
              ? 'border-blue-500 bg-blue-50 text-blue-700' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-1">📊</div>
          <div className="font-medium text-sm">Excel Import</div>
          <div className="text-xs text-gray-500">Bulk upload</div>
        </button>
      </div>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDocumentScan}
        accept="image/*,.pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={excelInputRef}
        onChange={handleExcelImport}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Scan Mode UI */}
      {entryMode === 'scan' && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">📄</div>
              <h3 className="font-medium text-gray-900 mb-2">Scan Policy Document</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload policy copy image or PDF to auto-extract details
              </p>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className="mb-4"
              >
                {scanning ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Scanning...
                  </>
                ) : (
                  <>📷 Choose File / Take Photo</>
                )}
              </Button>

              {scannedImage && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Uploaded Document:</p>
                  <img 
                    src={scannedImage} 
                    alt="Scanned document" 
                    className="max-h-48 mx-auto rounded-lg border"
                  />
                </div>
              )}

              {success && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Excel Mode UI */}
      {entryMode === 'excel' && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-medium text-gray-900 mb-2">Import from Excel</h3>
              <p className="text-sm text-gray-600 mb-2">
                Upload Excel file with policy data. Required columns:
              </p>
              <p className="text-xs text-gray-500 mb-4 bg-gray-100 p-2 rounded">
                Policy Number, Client Name, Client Phone, Company, Policy Type, Premium, Start Date, End Date
              </p>
              
              <Button
                onClick={() => excelInputRef.current?.click()}
                disabled={importing}
                variant="outline"
                className="mb-4"
              >
                {importing ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Reading Excel...
                  </>
                ) : (
                  <>📁 Choose Excel File</>
                )}
              </Button>

              {excelFileName && (
                <p className="text-sm text-gray-600">File: {excelFileName}</p>
              )}

              {success && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {/* Excel Preview Table */}
              {excelData.length > 0 && (
                <div className="mt-4 text-left">
                  <h4 className="font-medium mb-2">Preview ({excelData.length} policies):</h4>
                  <div className="max-h-64 overflow-auto border rounded">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Policy No</th>
                          <th className="p-2 text-left">Client</th>
                          <th className="p-2 text-left">Type</th>
                          <th className="p-2 text-right">Premium</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelData.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{row.policyNumber}</td>
                            <td className="p-2">{row.clientName}</td>
                            <td className="p-2">{row.policyType}</td>
                            <td className="p-2 text-right">₹{row.premiumAmount}</td>
                          </tr>
                        ))}
                        {excelData.length > 10 && (
                          <tr className="border-t bg-gray-50">
                            <td colSpan={4} className="p-2 text-center text-gray-500">
                              ... and {excelData.length - 10} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => { setExcelData([]); setExcelFileName(''); }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkImport}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Importing...' : `Import ${excelData.length} Policies`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Form - show for manual mode, or after scan/excel fills data */}
      {(entryMode === 'manual' || (entryMode === 'scan' && scannedImage)) && (
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {success && entryMode === 'scan' && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
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
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <div className="p-3">
                        <p className="text-gray-500 text-sm mb-2">No clients found matching "{clientSearch}"</p>
                        <Button 
                          type="button" 
                          size="sm" 
                          onClick={() => {
                            setShowNewClientForm(true);
                            setShowClientDropdown(false);
                            setNewClientData(prev => ({ ...prev, name: clientSearch }));
                          }}
                          className="w-full"
                        >
                          ➕ Add New Client
                        </Button>
                      </div>
                    ) : (
                      <>
                        {filteredClients.slice(0, 5).map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleClientSelect(client)}
                            className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                          >
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-gray-500">{client.phone}</p>
                          </button>
                        ))}
                        <div className="p-2 border-t bg-gray-50">
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setShowNewClientForm(true);
                              setShowClientDropdown(false);
                            }}
                            className="w-full"
                          >
                            ➕ Add New Client
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {formData.clientId && (
                  <p className="text-sm text-green-600 mt-1">✓ Client selected: {formData.clientName}</p>
                )}
              </div>

              {/* Inline New Client Form */}
              {showNewClientForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-blue-800">Add New Client</h4>
                    <button type="button" onClick={() => setShowNewClientForm(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Client Name *"
                      value={newClientData.name}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Phone Number *"
                      value={newClientData.phone}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                    <Input
                      placeholder="Email (optional)"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                    />
                    <Input
                      placeholder="Address (optional)"
                      value={newClientData.address}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleCreateClient} 
                    disabled={creatingClient || !newClientData.name || !newClientData.phone}
                    className="w-full"
                  >
                    {creatingClient ? 'Creating...' : '✓ Create & Select Client'}
                  </Button>
                </div>
              )}

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
                
                {/* Motor Policy Sub-Type */}
                {formData.policyType === 'Motor Insurance' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motor Policy Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="motorPolicyType"
                      value={formData.motorPolicyType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select motor type</option>
                      {MOTOR_POLICY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {formData.policyType !== 'Motor Insurance' && (
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
                )}
              </div>

              {/* Vehicle Number for Motor */}
              {formData.policyType === 'Motor Insurance' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={handleChange}
                    placeholder="e.g., MH01AB1234"
                    required
                  />
                </div>
              )}

              {/* Premium Section */}
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
                    Total Premium (₹) <span className="text-red-500">*</span>
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

              {/* Motor Premium Breakdown */}
              {formData.policyType === 'Motor Insurance' && formData.motorPolicyType && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-yellow-800">Premium Breakdown</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {(formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'OD_ONLY') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">OD Premium (₹)</label>
                        <Input
                          type="number"
                          name="odPremium"
                          value={formData.odPremium}
                          onChange={handleChange}
                          placeholder="0"
                        />
                      </div>
                    )}
                    {(formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'TP_ONLY') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">TP Premium (₹)</label>
                        <Input
                          type="number"
                          name="tpPremium"
                          value={formData.tpPremium}
                          onChange={handleChange}
                          placeholder="0"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Net Premium (₹)</label>
                      <Input
                        type="number"
                        name="netPremium"
                        value={formData.netPremium}
                        onChange={handleChange}
                        placeholder="Excl. GST"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Non-Motor Net Premium */}
              {formData.policyType && formData.policyType !== 'Motor Insurance' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Net Premium (₹) <span className="text-gray-400 text-xs">for commission calculation</span>
                  </label>
                  <Input
                    type="number"
                    name="netPremium"
                    value={formData.netPremium}
                    onChange={handleChange}
                    placeholder="Premium excluding GST"
                  />
                </div>
              )}

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
            </div>

            {/* Sub-Agent / Broker Assignment */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Sub-Agent / Broker (Optional)</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Sub-Agent
                </label>
                <select
                  name="subAgentId"
                  value={formData.subAgentId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Sub-Agent (Direct)</option>
                  {subAgents.map((sa) => (
                    <option key={sa.id} value={sa.id}>
                      {sa.name} ({sa.subAgentCode}) - {sa.commissionPercentage}% share
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  <Link href="/dashboard/sub-agents" className="text-blue-600 hover:underline">Manage Sub-Agents</Link>
                </p>
              </div>
            </div>

            {/* Commission Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Commission Details</h3>
              
              {/* Motor Commission Rates */}
              {formData.policyType === 'Motor Insurance' && formData.motorPolicyType && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-green-800">Commission Rates (%)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {(formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'OD_ONLY') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">OD Commission %</label>
                        <Input
                          type="number"
                          name="odCommissionRate"
                          value={formData.odCommissionRate}
                          onChange={handleChange}
                          placeholder="e.g., 15"
                          step="0.01"
                          max="100"
                        />
                      </div>
                    )}
                    {(formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'TP_ONLY') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">TP Commission %</label>
                        <Input
                          type="number"
                          name="tpCommissionRate"
                          value={formData.tpCommissionRate}
                          onChange={handleChange}
                          placeholder="e.g., 5"
                          step="0.01"
                          max="100"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Net Commission %</label>
                      <Input
                        type="number"
                        name="netCommissionRate"
                        value={formData.netCommissionRate}
                        onChange={handleChange}
                        placeholder="Optional"
                        step="0.01"
                        max="100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Non-Motor Commission */}
              {formData.policyType && formData.policyType !== 'Motor Insurance' && (
                <div className="grid grid-cols-2 gap-4">
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Renewal Commission (%)
                    </label>
                    <Input
                      type="number"
                      name="renewalCommissionRate"
                      value={formData.renewalCommissionRate}
                      onChange={handleChange}
                      placeholder="For future renewals"
                      step="0.01"
                      max="100"
                    />
                  </div>
                </div>
              )}

              {/* Commission Calculation Preview */}
              {(formData.premiumAmount || formData.odPremium || formData.tpPremium) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Commission Preview</h4>
                  <div className="text-sm space-y-1">
                    <p>Total Commission: <span className="font-bold text-green-700">₹{calculateTotalCommission().toFixed(2)}</span></p>
                    {formData.subAgentId && getSubAgentShare() && (
                      <>
                        <p className="text-gray-600">
                          → Your Share: <span className="font-medium">₹{getSubAgentShare()?.agentAmount.toFixed(2)}</span>
                        </p>
                        <p className="text-gray-600">
                          → Sub-Agent ({getSubAgentShare()?.subAgentPercent}%): <span className="font-medium">₹{getSubAgentShare()?.subAgentAmount.toFixed(2)}</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
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
      )}

      {/* Error display for Excel mode */}
      {entryMode === 'excel' && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
          {error}
        </div>
      )}
    </div>
  );
}
