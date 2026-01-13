'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { agentAPI } from '@/lib/api';

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
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
                    <th className="text-left p-3 font-medium text-gray-700">Commission %</th>
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
                            <h3 className="font-medium text-gray-900">{agent.name}</h3>
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
                      <td className="p-3">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-sm font-medium">
                          {agent.commissionPercentage || '10'}%
                        </span>
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
    </div>
  );
}
