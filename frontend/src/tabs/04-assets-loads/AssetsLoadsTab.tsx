import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Zap,
  Wind,
  Sun,
  Battery,
  Fuel,
  Flame,
  Building2,
  Activity,
  Wrench,
  Droplets,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { DigitalTwinStation } from '../../components/DigitalTwinStation';
import { AssetRecord, StationNode } from '../../types';
import { useStation } from '../../integration/StationContext';
import { applyLoadAction } from '../../integration/api';
import mainBuildingPhoto from '../../assets/images/maitri_main_building_1789652436746.jpg';

interface AssetsLoadsTabProps {
  onOpenAssetDetail: (asset: AssetRecord) => void;
  onOpenNodeDetail: (node: StationNode) => void;
}

export const AssetsLoadsTab: React.FC<AssetsLoadsTabProps> = ({
  onOpenAssetDetail,
  onOpenNodeDetail,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'Assets' | 'Asset Health' | 'Loads'>('Assets');
  const { snapshot, refreshSnapshot, timeOffset, setSelectedAssetId } = useStation();
  const EMPTY_ASSET: AssetRecord = { id: '—', name: 'No asset selected', type: 'Diesel Generator', status: 'Maintenance', capacity: '—', currentOutput: '—', efficiency: '—', health: '—', nextMaintenance: '—' };
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord>(EMPTY_ASSET);
  const [loadActionMsg, setLoadActionMsg] = useState('');
  const [loadActionBusy, setLoadActionBusy] = useState(false);
  useEffect(() => { const id=localStorage.getItem('polar_ems_focus_asset'); if(!id) return; const match=dynamicAssets.find(a=>a.id.toUpperCase()===id.toUpperCase() || a.id.replace('-','').toUpperCase()===id.replace('-','').toUpperCase()); if(match) setSelectedAsset(match); localStorage.removeItem('polar_ems_focus_asset'); }, [snapshot.generators, snapshot.renewables]);
  const dynamicAssets: AssetRecord[] = [...snapshot.generators, ...snapshot.renewables].map((a) => ({
    id: a.id.replace('-', ''), name: a.name, type: a.type,
    status: a.status === 'ONLINE' ? 'Online' : a.status === 'STANDBY' ? 'Standby' : a.status === 'OFFLINE' ? 'Offline' : 'Maintenance',
    capacity: `${a.capacityKw.toFixed(0)} kW`, currentOutput: `${a.currentOutputKw.toFixed(0)} kW`,
    efficiency: 'healthPercent' in a ? `${(a.electricalEfficiency * 100).toFixed(0)}%` : 'Modelled',
    health: 'healthPercent' in a ? `${a.healthPercent.toFixed(0)}%` : 'Unknown',
    nextMaintenance: 'nextMaintenanceHours' in a && a.nextMaintenanceHours > 0 ? `${a.nextMaintenanceHours.toFixed(0)} hrs` : 'Not provided',
    fuelRate: 'fuelConsumptionLhr' in a ? `${a.fuelConsumptionLhr.toFixed(1)} L/hr` : undefined,
    runtime: 'runtimeHours' in a ? `${a.runtimeHours.toFixed(0)} hrs` : undefined,
  }));
  const onlineDiesel = snapshot.generators.filter(a => a.status === 'ONLINE').length;
  const standbyDiesel = snapshot.generators.filter(a => a.status === 'STANDBY').length;

  // Keep the Assets & Loads detail card synchronized with the asset selected
  // inside this tab's Digital Twin. The twin uses station-node IDs while the
  // authoritative snapshot uses generator/renewable IDs, so resolve that
  // mapping explicitly instead of leaving the previous asset selected.
  const assetForNode = (nodeId: string): AssetRecord | null => {
    const generator = nodeId === 'diesel-generators' ? snapshot.generators[0] : undefined;
    const renewable = nodeId === 'wind-turbines'
      ? snapshot.renewables.find(a => a.type === 'Wind Turbine')
      : nodeId === 'solar-array'
        ? snapshot.renewables.find(a => a.type === 'Solar Array')
        : undefined;
    const source = generator || renewable;
    if (source) {
      return {
        id: source.id.replace('-', ''),
        name: source.name,
        type: source.type,
        status: source.status === 'ONLINE' ? 'Online' : source.status === 'STANDBY' ? 'Standby' : source.status === 'OFFLINE' ? 'Offline' : 'Maintenance',
        capacity: `${source.capacityKw.toFixed(0)} kW`,
        currentOutput: `${source.currentOutputKw.toFixed(0)} kW`,
        efficiency: 'healthPercent' in source ? `${(source.electricalEfficiency * 100).toFixed(0)}%` : 'Modelled',
        health: 'healthPercent' in source ? `${source.healthPercent.toFixed(0)}%` : 'Unknown',
        nextMaintenance: 'nextMaintenanceHours' in source && source.nextMaintenanceHours > 0 ? `${source.nextMaintenanceHours.toFixed(0)} hrs` : 'Not provided',
        fuelRate: 'fuelConsumptionLhr' in source ? `${source.fuelConsumptionLhr.toFixed(1)} L/hr` : undefined,
        runtime: 'runtimeHours' in source ? `${source.runtimeHours.toFixed(0)} hrs` : undefined,
      };
    }
    return null;
  };

  const handleTwinAssetSelect = (nodeId: string) => {
    const asset = assetForNode(nodeId);
    if (asset) {
      setSelectedAsset(asset);
      setSelectedAssetId(asset.id);
    }
  };
  const wind = snapshot.renewables.find(a => a.type === 'Wind Turbine');
  const solar = snapshot.renewables.find(a => a.type === 'Solar Array');
  const selectedDynamic = dynamicAssets.find(a => a.id.toUpperCase() === selectedAsset.id.toUpperCase());
  const activeSelected = selectedDynamic ?? (selectedAsset.id === '—' ? (dynamicAssets[0] ?? EMPTY_ASSET) : selectedAsset);
  const healthAssets = [
    ...snapshot.generators.map((a) => ({
      id: a.id, name: a.name, type: a.type, status: a.status,
      health: a.healthPercent, healthAvailable: true,
      efficiency: a.electricalEfficiency * 100,
      runtime: a.runtimeHours, maintenance: a.nextMaintenanceHours > 0 ? a.nextMaintenanceHours : undefined,
      thermal: a.status === 'ONLINE' ? 'Operating' : 'Standby / offline',
      predictive: a.nextMaintenanceHours > 0 ? 'Maintenance horizon available' : 'Maintenance horizon not provided',
      implication: a.nextMaintenanceHours > 0 ? 'Use the maintenance horizon when planning an operator-approved maintenance window.' : 'No maintenance interval is exposed by the current backend model.'
    })),
    {
      id: 'BATTERY', name: 'Battery System', type: 'Battery', status: snapshot.battery.status,
      health: snapshot.battery.healthPercent, healthAvailable: true,
      efficiency: undefined, runtime: undefined, maintenance: undefined,
      thermal: `${snapshot.battery.temperatureC.toFixed(1)} °C`,
      predictive: 'Battery health available; predictive issue model not exposed',
      implication: 'Use state of health, temperature and SOC together when assessing operating margin.'
    },
    ...snapshot.renewables.map((a) => ({
      id: a.id, name: a.name, type: a.type, status: a.status,
      health: undefined, healthAvailable: false, efficiency: a.efficiencyPercent,
      runtime: undefined, maintenance: undefined, thermal: 'Not provided',
      predictive: 'Predictive maintenance data not exposed',
      implication: 'No health or maintenance prediction is exposed by the current backend contract; operational status is shown without inventing a health score.'
    }))
  ];

  return (
    <div className="space-y-4 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-sans tracking-wide">
            Assets & Loads {timeOffset > 0 && <span className="text-xs font-mono text-cyan-400 align-middle">(+{timeOffset}h Forecast)</span>}
          </h1>
          <p className="text-xs text-cyan-400 font-mono mt-0.5">
            All equipment and loads that make up the station
          </p>
        </div>
      </div>

      {/* Top Split: Station Map (8 cols) + Focused Asset Details Card (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <DigitalTwinStation
            mode="assets"
            showInspector={false}
            showTimeline={false}
            timelineHour={timeOffset}
            onOpenAnalyticsModal={onOpenNodeDetail}
            onSelectNode={handleTwinAssetSelect}
          />
        </div>

        {/* Selected Asset Details Card */}
        <div className="lg:col-span-4 p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-xl space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white font-sans">Asset Details</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-500/50 text-emerald-300">
                {activeSelected.status}
              </span>
            </div>

            <div className="mt-2 text-base font-bold text-cyan-300 font-sans">
              {activeSelected.name}
            </div>

            {/* Real Station Equipment Photograph */}
            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-cyan-950 my-2.5">
              <img
                src={mainBuildingPhoto}
                alt={activeSelected.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-cyan-300">
                Maitri Station Module
              </div>
            </div>

            {/* Spec Table */}
            <div className="space-y-1.5 font-mono text-xs divide-y divide-cyan-950/60">
              <div className="flex justify-between pt-1">
                <span className="text-slate-400 font-sans">Capacity</span>
                <span className="font-bold text-white">{activeSelected.capacity}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-slate-400 font-sans">Current Output</span>
                <span className="font-bold text-cyan-300">{activeSelected.currentOutput}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-slate-400 font-sans">Fuel Consumption</span>
                <span className="text-orange-400">{activeSelected.fuelRate || (selectedAsset.type.includes('Diesel') ? `${snapshot.fuel.currentConsumptionRateLhr.toFixed(1)} L/hr` : '—')}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-slate-400 font-sans">Runtime</span>
                <span className="text-slate-300">{activeSelected.runtime || '—'}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-slate-400 font-sans">Efficiency</span>
                <span className="text-white">{activeSelected.efficiency}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-slate-400 font-sans">Next Maintenance</span>
                <span className="text-slate-300">{activeSelected.nextMaintenance}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-slate-400 font-sans">Health Status</span>
                <span className="text-emerald-400 font-bold">{activeSelected.health}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-slate-400 font-sans">Data Status</span>
                <span className="text-amber-300 font-bold">{snapshot.provenance.powerTelemetrySource}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenAssetDetail(activeSelected)}
            className="w-full py-2 rounded-lg bg-cyan-900/70 hover:bg-cyan-800 border border-cyan-500/50 text-cyan-200 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer font-sans"
          >
            <span>View Full Details</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle Filter Tabs: Assets | Loads */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => setActiveSubTab('Assets')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
            activeSubTab === 'Assets'
              ? 'bg-cyan-600 text-black shadow-md'
              : 'bg-[#040d1a] text-slate-400 hover:text-white border border-cyan-950'
          }`}
        >
          Assets
        </button>
        <button
          onClick={() => setActiveSubTab('Asset Health')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
            activeSubTab === 'Asset Health'
              ? 'bg-cyan-600 text-black shadow-md'
              : 'bg-[#040d1a] text-slate-400 hover:text-white border border-cyan-950'
          }`}
        >
          Asset Health
        </button>
        <button
          onClick={() => setActiveSubTab('Loads')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-sans ${
            activeSubTab === 'Loads'
              ? 'bg-cyan-600 text-black shadow-md'
              : 'bg-[#040d1a] text-slate-400 hover:text-white border border-cyan-950'
          }`}
        >
          Loads
        </button>
      </div>

      {activeSubTab === 'Asset Health' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-500/40 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-300" /><span className="font-bold text-sm text-white">Predictive Asset Health</span></div>
                <p className="text-[10px] text-slate-400 mt-1">Backend-provided condition and maintenance information. No frontend-generated health scores.</p>
              </div>
              <span className="px-2 py-1 rounded border border-amber-500/30 bg-amber-950/20 text-[10px] font-mono text-amber-300">Source: {snapshot.provenance.powerTelemetrySource}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {healthAssets.map((asset) => {
              const health = asset.health;
              const healthLabel = health == null ? 'Unavailable' : `${health.toFixed(0)}%`;
              const healthClass = health == null ? 'text-slate-400' : health >= 80 ? 'text-emerald-300' : health >= 60 ? 'text-amber-300' : 'text-red-300';
              return (
                <div key={asset.id} className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="text-sm font-bold text-white">{asset.name}</div><div className="text-[10px] text-slate-500 font-mono mt-0.5">{asset.id} · {asset.type}</div></div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-cyan-800 text-cyan-300">{asset.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-black/20 border border-cyan-950"><div className="text-[9px] text-slate-500">HEALTH</div><div className={`text-lg font-bold ${healthClass}`}>{healthLabel}</div></div>
                    <div className="p-2 rounded bg-black/20 border border-cyan-950"><div className="text-[9px] text-slate-500">THERMAL / CONDITION</div><div className="text-xs font-semibold text-white mt-1">{asset.thermal}</div></div>
                  </div>
                  <div className="space-y-1.5 text-[10px] font-mono">
                    <div className="flex justify-between gap-2"><span className="text-slate-500">Efficiency</span><span className="text-slate-200">{asset.efficiency == null ? '—' : `${asset.efficiency.toFixed(0)}%`}</span></div>
                    <div className="flex justify-between gap-2"><span className="text-slate-500">Operating Hours</span><span className="text-slate-200">{asset.runtime == null ? '—' : `${asset.runtime.toFixed(0)} h`}</span></div>
                    <div className="flex justify-between gap-2"><span className="text-slate-500">Maintenance Horizon</span><span className="text-slate-200">{asset.maintenance == null ? 'Not provided' : `${asset.maintenance.toFixed(0)} h`}</span></div>
                  </div>
                  <div className="pt-2 border-t border-cyan-950">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-cyan-300"><Wrench className="w-3.5 h-3.5" /> {asset.predictive}</div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{asset.implication}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubTab === 'Loads' && (
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-500/40 shadow-lg space-y-3">
          <div className="flex items-center justify-between"><div><span className="font-bold text-sm text-white">Load Management Workspace</span><p className="text-[10px] text-slate-400">Operator actions are sent to the backend load-action controller; critical P0 loads remain protected.</p></div>{loadActionMsg && <span className="text-[10px] font-mono text-emerald-400">{loadActionMsg}</span>}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {snapshot.loads.map(load => <div key={load.id} className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950"><div className="flex justify-between gap-2"><span className="text-xs font-semibold text-white truncate">{load.name}</span><span className="text-[10px] text-cyan-300">{load.priority}</span></div><div className="flex justify-between text-[10px] font-mono mt-1"><span>{load.currentLoadKw.toFixed(1)} kW</span><span className={load.shedStatus === 'SHED' ? 'text-red-300' : 'text-emerald-300'}>{load.shedStatus}</span></div>{load.isFlexible && <button disabled={loadActionBusy} onClick={async () => { setLoadActionBusy(true); try { const r=await applyLoadAction({ shiftFlexibleKw: load.currentLoadKw }); setLoadActionMsg(`${r.action} confirmed · ${Number(r.shifted_kw ?? r.shiftedKw ?? 0).toFixed(1)} kW · ${r.data_status ?? 'backend'}`); await refreshSnapshot(); } catch(e) { setLoadActionMsg(e instanceof Error ? e.message : 'Action failed'); } finally { setLoadActionBusy(false); } }} className="mt-2 w-full py-1 rounded bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-[10px] font-semibold disabled:opacity-50">Shift Flexible Load</button>}</div>)}
          </div>
        </div>
      )}

      {/* Asset Summary Quick Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-orange-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 font-sans block">Diesel Generators</span>
            <span className="font-bold text-white text-sm">{snapshot.generators.length} units</span>
            <span className="text-[9px] text-amber-300 block">{onlineDiesel} Online | {standbyDiesel} Standby</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow flex items-center gap-2.5">
          <Wind className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 font-sans block">Wind Turbines</span>
            <span className="font-bold text-white text-sm">{wind ? 3 : 0} units</span>
            <span className="text-[9px] text-emerald-400 block">{wind?.currentOutputKw.toFixed(0) ?? 0} kW total</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow flex items-center gap-2.5">
          <Sun className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 font-sans block">Solar Panels</span>
            <span className="font-bold text-white text-sm">{solar ? 1 : 0} array</span>
            <span className="text-[9px] text-yellow-300 block">{solar?.currentOutputKw.toFixed(0) ?? 0} kW</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow flex items-center gap-2.5">
          <Battery className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 font-sans block">Battery System</span>
            <span className="font-bold text-white text-sm">{snapshot.battery.capacityKwh.toFixed(0)} kWh</span>
            <span className="text-[9px] text-cyan-300 block">SoC {snapshot.battery.socPercent.toFixed(0)}%</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow flex items-center gap-2.5">
          <Fuel className="w-5 h-5 text-slate-300 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 font-sans block">Fuel Tanks</span>
            <span className="font-bold text-white text-sm">{snapshot.fuel.capacityLiters.toFixed(0)} L</span>
            <span className="text-[9px] text-slate-400 block">{snapshot.fuel.currentVolumeLiters.toFixed(0)} L ({snapshot.fuel.fillPercent.toFixed(0)}%)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow flex items-center gap-2.5">
          <Flame className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 font-sans block">Heat Recovery</span>
            <span className="font-bold text-white text-sm">{snapshot.thermal.heatRecoveryEnabled ? 1 : 0} unit</span>
            <span className="text-[9px] text-red-400 block">{snapshot.thermal.recoveredHeatKw.toFixed(0)} kW</span>
          </div>
        </div>
      </div>

      {activeSubTab === 'Assets' && (
      <>
      {/* Bottom Split: All Assets Table & Load Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Table of Assets (8 cols) */}
        <div id="all-assets-table" className="lg:col-span-8 p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-white font-sans">All Assets</span>
            <button onClick={() => { setActiveSubTab('Assets'); document.getElementById('all-assets-table')?.scrollIntoView({behavior:'smooth',block:'start'}); }} className="text-xs text-cyan-400 hover:underline cursor-pointer">View All Assets →</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="text-[11px] text-slate-400 border-b border-cyan-950 font-sans">
                <tr>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Rated Capacity</th>
                  <th className="pb-2">Current Output</th>
                  <th className="pb-2">Efficiency</th>
                  <th className="pb-2">Health</th>
                  <th className="pb-2">Next Maint.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-950/60 text-[11px]">
                {dynamicAssets.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedAsset(item)}
                    className={`hover:bg-cyan-950/40 transition-colors cursor-pointer ${
                      selectedAsset.id === item.id ? 'bg-cyan-950/60 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2 text-cyan-300 font-bold">{item.id}</td>
                    <td className="py-2 text-slate-300 font-sans">{item.type}</td>
                    <td className="py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          item.status === 'Online'
                            ? 'bg-emerald-950 text-emerald-300'
                            : item.status === 'Standby'
                            ? 'bg-blue-950 text-blue-300'
                            : 'bg-amber-950 text-amber-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-300">{item.capacity}</td>
                    <td className="py-2 text-white font-bold">{item.currentOutput}</td>
                    <td className="py-2 text-slate-400">{item.efficiency}</td>
                    <td className="py-2 text-emerald-400">{item.health}</td>
                    <td className="py-2 text-slate-400">{item.nextMaintenance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Load Summary (4 cols) */}
        <div className="lg:col-span-4 p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
          <span className="font-bold text-sm text-white font-sans block">Load Summary</span>

          {/* Donut & Stats */}
          <div className="flex items-center gap-4 my-2">
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center font-mono">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                {(() => {
                  const total = Math.max(0.001, snapshot.powerBalance.totalLoadKw);
                  const colors = ['#06b6d4', '#3b82f6', '#0ea5e9', '#a855f7', '#64748b'];
                  let offset = 0;
                  return snapshot.loads.map((load, index) => {
                    const pct = Math.max(0, Math.min(100, load.currentLoadKw / total * 100));
                    const currentOffset = -offset;
                    offset += pct;
                    return <path key={load.id} strokeDasharray={`${pct}, ${100 - pct}`} strokeDashoffset={currentOffset} strokeWidth="4" stroke={colors[index % colors.length]} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />;
                  });
                })()}
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-bold text-base text-white leading-none">{snapshot.powerBalance.totalLoadKw.toFixed(0)}</span>
                <span className="text-[9px] text-cyan-300 leading-none mt-0.5">kW Total</span>
              </div>
            </div>

            <div className="space-y-1 font-mono text-xs w-full">
              {snapshot.loads.map((load) => { const pct = snapshot.powerBalance.totalLoadKw > 0 ? load.currentLoadKw / snapshot.powerBalance.totalLoadKw * 100 : 0; return (
                <div key={load.id} className="flex justify-between items-center text-slate-300">
                  <span className="font-sans truncate mr-2">{load.name}</span>
                  <span>{load.currentLoadKw.toFixed(0)} kW ({pct.toFixed(0)}%)</span>
                </div>
              ); })}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
