'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { policyAPI, agentAPI } from '@/lib/api';

interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  motorPolicyType?: string;
  premiumAmount: string;
  odPremium?: string;
  tpPremium?: string;
  netPremium?: string;
  premiumPaidBy?: string;
  vehicleNumber?: string;
  policyDocumentUrl?: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  client: { 
    id: string;
    name: string; 
    phone: string;
    clientCode?: string;
  };
  company: { name: string; };
  broker?: { id: string; name: string; };
  subAgent?: { 
    id: string; 
    name: string; 
    commissionPercentage?: string;
  };
  commissions?: Array<{
    id: string;
    totalCommissionPercent: string;
    totalCommissionAmount: string;
    odCommissionPercent?: string;
    odCommissionAmount?: string;
    tpCommissionPercent?: string;
    tpCommissionAmount?: string;
    netCommissionPercent?: string;
    netCommissionAmount?: string;
    brokerCommissionAmount?: string;
    agentCommissionAmount: string;
    subAgentCommissionAmount?: string;
    subAgentSharePercent?: string;
    subAgentOdPercent?: string;
    subAgentTpPercent?: string;
    subAgentNetPercent?: string;
    receivedFromCompany: boolean;
    receivedDate?: string;
    paidToSubAgent?: boolean;
    paidToSubAgentDate?: string;
  }>;
}

interface SubAgent {
  id: string;
  name: string;
  ledgerBalance: string;
}

export default function LedgerPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'received' | 'pending'>('all');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        policyAPI.getAll({ limit: 500 }),
        agentAPI.getSubAgents()
      ]);
      setPolicies(pRes.data.data?.policies || pRes.data.data || []);
      setSubAgents(sRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  // Totals
  const total = policies.reduce((s, p) => s + Number(p.commissions?.[0]?.totalCommissionAmount || 0), 0);
  const received = policies.filter(p => p.commissions?.[0]?.receivedFromCompany).reduce((s, p) => s + Number(p.commissions?.[0]?.totalCommissionAmount || 0), 0);
  const pending = total - received;
  const subDue = policies.filter(p => p.subAgent && !p.commissions?.[0]?.paidToSubAgent).reduce((s, p) => s + Number(p.commissions?.[0]?.subAgentCommissionAmount || 0), 0);

  // Filter
  const filtered = policies.filter(p => {
    if (search && !p.policyNumber.toLowerCase().includes(search.toLowerCase()) && 
        !p.client.name.toLowerCase().includes(search.toLowerCase()) &&
        !(p.vehicleNumber || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'received' && !p.commissions?.[0]?.receivedFromCompany) return false;
    if (filter === 'pending' && p.commissions?.[0]?.receivedFromCompany) return false;
    return true;
  });

  // Get premium paid by label
  const getPaidByLabel = (paidBy?: string) => {
    switch(paidBy) {
      case 'AGENT': return 'Agent';
      case 'SUB_AGENT': return 'Sub-Agent';
      case 'CLIENT': return 'Client';
      default: return '-';
    }
  };

  // Get vehicle type (mock data - should come from backend)
  const getVehicleType = () => 'Pvt'; // Can be 'Commercial' or 'Pvt'
  const getVehicleSubType = () => 'Car'; // Can be 'Car', 'Bike', 'Scooter', 'Pickup'
  
  // Get policy type display
  const getPolicyTypeDisplay = (motorType?: string) => {
    switch(motorType) {
      case 'COMPREHENSIVE': return 'Package';
      case 'OD_ONLY': return 'OD';
      case 'TP_ONLY': return 'TP';
      default: return 'Package';
    }
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="p-4 space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📒 Commission Ledger (View Only)</h1>
        <p className="text-gray-500 text-sm">Complete Hisab-Kitab Report</p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-blue-50 border border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-blue-600">{fmt(total)}</p>
            <p className="text-xs text-gray-600">Total Commission</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-green-600">{fmt(received)}</p>
            <p className="text-xs text-gray-600">Received</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border border-orange-200">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-orange-600">{fmt(pending)}</p>
            <p className="text-xs text-gray-600">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border border-purple-200">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-purple-600">{fmt(subDue)}</p>
            <p className="text-xs text-gray-600">Partner Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-2">
        <Input 
          placeholder="🔍 Search Policy/Client/Vehicle..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="w-64 border-gray-300"
        />
        <Button variant={filter==='all'?'default':'outline'} size="sm" onClick={()=>setFilter('all')}>All</Button>
        <Button variant={filter==='received'?'default':'outline'} size="sm" onClick={()=>setFilter('received')}>Received</Button>
        <Button variant={filter==='pending'?'default':'outline'} size="sm" onClick={()=>setFilter('pending')}>Pending</Button>
      </div>

      {/* Detailed Table */}
      <Card className="border border-gray-200">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs border-collapse" style={{ borderCollapse: 'collapse' }}>
            <thead>
              {/* Section Headers */}
              <tr className="text-white text-sm">
                <th colSpan={2} className="p-2.5 text-center bg-blue-400 border border-gray-300 font-semibold">Client Details</th>
                <th colSpan={3} className="p-2.5 text-center bg-green-500 border border-gray-300 font-semibold">Vehicle Section</th>
                <th colSpan={8} className="p-2.5 text-center bg-purple-500 border border-gray-300 font-semibold">Policy Details</th>
                <th colSpan={8} className="p-2.5 text-center bg-orange-400 border border-gray-300 font-semibold">Received Commission</th>
                <th colSpan={6} className="p-2.5 text-center bg-pink-400 border border-gray-300 font-semibold">Partner Section</th>
                <th colSpan={5} className="p-2.5 text-center bg-teal-400 border border-gray-300 font-semibold">Hisab Section</th>
              </tr>
              {/* Column Headers */}
              <tr className="bg-gray-100 text-gray-700 text-xs">
                {/* Client Details - FROZEN */}
                <th className="p-2 text-left font-semibold border border-gray-300 whitespace-nowrap sticky left-0 bg-gray-100 z-10">Entry Date</th>
                <th className="p-2 text-left font-semibold border border-gray-300 whitespace-nowrap sticky left-[100px] bg-gray-100 z-10">Client Name</th>
                
                {/* Vehicle Section */}
                <th className="p-2 text-left font-semibold border border-gray-300 whitespace-nowrap">Vehicle No.</th>
                <th className="p-2 text-left font-semibold border border-gray-300 whitespace-nowrap">Vehicle Type</th>
                <th className="p-2 text-left font-semibold border border-gray-300 whitespace-nowrap">Vehicle Sub Type</th>
                
                {/* Policy Details */}
                <th className="p-2 text-left font-semibold border border-gray-300 whitespace-nowrap">Policy No.</th>
                <th className="p-2 text-left font-semibold border border-gray-300 whitespace-nowrap">Company</th>
                <th className="p-2 text-left font-semibold border border-gray-300 whitespace-nowrap">Policy Type</th>
                <th className="p-2 text-right font-semibold border border-gray-300 whitespace-nowrap">Gross Premium</th>
                <th className="p-2 text-right font-semibold border border-gray-300 whitespace-nowrap">OD</th>
                <th className="p-2 text-right font-semibold border border-gray-300 whitespace-nowrap">TP</th>
                <th className="p-2 text-right font-semibold border border-gray-300 whitespace-nowrap">Net Premium</th>
                <th className="p-2 text-right font-semibold border border-gray-300 whitespace-nowrap">Payable Premium</th>
                
                {/* Received Commission */}
                <th className="p-2 text-left font-semibold border border-gray-300 whitespace-nowrap">Broker Name</th>
                <th className="p-2 text-center font-semibold border border-gray-300 whitespace-nowrap">OD Rate</th>
                <th className="p-2 text-center font-semibold border border-gray-300 whitespace-nowrap">TP Rate</th>
                <th className="p-2 text-center font-semibold border border-gray-300 whitespace-nowrap">Net Rate</th>
                <th className="p-2 text-right font-semibold border border-gray-300 whitespace-nowrap">Gross Payout</th>
                <th className="p-2 text-right font-semibold border border-gray-300 whitespace-nowrap">TDS(2%)</th>
                <th className="p-2 text-right font-semibold border border-gray-300 whitespace-nowrap">Net Payout</th>
                <th className="p-2 text-center font-semibold border border-gray-300 whitespace-nowrap">Payout Received</th>
                
                {/* Partner Section */}
                <th className="p-2 text-left font-semibold border border-gray-300 whitespace-nowrap">Partner Name</th>
                <th className="p-2 text-center font-semibold border border-gray-300 whitespace-nowrap">OD Rate</th>
                <th className="p-2 text-center font-semibold border border-gray-300 whitespace-nowrap">TP Rate</th>
                <th className="p-2 text-center font-semibold border border-gray-300 whitespace-nowrap">Net Rate</th>
                <th className="p-2 text-right font-semibold border border-gray-300 whitespace-nowrap">Payout</th>
                <th className="p-2 text-center font-semibold border border-gray-300 whitespace-nowrap">Paid</th>
                
                {/* Hisab Section */}
                <th className="p-2 text-center font-semibold border border-gray-300 whitespace-nowrap">Paid By</th>
                <th className="p-2 text-right font-semibold border border-gray-300 whitespace-nowrap">Net Received Payout</th>
                <th className="p-2 text-right font-semibold border border-gray-300 whitespace-nowrap">Partner Payout</th>
                <th className="p-2 text-right font-semibold border border-gray-300 whitespace-nowrap">Net Agent Payout</th>
                <th className="p-2 text-left font-semibold border border-gray-300 whitespace-nowrap">Remark</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={32} className="p-8 text-center text-gray-400 border border-gray-300">No data found</td></tr>
              ) : filtered.map((p, idx) => {
                const c = p.commissions?.[0];
                const hasSub = !!p.subAgent;
                
                // Commission amounts are already in rupees (string from DB)
                const grossCommission = Number(c?.totalCommissionAmount || 0);
                const tds = grossCommission * 0.02;
                const netPayout = grossCommission - tds;
                const subAgentAmount = Number(c?.subAgentCommissionAmount || 0);
                const netAgentPayout = netPayout - subAgentAmount;
                
                const entryDate = new Date(p.createdAt).toLocaleDateString('en-IN');

                return (
                  <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {/* CLIENT DETAILS - FROZEN */}
                    <td className="p-2 border border-gray-300 text-black text-xs sticky left-0 bg-inherit z-10">{entryDate}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs font-medium sticky left-[100px] bg-inherit z-10">{p.client.name}</td>
                    
                    {/* VEHICLE SECTION */}
                    <td className="p-2 border border-gray-300 text-black text-xs">{p.vehicleNumber || '-'}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs">{getVehicleType()}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs">{getVehicleSubType()}</td>
                    
                    {/* POLICY DETAILS */}
                    <td className="p-2 border border-gray-300 text-black text-xs">{p.policyNumber}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs">{p.company.name}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs">{getPolicyTypeDisplay(p.motorPolicyType)}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-right">{fmt(Number(p.premiumAmount))}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-right">{p.odPremium ? fmt(Number(p.odPremium)) : '-'}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-right">{p.tpPremium ? fmt(Number(p.tpPremium)) : '-'}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-right">{p.netPremium ? fmt(Number(p.netPremium)) : '-'}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-right font-semibold">{fmt(Number(p.premiumAmount))}</td>
                    
                    {/* RECEIVED COMMISSION */}
                    <td className="p-2 border border-gray-300 text-black text-xs">{p.broker?.name || 'Direct'}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-center">{c?.odCommissionPercent || '-'}%</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-center">{c?.tpCommissionPercent || '-'}%</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-center">{c?.netCommissionPercent || c?.totalCommissionPercent || '0'}%</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-right">{fmt(grossCommission)}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-right">{fmt(tds)}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-right font-semibold">{fmt(netPayout)}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-center">{c?.receivedFromCompany ? 'Yes' : 'No'}</td>
                    
                    {/* PARTNER SECTION */}
                    <td className="p-2 border border-gray-300 text-black text-xs">{hasSub ? p.subAgent?.name : '-'}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-center">{hasSub && c?.subAgentOdPercent ? c.subAgentOdPercent + '%' : '-'}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-center">{hasSub && c?.subAgentTpPercent ? c.subAgentTpPercent + '%' : '-'}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-center">{hasSub ? (c?.subAgentNetPercent || c?.subAgentSharePercent || '0') + '%' : '-'}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-right">{hasSub ? fmt(subAgentAmount) : '-'}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-center">{hasSub ? (c?.paidToSubAgent ? 'Yes' : 'No') : '-'}</td>
                    
                    {/* HISAB SECTION */}
                    <td className="p-2 border border-gray-300 text-black text-xs text-center">{getPaidByLabel(p.premiumPaidBy)}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-right">{fmt(netPayout)}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-right">{hasSub ? fmt(subAgentAmount) : '-'}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs text-right font-semibold">{fmt(netAgentPayout)}</td>
                    <td className="p-2 border border-gray-300 text-black text-xs">-</td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Row */}
            <tfoot>
              <tr className="bg-gray-200 font-bold">
                <td colSpan={8} className="p-2 text-right text-black text-xs border border-gray-300">TOTAL:</td>
                <td className="p-2 text-right text-black text-xs border border-gray-300">
                  {fmt(filtered.reduce((s, p) => s + Number(p.premiumAmount || 0), 0))}
                </td>
                <td colSpan={7} className="p-2 border border-gray-300"></td>
                <td className="p-2 text-right text-black text-xs border border-gray-300">
                  {fmt(filtered.reduce((s, p) => s + Number(p.commissions?.[0]?.totalCommissionAmount || 0), 0))}
                </td>
                <td className="p-2 text-right text-black text-xs border border-gray-300">
                  {fmt(filtered.reduce((s, p) => s + (Number(p.commissions?.[0]?.totalCommissionAmount || 0) * 0.02), 0))}
                </td>
                <td className="p-2 text-right text-black text-xs border border-gray-300">
                  {fmt(filtered.reduce((s, p) => {
                    const gross = Number(p.commissions?.[0]?.totalCommissionAmount || 0);
                    return s + (gross - (gross * 0.02));
                  }, 0))}
                </td>
                <td colSpan={4} className="p-2 border border-gray-300"></td>
                <td className="p-2 text-right text-black text-xs border border-gray-300">
                  {fmt(filtered.reduce((s, p) => s + Number(p.commissions?.[0]?.subAgentCommissionAmount || 0), 0))}
                </td>
                <td colSpan={3} className="p-2 border border-gray-300"></td>
                <td className="p-2 text-right text-black text-xs border border-gray-300">
                  {fmt(filtered.reduce((s, p) => {
                    const gross = Number(p.commissions?.[0]?.totalCommissionAmount || 0);
                    const net = gross - (gross * 0.02);
                    const sub = Number(p.commissions?.[0]?.subAgentCommissionAmount || 0);
                    return s + (net - sub);
                  }, 0))}
                </td>
                <td className="p-2 border border-gray-300"></td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
        <strong>Note:</strong> This is a view-only report. TDS calculated at 2%. Entry Date and Client Name columns are frozen for easy scrolling.
      </div>

      {/* Sub-Agent Summary */}
      {subAgents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">👥 Partners Balance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {subAgents.map(s => (
                <div key={s.id} className={`p-2 rounded border ${Number(s.ledgerBalance) > 0 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50'}`}>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className={`font-bold ${Number(s.ledgerBalance) > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                    {fmt(Number(s.ledgerBalance))}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
