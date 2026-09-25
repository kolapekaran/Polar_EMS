import React, { useEffect, useState } from 'react';
import {
  Zap,
  Flame,
  BatteryCharging,
  TrendingUp,
  CloudSnow,
  Eye,
  ChevronRight,
  Sun,
  Wind,
  Building2,
  Wrench,
  Droplets,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { DigitalTwinStation } from '../../components/DigitalTwinStation';
import { StationNode, TabType } from '../../types';
import { useStation } from '../../integration/StationContext';
import { fetchFlexibleLoadOptimization, FlexibleLoadOptimization, fetchHeatRecoveryIntelligence, HeatRecoveryIntelligence, fetchFuelLogisticsIntelligence, FuelLogisticsIntelligence } from '../../integration/api';

interface EnergyTabProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenAnalyticsModal: (node: StationNode) => void;
}

export const EnergyTab: React.FC<EnergyTabProps> = ({
  onNavigateTab,
  onOpenAnalyticsModal,
}) => {
  const { snapshot, systemMode, timeOffset } = useStation();
  const [subPill, setSubPill] = useState('Live Flow');
  const [flexOptimization, setFlexOptimization] = useState<FlexibleLoadOptimization | null>(null);
  const [flexLoading, setFlexLoading] = useState(false);
  const [flexError, setFlexError] = useState('');
  const [heatRecovery, setHeatRecovery] = useState<HeatRecoveryIntelligence | null>(null);
  const [heatLoading, setHeatLoading] = useState(false);
  const [heatError, setHeatError] = useState('');
  const [fuelLogistics, setFuelLogistics] = useState<FuelLogisticsIntelligence | null>(null);
  const [fuelLogisticsLoading, setFuelLogisticsLoading] = useState(false);
  const [fuelLogisticsError, setFuelLogisticsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setFlexLoading(true);
    setHeatLoading(true);
    setFuelLogisticsLoading(true);
    fetchFlexibleLoadOptimization(24)
      .then(result => { if (!cancelled) { setFlexOptimization(result); setFlexError(''); } })
      .catch(err => { if (!cancelled) setFlexError(err instanceof Error ? err.message : 'Flexible-load advisory unavailable'); })
      .finally(() => { if (!cancelled) setFlexLoading(false); });
    fetchFuelLogisticsIntelligence(72, 72)
      .then(result => { if (!cancelled) { setFuelLogistics(result); setFuelLogisticsError(''); } })
      .catch(err => { if (!cancelled) setFuelLogisticsError(err instanceof Error ? err.message : 'Fuel logistics intelligence unavailable'); })
      .finally(() => { if (!cancelled) setFuelLogisticsLoading(false); });
    fetchHeatRecoveryIntelligence(24)
      .then(result => { if (!cancelled) { setHeatRecovery(result); setHeatError(''); } })
      .catch(err => { if (!cancelled) setHeatError(err instanceof Error ? err.message : 'Heat recovery intelligence unavailable'); })
      .finally(() => { if (!cancelled) setHeatLoading(false); });
    return () => { cancelled = true; };
  }, [timeOffset]);

  // The context fetches the backend snapshot for the selected application horizon.
  // Do not apply that same offset a second time inside Energy.
  const snapshotIsAtSelectedHorizon = (snapshot.selectedHourOffset ?? 0) === timeOffset;
  const displayGeneration = snapshot.powerBalance.totalGenerationKw;
  const displayLoad = snapshot.powerBalance.totalLoadKw;
  const displayBatteryPower = snapshot.powerBalance.batteryPowerKw;
  const displayBalance = snapshot.powerBalance.netBalanceKw;
  const displaySoc = snapshot.battery.socPercent;
  const displayFuel = snapshot.fuel.currentVolumeLiters;
  const displayReserve = snapshot.reserve.targetReservePercent;
  const displayWind = snapshot.powerBalance.windGenKw;
  const displaySolar = snapshot.powerBalance.solarGenKw;
  const displayDiesel = snapshot.powerBalance.dieselGenKw;
  const displayTemperature = snapshot.weather.temperature;
  const displayWindSpeed = snapshot.weather.windSpeed;


  const subNavs = [
    'Live Flow',
    'Generation',
    'Consumption',
    'Storage',
    'Thermal',
    'Efficiency',
    'Historical Trends',
  ];

  return (
    <div className="space-y-4 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-sans tracking-wide">
            Energy
          </h1>
          <p className="text-xs text-cyan-400 font-mono mt-0.5">
            Energy flow, generation, storage, consumption and thermal integration
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden 2xl:block tracking-[0.2em] text-cyan-400/80 font-mono text-[11px] font-bold text-right">
            “UNDERSTAND TODAY. OPTIMIZE TOMORROW.”
          </div>

          <button
            onClick={() => onNavigateTab('command-center')}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 transition-all cursor-pointer font-sans"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View in 3D Twin</span>
          </button>

          {/* Weather Widget */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 text-xs font-mono">
            <CloudSnow className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white font-sans">{displayTemperature.toFixed(0)}°C</span>
            <span className="text-slate-400">Wind {displayWindSpeed.toFixed(1)} m/s</span>
          </div>
        </div>
      </div>

      {/* Sub Navigation Horizontal Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
        {subNavs.map((nav) => (
          <button
            key={nav}
            onClick={() => setSubPill(nav)}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              subPill === nav
                ? 'bg-cyan-600 text-black font-bold shadow-md shadow-cyan-600/30'
                : 'bg-[#040d1a] text-slate-400 hover:text-slate-200 border border-cyan-950'
            }`}
          >
            {nav}
          </button>
        ))}
      </div>

      {/* Selected Energy Workspace — each pill changes the actual analysis view */}
      <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg">
        {(() => {
          const points = snapshot.horizonForecast;
          const avg = (fn: (p: typeof points[number]) => number) => {
            if (!points.length) return 0;
            let weighted = 0; let duration = 0;
            for (let i = 0; i < points.length; i++) {
              const start = points[i].hourOffset;
              const end = points[i + 1]?.hourOffset ?? start;
              const dt = Math.max(0, end - start);
              if (dt > 0) { weighted += fn(points[i]) * dt; duration += dt; }
            }
            return duration > 0 ? weighted / duration : fn(points[0]);
          };
          const peak = (fn: (p: typeof points[number]) => number) => points.length ? Math.max(...points.map(fn)) : 0;
          const content: Record<string, {title:string; description:string; stats:[string,string][]}> = {
            'Live Flow': { title: timeOffset > 0 ? `Projected Energy Flow (+${timeOffset}h)` : 'Current Energy Flow', description: timeOffset > 0 ? 'Authoritative backend projected state for the selected horizon.' : 'Authoritative current balance from the Digital Twin.', stats: [['Generation', `${displayGeneration.toFixed(1)} kW`], ['Load', `${displayLoad.toFixed(1)} kW`], ['Battery', `${displayBatteryPower >= 0 ? '+' : ''}${displayBatteryPower.toFixed(1)} kW`], ['Net Balance', `${displayBalance >= 0 ? '+' : ''}${displayBalance.toFixed(1)} kW`]] },
            'Generation': { title: 'Generation Analysis', description: timeOffset > 0 ? `Backend projected generation at +${timeOffset}h.` : 'Current and forecast generation by source.', stats: [['Diesel', `${displayDiesel.toFixed(1)} kW`], ['Wind', `${displayWind.toFixed(1)} kW`], ['Solar', `${displaySolar.toFixed(1)} kW`], ['Peak forecast', `${peak(p => p.predictedDieselKw+p.predictedWindKw+p.predictedSolarKw).toFixed(1)} kW`]] },
            'Consumption': { title: 'Consumption Analysis', description: timeOffset > 0 ? `Backend projected demand at +${timeOffset}h.` : 'Current load mix and forecast demand.', stats: [[timeOffset > 0 ? 'Projected load' : 'Current load', `${displayLoad.toFixed(1)} kW`], ['Peak forecast', `${peak(p => p.predictedTotalLoadKw).toFixed(1)} kW`], ['P0 load', `${snapshot.loads.filter(l => l.priority === 'P0').reduce((a,l) => a+l.currentLoadKw,0).toFixed(1)} kW`], ['Flexible load', `${snapshot.loads.filter(l => l.isFlexible).reduce((a,l) => a+l.currentLoadKw,0).toFixed(1)} kW`]] },
            'Storage': { title: 'Battery Storage', description: timeOffset > 0 ? `Backend projected battery state at +${timeOffset}h.` : 'State of charge, power direction and operating limits.', stats: [['SoC', `${displaySoc.toFixed(1)} %`], ['Stored energy', `${(displaySoc/100*snapshot.battery.capacityKwh).toFixed(1)} kWh`], ['Power', `${displayBatteryPower >= 0 ? '+' : ''}${displayBatteryPower.toFixed(1)} kW`], ['Operating range', `${snapshot.battery.minSocPercent}–${snapshot.battery.maxSocPercent}%`]] },
            'Thermal': { title: 'Thermal Integration', description: 'Heating demand and recovered diesel waste heat.', stats: [['Heating demand', `${snapshot.thermal.totalHeatingDemandKw.toFixed(1)} kW`], ['Recovered heat', `${snapshot.thermal.recoveredHeatKw.toFixed(1)} kW`], ['Electrical heating', `${snapshot.thermal.electricalHeatingKw.toFixed(1)} kW`], ['Thermal offset', `${snapshot.thermal.thermalOffsetPercent.toFixed(1)} %`]] },
            'Efficiency': { title: 'Supply & Utilization', description: 'Electrical supply coverage and utilization indicators. Physical conversion efficiency is not field-calibrated in the reference Twin.', stats: [['Supply coverage', `${snapshot.powerBalance.systemEfficiencyPercent.toFixed(1)} %`], ['Renewable share', `${snapshot.powerBalance.renewableSharePercent.toFixed(1)} %`], ['Heat recovery efficiency', `${(snapshot.thermal.heatRecoveryEfficiency*100).toFixed(1)} %`], ['Forecast average load', `${avg(p => p.predictedTotalLoadKw).toFixed(1)} kW`]] },
            'Historical Trends': { title: 'Forecast Trends', description: 'Backend forecast series. Field-calibrated historical telemetry is not currently available in the reference data set.', stats: [['Series points', `${points.length}`], ['6h load', `${(points.find(p=>p.hourOffset===6)?.predictedTotalLoadKw ?? snapshot.powerBalance.totalLoadKw).toFixed(1)} kW`], ['24h load', `${(points.find(p=>p.hourOffset===24)?.predictedTotalLoadKw ?? snapshot.powerBalance.totalLoadKw).toFixed(1)} kW`], ['72h load', `${(points.find(p=>p.hourOffset===72)?.predictedTotalLoadKw ?? snapshot.powerBalance.totalLoadKw).toFixed(1)} kW`]] },
          };
          const view = content[subPill];
          return <><div className="flex items-center justify-between mb-3"><div><span className="text-sm font-bold text-white">{view.title}</span><p className="text-[10px] text-slate-400 mt-0.5">{view.description}</p></div><span className="text-[10px] font-mono text-cyan-400">{subPill.toUpperCase()}</span></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{view.stats.map(([label,value]) => <div key={label} className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950"><span className="text-[9px] text-slate-500 block">{label}</span><span className="text-sm font-bold text-white font-mono">{value}</span></div>)}</div></>;
        })()}
      </div>

      {/* Critical Load Protection — backend-authoritative load priority and shed state */}
      <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">Critical Load Protection</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Backend-authoritative priority, service and shedding state for the selected station horizon.
            </p>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${
            snapshot.loads.filter(l => l.priority === 'P0').some(l => l.shedStatus === 'SHED')
              ? 'text-red-300 border-red-800/70 bg-red-950/30'
              : 'text-emerald-300 border-emerald-800/70 bg-emerald-950/30'
          }`}>
            {snapshot.loads.filter(l => l.priority === 'P0').some(l => l.shedStatus === 'SHED')
              ? 'CRITICAL LOAD AT RISK'
              : 'CRITICAL LOADS PROTECTED'}
          </span>
        </div>

        {(() => {
          const priorityRows = [
            { priority: 'P0', label: 'CRITICAL', description: 'Life safety / essential operations' },
            { priority: 'P1', label: 'IMPORTANT', description: 'Research / core station services' },
            { priority: 'P2', label: 'DEFERRABLE', description: 'Flexible / secondary demand' },
          ];
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              {priorityRows.map((row) => {
                const loads = snapshot.loads.filter(l => l.priority === row.priority);
                const requested = loads.reduce((sum, load) => sum + load.currentLoadKw, 0);
                const served = loads.reduce((sum, load) => sum + (load.shedStatus === 'SERVED' ? load.currentLoadKw : 0), 0);
                const servedPercent = requested > 0 ? Math.min(100, (served / requested) * 100) : 100;
                const hasShed = loads.some(l => l.shedStatus === 'SHED');
                return (
                  <div key={row.priority} className="rounded-lg bg-[#030914] border border-cyan-950 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className={`text-[10px] font-bold ${row.priority === 'P0' ? 'text-red-300' : row.priority === 'P1' ? 'text-amber-300' : 'text-yellow-300'}`}>
                          {row.label}
                        </span>
                        <p className="text-[9px] text-slate-500 mt-0.5">{row.description}</p>
                      </div>
                      <span className={`text-sm font-bold font-mono ${hasShed ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {servedPercent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                      <div
                        className={hasShed ? 'h-full bg-amber-400' : 'h-full bg-emerald-400'}
                        style={{ width: `${servedPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-[9px] font-mono">
                      <span className="text-slate-500">Requested {requested.toFixed(1)} kW</span>
                      <span className={hasShed ? 'text-amber-300' : 'text-slate-400'}>
                        {hasShed ? 'SHEDDING ACTIVE' : 'SERVED'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[9px] font-mono text-slate-500">
          <span>Station load: <b className="text-slate-300">{displayLoad.toFixed(1)} kW</b></span>
          <span>Backend shed: <b className={snapshot.loads.some(l => l.shedStatus === 'SHED') ? 'text-amber-300' : 'text-emerald-300'}>{snapshot.loads.filter(l => l.shedStatus === 'SHED').length} load(s)</b></span>
          <span>Reserve target: <b className="text-cyan-300">{displayReserve.toFixed(0)}%</b></span>
        </div>
      </div>

      {/* Flexible Load Optimization — backend-authoritative advisory */}
      <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">Flexible Load Optimization</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Backend advisory aligns deferrable demand with forecast renewable availability while protecting P0/P1 loads.
            </p>
          </div>
          <span className="text-[9px] font-mono text-cyan-300 border border-cyan-900 px-2 py-1 rounded bg-cyan-950/30">
            {flexOptimization?.data_status ?? 'LOADING'} · ADVISORY ONLY
          </span>
        </div>

        {flexLoading && <div className="text-xs text-slate-400 font-mono py-3">Calculating renewable-aligned load windows…</div>}
        {!flexLoading && flexError && <div className="text-xs text-amber-300 font-mono py-3">Flexible-load advisory unavailable: {flexError}</div>}
        {!flexLoading && !flexError && flexOptimization && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              {[
                ['Flexible available', `${flexOptimization.flexible_load_available_kw.toFixed(1)} kW`],
                ['Protected load', `${flexOptimization.protected_load_kw.toFixed(1)} kW`],
                ['Recommended shift', `${flexOptimization.recommendation.recommended_shift_kw.toFixed(1)} kW`],
                ['Renewable headroom', `${flexOptimization.recommendation.expected_renewable_headroom_kw.toFixed(1)} kW`],
                ['Target window', flexOptimization.recommendation.target_hour_offset == null ? 'NONE' : `+${flexOptimization.recommendation.target_hour_offset}h`],
              ].map(([label, value]) => (
                <div key={label} className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950">
                  <span className="text-[9px] text-slate-500 block">{label}</span>
                  <span className="text-sm font-bold text-white font-mono">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 p-3 rounded-lg bg-[#030914] border border-cyan-950">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-cyan-300">{flexOptimization.recommendation.title}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{flexOptimization.recommendation.description}</div>
                </div>
                <span className={`shrink-0 text-[10px] font-bold font-mono px-2 py-1 rounded border ${flexOptimization.recommended_action === 'SHIFT_FLEXIBLE_LOAD' ? 'text-emerald-300 border-emerald-800/70 bg-emerald-950/30' : 'text-slate-300 border-slate-700 bg-slate-900/40'}`}>
                  {flexOptimization.recommended_action === 'SHIFT_FLEXIBLE_LOAD' ? 'SHIFT WINDOW FOUND' : 'HOLD'}
                </span>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead className="text-slate-500 border-b border-cyan-950">
                  <tr><th className="text-left py-2">WINDOW</th><th className="text-right">RENEWABLE</th><th className="text-right">HEADROOM</th><th className="text-right">SHIFTABLE</th><th className="text-right">DIESEL</th><th className="text-right">CONF.</th></tr>
                </thead>
                <tbody>
                  {flexOptimization.windows.slice(0, 5).map((w) => (
                    <tr key={w.hour_offset} className="border-b border-slate-900/70">
                      <td className="py-2 text-cyan-300">+{w.hour_offset}h</td>
                      <td className="text-right text-slate-300">{w.renewable_available_kw.toFixed(1)} kW</td>
                      <td className="text-right text-slate-300">{w.renewable_headroom_kw.toFixed(1)} kW</td>
                      <td className="text-right text-emerald-300">{w.recommended_shift_kw.toFixed(1)} kW</td>
                      <td className="text-right text-slate-300">{w.predicted_diesel_kw.toFixed(1)} kW</td>
                      <td className="text-right text-slate-400">{w.confidence_percent.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-[9px] text-slate-500 font-mono">
              Protected loads: CRITICAL + IMPORTANT + heating. No automatic load-state change is made by this advisory.
            </div>
          </>
        )}
      </div>

      {/* Heat Recovery Intelligence — backend thermal + waste-heat model */}
      <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-amber-900/60 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-white">Heat Recovery Intelligence</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Reuses the backend thermal model to show how diesel waste heat can offset station heating demand.
            </p>
          </div>
          <span className="text-[9px] font-mono text-amber-300 border border-amber-900 px-2 py-1 rounded bg-amber-950/30">
            {heatRecovery?.data_status ?? 'LOADING'} · ADVISORY ONLY
          </span>
        </div>
        {heatLoading && <div className="text-xs text-slate-400 font-mono py-3">Calculating thermal recovery from the Digital Twin…</div>}
        {!heatLoading && heatError && <div className="text-xs text-amber-300 font-mono py-3">Heat recovery intelligence unavailable: {heatError}</div>}
        {!heatLoading && !heatError && heatRecovery && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              {[
                ['Heating demand', `${heatRecovery.summary.current_heating_demand_kwth.toFixed(1)} kWth`],
                ['Recovered heat', `${heatRecovery.summary.current_recovered_heat_kwth.toFixed(1)} kWth`],
                ['Thermal offset', `${heatRecovery.summary.current_thermal_offset_percent.toFixed(1)} %`],
                ['Peak recovery', `${heatRecovery.summary.peak_recovery_kwth.toFixed(1)} kWth`],
                ['Fuel equivalent', `${heatRecovery.summary.forecast_fuel_equivalent_liters.toFixed(1)} L`],
              ].map(([label, value]) => (
                <div key={label} className="p-2.5 rounded-lg bg-[#030914] border border-amber-950">
                  <span className="text-[9px] text-slate-500 block">{label}</span>
                  <span className="text-sm font-bold text-white font-mono">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead className="text-slate-500 border-b border-amber-950">
                  <tr><th className="text-left py-2">WINDOW</th><th className="text-right">HEAT DEMAND</th><th className="text-right">WASTE HEAT</th><th className="text-right">RECOVERED</th><th className="text-right">OFFSET</th><th className="text-right">DIESEL</th></tr>
                </thead>
                <tbody>
                  {heatRecovery.forecast.map((p) => (
                    <tr key={p.hour_offset} className="border-b border-slate-900/70">
                      <td className="py-2 text-amber-300">+{p.hour_offset}h</td>
                      <td className="text-right text-slate-300">{p.heating_demand_kwth.toFixed(1)} kWth</td>
                      <td className="text-right text-slate-300">{p.waste_heat_available_kwth.toFixed(1)} kWth</td>
                      <td className="text-right text-amber-300">{p.recovered_heat_kwth.toFixed(1)} kWth</td>
                      <td className="text-right text-emerald-300">{p.thermal_offset_percent.toFixed(1)}%</td>
                      <td className="text-right text-slate-300">{p.diesel_output_kw.toFixed(1)} kW</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-[9px] text-slate-500 font-mono">
              {heatRecovery.note} No station state is changed by this advisory. Provenance: {heatRecovery.provenance}.
            </div>
          </>
        )}
      </div>

      {/* Fuel Logistics Intelligence — backend-authoritative fuel inventory and resupply advisory */}
      <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">Fuel Logistics Intelligence</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Projects fuel inventory against the configured reserve and resupply lead time. Planning advisory only.
            </p>
          </div>
          <span className={`text-[9px] font-mono px-2 py-1 rounded border ${
            fuelLogistics?.recommendation.risk_level === 'HIGH' ? 'text-red-300 border-red-900 bg-red-950/30' :
            fuelLogistics?.recommendation.risk_level === 'MEDIUM' ? 'text-amber-300 border-amber-900 bg-amber-950/30' :
            'text-emerald-300 border-emerald-900 bg-emerald-950/30'
          }`}>
            {fuelLogistics?.data_status ?? 'LOADING'} · ADVISORY ONLY
          </span>
        </div>
        {fuelLogisticsLoading && <div className="text-xs text-slate-400 font-mono py-3">Projecting fuel inventory and resupply window…</div>}
        {!fuelLogisticsLoading && fuelLogisticsError && <div className="text-xs text-amber-300 font-mono py-3">Fuel logistics intelligence unavailable: {fuelLogisticsError}</div>}
        {!fuelLogisticsLoading && !fuelLogisticsError && fuelLogistics && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
              {[
                ['Fuel now', `${fuelLogistics.current_fuel_liters.toFixed(0)} L`],
                ['Fill level', `${fuelLogistics.current_fill_percent.toFixed(1)} %`],
                ['Burn rate', `${fuelLogistics.average_burn_lph.toFixed(1)} L/h`],
                ['72h projection', `${fuelLogistics.projected_fuel_liters.toFixed(0)} L`],
                ['Hours to reserve', fuelLogistics.estimated_hours_to_reserve == null ? 'N/A' : `${fuelLogistics.estimated_hours_to_reserve.toFixed(0)} h`],
                ['Resupply qty', `${fuelLogistics.recommended_resupply_quantity_liters.toFixed(0)} L`],
              ].map(([label, value]) => (
                <div key={label} className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950">
                  <span className="text-[9px] text-slate-500 block">{label}</span>
                  <span className="text-sm font-bold text-white font-mono">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-lg bg-[#030914] border border-cyan-950">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <div className={`text-xs font-bold ${fuelLogistics.recommendation.risk_level === 'HIGH' ? 'text-red-300' : fuelLogistics.recommendation.risk_level === 'MEDIUM' ? 'text-amber-300' : 'text-emerald-300'}`}>{fuelLogistics.recommendation.title}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{fuelLogistics.recommendation.description}</div>
                </div>
                <span className="text-[10px] font-mono text-cyan-300">{fuelLogistics.recommended_action}</span>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead className="text-slate-500 border-b border-cyan-950"><tr><th className="text-left py-2">WINDOW</th><th className="text-right">FUEL REMAINING</th><th className="text-right">DIESEL</th><th className="text-right">STATUS</th></tr></thead>
                <tbody>{fuelLogistics.series.filter(p => [0, 12, 24, 48, 72].includes(p.hour_offset)).map(p => (
                  <tr key={p.hour_offset} className="border-b border-slate-900/70"><td className="py-2 text-cyan-300">+{p.hour_offset}h</td><td className="text-right text-slate-300">{p.fuel_remaining_liters.toFixed(0)} L</td><td className="text-right text-slate-300">{p.diesel_power_kw.toFixed(1)} kW</td><td className="text-right text-slate-500">{p.data_status}</td></tr>
                ))}</tbody>
              </table>
            </div>
            <div className="mt-2 text-[9px] text-slate-500 font-mono">{fuelLogistics.note} Provenance: {fuelLogistics.provenance}.</div>
          </>
        )}
      </div>

      {/* Main Split View: Left (Digital Twin Flow) & Right (Live Power Balance) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Real Digital Twin Energy Flow (8 cols) */}
        <div className="lg:col-span-8 space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white font-sans">Energy Flow</span>
              <span className="text-xs font-mono text-slate-400">{timeOffset > 0 ? `(+${timeOffset}h Backend Forecast)` : systemMode === 'LIVE' ? '(Current State)' : '(Simulation State)'}</span>{timeOffset > 0 && !snapshotIsAtSelectedHorizon && <span className="text-[10px] text-amber-300 font-mono">Updating backend state…</span>}
              <span className={`flex items-center gap-1 text-[11px] font-mono ml-2 ${snapshot.provenance.powerTelemetrySource === 'LIVE' ? 'text-emerald-400' : 'text-amber-300'}`}>
                <span className={`w-2 h-2 rounded-full ${snapshot.provenance.powerTelemetrySource === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                Data: {snapshot.provenance.powerTelemetrySource}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Generation
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Storage
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Distribution
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400"></span> Thermal
              </span>
            </div>
          </div>

          <DigitalTwinStation
            mode="energy"
            showInspector={false}
            showTimeline={false}
            timelineHour={timeOffset}
            onOpenAnalyticsModal={onOpenAnalyticsModal}
          />
        </div>

        {/* Right Side: Live Power Balance & Load Breakdown (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-4">
            <div className="flex items-center justify-between"><span className="font-bold text-sm text-white font-sans block">{timeOffset > 0 ? `Projected Power Balance (+${timeOffset}h)` : "Current Power Balance"}</span><span className="text-[10px] font-mono text-amber-300">{snapshot.provenance.powerTelemetrySource}</span></div>

            {/* Power balance segmented bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full bg-[#030a16] overflow-hidden flex">
                {(() => {
                  const generation = Math.max(0, displayGeneration);
                  const load = Math.max(0, displayLoad);
                  const battery = Math.abs(displayBatteryPower);
                  const total = Math.max(1, generation + load + battery);
                  return <><div className="h-full bg-emerald-500" style={{ width: `${generation / total * 100}%` }}></div><div className="h-full bg-cyan-500" style={{ width: `${load / total * 100}%` }}></div><div className="h-full bg-cyan-300" style={{ width: `${battery / total * 100}%` }}></div></>;
                })()}
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Generation</span>
                  <span className="font-bold text-white">{displayGeneration.toFixed(0)} kW</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block font-sans">Consumption</span>
                  <span className="font-bold text-white">{displayLoad.toFixed(0)} kW</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">Net</span>
                  <span className="font-bold text-emerald-400">{displayBalance >= 0 ? '+' : ''}{displayBalance.toFixed(0)} kW</span>
                </div>
              </div>
            </div>

            {/* Gauges: Renewable Share & Supply Coverage */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-cyan-950 font-mono">
              {/* Renewable Share Donut */}
              <div className="p-2.5 rounded-xl bg-[#030914] border border-cyan-950 text-center flex flex-col items-center">
                <span className="text-[11px] text-slate-300 font-sans font-semibold mb-2">
                  Renewable Share
                </span>
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-400"
                      strokeDasharray={`${(displayGeneration > 0 ? ((displayWind + displaySolar) / displayGeneration * 100) : 0)}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute font-bold text-sm text-white">{snapshot.powerBalance.renewableSharePercent.toFixed(0)}%</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-2 space-y-0.5 text-left w-full pl-2">
                  <div className="flex justify-between"><span>Wind:</span><span className="text-slate-200">{snapshot.powerBalance.windGenKw.toFixed(0)} kW</span></div>
                  <div className="flex justify-between"><span>Solar:</span><span className="text-slate-200">{snapshot.powerBalance.solarGenKw.toFixed(0)} kW</span></div>
                  <div className="flex justify-between"><span>Diesel:</span><span className="text-slate-200">{snapshot.powerBalance.dieselGenKw.toFixed(0)} kW</span></div>
                </div>
              </div>

              {/* Supply Coverage Gauge */}
              <div className="p-2.5 rounded-xl bg-[#030914] border border-cyan-950 text-center flex flex-col items-center">
                <span className="text-[11px] text-slate-300 font-sans font-semibold mb-2">
                  Supply Coverage
                </span>
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-cyan-400"
                      strokeDasharray={`${snapshot.powerBalance.systemEfficiencyPercent}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-bold text-sm text-white leading-none">{snapshot.powerBalance.systemEfficiencyPercent.toFixed(0)}%</span>
                    <span className="text-[9px] text-emerald-400 mt-0.5 leading-none">Coverage</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 mt-3">Supply available to serve electrical load; not conversion efficiency.</span>
              </div>
            </div>

            {/* Current Load Breakdown */}
            <div className="space-y-2 pt-2 border-t border-cyan-950">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white font-sans">Load Breakdown</span>
                <span className="font-mono text-cyan-300 font-bold">{displayLoad.toFixed(0)} kW</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                {snapshot.loads.map((load, i) => {
                  const iconMap:any = { LIFE_SAFETY: Building2, CRITICAL_RESEARCH: Activity, WORKSHOP_UTILITIES: Wrench, HEATING: Flame, WATER_PUMPS: Droplets, SECONDARY: Zap };
                  const colorMap:any = { LIFE_SAFETY:'bg-cyan-500', CRITICAL_RESEARCH:'bg-blue-500', WORKSHOP_UTILITIES:'bg-sky-500', HEATING:'bg-purple-500', WATER_PUMPS:'bg-teal-500', SECONDARY:'bg-slate-500' };
                  const ItemIcon = iconMap[load.category] ?? Zap;
                  const pct = snapshot.powerBalance.totalLoadKw > 0 ? load.currentLoadKw / snapshot.powerBalance.totalLoadKw * 100 : 0;
                  return (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-slate-300 font-sans">
                      <span className="flex items-center gap-1.5">
                        <ItemIcon className="w-3 h-3 text-slate-400" />
                        {load.name}
                      </span>
                      <span className="font-mono">{load.currentLoadKw.toFixed(0)} kW ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className={`h-full ${colorMap[load.category] ?? 'bg-cyan-500'} rounded-full`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row of 5 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 font-mono text-xs">
        {/* 1. Generation Trends */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2 flex flex-col justify-between">
          <span className="font-bold text-white font-sans block text-xs">
            Generation Trends <span className="text-[10px] text-slate-400 font-mono">(Forecast)</span>
          </span>
          <div className="flex gap-2 text-[9px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-red-400"></span> Diesel</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-400"></span> Wind</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-yellow-400"></span> Solar</span>
          </div>
          <div className="h-20 w-full">
            <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
              {(() => { const pts=snapshot.horizonForecast; const max=Math.max(1,...pts.map(p=>Math.max(p.predictedDieselKw,p.predictedWindKw,p.predictedSolarKw))); const line=(vals:number[])=>vals.map((v,i)=>`${i/Math.max(1,vals.length-1)*200},${58-(v/max)*52}`).join(' '); return <><polyline points={line(pts.map(p=>p.predictedDieselKw))} fill="none" stroke="#ef4444" strokeWidth="2"/><polyline points={line(pts.map(p=>p.predictedWindKw))} fill="none" stroke="#10b981" strokeWidth="2"/><polyline points={line(pts.map(p=>p.predictedSolarKw))} fill="none" stroke="#eab308" strokeWidth="1.5"/></>; })()}
            </svg>
          </div>
          <div className="flex justify-between text-[9px] text-slate-500">
            {snapshot.horizonForecast.length ? snapshot.horizonForecast.map((p, i) => <span key={p.hourOffset}>{i === 0 ? 'Now' : `+${p.hourOffset}h`}</span>) : <span>Forecast unavailable</span>}
          </div>
        </div>

        {/* 2. Battery State of Charge */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2 flex flex-col justify-between">
          <span className="font-bold text-white font-sans block text-xs">Battery State of Charge</span>
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-800" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-emerald-400" strokeDasharray={`${snapshot.battery.socPercent}, 100`} strokeLinecap="round" strokeWidth="3.8" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span className="absolute font-bold text-xs text-white">{displaySoc.toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-sans block">Available Energy</span>
              <span className="font-bold text-white text-sm">{(displaySoc/100*snapshot.battery.capacityKwh).toFixed(0)} kWh</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Total: {snapshot.battery.capacityKwh.toFixed(0)} kWh</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 pt-1 border-t border-cyan-950">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Status: {displayBatteryPower > 0 ? 'DISCHARGING' : displayBatteryPower < 0 ? 'CHARGING' : 'IDLE'} ({displayBatteryPower > 0 ? 'DISCHARGE' : displayBatteryPower < 0 ? 'CHARGE' : 'IDLE'} {Math.abs(displayBatteryPower).toFixed(1)} kW)</span>
          </div>
        </div>

        {/* 3. Thermal Energy */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2 flex flex-col justify-between">
          <span className="font-bold text-white font-sans block text-xs">Thermal Energy</span>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <span className="text-sm font-bold text-white">{snapshot.thermal.recoveredHeatKw.toFixed(0)} kW</span>
                <span className="text-[10px] text-slate-400 block">Recovered (from DG)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <span className="text-sm font-bold text-white">{snapshot.thermal.totalHeatingDemandKw.toFixed(0)} kW</span>
                <span className="text-[10px] text-slate-400 block">Total Heating Demand</span>
              </div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Heat Coverage</span>
              <span className="text-orange-400 font-bold">{snapshot.thermal.totalHeatingDemandKw > 0 ? (snapshot.thermal.recoveredHeatKw / snapshot.thermal.totalHeatingDemandKw * 100).toFixed(0) : '0'}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${snapshot.thermal.totalHeatingDemandKw > 0 ? Math.min(100, snapshot.thermal.recoveredHeatKw / snapshot.thermal.totalHeatingDemandKw * 100) : 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* 4. Energy Flow Summary (Today) */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-1.5 text-[11px]">
          <span className="font-bold text-white font-sans block text-xs">Forecast Energy Summary <span className="text-[10px] text-slate-400 font-mono">({Math.max(...snapshot.horizonForecast.map(x => x.hourOffset), 0)}h reference projection)</span></span>
          <div className="space-y-1 divide-y divide-cyan-950/60 pt-1">
            {(() => {
              const points = snapshot.horizonForecast.length ? snapshot.horizonForecast : [];
              const horizon = Math.max(...points.map(x => x.hourOffset), 0);
              const integrate = (fn: (x: any) => number) => {
                let energy = 0;
                for (let i = 0; i < points.length - 1; i++) {
                  const dt = Math.max(0, points[i + 1].hourOffset - points[i].hourOffset);
                  energy += ((fn(points[i]) + fn(points[i + 1])) / 2) * dt;
                }
                return energy;
              };
              const genEnergy = integrate(x => x.predictedWindKw + x.predictedSolarKw + x.predictedDieselKw);
              const renEnergy = integrate(x => x.predictedWindKw + x.predictedSolarKw);
              const dieselEnergy = integrate(x => x.predictedDieselKw);
              const loadEnergy = integrate(x => x.predictedTotalLoadKw);
              const heatEnergy = integrate(x => x.heatRecoveryOffsetKw);
              return <><div className="flex justify-between pt-0.5"><span>Total Generation</span><span className="font-bold text-white">{genEnergy.toFixed(0)} kWh</span></div><div className="flex justify-between pt-1 text-emerald-400"><span>Renewable Gen</span><span>{renEnergy.toFixed(0)} kWh ({genEnergy > 0 ? (renEnergy / genEnergy * 100).toFixed(0) : 0}%)</span></div><div className="flex justify-between pt-1 text-orange-400"><span>Diesel Gen</span><span>{dieselEnergy.toFixed(0)} kWh</span></div><div className="flex justify-between pt-1"><span>Load Demand</span><span className="font-bold text-white">{loadEnergy.toFixed(0)} kWh</span></div><div className="flex justify-between pt-1 text-cyan-300"><span>Thermal Recovery</span><span>{heatEnergy.toFixed(0)} kWh</span></div></>;
            })()}
          </div>
        </div>

        {/* 5. Recent Energy Events */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white font-sans text-xs">Recent Energy Events</span>
            <button onClick={() => setSubPill('Historical Trends')} className="text-[10px] text-cyan-400 hover:underline cursor-pointer">View All →</button>
          </div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center gap-1.5"><span className="text-slate-400 w-12 shrink-0">Now</span><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span><span className="text-slate-300 truncate">Generation {snapshot.powerBalance.totalGenerationKw.toFixed(1)} kW / Load {snapshot.powerBalance.totalLoadKw.toFixed(1)} kW</span></div>
            <div className="flex items-center gap-1.5"><span className="text-slate-400 w-12 shrink-0">Battery</span><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span><span className="text-slate-300 truncate">{snapshot.battery.status} at {Math.abs(snapshot.battery.currentPowerKw).toFixed(1)} kW · SoC {displaySoc.toFixed(0)}%</span></div>
            <div className="flex items-center gap-1.5"><span className="text-slate-400 w-12 shrink-0">Fuel</span><span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"></span><span className="text-slate-300 truncate">{displayFuel.toFixed(0)} L · {snapshot.fuel.currentConsumptionRateLhr.toFixed(1)} L/hr</span></div>
            <div className="flex items-center gap-1.5"><span className="text-slate-400 w-12 shrink-0">Reserve</span><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0"></span><span className="text-slate-300 truncate">Target {displayReserve.toFixed(0)}% · {snapshot.reserve.status}</span></div>
            <div className="flex items-center gap-1.5"><span className="text-slate-400 w-12 shrink-0">Source</span><span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span><span className="text-slate-300 truncate">{snapshot.provenance.powerTelemetrySource}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
