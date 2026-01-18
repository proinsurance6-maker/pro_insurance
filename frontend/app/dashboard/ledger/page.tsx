'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { policyAPI, commissionAPI, agentAPI } from '@/lib/api';
import Link from 'next/link';

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
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

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

  // Click handler - Mark received from company
  const clickReceived = async (id: string) => {
    setUpdating(id);
    try {
      await commissionAPI.markPaid(id);
      await fetchData();
    } catch { alert('Error!'); }
    setUpdating(null);
  };

  // Click handler - Mark paid to sub-agent
  const clickPaidSub = async (id: string) => {
    setUpdating(id);
    try {
      await commissionAPI.markPaidToSubAgent(id);
      await fetchData();
    } catch { alert('Error!'); }
    setUpdating(null);
  };

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
    if (filter === 'pending' && p.commissions?.[0]?.receivedFromCompany) return false;
    if (filter === 'done' && !p.commissions?.[0]?.receivedFromCompany) return false;
    return true;
  });

  // Get premium paid by label
  const getPaidByLabel = (paidBy?: string) => {
    switch(paidBy) {
      case 'AGENT': return '🧑‍💼 Agent';
      case 'SUB_AGENT': return '👥 Sub-Agent';
      case 'CLIENT': return '👤 Client';
      default: return '-';
    }
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="p-4 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">📒 Commission Ledger</h1>
        <p className="text-gray-500 text-sm">Complete Hisab-Kitab - Click ⏳ to mark as ✅</p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-blue-50">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-blue-600">{fmt(total)}</p>
            <p className="text-xs text-gray-600">Total Commission</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-green-600">{fmt(received)}</p>
            <p className="text-xs text-gray-600">✅ Broker/Company से मिला</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-orange-600">{fmt(pending)}</p>
            <p className="text-xs text-gray-600">⏳ Pending from Broker</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-purple-600">{fmt(subDue)}</p>
            <p className="text-xs text-gray-600">👥 Sub-Agent को देना है</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-2">
        <Input 
          placeholder="🔍 Search Policy/Client/Vehicle..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="w-64"
        />
        <Button variant={filter==='all'?'default':'outline'} size="sm" onClick={()=>setFilter('all')}>All</Button>
        <Button variant={filter==='pending'?'default':'outline'} size="sm" onClick={()=>setFilter('pending')} className={filter==='pending'?'bg-orange-500':''}>⏳ Pending</Button>
        <Button variant={filter==='done'?'default':'outline'} size="sm" onClick={()=>setFilter('done')} className={filter==='done'?'bg-green-500':''}>✅ Done</Button>
      </div>

      {/* Detailed Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Section Headers */}
              <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <th colSpan={3} className="p-3 text-center border-r-2 border-blue-400 font-bold text-base">👤 CLIENT DETAILS</th>
                <th colSpan={5} className="p-3 text-center border-r-2 border-blue-400 font-bold text-base">🚗 VEHICLE & PREMIUM</th>
                <th colSpan={3} className="p-3 text-center border-r-2 border-blue-400 font-bold text-base">🏢 BROKER COMMISSION</th>
                <th colSpan={4} className="p-3 text-center border-r-2 border-blue-400 font-bold text-base">👥 SUB-AGENT SECTION</th>
                <th colSpan={4} className="p-3 text-center font-bold text-base">📊 HISAB SECTION</th>
              </tr>
              {/* Column Headers */}
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-b-2 border-blue-200">
                {/* Client Details */}
                <th className="p-3 text-left font-semibold border-r border-gray-200 whitespace-nowrap">Client Name</th>
                <th className="p-3 text-left font-semibold border-r border-gray-200 whitespace-nowrap">Phone</th>
                <th className="p-3 text-left font-semibold border-r-2 border-blue-200 whitespace-nowrap">Policy No.</th>
                
                {/* Vehicle & Premium */}
                <th className="p-3 text-left font-semibold border-r border-gray-200 whitespace-nowrap">Vehicle No.</th>
                <th className="p-3 text-right font-semibold border-r border-gray-200 whitespace-nowrap">OD Premium</th>
                <th className="p-3 text-right font-semibold border-r border-gray-200 whitespace-nowrap">TP Premium</th>
                <th className="p-3 text-right font-semibold border-r border-gray-200 whitespace-nowrap">Net Premium</th>
                <th className="p-3 text-right font-semibold border-r-2 border-blue-200 whitespace-nowrap">Gross Premium</th>
                
                {/* Broker Commission */}
                <th className="p-3 text-center font-semibold border-r border-gray-200 whitespace-nowrap">Rate %</th>
                <th className="p-3 text-right font-semibold border-r border-gray-200 whitespace-nowrap">Amount</th>
                <th className="p-3 text-center font-semibold border-r-2 border-blue-200 whitespace-nowrap">Received?</th>
                
                {/* Sub-Agent Section */}
                <th className="p-3 text-left font-semibold border-r border-gray-200 whitespace-nowrap">Sub-Agent</th>
                <th className="p-3 text-center font-semibold border-r border-gray-200 whitespace-nowrap">Rate %</th>
                <th className="p-3 text-right font-semibold border-r border-gray-200 whitespace-nowrap">Amount</th>
                <th className="p-3 text-center font-semibold border-r-2 border-blue-200 whitespace-nowrap">Paid?</th>
                
                {/* Hisab Section */}
                <th className="p-3 text-center font-semibold border-r border-gray-200 whitespace-nowrap">Paid By</th>
                <th className="p-3 text-right font-semibold border-r border-gray-200 whitespace-nowrap">Gross Comm.</th>
                <th className="p-3 text-right font-semibold border-r border-gray-200 whitespace-nowrap">Sub-Agent को</th>
                <th className="p-3 text-right font-semibold whitespace-nowrap">Net Agent Payout</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={19} className="p-8 text-center text-gray-400">No data found</td></tr>
              ) : filtered.map((p, idx) => {
                const c = p.commissions?.[0];
                const got = c?.receivedFromCompany;
                const paid = c?.paidToSubAgent;
                const hasSub = !!p.subAgent;
                const busy = updating === c?.id;
                
                const grossCommission = Number(c?.totalCommissionAmount || 0);
                const subAgentAmount = Number(c?.subAgentCommissionAmount || 0);
                const netAgentPayout = grossCommission - subAgentAmount;

                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    {/* CLIENT DETAILS */}
                    <td className="p-2 border-r">
                      <Link href={`/dashboard/clients/${p.client.id}`} className="text-blue-600 hover:underline font-medium">
                        {p.client.name}
                      </Link>
                    </td>
                    <td className="p-2 border-r text-gray-600">{p.client.phone}</td>
                    <td className="p-2 border-r border-gray-300">
                      <span className="font-medium text-blue-700">{p.policyNumber}</span>
                      <br/>
                      <span className="text-gray-400 text-[10px]">{p.company.name}</span>
                    </td>
                    
                    {/* VEHICLE & PREMIUM */}
                    <td className="p-2 border-r font-medium">{p.vehicleNumber || '-'}</td>
                    <td className="p-2 border-r text-right">{p.odPremium ? fmt(Number(p.odPremium)) : '-'}</td>
                    <td className="p-2 border-r text-right">{p.tpPremium ? fmt(Number(p.tpPremium)) : '-'}</td>
                    <td className="p-2 border-r text-right">{p.netPremium ? fmt(Number(p.netPremium)) : '-'}</td>
                    <td className="p-2 border-r border-gray-300 text-right font-semibold">{fmt(Number(p.premiumAmount))}</td>
                    
                    {/* BROKER COMMISSION */}
                    <td className="p-2 border-r text-center">
                      <span className="bg-blue-100 text-blue-700 px-1 rounded text-[10px] font-bold">
                        {c?.totalCommissionPercent || '0'}%
                      </span>
                    </td>
                    <td className="p-2 border-r text-right font-bold text-green-700">
                      {fmt(grossCommission)}
                    </td>
                    <td className="p-2 border-r border-gray-300 text-center">
                      {busy ? (
                        <span className="animate-pulse">⏳</span>
                      ) : got ? (
                        <span className="text-lg" title={c?.receivedDate ? `Received: ${new Date(c.receivedDate).toLocaleDateString('en-IN')}` : ''}>✅</span>
                      ) : (
                        <button 
                          onClick={() => c && clickReceived(c.id)}
                          className="text-lg hover:scale-125 transition"
                          title="Click to mark received"
                        >⏳</button>
                      )}
                    </td>
                    
                    {/* SUB-AGENT SECTION */}
                    <td className="p-2 border-r">
                      {hasSub ? (
                        <span className="text-purple-600 font-medium">{p.subAgent?.name}</span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="p-2 border-r text-center">
                      {hasSub ? (
                        <span className="bg-purple-100 text-purple-700 px-1 rounded text-[10px] font-bold">
                          {c?.subAgentSharePercent || p.subAgent?.commissionPercentage || '0'}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-2 border-r text-right">
                      {hasSub ? (
                        <span className="text-purple-600 font-bold">{fmt(subAgentAmount)}</span>
                      ) : '-'}
                    </td>
                    <td className="p-2 border-r border-gray-300 text-center">
                      {!hasSub ? (
                        <span className="text-gray-200">—</span>
                      ) : busy ? (
                        <span className="animate-pulse">⏳</span>
                      ) : paid ? (
                        <span className="text-lg" title={c?.paidToSubAgentDate ? `Paid: ${new Date(c.paidToSubAgentDate).toLocaleDateString('en-IN')}` : ''}>✅</span>
                      ) : (
                        <button 
                          onClick={() => c && clickPaidSub(c.id)}
                          className="text-lg hover:scale-125 transition"
                          title="Click to mark paid"
                        >❌</button>
                      )}
                    </td>
                    
                    {/* HISAB SECTION */}
                    <td className="p-2 border-r text-center">
                      <span className={`text-[10px] px-1 py-0.5 rounded ${
                        p.premiumPaidBy === 'AGENT' ? 'bg-yellow-100 text-yellow-700' :
                        p.premiumPaidBy === 'SUB_AGENT' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getPaidByLabel(p.premiumPaidBy)}
                      </span>
                    </td>
                    <td className="p-2 border-r text-right font-semibold text-green-600">
                      {fmt(grossCommission)}
                    </td>
                    <td className="p-2 border-r text-right text-purple-600">
                      {hasSub ? fmt(subAgentAmount) : '-'}
                    </td>
                    <td className="p-2 text-right">
                      <span className={`font-bold ${netAgentPayout >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {fmt(netAgentPayout)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Row */}
            <tfoot>
              <tr className="bg-gray-200 font-bold">
                <td colSpan={7} className="p-2 text-right border-r">TOTAL:</td>
                <td className="p-2 text-right border-r border-gray-300">
                  {fmt(filtered.reduce((s, p) => s + Number(p.premiumAmount || 0), 0))}
                </td>
                <td className="p-2 border-r"></td>
                <td className="p-2 text-right border-r text-green-700">
                  {fmt(filtered.reduce((s, p) => s + Number(p.commissions?.[0]?.totalCommissionAmount || 0), 0))}
                </td>
                <td className="p-2 border-r border-gray-300"></td>
                <td colSpan={2} className="p-2 border-r"></td>
                <td className="p-2 text-right border-r text-purple-600">
                  {fmt(filtered.reduce((s, p) => s + Number(p.commissions?.[0]?.subAgentCommissionAmount || 0), 0))}
                </td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r"></td>
                <td className="p-2 text-right border-r text-green-600">
                  {fmt(filtered.reduce((s, p) => s + Number(p.commissions?.[0]?.totalCommissionAmount || 0), 0))}
                </td>
                <td className="p-2 text-right border-r text-purple-600">
                  {fmt(filtered.reduce((s, p) => s + Number(p.commissions?.[0]?.subAgentCommissionAmount || 0), 0))}
                </td>
                <td className="p-2 text-right text-green-700">
                  {fmt(filtered.reduce((s, p) => {
                    const gross = Number(p.commissions?.[0]?.totalCommissionAmount || 0);
                    const sub = Number(p.commissions?.[0]?.subAgentCommissionAmount || 0);
                    return s + (gross - sub);
                  }, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm bg-gray-50 p-3 rounded-lg">
        <span><span className="text-xl">⏳</span> = Pending (click to ✅)</span>
        <span><span className="text-xl">✅</span> = Done</span>
        <span><span className="text-xl">❌</span> = Not paid yet (click to ✅)</span>
      </div>

      {/* Sub-Agent Summary */}
      {subAgents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">👥 Sub-Agents Balance Summary</CardTitle>
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
