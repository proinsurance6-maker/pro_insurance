'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { policyAPI, commissionAPI, agentAPI } from '@/lib/api';

interface Policy {
  id: string;
  policyNumber: string;
  policyType: string;
  premiumAmount: string;
  createdAt: string;
  client: { name: string; };
  company: { name: string; };
  subAgent?: { id: string; name: string; };
  commissions?: Array<{
    id: string;
    totalCommissionAmount: string;
    subAgentCommissionAmount?: string;
    receivedFromCompany: boolean;
    paidToSubAgent?: boolean;
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
        !p.client.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'pending' && p.commissions?.[0]?.receivedFromCompany) return false;
    if (filter === 'done' && !p.commissions?.[0]?.receivedFromCompany) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="p-4 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">💰 Commission Tracker</h1>
        <p className="text-gray-500 text-sm">Click ⏳ to mark as ✅</p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-blue-50">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-blue-600">{fmt(total)}</p>
            <p className="text-xs text-gray-600">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-green-600">{fmt(received)}</p>
            <p className="text-xs text-gray-600">✅ Received</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-orange-600">{fmt(pending)}</p>
            <p className="text-xs text-gray-600">⏳ Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-purple-600">{fmt(subDue)}</p>
            <p className="text-xs text-gray-600">👥 Sub-Agent को</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-2">
        <Input 
          placeholder="🔍 Search..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="w-48"
        />
        <Button variant={filter==='all'?'default':'outline'} size="sm" onClick={()=>setFilter('all')}>All</Button>
        <Button variant={filter==='pending'?'default':'outline'} size="sm" onClick={()=>setFilter('pending')} className={filter==='pending'?'bg-orange-500':''}>⏳ Pending</Button>
        <Button variant={filter==='done'?'default':'outline'} size="sm" onClick={()=>setFilter('done')} className={filter==='done'?'bg-green-500':''}>✅ Done</Button>
      </div>

      {/* Simple Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left font-semibold">Policy / Client</th>
                <th className="p-3 text-left font-semibold">Sub-Agent</th>
                <th className="p-3 text-right font-semibold">Commission</th>
                <th className="p-3 text-center font-semibold">Company से<br/>मिला?</th>
                <th className="p-3 text-center font-semibold">Sub-Agent को<br/>दिया?</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No data</td></tr>
              ) : filtered.map(p => {
                const c = p.commissions?.[0];
                const got = c?.receivedFromCompany;
                const paid = c?.paidToSubAgent;
                const hasSub = !!p.subAgent;
                const busy = updating === c?.id;

                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    {/* Policy + Client */}
                    <td className="p-3">
                      <p className="font-medium text-blue-600">{p.policyNumber}</p>
                      <p className="text-xs text-gray-500">{p.client.name} • {p.company.name}</p>
                    </td>

                    {/* Sub-Agent */}
                    <td className="p-3">
                      {hasSub ? (
                        <span className="text-purple-600 font-medium">{p.subAgent?.name}</span>
                      ) : <span className="text-gray-300">Direct</span>}
                    </td>

                    {/* Commission Amount */}
                    <td className="p-3 text-right">
                      <p className="font-bold">{fmt(Number(c?.totalCommissionAmount || 0))}</p>
                      {hasSub && <p className="text-xs text-purple-500">Sub: {fmt(Number(c?.subAgentCommissionAmount || 0))}</p>}
                    </td>

                    {/* Company se mila? */}
                    <td className="p-3 text-center">
                      {busy ? (
                        <span className="animate-pulse">⏳</span>
                      ) : got ? (
                        <span className="text-2xl">✅</span>
                      ) : (
                        <button 
                          onClick={() => c && clickReceived(c.id)}
                          className="text-2xl hover:scale-125 transition"
                          title="Click to mark received"
                        >⏳</button>
                      )}
                    </td>

                    {/* Sub-agent ko diya? */}
                    <td className="p-3 text-center">
                      {!hasSub ? (
                        <span className="text-gray-200">—</span>
                      ) : busy ? (
                        <span className="animate-pulse">⏳</span>
                      ) : paid ? (
                        <span className="text-2xl">✅</span>
                      ) : (
                        <button 
                          onClick={() => c && clickPaidSub(c.id)}
                          className="text-2xl hover:scale-125 transition"
                          title="Click to mark paid"
                        >❌</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
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
            <CardTitle className="text-base">👥 Sub-Agents Balance</CardTitle>
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
