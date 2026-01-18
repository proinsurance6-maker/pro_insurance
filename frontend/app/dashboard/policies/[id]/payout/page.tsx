'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { policyAPI, commissionAPI, ledgerAPI } from '@/lib/api';

interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  premiumAmount: string;
  odPremium?: string;
  tpPremium?: string;
  netPremium?: string;
  createdAt: string;
  client: { id: string; name: string; phone: string; };
  company: { id: string; name: string; };
  subAgent?: { id: string; name: string; };
  broker?: { id: string; name: string; };
  commissions?: Array<{
    id: string;
    totalCommissionAmount: string;
    agentCommissionAmount: string;
    subAgentCommissionAmount?: string;
    receivedFromCompany: boolean;
    receivedDate?: string;
    paidToSubAgent?: boolean;
    paidToSubAgentDate?: string;
  }>;
}

export default function PayoutPage() {
  const params = useParams();
  const router = useRouter();
  const policyId = params.id as string;

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [markReceived, setMarkReceived] = useState(false);
  const [markPaidToSub, setMarkPaidToSub] = useState(false);
  const [premiumPaidBy, setPremiumPaidBy] = useState('client');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [clientPaidAmount, setClientPaidAmount] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchPolicy();
  }, [policyId]);

  const fetchPolicy = async () => {
    try {
      const res = await policyAPI.getById(policyId);
      const policyData = res.data.data;
      setPolicy(policyData);
      
      // Pre-fill if already received/paid
      if (policyData.commissions?.[0]?.receivedFromCompany) {
        setMarkReceived(true);
      }
      if (policyData.commissions?.[0]?.paidToSubAgent) {
        setMarkPaidToSub(true);
      }
    } catch (error) {
      console.error('Failed to fetch policy:', error);
      alert('Policy not found');
      router.push('/dashboard/policies');
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
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy) return;

    setSubmitting(true);
    try {
      const commission = policy.commissions?.[0];

      // Mark received from company
      if (markReceived && !commission?.receivedFromCompany && commission?.id) {
        await commissionAPI.markPaid(commission.id);
      }

      // Mark paid to sub-agent
      if (markPaidToSub && !commission?.paidToSubAgent && commission?.id && policy.subAgent) {
        await commissionAPI.markPaidToSubAgent(commission.id);
      }

      // Create ledger entry for client payment
      if (clientPaidAmount && Number(clientPaidAmount) > 0) {
        await ledgerAPI.createCollection({
          clientId: policy.client.id,
          amount: Number(clientPaidAmount),
          description: `Premium payment for policy ${policy.policyNumber}`,
          entryDate: new Date()
        });
      }

      // Create ledger entry for advance
      if (advanceAmount && Number(advanceAmount) > 0) {
        await ledgerAPI.createCollection({
          clientId: policy.client.id,
          amount: Number(advanceAmount),
          description: `Advance for policy ${policy.policyNumber} - ${remarks || 'Agent advance'}`,
          entryDate: new Date()
        });
      }

      // If agent paid premium, create debit entry for client
      if (premiumPaidBy === 'agent') {
        await ledgerAPI.createDebit({
          clientId: policy.client.id,
          amount: Number(policy.premiumAmount),
          description: `Premium due - Agent paid for policy ${policy.policyNumber}`,
          entryDate: new Date()
        });
      }

      alert('✅ Payout updated successfully!');
      router.push('/dashboard/policies');
    } catch (error) {
      console.error('Failed to update payout:', error);
      alert('Failed to update payout');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Policy not found</p>
        <Link href="/dashboard/policies">
          <Button className="mt-4">Back to Policies</Button>
        </Link>
      </div>
    );
  }

  const commission = policy.commissions?.[0];
  const totalCommission = Number(commission?.totalCommissionAmount || 0);
  const agentCommission = Number(commission?.agentCommissionAmount || 0);
  const subAgentCommission = Number(commission?.subAgentCommissionAmount || 0);
  const pendingFromClient = Number(policy.premiumAmount) - Number(clientPaidAmount || 0);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">💰 Payout / Ledger Update</h1>
          <p className="text-gray-500">Update payment status for this policy</p>
        </div>
        <Link href="/dashboard/policies">
          <Button variant="outline">← Back to Policies</Button>
        </Link>
      </div>

      {/* Policy Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            📋 Policy Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Policy Number</p>
              <p className="font-semibold text-blue-700">{policy.policyNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Client</p>
              <p className="font-semibold">{policy.client.name}</p>
              <p className="text-xs text-gray-500">{policy.client.phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Company</p>
              <p className="font-semibold">{policy.company.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="font-semibold">{formatDate(policy.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-xs text-gray-500">Premium Amount</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(policy.premiumAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Commission</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalCommission)}</p>
            </div>
            {policy.subAgent && (
              <>
                <div>
                  <p className="text-xs text-gray-500">Sub-Agent</p>
                  <p className="font-semibold text-purple-600">{policy.subAgent.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Sub-Agent Commission</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(subAgentCommission)}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Commission Status */}
        <Card>
          <CardHeader className="bg-green-50 border-b">
            <CardTitle className="text-base">🏢 Commission Status</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Company se mila */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Company से Commission मिला?</p>
                <p className="text-sm text-gray-500">Amount: {formatCurrency(totalCommission)}</p>
              </div>
              {commission?.receivedFromCompany ? (
                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                  ✅ Already Received ({commission.receivedDate ? formatDate(commission.receivedDate) : ''})
                </span>
              ) : (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markReceived}
                    onChange={(e) => setMarkReceived(e.target.checked)}
                    className="w-6 h-6 text-green-600 rounded"
                  />
                  <span className="font-medium">Mark as Received</span>
                </label>
              )}
            </div>

            {/* Sub-Agent ko diya */}
            {policy.subAgent && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Sub-Agent को Commission दिया?</p>
                  <p className="text-sm text-gray-500">{policy.subAgent.name}: {formatCurrency(subAgentCommission)}</p>
                </div>
                {commission?.paidToSubAgent ? (
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                    ✅ Already Paid ({commission.paidToSubAgentDate ? formatDate(commission.paidToSubAgentDate) : ''})
                  </span>
                ) : (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={markPaidToSub}
                      onChange={(e) => setMarkPaidToSub(e.target.checked)}
                      className="w-6 h-6 text-purple-600 rounded"
                    />
                    <span className="font-medium">Mark as Paid</span>
                  </label>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Premium Payment */}
        <Card>
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="text-base">💳 Premium Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Premium kisne pay kiya */}
            <div>
              <label className="block font-medium mb-2">Premium किसने Pay किया?</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'client', label: '👤 Client ने', desc: 'Client ने directly pay किया' },
                  { value: 'agent', label: '🧑‍💼 Agent ने', desc: 'आपने pay किया, client से लेना है' },
                  { value: 'subagent', label: '👥 Sub-Agent ने', desc: 'Sub-Agent ने pay किया' },
                  { value: 'partial', label: '📊 Partial', desc: 'कुछ amount pay हुआ है' }
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition ${
                      premiumPaidBy === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="premiumPaidBy"
                      value={option.value}
                      checked={premiumPaidBy === option.value}
                      onChange={(e) => setPremiumPaidBy(e.target.value)}
                      className="sr-only"
                    />
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Client payment amount - show only for partial */}
            {premiumPaidBy === 'partial' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <label className="block font-medium mb-2">Client ने कितना Pay किया?</label>
                <div className="flex gap-4 items-center">
                  <Input
                    type="number"
                    value={clientPaidAmount}
                    onChange={(e) => setClientPaidAmount(e.target.value)}
                    placeholder="Enter paid amount"
                    className="max-w-xs"
                  />
                  <span className="text-sm text-gray-600">
                    of {formatCurrency(policy.premiumAmount)}
                  </span>
                </div>
                {clientPaidAmount && (
                  <p className="mt-2 text-sm">
                    <span className="text-orange-600 font-medium">
                      Pending: {formatCurrency(pendingFromClient)}
                    </span>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Additional Entries */}
        <Card>
          <CardHeader className="bg-orange-50 border-b">
            <CardTitle className="text-base">📝 Additional Ledger Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Advance from client */}
            <div>
              <label className="block font-medium mb-2">Client से Advance मिला? (Optional)</label>
              <p className="text-sm text-gray-500 mb-2">अगर client ने extra advance दिया है तो यहाँ enter करें</p>
              <Input
                type="number"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="Enter advance amount (₹)"
                className="max-w-xs"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block font-medium mb-2">Remarks (Optional)</label>
              <Input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-base">📊 Summary of Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {markReceived && !commission?.receivedFromCompany && (
                <p className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Commission will be marked as received from company
                </p>
              )}
              {markPaidToSub && !commission?.paidToSubAgent && policy.subAgent && (
                <p className="flex items-center gap-2">
                  <span className="text-purple-600">✓</span>
                  Commission will be marked as paid to {policy.subAgent.name}
                </p>
              )}
              {premiumPaidBy === 'agent' && (
                <p className="flex items-center gap-2">
                  <span className="text-orange-600">✓</span>
                  Ledger entry will be created: Client owes {formatCurrency(policy.premiumAmount)}
                </p>
              )}
              {clientPaidAmount && Number(clientPaidAmount) > 0 && (
                <p className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  Client payment of {formatCurrency(clientPaidAmount)} will be recorded
                </p>
              )}
              {advanceAmount && Number(advanceAmount) > 0 && (
                <p className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Advance of {formatCurrency(advanceAmount)} will be recorded
                </p>
              )}
              {!markReceived && !markPaidToSub && !advanceAmount && premiumPaidBy === 'client' && (
                <p className="text-gray-500">No changes to make</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Link href="/dashboard/policies" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? 'Updating...' : '✅ Update Payout'}
          </Button>
        </div>
      </form>
    </div>
  );
}
