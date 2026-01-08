'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { agentAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface ProfileData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  licenseNumber: string | null;
  panNumber: string | null;
  aadhaarNumber: string | null;
  bankName: string | null;
  bankAccount: string | null;
  ifscCode: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await agentAPI.getProfile();
      setProfile(response.data.data);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      await agentAPI.updateProfile(formData);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditing(false);
      fetchProfile();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update profile' 
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
          <p className="text-gray-600">Manage your account information</p>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)}>
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setEditing(false);
                setFormData(profile || {});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Card */}
      <Card>
        <CardHeader className="border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {profile?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile?.name}</h2>
              <p className="text-gray-500">{profile?.phone}</p>
              {profile?.createdAt && (
                <p className="text-sm text-gray-400">
                  Member since {formatDate(profile.createdAt)}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Full Name
                </label>
                {editing ? (
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-800">{profile?.name || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Phone Number
                </label>
                <p className="text-gray-800">{profile?.phone}</p>
                <p className="text-xs text-gray-400">Phone cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Email
                </label>
                {editing ? (
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                ) : (
                  <p className="text-gray-800">{profile?.email || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Address
                </label>
                {editing ? (
                  <Input
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter your address"
                  />
                ) : (
                  <p className="text-gray-800">{profile?.address || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* License & Documents */}
          <div className="pt-4 border-t">
            <h3 className="text-lg font-medium text-gray-800 mb-4">License & Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  License Number
                </label>
                {editing ? (
                  <Input
                    value={formData.licenseNumber || ''}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    placeholder="IRDA License No."
                  />
                ) : (
                  <p className="text-gray-800">{profile?.licenseNumber || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  PAN Number
                </label>
                {editing ? (
                  <Input
                    value={formData.panNumber || ''}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                ) : (
                  <p className="text-gray-800">{profile?.panNumber || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Aadhaar Number
                </label>
                {editing ? (
                  <Input
                    value={formData.aadhaarNumber || ''}
                    onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                    placeholder="1234 5678 9012"
                    maxLength={14}
                  />
                ) : (
                  <p className="text-gray-800">
                    {profile?.aadhaarNumber 
                      ? `XXXX XXXX ${profile.aadhaarNumber.slice(-4)}` 
                      : '-'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="pt-4 border-t">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Bank Name
                </label>
                {editing ? (
                  <Input
                    value={formData.bankName || ''}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="Bank Name"
                  />
                ) : (
                  <p className="text-gray-800">{profile?.bankName || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Account Number
                </label>
                {editing ? (
                  <Input
                    value={formData.bankAccount || ''}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    placeholder="Account Number"
                  />
                ) : (
                  <p className="text-gray-800">
                    {profile?.bankAccount 
                      ? `XXXX${profile.bankAccount.slice(-4)}` 
                      : '-'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  IFSC Code
                </label>
                {editing ? (
                  <Input
                    value={formData.ifscCode || ''}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                    placeholder="SBIN0001234"
                  />
                ) : (
                  <p className="text-gray-800">{profile?.ifscCode || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
