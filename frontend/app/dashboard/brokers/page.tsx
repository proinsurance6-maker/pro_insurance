'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { brokerAPI } from '@/lib/api';

interface Broker {
  id: string;
  name: string;
  code: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  _count: {
    policies: number;
    commissions: number;
  };
}

export default function BrokersPage() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    try {
      setLoading(true);
      const response = await brokerAPI.getAll();
      setBrokers(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingId) {
        await brokerAPI.update(editingId, formData);
        setSuccess('Broker updated successfully');
      } else {
        await brokerAPI.create(formData);
        setSuccess('Broker added successfully');
      }
      setShowAddForm(false);
      setEditingId(null);
      setFormData({ name: '', code: '', contactPerson: '', email: '', phone: '', address: '' });
      fetchBrokers();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save broker');
    }
  };

  const handleEdit = (broker: Broker) => {
    setEditingId(broker.id);
    setFormData({
      name: broker.name,
      code: broker.code || '',
      contactPerson: broker.contactPerson || '',
      email: broker.email || '',
      phone: broker.phone || '',
      address: broker.address || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this broker?')) return;
    
    try {
      await brokerAPI.delete(id);
      setSuccess('Broker deactivated successfully');
      fetchBrokers();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to deactivate broker');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ name: '', code: '', contactPerson: '', email: '', phone: '', address: '' });
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Brokers</h1>
          <p className="text-gray-600">Manage brokers like PolicyBazaar, MitPro, Probus, etc.</p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            + Add Broker
          </Button>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg">
          {success}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Broker' : 'Add New Broker'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Broker Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., PolicyBazaar"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., PB001"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="broker@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Office address"
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={!formData.name}>
                  {editingId ? 'Update Broker' : 'Add Broker'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Brokers List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading brokers...</div>
      ) : brokers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-3">🏢</div>
            <h3 className="text-lg font-medium text-gray-800 mb-1">No Brokers Added</h3>
            <p className="text-gray-500 mb-4">
              Add brokers like PolicyBazaar, MitPro, Probus to track commission from them
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              + Add Your First Broker
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {brokers.map((broker) => (
            <Card key={broker.id} className={!broker.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">{broker.name}</h3>
                      {broker.code && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {broker.code}
                        </span>
                      )}
                      {!broker.isActive && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {broker.contactPerson && <span>{broker.contactPerson} • </span>}
                      {broker.phone && <span>{broker.phone} • </span>}
                      {broker.email && <span>{broker.email}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      {broker._count.policies} Policies • {broker._count.commissions} Commissions
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(broker)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    {broker.isActive && (
                      <button
                        onClick={() => handleDelete(broker.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-medium text-purple-800 mb-2">💡 Commission Flow with Brokers</h4>
        <div className="text-sm text-purple-700 space-y-1">
          <p>1. <strong>Broker</strong> (PolicyBazaar, MitPro, etc.) → Gives commission to Agent</p>
          <p>2. <strong>Agent</strong> → Keeps their share, gives rest to Sub-Agent</p>
          <p>3. Example: Broker gives ₹100 → Agent keeps ₹10 → Sub-Agent gets ₹90</p>
        </div>
      </div>
    </div>
  );
}
