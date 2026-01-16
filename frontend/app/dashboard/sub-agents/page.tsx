'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { agentAPI, policyAPI, commissionAPI } from '@/lib/api';

interface SubAgent {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  commissionPercentage: string;
  subAgentCode: string;
  _count?: {
    clients: number;
    policies: number;
  };
}

export default function SubAgentsPage() {
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<SubAgent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<SubAgent | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [selectedAgentForKyc, setSelectedAgentForKyc] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [kycFiles, setKycFiles] = useState<{ [key: string]: File[] }>({});
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    commissionPercentage: '10'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubAgents();
  }, []);

  const fetchSubAgents = async () => {
    try {
      const response = await agentAPI.getSubAgents();
      setSubAgents(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      console.error('Failed to fetch sub-agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingAgent) {
        await agentAPI.updateSubAgent(editingAgent.id, formData);
      } else {
        await agentAPI.createSubAgent(formData);
      }
      setShowModal(false);
      setEditingAgent(null);
      setFormData({ name: '', phone: '', email: '', password: '', commissionPercentage: '10' });
      fetchSubAgents();
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to ${editingAgent ? 'update' : 'create'} sub-agent`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (agent: SubAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      phone: agent.phone,
      email: agent.email || '',
      password: '', // Don't pre-fill password for security
      commissionPercentage: agent.commissionPercentage || '10'
    });
    setShowModal(true);
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this sub-agent?')) return;
    
    try {
      await agentAPI.deleteSubAgent(agentId);
      fetchSubAgents();
    } catch (error: any) {
      alert('Failed to delete sub-agent: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleKycUpload = (agentId: string) => {
    setSelectedAgentForKyc(agentId);
    setShowKycModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setKycFiles(prev => ({
        ...prev,
        [selectedAgentForKyc]: [...(prev[selectedAgentForKyc] || []), ...files]
      }));
    }
  };

  const removeKycFile = (agentId: string, index: number) => {
    setKycFiles(prev => ({
      ...prev,
      [agentId]: prev[agentId]?.filter((_, i) => i !== index) || []
    }));
  };

  const uploadKycDocuments = async () => {
    if (!selectedAgentForKyc || !kycFiles[selectedAgentForKyc]?.length) return;
    
    setUploadingKyc(true);
    try {
      const formData = new FormData();
      kycFiles[selectedAgentForKyc].forEach((file) => {
        formData.append('documents', file);
      });
      
      await agentAPI.uploadSubAgentKyc(selectedAgentForKyc, formData);
      setShowKycModal(false);
      setSelectedAgentForKyc('');
      setKycFiles(prev => ({ ...prev, [selectedAgentForKyc]: [] }));
      alert('KYC documents uploaded successfully!');
    } catch (error: any) {
      alert('Failed to upload KYC documents: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploadingKyc(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

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
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sub-Agents</h1>
          <p className="text-gray-600">Manage your team members</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          + Add Sub-Agent
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-800">{subAgents.length}</p>
            <p className="text-sm text-gray-500">Total Sub-Agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {subAgents.filter(a => a.isActive).length}
            </p>
            <p className="text-sm text-gray-500">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {subAgents.reduce((sum, a) => sum + (a._count?.clients || 0), 0)}
            </p>
            <p className="text-sm text-gray-500">Total Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {subAgents.reduce((sum, a) => sum + (a._count?.policies || 0), 0)}
            </p>
            <p className="text-sm text-gray-500">Total Policies</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Agents Table */}
      {subAgents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No sub-agents yet</p>
            <Button onClick={() => setShowModal(true)}>Add Your First Sub-Agent</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sub-Agents List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-gray-700">Sub-Agent</th>
                    <th className="text-left p-3 font-medium text-gray-700">Contact</th>
                    <th className="text-center p-3 font-medium text-gray-700">Clients</th>
                    <th className="text-center p-3 font-medium text-gray-700">Policies</th>
                    <th className="text-center p-3 font-medium text-gray-700">Status</th>
                    <th className="text-center p-3 font-medium text-gray-700">Joined</th>
                    <th className="text-center p-3 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subAgents.map((agent) => (
                    <tr key={agent.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-lg font-semibold text-blue-600">
                              {agent.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <button
                              onClick={() => setShowDetailModal(agent)}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                            >
                              {agent.name}
                            </button>
                            <p className="text-sm text-gray-500">{agent.subAgentCode || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm text-gray-900">{agent.phone}</p>
                          <p className="text-sm text-gray-500">{agent.email || 'No email'}</p>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-lg font-semibold text-blue-600">
                          {agent._count?.clients || 0}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-lg font-semibold text-purple-600">
                          {agent._count?.policies || 0}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          agent.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {agent.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm text-gray-500">
                        {formatDate(agent.createdAt)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEdit(agent)}
                            className="text-xs"
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleKycUpload(agent.id)}
                            className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100"
                          >
                            KYC
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(`tel:${agent.phone}`, '_self')}
                            className="text-xs"
                          >
                            📞
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDelete(agent.id)}
                            className="text-xs text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Sub-Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingAgent ? 'Edit Sub-Agent' : 'Add Sub-Agent'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    pattern="[0-9]{10}"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (Optional)
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission Percentage *
                  </label>
                  <Input
                    type="number"
                    value={formData.commissionPercentage}
                    onChange={(e) => setFormData({ ...formData, commissionPercentage: e.target.value })}
                    placeholder="10"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                </div>
                
                {!editingAgent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Password *
                    </label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Temporary password"
                      required={!editingAgent}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Sub-agent will use this for first login, then switch to OTP
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setShowModal(false);
                      setEditingAgent(null);
                      setFormData({ name: '', phone: '', email: '', password: '', commissionPercentage: '10' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={submitting}
                  >
                    {submitting ? (editingAgent ? 'Updating...' : 'Adding...') : (editingAgent ? 'Update Sub-Agent' : 'Add Sub-Agent')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KYC Upload Modal */}
      {showKycModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Upload KYC Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Documents (Aadhar, PAN, Bank Passbook, etc.)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*,.pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: Images (JPG, PNG, etc.) and PDF files
                  </p>
                </div>

                {kycFiles[selectedAgentForKyc]?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h4>
                    <div className="space-y-2">
                      {kycFiles[selectedAgentForKyc].map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeKycFile(selectedAgentForKyc, index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setShowKycModal(false);
                      setSelectedAgentForKyc('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    className="flex-1"
                    onClick={uploadKycDocuments}
                    disabled={uploadingKyc || !kycFiles[selectedAgentForKyc]?.length}
                  >
                    {uploadingKyc ? 'Uploading...' : 'Upload Documents'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sub-Agent Detail Modal */}
      {showDetailModal && (
        <SubAgentDetailModal
          agent={showDetailModal}
          onClose={() => setShowDetailModal(null)}
        />
      )}
    </div>
  );
}

// Sub-Agent Detail Modal Component
function SubAgentDetailModal({ agent, onClose }: { agent: SubAgent; onClose: () => void }) {
  const [policies, setPolicies] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'policies' | 'commissions'>('policies');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [policiesRes, commissionsRes] = await Promise.all([
        policyAPI.getAll({ subAgentId: agent.id, limit: 100 }),
        commissionAPI.getSubAgentCommissions(agent.id)
      ]);
      setPolicies(policiesRes.data.data.policies || []);
      setCommissions(commissionsRes.data.data || []);
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
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-xl flex justify-between items-center z-10">
          <div>
            <h3 className="text-lg font-bold">{agent.name}</h3>
            <p className="text-blue-100 text-sm">{agent.subAgentCode} • {agent.phone}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded-full p-2 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 sticky top-[72px] bg-white z-10">
          <button
            onClick={() => setActiveTab('policies')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'policies'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            📋 Policies ({policies.length})
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'commissions'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            💰 Commission Ledger ({commissions.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'policies' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2 font-medium text-gray-700">Date</th>
                    <th className="text-left p-2 font-medium text-gray-700">Policy No</th>
                    <th className="text-left p-2 font-medium text-gray-700">Client</th>
                    <th className="text-left p-2 font-medium text-gray-700">Type</th>
                    <th className="text-right p-2 font-medium text-gray-700">Premium</th>
                    <th className="text-right p-2 font-medium text-gray-700">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((policy) => (
                    <tr key={policy.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{formatDate(policy.createdAt)}</td>
                      <td className="p-2 font-medium">{policy.policyNumber}</td>
                      <td className="p-2">{policy.client.name}</td>
                      <td className="p-2">{policy.policyType}</td>
                      <td className="p-2 text-right">{formatCurrency(policy.premiumAmount)}</td>
                      <td className="p-2 text-right font-semibold text-green-600">
                        {policy.commissions?.[0]?.subAgentCommissionAmount 
                          ? formatCurrency(policy.commissions[0].subAgentCommissionAmount)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                  {policies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        No policies found for this sub-agent
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2 font-medium text-gray-700">Date</th>
                    <th className="text-left p-2 font-medium text-gray-700">Policy No</th>
                    <th className="text-left p-2 font-medium text-gray-700">Client</th>
                    <th className="text-left p-2 font-medium text-gray-700">Company</th>
                    <th className="text-right p-2 font-medium text-gray-700">Commission</th>
                    <th className="text-center p-2 font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((comm) => (
                    <tr key={comm.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{formatDate(comm.createdAt)}</td>
                      <td className="p-2 font-medium">{comm.policy?.policyNumber || '-'}</td>
                      <td className="p-2">{comm.policy?.client?.name || '-'}</td>
                      <td className="p-2">{comm.company?.name || '-'}</td>
                      <td className="p-2 text-right font-semibold text-green-600">
                        {formatCurrency(comm.subAgentCommissionAmount || 0)}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          comm.paidToSubAgent
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {comm.paidToSubAgent ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {commissions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        No commission records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

