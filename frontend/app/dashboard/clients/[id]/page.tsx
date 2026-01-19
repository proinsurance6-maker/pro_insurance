'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clientAPI } from '@/lib/api';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  dateOfBirth?: string;
  phone?: string;
}

interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  premiumAmount: number;
  status: string;
  company: {
    name: string;
  };
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  pincode?: string;
  aadharNumber?: string;
  panNumber?: string;
  createdAt: string;
  familyMembers: FamilyMember[];
  policies: Policy[];
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'policies' | 'family'>('info');

  useEffect(() => {
    if (params.id) {
      fetchClient();
    }
  }, [params.id]);

  const fetchClient = async () => {
    try {
      const clientRes = await clientAPI.getById(params.id as string);
      setClient(clientRes.data.data);
    } catch (error) {
      console.error('Failed to fetch client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    try {
      await clientAPI.delete(params.id as string);
      router.push('/dashboard/clients');
    } catch (error) {
      console.error('Failed to delete client:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-800">Client not found</h2>
        <Link href="/dashboard/clients" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Clients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/clients" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Clients
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{client.name}</h1>
              <p className="text-gray-600">{client.phone}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/clients/${client.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{client.policies?.length || 0}</p>
            <p className="text-sm text-gray-500">Policies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{client.familyMembers?.length || 0}</p>
            <p className="text-sm text-gray-500">Family Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(client.policies?.reduce((sum, p) => sum + Number(p.premiumAmount), 0) || 0)}
            </p>
            <p className="text-sm text-gray-500">Total Premium</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-8">
          {(['info', 'policies', 'family'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'info' ? 'Information' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoRow label="Full Name" value={client.name} />
              <InfoRow label="Phone" value={client.phone} />
              <InfoRow label="Email" value={client.email || '-'} />
              <InfoRow label="Date of Birth" value={client.dateOfBirth ? formatDate(client.dateOfBirth) : '-'} />
              <InfoRow label="Address" value={client.address || '-'} />
              <InfoRow label="City" value={client.city || '-'} />
              <InfoRow label="Pincode" value={client.pincode || '-'} />
              <InfoRow label="Aadhar" value={client.aadharNumber || '-'} />
              <InfoRow label="PAN" value={client.panNumber || '-'} />
              <InfoRow label="Client Since" value={formatDate(client.createdAt)} />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900">Policies ({client.policies?.length || 0})</h3>
            <Link href={`/dashboard/policies/new?clientId=${client.id}`}>
              <Button size="sm">Add Policy</Button>
            </Link>
          </div>
          {client.policies?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No policies found for this client
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {client.policies?.map((policy) => (
                <Link key={policy.id} href={`/dashboard/policies/${policy.id}`}>
                  <Card className="hover:shadow-md transition cursor-pointer">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{policy.policyNumber}</p>
                        <p className="text-sm text-gray-500">{policy.company.name} • {policy.policyType}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(policy.premiumAmount)}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          policy.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {policy.status}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'family' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900">Family Members ({client.familyMembers?.length || 0})</h3>
            <Button size="sm">Add Member</Button>
          </div>
          {client.familyMembers?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No family members added
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {client.familyMembers?.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{member.relationship}</p>
                      </div>
                    </div>
                    {member.phone && (
                      <p className="text-sm text-gray-500">{member.phone}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  );
}
