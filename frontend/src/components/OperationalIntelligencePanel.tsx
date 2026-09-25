import React, { useEffect, useState } from 'react';
import { AlertTriangle, BrainCircuit, Clock3, Database, ShieldCheck, TrendingUp } from 'lucide-react';
import { API_BASE } from '../integration/api';

type Bundle = any;

export const OperationalIntelligencePanel: React.FC = () => {
  const [data, setData] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [horizon, setHorizon] = useState(24);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`${API_BASE}/intelligence/operational-intelligence?hours=${horizon}`, { signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error(`Backend ${r.status}`); return r.json(); })
      .then(setData)
      .catch(e => { if (e?.name !== 'AbortError') setError('Operational intelligence unavailable.'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [horizon]);

  const audit = data?.decision_audit;
  const perf = data?.performance ?? {};
  const alerts = data?.alerts?.active ?? [];
  return <section className="rounded-xl bg-[#040d1a]/95 border border-cyan-900/60 shadow-lg overflow-hidden">
    <div className="px-4 py-3 border-b border-cyan-950 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center"><BrainCircuit className="w-4 h-4 text-cyan-300"/></div><div><div className="text-sm font-bold text-white">OPERATIONAL INTELLIGENCE</div><div className="text-[10px] font-mono text-slate-500">Decision audit · performance · alerts · timeline · provenance</div></div></div>
      <div className="flex gap-1.5">{[24,48,72].map(h=><button key={h} onClick={()=>setHorizon(h)} className={`px-2.5 py-1 rounded-md text-[9px] font-mono border ${horizon===h?'bg-cyan-500 text-black border-cyan-400':'bg-[#061224] text-slate-400 border-cyan-950 hover:text-cyan-300'}`}>+{h}H</button>)}</div>
    </div>
    {loading ? <div className="p-6 text-xs font-mono text-cyan-300">Loading backend intelligence bundle…</div> : error ? <div className="p-6 text-xs font-mono text-amber-300">{error}</div> : <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Metric icon={<BrainCircuit/>} label="Recommended Strategy" value={audit?.strategy ?? '—'} />
        <Metric icon={<TrendingUp/>} label="Fuel Saved" value={`${Number(audit?.expected_impact?.fuel_saved_liters ?? 0).toFixed(1)} L`} />
        <Metric icon={<ShieldCheck/>} label="Min Battery SOC" value={`${Number(audit?.constraints?.minimum_soc_percent ?? 0).toFixed(1)}%`} />
        <Metric icon={<AlertTriangle/>} label="Risk" value={`${data?.alerts?.risk_level ?? '—'} · ${Number(data?.alerts?.overall_risk_percent ?? 0).toFixed(1)}%`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg bg-[#030914] border border-cyan-950 p-3"><div className="flex items-center gap-2 text-xs font-bold text-white"><BrainCircuit className="w-3.5 h-3.5 text-cyan-300"/> Decision Audit</div><div className="mt-2 space-y-1.5 text-[10px] text-slate-300 font-mono">{(audit?.why_selected ?? []).map((x:string,i:number)=><div key={i} className="p-2 rounded bg-[#061224] border border-cyan-950/70">{x}</div>)}</div><div className="mt-2 text-[8px] text-amber-300">{audit?.optimality_claim ? 'OPTIMALITY CLAIMED' : 'HEURISTIC / ADVISORY · NO GLOBAL OPTIMALITY CLAIM'}</div></div>
        <div className="rounded-lg bg-[#030914] border border-cyan-950 p-3"><div className="flex items-center gap-2 text-xs font-bold text-white"><TrendingUp className="w-3.5 h-3.5 text-emerald-300"/> Performance Snapshot</div><div className="grid grid-cols-2 gap-2 mt-2 text-[10px] font-mono"><Mini label="Avg Load" value={perf.average_load_kw != null ? `${Number(perf.average_load_kw).toFixed(1)} kW` : '—'}/><Mini label="Avg Renewable" value={perf.average_renewable_power_kw != null ? `${Number(perf.average_renewable_power_kw).toFixed(1)} kW` : '—'}/><Mini label="Fuel Consumed" value={perf.fuel_consumed_liters != null ? `${Number(perf.fuel_consumed_liters).toFixed(1)} L` : '—'}/><Mini label="Load Shed Steps" value={perf.load_shed_steps != null ? `${Number(perf.load_shed_steps)}` : '—'}/></div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg bg-[#030914] border border-cyan-950 p-3"><div className="flex items-center gap-2 text-xs font-bold text-white"><AlertTriangle className="w-3.5 h-3.5 text-amber-300"/> Alert & Event Intelligence <span className="ml-auto text-[9px] font-mono text-slate-500">{alerts.length} EVENTS</span></div><div className="mt-2 space-y-1.5 max-h-32 overflow-auto">{alerts.length ? alerts.slice(0,8).map((a:any,i:number)=><div key={i} className="flex items-start gap-2 p-2 rounded bg-[#061224] border border-cyan-950/70 text-[9px] font-mono"><span className={a.severity==='critical'?'text-red-300':a.severity==='warning'?'text-amber-300':'text-cyan-300'}>{String(a.severity ?? 'info').toUpperCase()}</span><span className="text-slate-300">{a.message ?? a.type ?? 'Operational event'}</span></div>) : <div className="text-[10px] text-emerald-300 font-mono">No active/projected alerts in this bundle.</div>}</div></div>
        <div className="rounded-lg bg-[#030914] border border-cyan-950 p-3"><div className="flex items-center gap-2 text-xs font-bold text-white"><Database className="w-3.5 h-3.5 text-cyan-300"/> Data Quality & Provenance</div><div className="mt-2 grid grid-cols-2 gap-1.5">{(data?.provenance ?? []).map((p:any,i:number)=><div key={i} className="p-2 rounded bg-[#061224] border border-cyan-950/70"><div className="text-[9px] text-slate-300">{p.domain}</div><div className="text-[8px] text-cyan-300 font-mono">{p.status}</div><div className="text-[8px] text-slate-500 mt-0.5">{p.source}</div></div>)}</div></div>
      </div>
      <div className="rounded-lg bg-[#030914] border border-cyan-950 p-3"><div className="flex items-center gap-2 text-xs font-bold text-white"><Clock3 className="w-3.5 h-3.5 text-cyan-300"/> Operational Timeline</div><div className="mt-2 flex gap-1.5 overflow-x-auto">{(data?.timeline ?? []).filter((_:any,i:number)=>i%3===0).slice(0,8).map((e:any,i:number)=><div key={i} className="min-w-[130px] p-2 rounded bg-[#061224] border border-cyan-950/70"><div className="text-[8px] text-cyan-300 font-mono">+{e.hour_offset}H</div><div className="text-[9px] text-white mt-1">Diesel {Number(e.diesel_kw??0).toFixed(0)} kW</div><div className="text-[8px] text-slate-500">SOC {Number(e.battery_soc_percent??0).toFixed(1)}%</div></div>)}</div></div>
      <div className="text-[8px] font-mono text-slate-600">BACKEND AGGREGATED ADVISORY · READ ONLY · STATION STATE MUTATED: NO</div>
    </div>}
  </section>;
};
const Metric=({icon,label,value}:{icon:React.ReactNode;label:string;value:string})=><div className="p-3 rounded-lg bg-[#030914] border border-cyan-950"><div className="flex items-center justify-between text-[9px] text-slate-500">{label}<span className="text-cyan-400">{icon}</span></div><div className="mt-1 text-sm font-bold text-white break-words">{value}</div></div>;
const Mini=({label,value}:{label:string;value:string})=><div className="p-2 rounded bg-[#061224] border border-cyan-950/70"><div className="text-[8px] text-slate-500">{label}</div><div className="text-xs font-bold text-white mt-0.5">{value}</div></div>;
