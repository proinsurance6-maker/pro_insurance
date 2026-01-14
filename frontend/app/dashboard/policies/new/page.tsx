'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { policyAPI, clientAPI, agentAPI, brokerAPI } from '@/lib/api';

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

interface Broker {
  id: string;
  name: string;
  code: string | null;
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
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [showNewBrokerForm, setShowNewBrokerForm] = useState(false);
  const [showSubAgentForm, setShowSubAgentForm] = useState(false);
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
  
  // New broker form data
  const [newBrokerData, setNewBrokerData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [creatingBroker, setCreatingBroker] = useState(false);
  
  // New sub-agent form data
  const [newSubAgentData, setNewSubAgentData] = useState({
    name: '',
    phone: '',
    email: '',
    commissionPercentage: '10'
  });
  const [creatingSubAgent, setCreatingSubAgent] = useState(false);
  
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
    // Broker (PolicyBazaar, MitPro, Probus, etc.)
    brokerId: '',
    brokerCommissionAmount: '', // Manual commission input from broker
    agentSharePercent: '', // Agent keeps this %, rest to sub-agent
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
      const [companiesRes, clientsRes, subAgentsRes, brokersRes] = await Promise.all([
        policyAPI.getCompanies(),
        clientAPI.getAll(),
        agentAPI.getSubAgents(),
        brokerAPI.getAll()
      ]);
      setCompanies(Array.isArray(companiesRes.data.data) ? companiesRes.data.data : []);
      setClients(clientsRes.data.data?.clients || []);
      setSubAgents(subAgentsRes.data.data || []);
      setBrokers(brokersRes.data.data || []);
      
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

  // Create new broker inline
  const handleCreateBroker = async () => {
    if (!newBrokerData.name) {
      setError('Broker name is required');
      return;
    }
    setCreatingBroker(true);
    try {
      const response = await brokerAPI.create(newBrokerData);
      const newBroker = response.data.data;
      // Add to list and select
      setBrokers(prev => [newBroker, ...prev]);
      setFormData(prev => ({ ...prev, brokerId: newBroker.id }));
      setShowNewBrokerForm(false);
      setNewBrokerData({ name: '', phone: '', email: '' });
      setSuccess('✅ New broker added and selected');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create broker');
    } finally {
      setCreatingBroker(false);
    }
  };

  // Create new sub-agent inline
  const handleCreateSubAgent = async () => {
    if (!newSubAgentData.name) {
      setError('Sub-Agent name is required');
      return;
    }
    setCreatingSubAgent(true);
    try {
      const response = await agentAPI.createSubAgent(newSubAgentData);
      const newSubAgent = response.data.data;
      // Add to list and select
      setSubAgents(prev => [newSubAgent, ...prev]);
      setFormData(prev => ({ ...prev, subAgentId: newSubAgent.id }));
      setShowSubAgentForm(false);
      setNewSubAgentData({ name: '', phone: '', email: '', commissionPercentage: '10' });
      setSuccess('✅ New Sub-Agent added and selected');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create Sub-Agent');
    } finally {
      setCreatingSubAgent(false);
    }
  };

  // Calculate total commission for motor policies
  // If broker commission is manually entered, use that. Otherwise calculate from rates.
  const calculateTotalCommission = () => {
    // If broker commission is manually entered, use that
    if (formData.brokerCommissionAmount && parseFloat(formData.brokerCommissionAmount) > 0) {
      return parseFloat(formData.brokerCommissionAmount);
    }
    
    const isMotor = formData.policyType === 'Motor Insurance';
    if (isMotor) {
      // For motor insurance, check if net rate is filled first
      const netRate = parseFloat(formData.netCommissionRate) || 0;
      const netPremium = parseFloat(formData.netPremium || formData.premiumAmount) || 0;
      
      if (netRate > 0 && netPremium > 0) {
        // Use net rate calculation if filled
        return netPremium * netRate / 100;
      } else {
        // Otherwise use OD/TP separate calculations
        const odComm = (parseFloat(formData.odPremium) || 0) * (parseFloat(formData.odCommissionRate) || 0) / 100;
        const tpComm = (parseFloat(formData.tpPremium) || 0) * (parseFloat(formData.tpCommissionRate) || 0) / 100;
        return odComm + tpComm;
      }
    } else {
      // Other policies - Net based
      return (parseFloat(formData.netPremium || formData.premiumAmount) || 0) * (parseFloat(formData.netCommissionRate || formData.commissionRate) || 0) / 100;
    }
  };

  // Get selected sub-agent commission share
  // Commission flow: Broker → Agent keeps X% → Sub-Agent gets rest
  // Calculate agent payout based on manually mentioned rates
  const calculateAgentPayout = () => {
    if (!formData.subAgentId) return calculateTotalCommission(); // No sub-agent, agent gets all
    
    const isMotor = formData.policyType === 'Motor Insurance';
    const totalReceived = calculateTotalCommission();
    
    if (isMotor) {
      // For Motor: Calculate based on manually mentioned OD/TP rates or Net rate
      const formDataAny = formData as any;
      const netRate = parseFloat(formDataAny.subAgentNetRate) || 0;
      
      if (netRate > 0) {
        // Use Net rate calculation for sub-agent payout
        const netPremium = parseFloat(formData.netPremium || formData.premiumAmount) || 0;
        const subAgentPayout = netPremium * netRate / 100;
        return Math.max(0, totalReceived - subAgentPayout);
      } else {
        // Use OD/TP separate calculations for sub-agent payout
        const odRate = parseFloat(formDataAny.subAgentOdRate) || 0;
        const tpRate = parseFloat(formDataAny.subAgentTpRate) || 0;
        const odPayout = (parseFloat(formData.odPremium) || 0) * odRate / 100;
        const tpPayout = (parseFloat(formData.tpPremium) || 0) * tpRate / 100;
        const subAgentPayout = odPayout + tpPayout;
        return Math.max(0, totalReceived - subAgentPayout);
      }
    } else {
      // For Non-Motor: No manual rate input implemented yet, agent gets full amount
      return totalReceived;
    }
  };

  // Calculate sub-agent payout based on manually mentioned rates
  const calculateSubAgentPayout = () => {
    if (!formData.subAgentId) return 0;
    
    const isMotor = formData.policyType === 'Motor Insurance';
    
    if (isMotor) {
      const formDataAny = formData as any;
      const netRate = parseFloat(formDataAny.subAgentNetRate) || 0;
      
      if (netRate > 0) {
        // Use Net rate calculation
        const netPremium = parseFloat(formData.netPremium || formData.premiumAmount) || 0;
        return netPremium * netRate / 100;
      } else {
        // Use OD/TP separate calculations
        const odRate = parseFloat(formDataAny.subAgentOdRate) || 0;
        const tpRate = parseFloat(formDataAny.subAgentTpRate) || 0;
        const odPayout = (parseFloat(formData.odPremium) || 0) * odRate / 100;
        const tpPayout = (parseFloat(formData.tpPremium) || 0) * tpRate / 100;
        return odPayout + tpPayout;
      }
    }
    
    return 0; // No sub-agent payout for non-motor yet
  };

  const getSubAgentShare = () => {
    if (!formData.subAgentId) return null;
    const subAgent = subAgents.find(sa => sa.id === formData.subAgentId);
    if (!subAgent) return null;
    
    const totalComm = calculateTotalCommission();
    const agentAmount = calculateAgentPayout();
    const subAgentAmount = calculateSubAgentPayout();
    const subAgentPercent = totalComm > 0 ? (subAgentAmount / totalComm * 100) : 0;
    const agentKeeps = totalComm > 0 ? (agentAmount / totalComm * 100) : 100;
    
    return {
      subAgentAmount,
      agentAmount,
      subAgentPercent: parseFloat(subAgentPercent.toFixed(2)),
      agentKeeps: parseFloat(agentKeeps.toFixed(2))
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

      // Also set the scanned file as policy copy
      setFormData(prev => ({ 
        ...prev, 
        policyCopyFile: file 
      } as any));

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
          // Motor-specific fields from OCR
          motorPolicyType: extractedData.motorPolicyType || prev.motorPolicyType,
          odPremium: extractedData.odPremium?.toString() || prev.odPremium,
          tpPremium: extractedData.tpPremium?.toString() || prev.tpPremium,
          netPremium: extractedData.netPremium?.toString() || prev.netPremium,
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
        if (extractedData.motorPolicyType) extractedFields.push('Motor Type');
        if (extractedData.odPremium) extractedFields.push('OD Premium');
        if (extractedData.tpPremium) extractedFields.push('TP Premium');
        if (extractedData.netPremium) extractedFields.push('Net Premium');
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
      
      // Collect all document files
      const files: { [key: string]: File } = {};
      const formDataObj = formData as any;
      
      if (formDataObj.policyCopyFile) files.policyCopy = formDataObj.policyCopyFile;
      if (formDataObj.rcDocumentFile) files.rcDocument = formDataObj.rcDocumentFile;
      if (formDataObj.aadharFrontFile) files.aadharFront = formDataObj.aadharFrontFile;
      if (formDataObj.aadharBackFile) files.aadharBack = formDataObj.aadharBackFile;
      if (formDataObj.panCardFile) files.panCard = formDataObj.panCardFile;
      if (formDataObj.photoFile) files.photo = formDataObj.photoFile;
      if (formDataObj.cancelChequeFile) files.cancelCheque = formDataObj.cancelChequeFile;

      const policyData = {
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
        // Sub-agent rates
        subAgentOdRate: isMotor ? parseFloat(formDataObj.subAgentOdRate) || undefined : undefined,
        subAgentTpRate: isMotor ? parseFloat(formDataObj.subAgentTpRate) || undefined : undefined,
        subAgentNetRate: parseFloat(formDataObj.subAgentNetRate) || undefined,
        // Broker
        brokerId: formData.brokerId || undefined,
        brokerCommissionAmount: parseFloat(formData.brokerCommissionAmount) || undefined,
        agentSharePercent: parseFloat(formData.agentSharePercent) || undefined,
        // Sub-agent
        subAgentId: formData.subAgentId || undefined,
        holderName: formData.holderName || undefined,
        vehicleNumber: isMotor ? formData.vehicleNumber : undefined,
        remarks: formData.remarks || undefined,
      };

      await policyAPI.create(policyData, Object.keys(files).length > 0 ? files : undefined);
      setSuccess('✅ Policy created successfully with documents uploaded!');
      setTimeout(() => router.push('/dashboard/policies'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Compact Header with Entry Mode Pills */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/policies" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
              <span>←</span>
              <span className="text-sm">Back</span>
            </Link>
            <div className="border-l pl-4">
              <h1 className="text-xl font-bold text-gray-800">Add New Policy</h1>
            </div>
          </div>
          {/* Entry Mode Pills */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => { setEntryMode('manual'); setError(''); setSuccess(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                entryMode === 'manual' 
                  ? 'bg-white shadow-sm text-blue-600 ring-1 ring-blue-100' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              ✏️ Manual
            </button>
            <button
              onClick={() => { setEntryMode('scan'); setError(''); setSuccess(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                entryMode === 'scan' 
                  ? 'bg-white shadow-sm text-blue-600 ring-1 ring-blue-100' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              📷 Scan
            </button>
            <button
              onClick={() => { setEntryMode('excel'); setError(''); setSuccess(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                entryMode === 'excel' 
                  ? 'bg-white shadow-sm text-blue-600 ring-1 ring-blue-100' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              📊 Excel
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6">
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
          <Card className="mb-6 shadow-lg">
            <CardContent className="p-8">
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
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 lg:p-8">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
                  {error}
                </div>
              )}
              
              {success && entryMode === 'scan' && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-6">
                  {success}
                </div>
              )}

              {/* Form Grid Layout - 3 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1 - Client & Policy */}
                <div className="space-y-5">

                  {/* Client Selection */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                    <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="text-blue-500 mr-2">👤</span>
                      Client Details
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          className="h-12 text-base"
                        />
                        {showClientDropdown && clientSearch && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {filteredClients.length === 0 ? (
                              <div className="p-4">
                                <p className="text-gray-500 text-sm mb-3">No clients found matching "{clientSearch}"</p>
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
                                    className="w-full text-left p-4 hover:bg-gray-50 border-b last:border-b-0"
                                  >
                                    <p className="font-medium">{client.name}</p>
                                    <p className="text-sm text-gray-500">{client.phone}</p>
                                  </button>
                                ))}
                                <div className="p-3 border-t bg-gray-50">
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

            {/* Broker Selection */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Broker (Optional)</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Broker (PolicyBazaar, MitPro, Probus, etc.)
                </label>
                {!showNewBrokerForm ? (
                  <div>
                    <select
                      name="brokerId"
                      value={formData.brokerId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Direct / No Broker</option>
                      {brokers.map((broker) => (
                        <option key={broker.id} value={broker.id}>
                          {broker.name} {broker.code ? `(${broker.code})` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewBrokerForm(true)}
                      className="text-xs text-blue-600 hover:underline mt-1"
                    >
                      + Add New Broker
                    </button>
                  </div>
                ) : (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-purple-800">Add New Broker</span>
                      <button type="button" onClick={() => setShowNewBrokerForm(false)} className="text-xs text-gray-500">Cancel</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Broker Name *"
                        value={newBrokerData.name}
                        onChange={(e) => setNewBrokerData(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <Input
                        placeholder="Phone"
                        value={newBrokerData.phone}
                        onChange={(e) => setNewBrokerData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <Input
                      placeholder="Email"
                      type="email"
                      value={newBrokerData.email}
                      onChange={(e) => setNewBrokerData(prev => ({ ...prev, email: e.target.value }))}
                    />
                    <Button
                      type="button"
                      onClick={handleCreateBroker}
                      disabled={creatingBroker || !newBrokerData.name}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-sm"
                    >
                      {creatingBroker ? 'Creating...' : '✓ Create & Select Broker'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-Agent Assignment */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Sub-Agent (Optional)</h3>
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
                      {sa.name} ({sa.subAgentCode})
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    <Link href="/dashboard/sub-agents" className="text-blue-600 hover:underline">Manage Sub-Agents</Link>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSubAgentForm(!showSubAgentForm)}
                    className="text-xs px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    {showSubAgentForm ? 'Cancel' : '+ Add New Sub-Agent'}
                  </button>
                </div>
                
                {/* Inline Sub-Agent Creation Form */}
                {showSubAgentForm && (
                  <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-3">Add New Sub-Agent</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={newSubAgentData.name}
                          onChange={(e) => setNewSubAgentData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Sub-Agent full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          value={newSubAgentData.phone}
                          onChange={(e) => setNewSubAgentData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="10-digit mobile number"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          value={newSubAgentData.email}
                          onChange={(e) => setNewSubAgentData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Commission % (Default)
                        </label>
                        <input
                          type="number"
                          value={newSubAgentData.commissionPercentage}
                          onChange={(e) => setNewSubAgentData(prev => ({ ...prev, commissionPercentage: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="10"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleCreateSubAgent}
                      disabled={creatingSubAgent || !newSubAgentData.name}
                      className="mt-4 bg-blue-600 hover:bg-blue-700"
                    >
                      {creatingSubAgent ? 'Creating...' : '✓ Create & Select Sub-Agent'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Commission Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Commission Details</h3>
              
              {/* Broker Commission (Manual Input) */}
              {formData.brokerId && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    💰 Commission Received from Broker (₹)
                  </label>
                  <Input
                    type="number"
                    name="brokerCommissionAmount"
                    value={formData.brokerCommissionAmount}
                    onChange={handleChange}
                    placeholder="Enter commission amount from broker"
                    step="0.01"
                    className="bg-white"
                  />
                  <p className="text-xs text-purple-600 mt-1">
                    Total commission you will receive from {brokers.find(b => b.id === formData.brokerId)?.name || 'broker'}
                  </p>
                </div>
              )}
              
              {/* Received Payout - Motor Commission Rates */}
              {formData.policyType === 'Motor Insurance' && formData.motorPolicyType && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-green-800">Received Payout (%)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {(formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'OD_ONLY') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">OD Rate %</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          name="odCommissionRate"
                          value={formData.odCommissionRate}
                          onChange={handleChange}
                          placeholder="e.g., 15"
                          max="100"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    )}
                    {(formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'TP_ONLY') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">TP Rate %</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          name="tpCommissionRate"
                          value={formData.tpCommissionRate}
                          onChange={handleChange}
                          placeholder="e.g., 5"
                          max="100"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Net Rate %</label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        name="netCommissionRate"
                        value={formData.netCommissionRate}
                        onChange={handleChange}
                        placeholder="Optional"
                        max="100"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Paid Amount - Motor Commission Rates for Sub-Agent */}
              {formData.policyType === 'Motor Insurance' && formData.motorPolicyType && formData.subAgentId && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-orange-800">Paid Amount (%) - To Sub-Agent</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {(formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'OD_ONLY') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">OD Rate %</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          name="subAgentOdRate"
                          value={(formData as any).subAgentOdRate || ''}
                          onChange={handleChange}
                          placeholder="e.g., 10"
                          max="100"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    )}
                    {(formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'TP_ONLY') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">TP Rate %</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          name="subAgentTpRate"
                          value={(formData as any).subAgentTpRate || ''}
                          onChange={handleChange}
                          placeholder="e.g., 3"
                          max="100"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Net Rate %</label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        name="subAgentNetRate"
                        value={(formData as any).subAgentNetRate || ''}
                        onChange={handleChange}
                        placeholder="Optional"
                        max="100"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                      type="text"
                      inputMode="decimal"
                      name="commissionRate"
                      value={formData.commissionRate}
                      onChange={handleChange}
                      placeholder="e.g., 15"
                      max="100"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Renewal Commission (%)
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      name="renewalCommissionRate"
                      value={formData.renewalCommissionRate}
                      onChange={handleChange}
                      placeholder="For future renewals"
                      max="100"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              )}

              {/* Commission Calculation Preview */}
              {(formData.odCommissionRate || formData.tpCommissionRate || formData.netCommissionRate || formData.commissionRate || formData.brokerCommissionAmount) && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-medium text-indigo-800 mb-2">Commission Preview</h4>
                  <div className="text-sm space-y-2">
                    <p>Total Commission: <span className="font-bold text-green-700">₹{calculateTotalCommission().toFixed(2)}</span></p>
                    <p className="text-indigo-700">
                      Your Payout: <span className="font-bold text-indigo-800">₹{calculateAgentPayout().toFixed(2)}</span>
                    </p>
                    {formData.subAgentId && calculateSubAgentPayout() > 0 && (
                      <>
                        <p className="text-orange-700">
                          Paid to Sub-Agent: <span className="font-bold text-orange-800">₹{calculateSubAgentPayout().toFixed(2)}</span>
                        </p>
                        <p className="text-xs text-gray-600 italic">
                          * Agent payout calculated from manually mentioned rates only
                        </p>
                      </>
                    )}
                    {formData.subAgentId && calculateSubAgentPayout() === 0 && (
                      <p className="text-xs text-amber-600 italic">
                        * No rates mentioned for sub-agent. Agent gets full payout.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-blue-500 mr-2">📎</span>
                Documents
              </h3>
              
              {/* Document Upload Grid */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {/* Policy Copy Upload */}
                <div className="group">
                  <input
                    type="file"
                    id="policyCopy"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, policyCopyFile: file } as any));
                      }
                    }}
                  />
                  <label htmlFor="policyCopy" className="cursor-pointer block">
                    <div className={`relative bg-gradient-to-br from-purple-50 to-purple-100 border-2 rounded-xl p-4 text-center transition-all hover:shadow-md ${
                      (formData as any).policyCopyFile ? 'border-green-400 bg-green-50' : 'border-purple-200 hover:border-purple-300'
                    }`}>
                      <div className="text-2xl mb-2">📄</div>
                      <div className="text-sm font-medium text-gray-700">Policy Copy</div>
                      {(formData as any).policyCopyFile ? (
                        <div className="text-xs text-green-600 mt-1">✓ Uploaded</div>
                      ) : (
                        <div className="text-xs text-gray-400">PDF, JPG, PNG</div>
                      )}
                    </div>
                  </label>
                </div>

                {/* RC Upload */}
                <div className="group">
                  <input
                    type="file"
                    id="rcDocument"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, rcDocumentFile: file } as any));
                      }
                    }}
                  />
                  <label htmlFor="rcDocument" className="cursor-pointer block">
                    <div className={`relative bg-gradient-to-br from-blue-50 to-blue-100 border-2 rounded-xl p-4 text-center transition-all hover:shadow-md ${
                      (formData as any).rcDocumentFile ? 'border-green-400 bg-green-50' : 'border-blue-200 hover:border-blue-300'
                    }`}>
                      <div className="text-2xl mb-2">🚗</div>
                      <div className="text-sm font-medium text-gray-700">RC Document</div>
                      {(formData as any).rcDocumentFile ? (
                        <div className="text-xs text-green-600 mt-1">✓ Uploaded</div>
                      ) : (
                        <div className="text-xs text-gray-400">Registration</div>
                      )}
                    </div>
                  </label>
                </div>

                {/* Aadhar Front */}
                <div className="group">
                  <input
                    type="file"
                    id="aadharFront"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, aadharFrontFile: file } as any));
                      }
                    }}
                  />
                  <label htmlFor="aadharFront" className="cursor-pointer block">
                    <div className={`relative bg-gradient-to-br from-orange-50 to-orange-100 border-2 rounded-xl p-4 text-center transition-all hover:shadow-md ${
                      (formData as any).aadharFrontFile ? 'border-green-400 bg-green-50' : 'border-orange-200 hover:border-orange-300'
                    }`}>
                      <div className="text-2xl mb-2">🪪</div>
                      <div className="text-sm font-medium text-gray-700">Aadhar Front</div>
                      {(formData as any).aadharFrontFile ? (
                        <div className="text-xs text-green-600 mt-1">✓ Uploaded</div>
                      ) : (
                        <div className="text-xs text-gray-400">Front side</div>
                      )}
                    </div>
                  </label>
                </div>

                {/* Aadhar Back */}
                <div className="group">
                  <input
                    type="file"
                    id="aadharBack"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, aadharBackFile: file } as any));
                      }
                    }}
                  />
                  <label htmlFor="aadharBack" className="cursor-pointer block">
                    <div className={`relative bg-gradient-to-br from-orange-50 to-orange-100 border-2 rounded-xl p-4 text-center transition-all hover:shadow-md ${
                      (formData as any).aadharBackFile ? 'border-green-400 bg-green-50' : 'border-orange-200 hover:border-orange-300'
                    }`}>
                      <div className="text-2xl mb-2">🪪</div>
                      <div className="text-sm font-medium text-gray-700">Aadhar Back</div>
                      {(formData as any).aadharBackFile ? (
                        <div className="text-xs text-green-600 mt-1">✓ Uploaded</div>
                      ) : (
                        <div className="text-xs text-gray-400">Back side</div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Second Row of Documents */}
              <div className="grid grid-cols-3 gap-4">
                {/* PAN Card */}
                <div className="group">
                  <input
                    type="file"
                    id="panCard"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, panCardFile: file } as any));
                      }
                    }}
                  />
                  <label htmlFor="panCard" className="cursor-pointer block">
                    <div className={`relative bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 rounded-xl p-4 text-center transition-all hover:shadow-md ${
                      (formData as any).panCardFile ? 'border-green-400 bg-green-50' : 'border-indigo-200 hover:border-indigo-300'
                    }`}>
                      <div className="text-2xl mb-2">🆔</div>
                      <div className="text-sm font-medium text-gray-700">PAN Card</div>
                      {(formData as any).panCardFile ? (
                        <div className="text-xs text-green-600 mt-1">✓ Uploaded</div>
                      ) : (
                        <div className="text-xs text-gray-400">Tax ID</div>
                      )}
                    </div>
                  </label>
                </div>

                {/* Photo */}
                <div className="group">
                  <input
                    type="file"
                    id="photo"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, photoFile: file } as any));
                      }
                    }}
                  />
                  <label htmlFor="photo" className="cursor-pointer block">
                    <div className={`relative bg-gradient-to-br from-green-50 to-green-100 border-2 rounded-xl p-4 text-center transition-all hover:shadow-md ${
                      (formData as any).photoFile ? 'border-green-400 bg-green-50' : 'border-green-200 hover:border-green-300'
                    }`}>
                      <div className="text-2xl mb-2">📸</div>
                      <div className="text-sm font-medium text-gray-700">Photo</div>
                      {(formData as any).photoFile ? (
                        <div className="text-xs text-green-600 mt-1">✓ Uploaded</div>
                      ) : (
                        <div className="text-xs text-gray-400">Passport size</div>
                      )}
                    </div>
                  </label>
                </div>

                {/* Cancel Cheque */}
                <div className="group">
                  <input
                    type="file"
                    id="cancelCheque"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, cancelChequeFile: file } as any));
                      }
                    }}
                  />
                  <label htmlFor="cancelCheque" className="cursor-pointer block">
                    <div className={`relative bg-gradient-to-br from-rose-50 to-rose-100 border-2 rounded-xl p-4 text-center transition-all hover:shadow-md ${
                      (formData as any).cancelChequeFile ? 'border-green-400 bg-green-50' : 'border-rose-200 hover:border-rose-300'
                    }`}>
                      <div className="text-2xl mb-2">🏦</div>
                      <div className="text-sm font-medium text-gray-700">Cancel Cheque</div>
                      {(formData as any).cancelChequeFile ? (
                        <div className="text-xs text-green-600 mt-1">✓ Uploaded</div>
                      ) : (
                        <div className="text-xs text-gray-400">Bank proof</div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4 text-center">Upload policy copy and KYC documents for record keeping</p>
                    </div>
                  </div>
                </div>

                {/* Remarks Section */}
                <div className="col-span-1 lg:col-span-2">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="text-purple-500 mr-2">📝</span>
                      Remarks
                    </h3>
                    <textarea
                      name="remarks"
                      value={formData.remarks || ''}
                      onChange={handleChange}
                      placeholder="Add any additional notes or remarks..."
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              }

                {/* Aadhar Back */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-400 transition">
                  <input
                    type="file"
                    id="aadharBack"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, aadharBackFile: file } as any));
                      }
                    }}
                  />
                  <label htmlFor="aadharBack" className="cursor-pointer">
                    <div className="text-2xl mb-1">🪪</div>
                    <div className="text-xs font-medium text-gray-700">Aadhar Back</div>
                    {(formData as any).aadharBackFile && (
                      <div className="text-xs text-green-600 mt-1">✓ Done</div>
                    )}
                  </label>
                </div>

                {/* PAN Card */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-400 transition">
                  <input
                    type="file"
                    id="panCard"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, panCardFile: file } as any));
                      }
                    }}
                  />
                  <label htmlFor="panCard" className="cursor-pointer">
                    <div className="text-2xl mb-1">💳</div>
                    <div className="text-xs font-medium text-gray-700">PAN Card</div>
                    {(formData as any).panCardFile && (
                      <div className="text-xs text-green-600 mt-1">✓ Done</div>
                    )}
                  </label>
                </div>
              </div>

              {/* Photo and Cheque Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Photo */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition">
                  <input
                    type="file"
                    id="photo"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, photoFile: file } as any));
                      }
                    }}
                  />
                  <label htmlFor="photo" className="cursor-pointer">
                    <div className="text-3xl mb-2">📷</div>
                    <div className="text-sm font-medium text-gray-700">Photo</div>
                    <div className="text-xs text-gray-500">Passport size photo</div>
                    {(formData as any).photoFile && (
                      <div className="text-xs text-green-600 mt-1">✓ {(formData as any).photoFile.name}</div>
                    )}
                  </label>
                </div>

                {/* Cancel Cheque */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition">
                  <input
                    type="file"
                    id="cancelCheque"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, cancelChequeFile: file } as any));
                      }
                    }}
                  />
                  <label htmlFor="cancelCheque" className="cursor-pointer">
                    <div className="text-3xl mb-2">🏦</div>
                    <div className="text-sm font-medium text-gray-700">Cancel Cheque</div>
                    <div className="text-xs text-gray-500">Bank account proof</div>
                    {(formData as any).cancelChequeFile && (
                      <div className="text-xs text-green-600 mt-1">✓ {(formData as any).cancelChequeFile.name}</div>
                    )}
                  </label>
                </div>
              </div>
              
              <p className="text-xs text-gray-500">Upload policy copy and KYC documents for record keeping</p>
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

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-white border-t pt-6 mt-8">
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1 h-12 text-base font-medium border-2"
                  >
                    <span className="mr-2">←</span>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !formData.clientId || !formData.companyId || !formData.policyNumber}
                    className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Saving Policy...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">💾</span>
                        Save Policy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
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
