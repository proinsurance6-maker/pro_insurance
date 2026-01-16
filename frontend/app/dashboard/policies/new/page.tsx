'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
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

type EntryMode = 'manual' | 'excel';

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

const POLICY_SOURCES = [
  { value: 'NEW', label: 'Fresh/New' },
  { value: 'RENEWAL', label: 'Renewal' },
  { value: 'PORT', label: 'Port' }
];

const POLICY_PERIODS = [
  { value: '1 Year', label: '1 Year' },
  { value: '2 Years', label: '2 Years' },
  { value: '3 Years', label: '3 Years' },
  { value: '5 Years', label: '5 Years' },
  { value: '10 Years', label: '10 Years' }
];

const RELATIONSHIPS = [
  'Self',
  'Spouse',
  'Father',
  'Mother',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Father-in-Law',
  'Mother-in-Law',
  'Other'
];

export default function NewPolicyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedClientId = searchParams.get('clientId');
  const excelInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  
  const [entryMode, setEntryMode] = useState<EntryMode>('manual');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showScanModal, setShowScanModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [clientType, setClientType] = useState<'existing' | 'new'>('existing');
  const [showNewBrokerForm, setShowNewBrokerForm] = useState(false);
  const [showSubAgentForm, setShowSubAgentForm] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  
  // New client form data
  const [newClientData, setNewClientData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    // Family member linking
    isFamilyMember: false,
    linkedClientId: '',
    linkedClientName: '',
    relationship: ''
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [familyClientSearch, setFamilyClientSearch] = useState('');
  const [showFamilyClientDropdown, setShowFamilyClientDropdown] = useState(false);
  const [holderNameSuggestions, setHolderNameSuggestions] = useState<any[]>([]);
  const [showHolderSuggestions, setShowHolderSuggestions] = useState(false);
  
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
    policySource: 'NEW', // NEW, RENEWAL, PORT
    policyPeriod: '1 Year', // Policy duration
    paymentTerm: '', // Payment term (if different from policy period)
    motorPolicyType: '', // COMPREHENSIVE, OD_ONLY, TP_ONLY
    planName: '',
    sumAssured: '',
    premiumAmount: '',
    // Motor premium breakdown
    odPremium: '',
    tpPremium: '',
    netPremium: '',
    paymentMode: 'yearly',
    loginDate: '', // Date when policy was logged/processed
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    // Commission fields
    commissionRate: '',
    odCommissionRate: '',
    tpCommissionRate: '',
    netCommissionRate: '',
    renewalCommissionRate: '',
    // Sub-Agent commission rates
    subAgentOdRate: '',
    subAgentTpRate: '',
    subAgentNetRate: '',
    subAgentCommissionRate: '', // For non-motor policies
    // Broker (PolicyBazaar, MitPro, Probus, etc.)
    brokerId: '',
    brokerCommissionAmount: '', // Manual commission input from broker
    agentSharePercent: '', // Agent keeps this %, rest to sub-agent
    // Sub-agent
    subAgentId: '',
    // Motor-specific payment tracking
    premiumPaidByAgent: false, // Agent paid premium for client
    receivedAdvanceFromAgent: false, // Received advance from sub-agent
    advanceAmount: '', // Advance amount received
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
    
    // If this is a family member of existing client
    if (newClientData.isFamilyMember && newClientData.linkedClientId) {
      if (!newClientData.relationship) {
        setError('Please select relationship for family member');
        return;
      }
      setCreatingClient(true);
      try {
        // Create family member under the linked client
        const familyMemberData = {
          name: newClientData.name,
          relationship: newClientData.relationship,
          phone: newClientData.phone,
          email: newClientData.email
        };
        const response = await clientAPI.addFamilyMember(newClientData.linkedClientId, familyMemberData);
        const newFamilyMember = response.data.data;
        
        // Select the linked client and set holder name to family member's name
        const linkedClient = clients.find(c => c.id === newClientData.linkedClientId);
        if (linkedClient) {
          setFormData(prev => ({ 
            ...prev, 
            clientId: linkedClient.id, 
            clientName: linkedClient.name,
            holderName: newClientData.name // Family member is the policy holder
          }));
          setClientSearch(linkedClient.name);
        }
        
        setShowNewClientForm(false);
        setShowClientDropdown(false);
        setNewClientData({ name: '', phone: '', email: '', address: '', isFamilyMember: false, linkedClientId: '', linkedClientName: '', relationship: '' });
        setFamilyClientSearch('');
        setSuccess(`✅ ${newClientData.name} added as ${newClientData.relationship} of ${newClientData.linkedClientName}`);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to add family member');
      } finally {
        setCreatingClient(false);
      }
      return;
    }
    
    // Regular new client creation
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
      setNewClientData({ name: '', phone: '', email: '', address: '', isFamilyMember: false, linkedClientId: '', linkedClientName: '', relationship: '' });
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
      const netRate = parseFloat(formData.subAgentNetRate) || 0;
      
      if (netRate > 0) {
        // Use Net rate calculation
        const netPremium = parseFloat(formData.netPremium || formData.premiumAmount) || 0;
        return netPremium * netRate / 100;
      } else {
        // Use OD/TP separate calculations
        const odRate = parseFloat(formData.subAgentOdRate) || 0;
        const tpRate = parseFloat(formData.subAgentTpRate) || 0;
        const odPayout = (parseFloat(formData.odPremium) || 0) * odRate / 100;
        const tpPayout = (parseFloat(formData.tpPremium) || 0) * tpRate / 100;
        return odPayout + tpPayout;
      }
    } else {
      // Non-motor: use subAgentCommissionRate
      const subAgentRate = parseFloat(formData.subAgentCommissionRate) || 0;
      const netPremium = parseFloat(formData.netPremium || formData.premiumAmount) || 0;
      return netPremium * subAgentRate / 100;
    }
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

  // Handle document scan/upload - OCR for policy copy
  const handleDocumentScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setError('');
    setSuccess('');

    try {
      // Set the file as policy copy
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
          policySource: extractedData.policySource || prev.policySource,
          policyPeriod: extractedData.policyPeriod || prev.policyPeriod,
          planName: extractedData.planName || prev.planName,
          sumAssured: extractedData.sumAssured || prev.sumAssured, // Can be "Unlimited" or number
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

        // Try to match company or create new one
        if (extractedData.companyName) {
          const matchedCompany = companies.find(c => 
            c.name.toLowerCase().includes(extractedData.companyName.toLowerCase()) ||
            extractedData.companyName.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchedCompany) {
            setFormData(prev => ({ ...prev, companyId: matchedCompany.id }));
          } else {
            // Company not found - auto-create it
            try {
              const createResponse = await policyAPI.createCompany({ name: extractedData.companyName });
              const newCompany = createResponse.data.data;
              if (newCompany) {
                // Add to companies list and select it
                setCompanies(prev => [...prev, newCompany].sort((a, b) => a.name.localeCompare(b.name)));
                setFormData(prev => ({ ...prev, companyId: newCompany.id }));
              }
            } catch (companyErr) {
              console.error('Failed to create company:', companyErr);
              // Continue without setting company - user can select manually
            }
          }
        }

        // Build success message with extracted fields
        const extractedFields = [];
        if (extractedData.policyNumber) extractedFields.push('Policy No');
        if (extractedData.companyName) extractedFields.push('Company');
        if (extractedData.holderName) extractedFields.push('Holder Name');
        if (extractedData.premiumAmount) extractedFields.push('Premium');
        if (extractedData.policySource) extractedFields.push('Proposal Type');
        if (extractedData.policyPeriod) extractedFields.push('Policy Period');
        if (extractedData.sumAssured) extractedFields.push('Sum Assured');
        if (extractedData.motorPolicyType) extractedFields.push('Motor Type');
        if (extractedData.odPremium) extractedFields.push('OD Premium');
        if (extractedData.tpPremium) extractedFields.push('TP Premium');
        if (extractedData.netPremium) extractedFields.push('Net Premium');
        if (extractedData.startDate) extractedFields.push('Dates');
        
        setSuccess('⚠️ AI can make a mistake. Please recheck all details before submitting.');
        
        // Auto-close modal after 1.5 seconds with success message
        setTimeout(() => {
          setShowScanModal(false);
          setScanning(false);
        }, 1500);
      } else {
        setScanning(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to scan document. Please try again or enter manually.');
      setScanning(false);
      // Auto-close on error after 3 seconds
      setTimeout(() => {
        setShowScanModal(false);
      }, 3000);
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
        commissionPercent: parseFloat(formData.commissionRate) || 0,
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
    <div className="min-h-screen bg-slate-100">
      {/* Sticky Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/policies" className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
              <span>←</span> Back to Policies
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-semibold text-gray-800">Add New Policy</h1>
          </div>
          <p className="text-sm text-gray-500">Choose how you want to add policy details</p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-4">
        {/* Entry Mode Selection - Compact */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => { setEntryMode('manual'); setError(''); setSuccess(''); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-all text-sm font-medium ${
              entryMode === 'manual' 
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
            }`}
          >
            <span>✏️</span>
            <span>Manual Entry</span>
          </button>
          
          <button
            onClick={() => { setShowScanModal(true); setError(''); setSuccess(''); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-all text-sm font-medium border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 text-gray-600"
          >
            <span>📷</span>
            <span>Scan Document</span>
          </button>
          
          <button
            onClick={() => { setEntryMode('excel'); setError(''); setSuccess(''); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-all text-sm font-medium ${
              entryMode === 'excel' 
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
            }`}
          >
            <span>📊</span>
            <span>Excel Import</span>
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={excelInputRef}
          onChange={handleExcelImport}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />
        <input
          type="file"
          ref={scanInputRef}
          onChange={(e) => {
            handleDocumentScan(e);
            // Keep modal open - it will close after processing completes
            setEntryMode('manual');
          }}
          accept="image/*,.pdf"
          className="hidden"
        />

        {/* Scan Document Modal - Modern Redesign */}
        {showScanModal && (
          <div 
            className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" 
            onClick={(e) => {
              if (!scanning && e.target === e.currentTarget) {
                setShowScanModal(false);
              }
            }}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto relative z-[10000] overflow-hidden transform transition-all"
              onClick={e => e.stopPropagation()}
            >
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Scan Policy Document</h3>
                      <p className="text-blue-100 text-sm">AI-powered OCR extraction</p>
                    </div>
                  </div>
                  {!scanning && (
                    <button 
                      onClick={() => setShowScanModal(false)} 
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                      title="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {scanning ? (
                  <div className="text-center py-10">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-3 bg-blue-50 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Processing Document...</h4>
                    <p className="text-gray-500 mb-4">AI is extracting policy details using OCR</p>
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                ) : success ? (
                  <div className="text-center py-10">
                    <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-green-700 mb-2">Successfully Extracted!</h4>
                    <p className="text-gray-500">{success}</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-10">
                    <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-red-700 mb-2">Extraction Failed</h4>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button
                      onClick={() => {
                        setError('');
                        setShowScanModal(false);
                      }}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div>
                    <div 
                      onClick={() => scanInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-gray-800 font-semibold mb-1">Click to upload or drag & drop</p>
                      <p className="text-gray-500 text-sm mb-4">PDF, JPG, PNG (Max 10MB)</p>
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Select File
                      </span>
                    </div>
                    
                    {/* Tips Section */}
                    <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-amber-800 font-medium text-sm">Tips for best results:</p>
                          <ul className="text-amber-700 text-xs mt-1 space-y-0.5">
                            <li>• Upload clear, high-resolution documents</li>
                            <li>• Ensure all text is readable and not blurry</li>
                            <li>• Use official policy documents only</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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

      {/* Manual Form - show for manual mode */}
      {entryMode === 'manual' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit}>
            {/* Error/Success Messages */}
            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="text-red-500">⚠</span> {error}
              </div>
            )}
            
            {success && (
              <div className="mx-6 mt-4 bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="text-emerald-500">✓</span> {success}
              </div>
            )}

            {/* Section: Client Details */}
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">1</span>
                Client Details
              </h3>
              
              {/* Policy Holder Name - First */}
              <div className="mb-4 relative">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Policy Holder Name
                </label>
                <Input
                  name="holderName"
                  value={formData.holderName}
                  onChange={async (e) => {
                    handleChange(e);
                    const value = e.target.value;
                    if (value.length >= 2) {
                      try {
                        const response = await policyAPI.searchClients(value);
                        if (response.data.data && response.data.data.length > 0) {
                          setHolderNameSuggestions(response.data.data);
                          setShowHolderSuggestions(true);
                        } else {
                          setHolderNameSuggestions([]);
                          setShowHolderSuggestions(false);
                        }
                      } catch (err) {
                        console.error('Error searching clients:', err);
                      }
                    } else {
                      setHolderNameSuggestions([]);
                      setShowHolderSuggestions(false);
                    }
                  }}
                  onFocus={() => {
                    if (holderNameSuggestions.length > 0) {
                      setShowHolderSuggestions(true);
                    }
                  }}
                  placeholder="Enter policy holder name"
                  className="h-10 text-sm max-w-md"
                />
                {showHolderSuggestions && holderNameSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {holderNameSuggestions.map((client: any) => (
                      <div
                        key={client.id}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, holderName: client.name }));
                          setClientType('existing');
                          setShowNewClientForm(false);
                          setFormData(prev => ({ ...prev, clientId: client.id, clientName: client.name }));
                          setClientSearch(client.name);
                          setShowHolderSuggestions(false);
                        }}
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm text-gray-800">{client.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{client.phone}</p>
                            {client.policies && client.policies.length > 0 && (
                              <p className="text-xs text-blue-600 mt-1">
                                {client.policies.length} {client.policies.length === 1 ? 'Policy' : 'Policies'}: {client.policies.slice(0, 2).map((p: any) => p.policyNumber).join(', ')}
                                {client.policies.length > 2 && '...'}
                              </p>
                            )}
                            {client.vehicles && client.vehicles.length > 0 && (
                              <p className="text-xs text-green-600 mt-0.5">
                                Vehicles: {client.vehicles.slice(0, 2).join(', ')}
                                {client.vehicles.length > 2 && '...'}
                              </p>
                            )}
                          </div>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Select</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Client Type Toggle */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Client Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="clientType"
                      value="existing"
                      checked={clientType === 'existing'}
                      onChange={() => {
                        setClientType('existing');
                        setShowNewClientForm(false);
                        setFormData(prev => ({ ...prev, clientId: '', clientName: '' }));
                        setNewClientData({ name: '', phone: '', email: '', address: '', isFamilyMember: false, linkedClientId: '', linkedClientName: '', relationship: '' });
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Existing Client</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="clientType"
                      value="new"
                      checked={clientType === 'new'}
                      onChange={() => {
                        setClientType('new');
                        setShowNewClientForm(true);
                        setShowClientDropdown(false);
                        setFormData(prev => ({ ...prev, clientId: '', clientName: '' }));
                        setClientSearch('');
                        // Pre-fill name from holder name if available
                        if (formData.holderName) {
                          setNewClientData(prev => ({ ...prev, name: formData.holderName }));
                        }
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">New Client</span>
                  </label>
                </div>
              </div>

              {/* Existing Client Selection */}
              {clientType === 'existing' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
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
                      required={clientType === 'existing'}
                      className="h-10 text-sm"
                    />
                    {showClientDropdown && clientSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredClients.length === 0 ? (
                          <div className="p-3">
                            <p className="text-gray-500 text-xs mb-2">No clients found</p>
                            <Button 
                              type="button" 
                              size="sm" 
                              onClick={() => {
                                setClientType('new');
                                setShowNewClientForm(true);
                                setShowClientDropdown(false);
                                setNewClientData(prev => ({ ...prev, name: clientSearch }));
                              }}
                              className="w-full text-xs"
                            >
                              + Add New Client
                            </Button>
                          </div>
                        ) : (
                          <>
                            {filteredClients.slice(0, 5).map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                onClick={() => handleClientSelect(client)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 text-sm"
                              >
                                <p className="font-medium text-gray-800">{client.name}</p>
                                <p className="text-xs text-gray-500">{client.phone}</p>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                    
                    {formData.clientId && (
                      <p className="text-xs text-green-600 mt-1">✓ {formData.clientName} selected</p>
                    )}
                  </div>
                </div>
              )}

              {/* New Client Form */}
              {clientType === 'new' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-blue-800 text-sm">Create New Client</h4>
                  </div>
                  
                  {/* Basic Info Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <Input 
                      placeholder="Client Name *" 
                      value={newClientData.name} 
                      onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))} 
                      className="h-10 text-sm" 
                    />
                    <Input 
                      placeholder="Phone Number *" 
                      value={newClientData.phone} 
                      onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))} 
                      className="h-10 text-sm" 
                    />
                    <Input 
                      placeholder="Email" 
                      value={newClientData.email} 
                      onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))} 
                      className="h-10 text-sm" 
                    />
                  </div>

                  {/* Family Member Toggle */}
                  <div className="bg-white rounded-lg p-3 border border-blue-100 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newClientData.isFamilyMember}
                        onChange={(e) => setNewClientData(prev => ({ 
                          ...prev, 
                          isFamilyMember: e.target.checked,
                          linkedClientId: '',
                          linkedClientName: '',
                          relationship: ''
                        }))}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">This is a family member of an existing client</span>
                    </label>

                    {/* Family Member Details */}
                    {newClientData.isFamilyMember && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Select Existing Client */}
                        <div className="relative">
                          <label className="block text-xs text-gray-500 mb-1">Family Member of <span className="text-red-500">*</span></label>
                          <Input
                            type="text"
                            value={familyClientSearch}
                            onChange={(e) => {
                              setFamilyClientSearch(e.target.value);
                              setShowFamilyClientDropdown(true);
                              setNewClientData(prev => ({ ...prev, linkedClientId: '', linkedClientName: '' }));
                            }}
                            onFocus={() => setShowFamilyClientDropdown(true)}
                            placeholder="Search existing client..."
                            className="h-9 text-sm"
                          />
                          {showFamilyClientDropdown && familyClientSearch && (
                            <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                              {clients.filter(c => 
                                c.name.toLowerCase().includes(familyClientSearch.toLowerCase()) ||
                                c.phone.includes(familyClientSearch)
                              ).slice(0, 5).map((client) => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => {
                                    setNewClientData(prev => ({ 
                                      ...prev, 
                                      linkedClientId: client.id, 
                                      linkedClientName: client.name 
                                    }));
                                    setFamilyClientSearch(client.name);
                                    setShowFamilyClientDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                                >
                                  <p className="font-medium text-gray-800">{client.name}</p>
                                  <p className="text-xs text-gray-500">{client.phone}</p>
                                </button>
                              ))}
                              {clients.filter(c => 
                                c.name.toLowerCase().includes(familyClientSearch.toLowerCase()) ||
                                c.phone.includes(familyClientSearch)
                              ).length === 0 && (
                                <p className="p-3 text-gray-500 text-xs">No clients found</p>
                              )}
                            </div>
                          )}
                          {newClientData.linkedClientId && (
                            <p className="text-xs text-green-600 mt-1">✓ {newClientData.linkedClientName}</p>
                          )}
                        </div>

                        {/* Relationship Dropdown */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Relationship <span className="text-red-500">*</span></label>
                          <select
                            value={newClientData.relationship}
                            onChange={(e) => setNewClientData(prev => ({ ...prev, relationship: e.target.value }))}
                            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50/50 transition-all duration-200 hover:border-gray-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="">Select Relationship</option>
                            {RELATIONSHIPS.map((rel) => (
                              <option key={rel} value={rel}>{rel}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Create Button */}
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      onClick={handleCreateClient} 
                      disabled={creatingClient || !newClientData.name || !newClientData.phone || (newClientData.isFamilyMember && (!newClientData.linkedClientId || !newClientData.relationship))} 
                      className="h-10 text-sm px-6"
                    >
                      {creatingClient ? 'Creating...' : newClientData.isFamilyMember ? '✓ Add as Family Member' : '✓ Create Client'}
                    </Button>
                  </div>

                  {formData.clientId && clientType === 'new' && (
                    <p className="text-xs text-green-600 mt-2">✓ Client created: {formData.clientName}</p>
                  )}
                </div>
              )}
            </div>

            {/* Section: Policy Details */}
            <div className="p-6 border-b">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">2</span>
                Policy Details
              </h3>
              
              {/* Row 1: Proposal Type, Policy Type, Motor Type (if motor) */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Proposal Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="policySource"
                    value={formData.policySource}
                    onChange={handleChange}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50/50 transition-all duration-200 hover:border-gray-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    {POLICY_SOURCES.map((source) => (
                      <option key={source.value} value={source.value}>{source.label}</option>
                    ))}
                  </select>
                </div>

                <div className="w-44">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Policy Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="policyType"
                    value={formData.policyType}
                    onChange={handleChange}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50/50 transition-all duration-200 hover:border-gray-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    <option value="">Select Type</option>
                    {POLICY_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {formData.policyType === 'Motor Insurance' && (
                  <>
                    <div className="w-40">
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Motor Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="motorPolicyType"
                        value={formData.motorPolicyType}
                        onChange={handleChange}
                        className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50/50 transition-all duration-200 hover:border-gray-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                        required
                      >
                        <option value="">Select</option>
                        {MOTOR_POLICY_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-44">
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Vehicle Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        name="vehicleNumber"
                        value={formData.vehicleNumber}
                        onChange={(e) => {
                          const upperValue = e.target.value.toUpperCase();
                          handleChange({ target: { name: 'vehicleNumber', value: upperValue } } as any);
                        }}
                        placeholder="e.g., MH01AB1234"
                        required
                        className="h-10 text-sm uppercase"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Row 2: Company, Policy Number, Sum Assured, Plan Name */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="w-56">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Insurance Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="companyId"
                    value={formData.companyId}
                    onChange={handleChange}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50/50 transition-all duration-200 hover:border-gray-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    <option value="">Select Company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>

                <div className="w-48">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Policy Number <span className="text-red-500">*</span>
                  </label>
                  <Input name="policyNumber" value={formData.policyNumber} onChange={handleChange} placeholder="POL123456" required className="h-10 text-sm" />
                </div>

                <div className="w-36">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Sum Assured (₹)</label>
                  <Input type="text" name="sumAssured" value={formData.sumAssured} onChange={handleChange} placeholder="Unlimited" className="h-10 text-sm" />
                </div>

                <div className="w-44">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Plan Name</label>
                  <Input name="planName" value={formData.planName} onChange={handleChange} placeholder="Plan name" className="h-10 text-sm" />
                </div>
              </div>

              {/* Row 3: Login Date, Start Date, Renewal Date (End Date) */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Login Date</label>
                  <DatePicker
                    name="loginDate"
                    value={formData.loginDate || ''}
                    onChange={(date) => handleChange({ target: { name: 'loginDate', value: date } } as any)}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Start Date <span className="text-red-500">*</span></label>
                  <DatePicker
                    name="startDate"
                    value={formData.startDate}
                    onChange={(date) => handleChange({ target: { name: 'startDate', value: date } } as any)}
                    required
                    className="h-10 text-sm"
                  />
                </div>

                <div className="w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Renewal Date <span className="text-red-500">*</span></label>
                  <DatePicker
                    name="endDate"
                    value={formData.endDate}
                    onChange={(date) => handleChange({ target: { name: 'endDate', value: date } } as any)}
                    required
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Row 4: Policy Term, Policy Payment Term, Payment Mode */}
              <div className="flex flex-wrap gap-4">
                <div className="w-36">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Policy Term <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="policyPeriod"
                    value={formData.policyPeriod}
                    onChange={handleChange}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50/50 transition-all duration-200 hover:border-gray-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    {POLICY_PERIODS.map((period) => (
                      <option key={period.value} value={period.value}>{period.label}</option>
                    ))}
                  </select>
                </div>

                <div className="w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Payment Term</label>
                  <select
                    name="paymentTerm"
                    value={formData.paymentTerm || ''}
                    onChange={handleChange}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50/50 transition-all duration-200 hover:border-gray-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Same as Policy</option>
                    {POLICY_PERIODS.map((period) => (
                      <option key={period.value} value={period.value}>{period.label}</option>
                    ))}
                  </select>
                </div>

                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Payment Mode</label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleChange}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50/50 transition-all duration-200 hover:border-gray-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Premium Details */}
            <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">3</span>
                Premium Details
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Total Premium (₹) <span className="text-red-500">*</span></label>
                  <Input type="number" name="premiumAmount" value={formData.premiumAmount} onChange={handleChange} placeholder="25000" required className="h-10 text-sm bg-white" />
                </div>

                {formData.policyType === 'Motor Insurance' && (formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'OD_ONLY') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">OD Premium (₹)</label>
                    <Input type="number" name="odPremium" value={formData.odPremium} onChange={handleChange} placeholder="0" className="h-10 text-sm bg-white" />
                  </div>
                )}

                {formData.policyType === 'Motor Insurance' && (formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'TP_ONLY') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">TP Premium (₹)</label>
                    <Input type="number" name="tpPremium" value={formData.tpPremium} onChange={handleChange} placeholder="0" className="h-10 text-sm bg-white" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Net Premium (₹)</label>
                  <Input type="number" name="netPremium" value={formData.netPremium} onChange={handleChange} placeholder="Excl. GST" className="h-10 text-sm bg-white" />
                </div>
              </div>
            </div>

            {/* Section: Broker & Sub-Agent */}
            <div className="p-6 border-b">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">4</span>
                Broker & Sub-Agent
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Broker Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Broker (PolicyBazaar, Probus, etc.)</label>
                  {!showNewBrokerForm ? (
                    <div className="flex gap-2">
                      <select
                        name="brokerId"
                        value={formData.brokerId}
                        onChange={handleChange}
                        className="flex-1 h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50/50 transition-all duration-200 hover:border-gray-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">Direct / No Broker</option>
                        {brokers.map((broker) => (
                          <option key={broker.id} value={broker.id}>{broker.name}</option>
                        ))}
                      </select>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowNewBrokerForm(true)} className="text-xs whitespace-nowrap">+ Add</Button>
                    </div>
                  ) : (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-purple-800">Add New Broker</span>
                        <button type="button" onClick={() => setShowNewBrokerForm(false)} className="text-gray-500 text-lg">×</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="Broker Name *" value={newBrokerData.name} onChange={(e) => setNewBrokerData(prev => ({ ...prev, name: e.target.value }))} className="h-9 text-sm" />
                        <Input placeholder="Phone" value={newBrokerData.phone} onChange={(e) => setNewBrokerData(prev => ({ ...prev, phone: e.target.value }))} className="h-9 text-sm" />
                        <Button type="button" onClick={handleCreateBroker} disabled={creatingBroker || !newBrokerData.name} className="h-9 text-xs bg-purple-600 hover:bg-purple-700">
                          {creatingBroker ? '...' : '✓ Create'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-Agent Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Assign Sub-Agent</label>
                  <div className="flex gap-2">
                    <select
                      name="subAgentId"
                      value={formData.subAgentId}
                      onChange={handleChange}
                      className="flex-1 h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50/50 transition-all duration-200 hover:border-gray-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">No Sub-Agent</option>
                      {subAgents.map((sa) => (
                        <option key={sa.id} value={sa.id}>{sa.name} ({sa.subAgentCode})</option>
                      ))}
                    </select>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowSubAgentForm(!showSubAgentForm)} className="text-xs whitespace-nowrap">
                      {showSubAgentForm ? 'Cancel' : '+ Add'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Inline Sub-Agent Form */}
              {showSubAgentForm && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 text-sm mb-3">Add New Sub-Agent</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input placeholder="Name *" value={newSubAgentData.name} onChange={(e) => setNewSubAgentData(prev => ({ ...prev, name: e.target.value }))} className="h-9 text-sm" />
                    <Input placeholder="Phone *" value={newSubAgentData.phone} onChange={(e) => setNewSubAgentData(prev => ({ ...prev, phone: e.target.value }))} className="h-9 text-sm" />
                    <Input placeholder="Email" value={newSubAgentData.email} onChange={(e) => setNewSubAgentData(prev => ({ ...prev, email: e.target.value }))} className="h-9 text-sm" />
                    <Button type="button" onClick={handleCreateSubAgent} disabled={creatingSubAgent || !newSubAgentData.name} className="h-9 text-xs">
                      {creatingSubAgent ? '...' : '✓ Create Sub-Agent'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Section: Commission Rates */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">5</span>
                Commission Rates
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Received Commission Rates */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <h4 className="text-xs font-semibold text-green-700 uppercase mb-3 flex items-center gap-2">
                    <span className="text-base">📥</span> Received Payout (%)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {formData.policyType === 'Motor Insurance' && (formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'OD_ONLY') && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">OD Rate</label>
                        <Input type="text" inputMode="decimal" name="odCommissionRate" value={formData.odCommissionRate} onChange={handleChange} placeholder="15" className="h-9 text-sm" />
                      </div>
                    )}
                    {formData.policyType === 'Motor Insurance' && (formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'TP_ONLY') && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">TP Rate</label>
                        <Input type="text" inputMode="decimal" name="tpCommissionRate" value={formData.tpCommissionRate} onChange={handleChange} placeholder="5" className="h-9 text-sm" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{formData.policyType === 'Motor Insurance' ? 'Net Rate' : 'Commission %'}</label>
                      <Input type="text" inputMode="decimal" name={formData.policyType === 'Motor Insurance' ? 'netCommissionRate' : 'commissionRate'} value={formData.policyType === 'Motor Insurance' ? formData.netCommissionRate : formData.commissionRate} onChange={handleChange} placeholder="10" className="h-9 text-sm" />
                    </div>
                    {formData.policyType !== 'Motor Insurance' && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Renewal %</label>
                        <Input type="text" inputMode="decimal" name="renewalCommissionRate" value={formData.renewalCommissionRate} onChange={handleChange} placeholder="5" className="h-9 text-sm" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-Agent Payout Rates - Show for ALL policy types when sub-agent is selected */}
                {formData.subAgentId && (
                  <div className="bg-white rounded-xl p-4 border border-orange-200 shadow-sm">
                    <h4 className="text-xs font-semibold text-orange-700 uppercase mb-3 flex items-center gap-2">
                      <span className="text-base">📤</span> Paid to Sub-Agent (%)
                    </h4>
                    {formData.policyType === 'Motor Insurance' ? (
                      <div className="grid grid-cols-2 gap-3">
                        {(formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'OD_ONLY') && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">OD Rate</label>
                            <Input type="text" inputMode="decimal" name="subAgentOdRate" value={formData.subAgentOdRate} onChange={handleChange} placeholder="10" className="h-9 text-sm" />
                          </div>
                        )}
                        {(formData.motorPolicyType === 'COMPREHENSIVE' || formData.motorPolicyType === 'TP_ONLY') && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">TP Rate</label>
                            <Input type="text" inputMode="decimal" name="subAgentTpRate" value={formData.subAgentTpRate} onChange={handleChange} placeholder="3" className="h-9 text-sm" />
                          </div>
                        )}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Net Rate</label>
                          <Input type="text" inputMode="decimal" name="subAgentNetRate" value={formData.subAgentNetRate} onChange={handleChange} placeholder="8" className="h-9 text-sm" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Commission %</label>
                          <Input type="text" inputMode="decimal" name="subAgentCommissionRate" value={formData.subAgentCommissionRate} onChange={handleChange} placeholder="5" className="h-9 text-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Motor Insurance: Premium Payment & Advance Options */}
              {formData.policyType === 'Motor Insurance' && formData.subAgentId && (
                <div className="mt-4 bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                  <h4 className="text-xs font-semibold text-blue-700 uppercase mb-3 flex items-center gap-2">
                    <span className="text-base">💰</span> Payment & Ledger Adjustment
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Premium Paid By Agent */}
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <div className="flex items-center gap-3 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.premiumPaidByAgent}
                            onChange={(e) => setFormData(prev => ({ ...prev, premiumPaidByAgent: e.target.checked }))}
                            className="w-4 h-4 text-amber-600 rounded"
                          />
                          <span className="text-sm font-medium text-amber-800">Premium Paid By You?</span>
                        </label>
                      </div>
                      {formData.premiumPaidByAgent && (
                        <div className="text-xs text-amber-700 bg-amber-100 rounded p-2 mt-2">
                          <p className="font-medium mb-1">💡 Ledger Adjustment:</p>
                          <p>Gross Premium (₹{formData.premiumAmount || 0}) − Sub-Agent Payout (₹{calculateSubAgentPayout().toFixed(0)}) = <span className="font-bold text-red-600">₹{(parseFloat(formData.premiumAmount || '0') - calculateSubAgentPayout()).toFixed(0)}</span></p>
                          <p className="mt-1 text-amber-600">This amount will be added to Sub-Agent's <strong>DUE</strong> in ledger.</p>
                        </div>
                      )}
                    </div>

                    {/* Received Advance */}
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-3 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.receivedAdvanceFromAgent}
                            onChange={(e) => setFormData(prev => ({ ...prev, receivedAdvanceFromAgent: e.target.checked, advanceAmount: e.target.checked ? prev.advanceAmount : '' }))}
                            className="w-4 h-4 text-green-600 rounded"
                          />
                          <span className="text-sm font-medium text-green-800">Received Advance?</span>
                        </label>
                      </div>
                      {formData.receivedAdvanceFromAgent && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Amount:</label>
                            <Input
                              type="number"
                              name="advanceAmount"
                              value={formData.advanceAmount}
                              onChange={handleChange}
                              placeholder="Enter advance amount"
                              className="h-8 text-sm flex-1"
                            />
                          </div>
                          <p className="text-xs text-green-600 mt-2">
                            ✓ This advance (₹{formData.advanceAmount || 0}) will be <strong>deducted</strong> from Sub-Agent's pending dues.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ledger Summary Preview */}
                  {(formData.premiumPaidByAgent || formData.receivedAdvanceFromAgent) && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <h5 className="text-xs font-semibold text-gray-700 uppercase mb-2">📊 Sub-Agent Ledger Preview</h5>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-2 bg-red-50 rounded-lg">
                          <p className="text-xs text-gray-500">Amount Due</p>
                          <p className="font-bold text-red-600">
                            ₹{formData.premiumPaidByAgent ? (parseFloat(formData.premiumAmount || '0') - calculateSubAgentPayout()).toFixed(0) : '0'}
                          </p>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded-lg">
                          <p className="text-xs text-gray-500">Advance Received</p>
                          <p className="font-bold text-green-600">₹{formData.advanceAmount || '0'}</p>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-500">Net Balance</p>
                          <p className="font-bold text-blue-600">
                            ₹{(
                              (formData.premiumPaidByAgent ? (parseFloat(formData.premiumAmount || '0') - calculateSubAgentPayout()) : 0) -
                              parseFloat(formData.advanceAmount || '0')
                            ).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Commission Preview */}
              {(formData.odCommissionRate || formData.tpCommissionRate || formData.netCommissionRate || formData.commissionRate || formData.brokerCommissionAmount) && (
                <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
                  <h4 className="text-xs font-semibold text-indigo-800 uppercase mb-2">Commission Preview</h4>
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="bg-white px-3 py-2 rounded-lg">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-bold text-green-700 ml-1">₹{calculateTotalCommission().toFixed(0)}</span>
                    </div>
                    <div className="bg-white px-3 py-2 rounded-lg">
                      <span className="text-gray-600">Your Payout:</span>
                      <span className="font-bold text-indigo-700 ml-1">₹{calculateAgentPayout().toFixed(0)}</span>
                    </div>
                    {formData.subAgentId && calculateSubAgentPayout() > 0 && (
                      <div className="bg-white px-3 py-2 rounded-lg">
                        <span className="text-gray-600">Sub-Agent:</span>
                        <span className="font-bold text-orange-700 ml-1">₹{calculateSubAgentPayout().toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section: Documents */}
            <div className="p-6 border-b">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-gray-600 text-xs">6</span>
                Documents
              </h3>
              
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {/* Policy Copy */}
                <div>
                  <input type="file" id="policyCopy" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setFormData(prev => ({ ...prev, policyCopyFile: file } as any)); }} />
                  <label htmlFor="policyCopy" className="cursor-pointer block">
                    <div className={`border-2 border-dashed rounded-lg p-2 text-center transition-all hover:border-blue-400 ${(formData as any).policyCopyFile ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                      <div className="text-lg">📄</div>
                      <div className="text-[10px] font-medium text-gray-700">Policy</div>
                    </div>
                  </label>
                  {(formData as any).policyCopyFile && (
                    <div className="flex justify-center gap-1 mt-1">
                      <button type="button" onClick={() => window.open(URL.createObjectURL((formData as any).policyCopyFile), '_blank')} className="text-[9px] text-blue-600 hover:underline">View</button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, policyCopyFile: undefined } as any))} className="text-[9px] text-red-500 hover:underline">Remove</button>
                    </div>
                  )}
                </div>

                {/* RC Document */}
                <div>
                  <input type="file" id="rcDocument" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setFormData(prev => ({ ...prev, rcDocumentFile: file } as any)); }} />
                  <label htmlFor="rcDocument" className="cursor-pointer block">
                    <div className={`border-2 border-dashed rounded-lg p-2 text-center transition-all hover:border-blue-400 ${(formData as any).rcDocumentFile ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                      <div className="text-lg">🚗</div>
                      <div className="text-[10px] font-medium text-gray-700">RC</div>
                    </div>
                  </label>
                  {(formData as any).rcDocumentFile && (
                    <div className="flex justify-center gap-1 mt-1">
                      <button type="button" onClick={() => window.open(URL.createObjectURL((formData as any).rcDocumentFile), '_blank')} className="text-[9px] text-blue-600 hover:underline">View</button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, rcDocumentFile: undefined } as any))} className="text-[9px] text-red-500 hover:underline">Remove</button>
                    </div>
                  )}
                </div>

                {/* Aadhar Front */}
                <div>
                  <input type="file" id="aadharFront" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setFormData(prev => ({ ...prev, aadharFrontFile: file } as any)); }} />
                  <label htmlFor="aadharFront" className="cursor-pointer block">
                    <div className={`border-2 border-dashed rounded-lg p-2 text-center transition-all hover:border-blue-400 ${(formData as any).aadharFrontFile ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                      <div className="text-lg">🪪</div>
                      <div className="text-[10px] font-medium text-gray-700">Aadhar F</div>
                    </div>
                  </label>
                  {(formData as any).aadharFrontFile && (
                    <div className="flex justify-center gap-1 mt-1">
                      <button type="button" onClick={() => window.open(URL.createObjectURL((formData as any).aadharFrontFile), '_blank')} className="text-[9px] text-blue-600 hover:underline">View</button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, aadharFrontFile: undefined } as any))} className="text-[9px] text-red-500 hover:underline">Remove</button>
                    </div>
                  )}
                </div>

                {/* Aadhar Back */}
                <div>
                  <input type="file" id="aadharBack" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setFormData(prev => ({ ...prev, aadharBackFile: file } as any)); }} />
                  <label htmlFor="aadharBack" className="cursor-pointer block">
                    <div className={`border-2 border-dashed rounded-lg p-2 text-center transition-all hover:border-blue-400 ${(formData as any).aadharBackFile ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                      <div className="text-lg">🪪</div>
                      <div className="text-[10px] font-medium text-gray-700">Aadhar B</div>
                    </div>
                  </label>
                  {(formData as any).aadharBackFile && (
                    <div className="flex justify-center gap-1 mt-1">
                      <button type="button" onClick={() => window.open(URL.createObjectURL((formData as any).aadharBackFile), '_blank')} className="text-[9px] text-blue-600 hover:underline">View</button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, aadharBackFile: undefined } as any))} className="text-[9px] text-red-500 hover:underline">Remove</button>
                    </div>
                  )}
                </div>

                {/* PAN Card */}
                <div>
                  <input type="file" id="panCard" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setFormData(prev => ({ ...prev, panCardFile: file } as any)); }} />
                  <label htmlFor="panCard" className="cursor-pointer block">
                    <div className={`border-2 border-dashed rounded-lg p-2 text-center transition-all hover:border-blue-400 ${(formData as any).panCardFile ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                      <div className="text-lg">🆔</div>
                      <div className="text-[10px] font-medium text-gray-700">PAN</div>
                    </div>
                  </label>
                  {(formData as any).panCardFile && (
                    <div className="flex justify-center gap-1 mt-1">
                      <button type="button" onClick={() => window.open(URL.createObjectURL((formData as any).panCardFile), '_blank')} className="text-[9px] text-blue-600 hover:underline">View</button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, panCardFile: undefined } as any))} className="text-[9px] text-red-500 hover:underline">Remove</button>
                    </div>
                  )}
                </div>

                {/* Photo */}
                <div>
                  <input type="file" id="photo" accept=".jpg,.jpeg,.png" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setFormData(prev => ({ ...prev, photoFile: file } as any)); }} />
                  <label htmlFor="photo" className="cursor-pointer block">
                    <div className={`border-2 border-dashed rounded-lg p-2 text-center transition-all hover:border-blue-400 ${(formData as any).photoFile ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                      <div className="text-lg">📸</div>
                      <div className="text-[10px] font-medium text-gray-700">Photo</div>
                    </div>
                  </label>
                  {(formData as any).photoFile && (
                    <div className="flex justify-center gap-1 mt-1">
                      <button type="button" onClick={() => window.open(URL.createObjectURL((formData as any).photoFile), '_blank')} className="text-[9px] text-blue-600 hover:underline">View</button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, photoFile: undefined } as any))} className="text-[9px] text-red-500 hover:underline">Remove</button>
                    </div>
                  )}
                </div>

                {/* Cancel Cheque */}
                <div>
                  <input type="file" id="cancelCheque" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setFormData(prev => ({ ...prev, cancelChequeFile: file } as any)); }} />
                  <label htmlFor="cancelCheque" className="cursor-pointer block">
                    <div className={`border-2 border-dashed rounded-lg p-2 text-center transition-all hover:border-blue-400 ${(formData as any).cancelChequeFile ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}>
                      <div className="text-lg">🏦</div>
                      <div className="text-[10px] font-medium text-gray-700">Cheque</div>
                    </div>
                  </label>
                  {(formData as any).cancelChequeFile && (
                    <div className="flex justify-center gap-1 mt-1">
                      <button type="button" onClick={() => window.open(URL.createObjectURL((formData as any).cancelChequeFile), '_blank')} className="text-[9px] text-blue-600 hover:underline">View</button>
                      <span className="text-gray-300">|</span>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, cancelChequeFile: undefined } as any))} className="text-[9px] text-red-500 hover:underline">Remove</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Remarks */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-gray-600 text-xs">7</span>
                Remarks
              </h3>
              <textarea
                name="remarks"
                value={formData.remarks || ''}
                onChange={handleChange}
                placeholder="Add any notes..."
                rows={2}
                className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Sticky Footer with Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t p-4 flex items-center justify-between">
              <Button type="button" variant="outline" onClick={() => router.back()} className="h-11 px-6">
                ← Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.clientId || !formData.companyId || !formData.policyNumber}
                className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg"
              >
                {loading ? '⏳ Saving...' : '💾 Save Policy'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Error display for Excel mode */}
      {entryMode === 'excel' && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
          {error}
        </div>
      )}
      </div>
    </div>
  );
}
