'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { renewalAPI } from '@/lib/api';

interface Renewal {
  id: string;
  renewalDate: string;
  renewalStatus: string;
  policy: {
    id: string;
    policyNumber: string;
    policyType: string;
    premiumAmount: number;
    client: {
      id: string;
      name: string;
      phone: string;
    };
    company: {
      name: string;
    };
  };
}

export default function RenewalsPage() {
  const [upcomingRenewals, setUpcomingRenewals] = useState<Renewal[]>([]);
  const [expiredPolicies, setExpiredPolicies] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'expired' | 'today'>('upcoming');
  const [daysFilter, setDaysFilter] = useState(30);

  useEffect(() => {
    fetchRenewals();
  }, [daysFilter]);

  const fetchRenewals = async () => {
    try {
      const [upcomingRes, expiredRes] = await Promise.all([
        renewalAPI.getUpcoming(daysFilter),
        renewalAPI.getExpired()
      ]);
      setUpcomingRenewals(upcomingRes.data.data || []);
      setExpiredPolicies(expiredRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch renewals:', error);
    } finally {
      setLoading(false);
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

  const getDaysRemaining = (dateString: string) => {
    const today = new Date();
    const renewalDate = new Date(dateString);
    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysLabel = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return `${Math.abs(days)} days ago`;
    return `${days} days`;
  };

  const getDaysColor = (days: number) => {
    if (days <= 0) return 'text-red-600 bg-red-100';
    if (days <= 7) return 'text-orange-600 bg-orange-100';
    if (days <= 15) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const todayRenewals = upcomingRenewals.filter(r => getDaysRemaining(r.renewalDate) === 0);

  const handleMarkRenewed = async (id: string) => {
    try {
      await renewalAPI.markRenewed(id);
      fetchRenewals();
    } catch (error) {
      console.error('Failed to mark renewed:', error);
    }
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleWhatsApp = (phone: string, clientName: string, policyNumber: string, renewalDate: string) => {
    const message = encodeURIComponent(
      `नमस्ते ${clientName} जी,\n\n` +
      `आपकी पॉलिसी ${policyNumber} का नवीनीकरण ${formatDate(renewalDate)} को होने वाला है।\n\n` +
      `कृपया समय पर प्रीमियम का भुगतान करें।\n\n` +
      `धन्यवाद!`
    );
    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
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
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Renewals</h1>
        <p className="text-gray-600">Track and manage policy renewals</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('today')}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{todayRenewals.length}</p>
            <p className="text-sm text-gray-500">Today</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => { setDaysFilter(7); setActiveTab('upcoming'); }}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-orange-600">
              {upcomingRenewals.filter(r => getDaysRemaining(r.renewalDate) <= 7).length}
            </p>
            <p className="text-sm text-gray-500">Next 7 Days</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => { setDaysFilter(30); setActiveTab('upcoming'); }}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {upcomingRenewals.filter(r => getDaysRemaining(r.renewalDate) <= 30).length}
            </p>
            <p className="text-sm text-gray-500">Next 30 Days</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setActiveTab('expired')}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-600">{expiredPolicies.length}</p>
            <p className="text-sm text-gray-500">Expired</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-3 border-b-2 font-medium text-sm ${
              activeTab === 'upcoming' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Upcoming ({upcomingRenewals.length})
          </button>
          <button
            onClick={() => setActiveTab('today')}
            className={`py-3 border-b-2 font-medium text-sm ${
              activeTab === 'today' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Today ({todayRenewals.length})
          </button>
          <button
            onClick={() => setActiveTab('expired')}
            className={`py-3 border-b-2 font-medium text-sm ${
              activeTab === 'expired' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Expired ({expiredPolicies.length})
          </button>
        </div>
      </div>

      {/* Filter for Upcoming */}
      {activeTab === 'upcoming' && (
        <div className="flex gap-2">
          {[7, 15, 30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setDaysFilter(days)}
              className={`px-3 py-1 text-sm rounded-full transition ${
                daysFilter === days 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      )}

      {/* Renewals List */}
      {activeTab === 'upcoming' && (
        <RenewalsList 
          renewals={upcomingRenewals.filter(r => getDaysRemaining(r.renewalDate) <= daysFilter)}
          getDaysRemaining={getDaysRemaining}
          getDaysLabel={getDaysLabel}
          getDaysColor={getDaysColor}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          handleCall={handleCall}
          handleWhatsApp={handleWhatsApp}
          handleMarkRenewed={handleMarkRenewed}
        />
      )}

      {activeTab === 'today' && (
        <RenewalsList 
          renewals={todayRenewals}
          getDaysRemaining={getDaysRemaining}
          getDaysLabel={getDaysLabel}
          getDaysColor={getDaysColor}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          handleCall={handleCall}
          handleWhatsApp={handleWhatsApp}
          handleMarkRenewed={handleMarkRenewed}
          emptyMessage="🎉 No renewals due today!"
        />
      )}

      {activeTab === 'expired' && (
        <RenewalsList 
          renewals={expiredPolicies}
          getDaysRemaining={getDaysRemaining}
          getDaysLabel={getDaysLabel}
          getDaysColor={getDaysColor}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          handleCall={handleCall}
          handleWhatsApp={handleWhatsApp}
          handleMarkRenewed={handleMarkRenewed}
          emptyMessage="No expired policies"
          isExpired
        />
      )}
    </div>
  );
}

interface RenewalsListProps {
  renewals: Renewal[];
  getDaysRemaining: (date: string) => number;
  getDaysLabel: (days: number) => string;
  getDaysColor: (days: number) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  handleCall: (phone: string) => void;
  handleWhatsApp: (phone: string, name: string, policy: string, date: string) => void;
  handleMarkRenewed: (id: string) => void;
  emptyMessage?: string;
  isExpired?: boolean;
}

interface Renewal {
  id: string;
  renewalDate: string;
  renewalStatus: string;
  policy: {
    id: string;
    policyNumber: string;
    policyType: string;
    premiumAmount: number;
    client: {
      id: string;
      name: string;
      phone: string;
    };
    company: {
      name: string;
    };
  };
}

function RenewalsList({
  renewals,
  getDaysRemaining,
  getDaysLabel,
  getDaysColor,
  formatCurrency,
  formatDate,
  handleCall,
  handleWhatsApp,
  handleMarkRenewed,
  emptyMessage = "No renewals found",
  isExpired = false
}: RenewalsListProps) {
  if (renewals.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {renewals.map((renewal) => {
        const daysRemaining = getDaysRemaining(renewal.renewalDate);
        
        return (
          <Card key={renewal.id} className="hover:shadow-md transition">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`px-3 py-2 rounded-lg text-center min-w-[80px] ${getDaysColor(daysRemaining)}`}>
                    <p className="text-lg font-bold">{daysRemaining}</p>
                    <p className="text-xs">days</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{renewal.policy.client.name}</h3>
                    <p className="text-sm text-gray-600">{renewal.policy.company.name}</p>
                    <p className="text-sm text-gray-500">
                      {renewal.policy.policyNumber} • {renewal.policy.policyType}
                    </p>
                    <p className="text-sm text-gray-500">
                      Renewal: {formatDate(renewal.renewalDate)}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <p className="font-semibold text-lg">{formatCurrency(renewal.policy.premiumAmount)}</p>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCall(renewal.policy.client.phone)}
                    >
                      📞 Call
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      onClick={() => handleWhatsApp(
                        renewal.policy.client.phone,
                        renewal.policy.client.name,
                        renewal.policy.policyNumber,
                        renewal.renewalDate
                      )}
                    >
                      💬 WhatsApp
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleMarkRenewed(renewal.id)}
                    >
                      ✓ Renewed
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
