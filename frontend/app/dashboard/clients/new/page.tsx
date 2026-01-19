'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clientAPI } from '@/lib/api';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    address: '',
    city: '',
    pincode: '',
    aadharNumber: '',
    panNumber: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Clean name by removing prefixes
  const cleanName = (name: string) => {
    return name.replace(/^(Mr\.?|Mrs\.?|Miss|Ms\.?|Dr\.?)\s+/i, '').trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await clientAPI.create({
        ...formData,
        name: cleanName(formData.name),
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
      });
      router.push('/dashboard/clients');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/clients" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
          ← Back to Clients
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Add New Client</h1>
        <p className="text-gray-600">Enter client details below</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number
                  </label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      phone: e.target.value.replace(/\D/g, '').slice(0, 10) 
                    }))}
                    placeholder="9876543210"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <Input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Address</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="House no, street, locality..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode
                  </label>
                  <Input
                    name="pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      pincode: e.target.value.replace(/\D/g, '').slice(0, 6) 
                    }))}
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Documents (Optional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhar Number
                  </label>
                  <Input
                    name="aadharNumber"
                    value={formData.aadharNumber}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      aadharNumber: e.target.value.replace(/\D/g, '').slice(0, 12) 
                    }))}
                    placeholder="1234 5678 9012"
                    maxLength={12}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Number
                  </label>
                  <Input
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      panNumber: e.target.value.toUpperCase().slice(0, 10) 
                    }))}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
              </div>
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
                disabled={loading || !formData.name || formData.phone.length !== 10}
                className="flex-1"
              >
                {loading ? 'Saving...' : 'Save Client'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
