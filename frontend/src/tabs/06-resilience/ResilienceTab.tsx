import React, { useEffect, useState } from 'react';
import twinImage from '../../assets/images/maitri_station_twin_1789652424632.jpg';
import {
  ShieldAlert,
  ShieldCheck,
  Fuel,
  CheckCircle2,
  AlertTriangle,
  Wind,
  Zap,
  BatteryCharging,
  Sun,
  Flame,
  Check,
  Clock,
  Radio,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { StationPageStrip } from '../../components/StationPageStrip';
import { useStation } from '../../integration/StationContext';
import { API_BASE, fetchStationRisk, reevaluateStationResilience } from '../../integration/api';

export const ResilienceTab: React.FC = () => {
  const { resilience, refreshSnapshot, refreshResilience, snapshot, resilienceLoading, resilienceError } = useStation();
  const [appliedActions, setAppliedActions] = useState(false);
  const [reevaluating, setReevaluating] = useState(false);
  const [reevaluateError, setReevaluateError] = useState('');
  const [showWeather, setShowWeather] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [missionRisk, setMissionRisk] = useState<Awaited<ReturnType<typeof fetchStationRisk>> | null>(null);
  const [missionRiskError, setMissionRiskError] = useState('');
  const [missionRiskLoading, setMissionRiskLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadMissionRisk = async () => {
      try {
        setMissionRiskLoading(true);
        setMissionRiskError('');
        const result = await fetchStationRisk(24);
        if (!cancelled) setMissionRisk(result);
      } catch (error) {
        // Fallback to the unified backend intelligence bundle so a transient
        // risk-request failure does not leave the operator with blank metrics.
        try {
          const response = await fetch(`${API_BASE}/intelligence/operational-intelligence?hours=24`);
          if (!response.ok) throw new Error(`Backend ${response.status}`);
          const bundle = await response.json();
          const risk = bundle?.alerts;
          if (!risk) throw new Error('Risk data unavailable');
          const components = bundle?.risk?.components ?? {};
          if (!cancelled) setMissionRisk({
            horizonHours: 24,
            overallRiskPercent: Number(risk.overall_risk_percent ?? 0),
            riskLevel: risk.risk_level ?? 'LOW',
            blackoutRiskPercent: Number(components.blackout_risk_percent ?? risk.overall_risk_percent ?? 0),
            components: {
              criticalLoadRiskPercent: Number(components.critical_load_risk_percent ?? 0),
              batterySocRiskPercent: Number(components.battery_soc_risk_percent ?? 0),
              fuelReserveRiskPercent: Number(components.fuel_reserve_risk_percent ?? 0),
              serviceLevelRiskPercent: Number(components.service_level_risk_percent ?? 0),
              forecastUncertaintyRiskPercent: Number(components.forecast_uncertainty_risk_percent ?? 0),
              extremeWeatherRiskPercent: Number(components.extreme_weather_risk_percent ?? 0),
            },
            isAdvisory: true,
            calibrationNote: 'Engineering risk indicator based on the synthetic/reference Digital Twin projection; not a field-calibrated probability.',
          });
        } catch (fallbackError) {
          if (!cancelled) {
            setMissionRisk(null);
            setMissionRiskError(fallbackError instanceof Error ? fallbackError.message : (error instanceof Error ? error.message : 'Mission risk unavailable'));
          }
        }
      } finally {
        if (!cancelled) setMissionRiskLoading(false);
      }
    };
    void loadMissionRisk();
    return () => { cancelled = true; };
  }, [resilience]);

  const handleApply = async () => {
    if (reevaluating) return;
    setReevaluating(true);
    setReevaluateError('');
    try {
      const result = await reevaluateStationResilience(72);
      if (!result) throw new Error('Resilience re-evaluation unavailable');
      await refreshResilience(72, true);
      await refreshSnapshot();
      setAppliedActions(true);
      setTimeout(() => setAppliedActions(false), 3000);
    } catch (error) {
      console.warn('Resilience re-evaluation failed:', error);
      setAppliedActions(false);
      setReevaluateError(error instanceof Error ? error.message : 'Resilience re-evaluation failed');
    } finally {
      setReevaluating(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-200">
      <StationPageStrip
        title="Resilience"
        subtitle="Survivability, redundancy, reserve protection and future risk"
      />
      {(resilienceLoading || resilienceError) && (
        <div className={`px-3 py-2 rounded-lg border text-xs font-mono ${resilienceError ? 'border-red-900/70 bg-red-950/30 text-red-300' : 'border-cyan-900/60 bg-cyan-950/20 text-cyan-300'}`}>
          {resilienceLoading ? 'Refreshing authoritative resilience intelligence…' : `Backend resilience status: ${resilienceError}`}
        </div>
      )}

      {/* Main Grid: Left Column (4 cols) & Right Column (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (4 cols): Resilience Overview & Risk Assessment & Reserve Level Forecast */}
        <div className="lg:col-span-4 space-y-4">
          {/* Resilience Overview */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-4">
            <span className="font-bold text-sm text-white font-sans block">Resilience Overview</span>

            <div className="flex items-center gap-4">
              {/* Circular Score Donut */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center font-mono">
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
                    strokeDasharray={`${resilience?.overallScore ?? 0}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-bold text-white leading-none">{resilience?.overallScore?.toFixed(0) ?? "—"}</span>
                  <span className="text-[10px] text-slate-400 leading-none mt-0.5">/100</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono text-slate-400 block">STATION RESILIENCE</span>
                <span className={`text-lg font-extrabold font-sans block ${resilience ? 'text-emerald-400' : 'text-slate-400'}`}>{resilience?.status ?? 'Unavailable'}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{resilience ? `Backend-derived resilience index · ${resilience.dataStatus ?? 'BACKEND'}` : 'Overall resilience index unavailable; partial station indicators may still be shown.'}</span>
              </div>
            </div>

            {/* Breakdown Sub-scores */}
            <div className="space-y-1.5 font-mono text-xs divide-y divide-cyan-950/60 pt-1">
              <div className="flex justify-between pt-1">
                <span className="text-slate-300 font-sans">Power Reliability</span>
                <span className="font-bold text-emerald-400">{resilience?.metrics?.powerReliability != null ? `${resilience.metrics.powerReliability.toFixed(0)}/100` : "—"}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-slate-300 font-sans">Fuel Security</span>
                <span className="font-bold text-cyan-300">{resilience?.metrics?.fuelSecurity != null ? `${resilience.metrics.fuelSecurity.toFixed(0)}/100` : "—"}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-slate-300 font-sans">Generator Redundancy</span>
                <span className="font-bold text-emerald-400">{resilience?.metrics?.generatorRedundancy != null ? `${resilience.metrics.generatorRedundancy.toFixed(0)}/100` : "—"}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-slate-300 font-sans">Battery Availability</span>
                <span className="font-bold text-cyan-300">{resilience?.metrics?.batteryAvailability != null ? `${resilience.metrics.batteryAvailability.toFixed(0)}/100` : "—"}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-slate-300 font-sans">Renewable Stability</span>
                <span className="font-bold text-amber-400">{resilience?.metrics?.renewableStability != null ? `${resilience.metrics.renewableStability.toFixed(0)}/100` : "—"}</span>
              </div>
              <div className="flex justify-between pt-1.5">
                <span className="text-slate-300 font-sans">Critical Load Protection</span>
                <span className="font-bold text-emerald-400">{resilience?.metrics?.criticalLoadProtection != null ? `${resilience.metrics.criticalLoadProtection.toFixed(0)}/100` : "—"}</span>
              </div>
            </div>
          </div>

          {/* Mission Risk & Resilience Intelligence */}
          <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-sm text-white font-sans block">Mission Risk</span>
                <span className="text-[10px] text-slate-500 font-mono">24h authoritative risk engine</span>
              </div>
              <div className={`px-2 py-1 rounded border text-[10px] font-mono font-bold ${missionRisk?.riskLevel === 'CRITICAL' ? 'border-red-700 bg-red-950/50 text-red-300' : missionRisk?.riskLevel === 'HIGH' ? 'border-red-800/60 bg-red-950/30 text-red-300' : missionRisk?.riskLevel === 'MEDIUM' ? 'border-amber-800/60 bg-amber-950/30 text-amber-300' : 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300'}`}>
                {missionRiskLoading ? 'LOADING' : (missionRisk?.riskLevel ?? 'UNAVAILABLE')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950">
                <span className="text-[9px] text-slate-500 block">Overall Risk</span>
                <span className="text-lg font-bold text-white font-mono">{missionRisk ? `${missionRisk.overallRiskPercent.toFixed(0)}%` : missionRiskLoading ? 'Loading…' : '—'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950">
                <span className="text-[9px] text-slate-500 block">Blackout Risk Indicator</span>
                <span className="text-lg font-bold text-white font-mono">{missionRisk ? `${missionRisk.blackoutRiskPercent.toFixed(0)}%` : missionRiskLoading ? 'Loading…' : '—'}</span>
              </div>
            </div>

            <div className="space-y-2 text-[10px] font-mono">
              {[
                ['Critical Load', missionRisk?.components.criticalLoadRiskPercent, 'text-red-300'],
                ['Battery Reserve', missionRisk?.components.batterySocRiskPercent, 'text-cyan-300'],
                ['Fuel Security', missionRisk?.components.fuelReserveRiskPercent, 'text-orange-300'],
                ['Service Level', missionRisk?.components.serviceLevelRiskPercent, 'text-amber-300'],
                ['Forecast Uncertainty', missionRisk?.components.forecastUncertaintyRiskPercent, 'text-violet-300'],
                ['Extreme Weather', missionRisk?.components.extremeWeatherRiskPercent, 'text-sky-300'],
              ].map(([label, value, textClass]) => (
                <div key={String(label)}>
                  <div className="flex justify-between mb-1"><span className="text-slate-400">{label}</span><span className={String(textClass)}>{value != null ? `${Number(value).toFixed(0)}%` : '—'}</span></div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-current opacity-80" style={{ width: `${Math.min(100, Math.max(0, Number(value ?? 0)))}%` }} /></div>
                </div>
              ))}
            </div>

            {missionRisk?.calibrationNote && <div className="text-[9px] leading-relaxed text-slate-500 border-t border-cyan-950 pt-2">{missionRisk.calibrationNote}</div>}
            {missionRiskError && <div className="text-[10px] text-red-300 font-mono border border-red-900/60 bg-red-950/20 rounded p-2">Backend mission risk unavailable: {missionRiskError}</div>}
          </div>

          {/* Risk Assessment (Next 72 Hours) */}
          <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2.5">
            <span className="font-bold text-sm text-white font-sans block">
              Risk Assessment <span className="text-xs font-mono text-slate-400">(Next 72 Hours · Backend projection)</span>
            </span>

            <div className="space-y-1.5 text-xs font-mono">
              {(resilience?.riskAssessment ?? []).map((item) => (
                <div key={item.label} className="flex justify-between items-center p-1.5 rounded-lg bg-[#030914] border border-cyan-950">
                  <span className="text-slate-300 font-sans">{item.label}</span>
                  <span title={item.source} className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.level === 'HIGH' ? 'bg-red-950 text-red-300' : item.level === 'MEDIUM' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>{item.level}</span>
                </div>
              ))}
              {!resilience?.riskAssessment?.length && <div className="text-slate-500 text-[11px]">Backend risk assessment unavailable.</div>}
            </div>
          </div>

        </div>

        {/* Right Column (8 cols): N+1 Redundancy, Fuel Survival, Critical Load, Threats & Actions */}
        <div className="lg:col-span-8 space-y-4">
          {/* N+1 Redundancy Status (4 boxes) */}
          <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
            <div><span className="font-bold text-sm text-white font-sans block">N+1 Redundancy Status</span><span className="text-[10px] text-slate-500 font-mono">Backend scenario-derived availability; notation describes the backend fleet result.</span></div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#030914] border border-cyan-950 flex flex-col items-center text-center">
                <Zap className="w-5 h-5 text-orange-400 mb-1" />
                <span className="text-slate-400 font-sans text-[11px]">Generators</span>
                <span className="font-bold text-white text-sm my-0.5">{resilience?.nPlusOneStatus.generators ?? '—'}</span>
                <span className={`text-[10px] flex items-center gap-1 ${resilience?.nPlusOneStatus.generators ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-3 h-3" /> {resilience?.nPlusOneStatus.generators ? 'Backend status ✓' : 'Unavailable'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#030914] border border-cyan-950 flex flex-col items-center text-center">
                <BatteryCharging className="w-5 h-5 text-cyan-400 mb-1" />
                <span className="text-slate-400 font-sans text-[11px]">Battery</span>
                <span className="font-bold text-white text-sm my-0.5">{resilience?.nPlusOneStatus.battery ?? "—"}</span>
                <span className={`text-[10px] flex items-center gap-1 ${resilience?.nPlusOneStatus.battery ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-3 h-3" /> {resilience?.nPlusOneStatus.battery ? 'Backend status ✓' : 'Unavailable'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#030914] border border-cyan-950 flex flex-col items-center text-center">
                <Wind className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-slate-400 font-sans text-[11px]">Wind Turbines</span>
                <span className="font-bold text-white text-sm my-0.5">{resilience?.nPlusOneStatus.windTurbines ?? "—"}</span>
                <span className={`text-[10px] flex items-center gap-1 ${resilience?.nPlusOneStatus.windTurbines ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-3 h-3" /> {resilience?.nPlusOneStatus.windTurbines ? 'Backend status ✓' : 'Unavailable'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#030914] border border-cyan-950 flex flex-col items-center text-center">
                <Sun className="w-5 h-5 text-yellow-400 mb-1" />
                <span className="text-slate-400 font-sans text-[11px]">Solar Array</span>
                <span className="font-bold text-white text-sm my-0.5">{resilience?.nPlusOneStatus.solarArray ?? "—"}</span>
                <span className={`text-[10px] flex items-center gap-1 ${resilience?.nPlusOneStatus.solarArray ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-3 h-3" /> {resilience?.nPlusOneStatus.solarArray ? 'Backend status ✓' : 'Unavailable'}
                </span>
              </div>
            </div>
          </div>

          {/* Row: Fuel Survival Projection (6 cols) & Critical Load Coverage (6 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
            {/* Fuel Survival Projection */}
            <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2 flex flex-col justify-between">
              <div>
                <span className="font-bold text-sm text-white font-sans block">Fuel Survival Projection</span>
                <div className="flex items-center gap-2 mt-2">
                  <Fuel className="w-5 h-5 text-orange-400" />
                  <div>
                    <span className="text-lg font-bold text-white">{resilience?.fuelSurvivalDays != null ? `${resilience.fuelSurvivalDays.toFixed(1)} days` : '—'}</span>
                    <span className="text-[10px] text-slate-400 block font-sans">At current consumption rate</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, snapshot.fuel.fillPercent))}%` }}></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Current: {snapshot.fuel.currentVolumeLiters.toFixed(0)} L</span>
                  <span>Cap: {snapshot.fuel.capacityLiters.toFixed(0)} L ({snapshot.fuel.fillPercent.toFixed(0)}%)</span>
                </div>
              </div>
            </div>

            {/* Critical Load Coverage */}
            <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white font-sans">Protected Load Coverage</span>
                <span className="text-[10px] text-slate-500 font-mono">Backend-derived</span>
              </div>

              <div className="space-y-1.5 text-xs">
                {(resilience?.criticalLoadCoverage ?? []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-slate-300 font-sans gap-3">
                    <span className="truncate">{item.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">{item.servedKw != null ? `${item.servedKw.toFixed(1)} / ${(item.requestedKw ?? item.servedKw).toFixed(1)} kW` : ''}</span>
                    <span className={`text-[10px] font-mono font-bold ${item.isProtected ? 'text-emerald-400' : 'text-red-400'}`}>{item.coveragePercent != null ? `${item.coveragePercent.toFixed(0)}%` : (item.isProtected ? 'SERVED' : 'SHED')}</span>
                  </div>
                ))}
                {!resilience?.criticalLoadCoverage?.length && <div className="text-[11px] text-slate-500">Backend critical-load coverage unavailable.</div>}
              </div>
            </div>
          </div>

          {/* Row: Current Threats & Recommended Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Current Threats */}
            <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3 flex flex-col justify-between">
              <div>
                <span className="font-bold text-sm text-white font-sans block">Current Threats</span>

                {/* Storm Visual Banner */}
                <div className="relative rounded-xl overflow-hidden border border-cyan-900/80 my-2 h-24">
                  <img
                    src={twinImage}
                    alt="Antarctic Storm Threat"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover brightness-50 contrast-125"
                  />
                  <div className="absolute inset-0 bg-blue-950/60 mix-blend-multiply"></div>
                  <div className="absolute inset-0 p-3 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs font-sans">
                      <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>{(() => { const next = snapshot.horizonForecast.find(x => x.windSpeedMs > snapshot.weather.windSpeed); return next ? `Wind increase expected in +${next.hourOffset}h` : `Wind forecast stable`; })()}</span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-snug">
                      {(() => { const peak = Math.max(...snapshot.horizonForecast.map(x => x.windSpeedMs), snapshot.weather.windSpeed); return `Forecast peak wind ${peak.toFixed(1)} m/s. Dynamic reserve target is ${snapshot.reserve.targetReservePercent.toFixed(0)}%.`; })()}
                    </p>
                  </div>
                </div>
              </div>

              <button onClick={() => { setShowWeather(true); void refreshSnapshot(); }} className="w-full py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-xs font-sans font-semibold transition-all cursor-pointer">
                View Weather Details
              </button>
            </div>

            {/* Recommended Actions */}
            <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2.5 flex flex-col justify-between">
              <div>
                <span className="font-bold text-sm text-white font-sans block">Recommended Actions</span>
                <div className="space-y-1.5 text-xs font-sans pt-1">
                  {(resilience?.recommendedProactiveActions ?? []).map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-300">
                      <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-600 text-cyan-300 flex items-center justify-center text-[10px] shrink-0 font-mono mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-[11px] leading-tight">{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {reevaluateError && <div className="text-[10px] text-red-300 font-mono border border-red-900/60 bg-red-950/20 rounded p-2">{reevaluateError}</div>}
              <button
                onClick={handleApply}
                disabled={reevaluating}
                className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all cursor-pointer font-sans"
              >
                <Check className="w-4 h-4" />
                <span>{reevaluating ? 'Re-evaluating…' : appliedActions ? 'Recommendations Re-evaluated!' : 'Re-evaluate Recommendations'}</span>
              </button>
            </div>
          </div>

          {/* Resilience History (Recent) */}
          <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white font-sans">Resilience History (Recent)</span>
              <button onClick={() => setShowAllEvents(v=>!v)} className="text-xs text-cyan-400 hover:underline cursor-pointer">{showAllEvents ? 'Collapse Events ↑' : 'View All Events →'}</button>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400"/><span className="text-slate-300">Wind {snapshot.weather.windSpeed.toFixed(1)} m/s · {snapshot.weather.windDirection}</span></div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"/><span className="text-slate-300">Battery SOC {snapshot.battery.socPercent.toFixed(1)}% · {snapshot.battery.status}</span></div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400"/><span className="text-slate-300">Fuel {snapshot.fuel.currentVolumeLiters.toFixed(0)} L · {snapshot.fuel.estimatedAutonomyDays != null ? `${snapshot.fuel.estimatedAutonomyDays.toFixed(1)} days autonomy` : 'Autonomy unavailable (zero fuel burn)'}</span></div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400"/><span className="text-slate-300">Reserve target {snapshot.reserve.targetReservePercent.toFixed(1)}%</span></div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"/><span className="text-slate-300">Critical load {snapshot.loads.filter(x => x.priority === 'P0').reduce((a,x)=>a+x.currentLoadKw,0).toFixed(1)} kW served</span></div>
              {showAllEvents && <><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400"/><span className="text-slate-300">Forecast confidence {snapshot.horizonForecast[0]?.confidencePercent?.toFixed(0) ?? '—'}%</span></div><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400"/><span className="text-slate-300">Fuel reserve threshold {snapshot.fuel.emergencyReserveLiters.toFixed(0)} L</span></div></>}
            </div>
          </div>

          {/* Reserve Level Forecast */}
          <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2 font-mono">
            <span className="font-bold text-xs text-white font-sans block">Reserve Level Forecast</span>
            <div className="flex gap-3 text-[9px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-cyan-400"></span> Current Plan</span>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-400"></span> With Recom.</span>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-red-400"></span> Min Threshold</span>
            </div>

            <div className="h-24 w-full">
              {(() => {
                const points = resilience?.reserveForecast ?? [];
                const maxV = Math.max(30, ...points.flatMap(p => [p.currentPlanPercent, p.recommendedPercent, p.minimumPercent]));
                const minV = Math.min(0, ...points.map(p => p.minimumPercent));
                const toPoints = (key: 'currentPlanPercent'|'recommendedPercent'|'minimumPercent') => points.map((p, i) => {
                  const x = points.length <= 1 ? 0 : i / (points.length - 1) * 250;
                  const y = 76 - ((p[key] - minV) / Math.max(1, maxV - minV)) * 68;
                  return `${x},${y}`;
                }).join(' ');
                return points.length ? (
                  <svg className="w-full h-full" viewBox="0 0 250 80" preserveAspectRatio="none">
                    <polyline points={toPoints('minimumPercent')} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,3" />
                    <polyline points={toPoints('currentPlanPercent')} fill="none" stroke="#06b6d4" strokeWidth="1.8" />
                    <polyline points={toPoints('recommendedPercent')} fill="none" stroke="#10b981" strokeWidth="2" />
                  </svg>
                ) : <div className="h-full flex items-center justify-center text-[10px] text-slate-500">Reserve forecast unavailable.</div>;
              })()}
            </div>
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Now</span><span>+12h</span><span>+24h</span><span>+36h</span><span>+48h</span><span>+60h</span><span>+72h</span>
            </div>
          </div>
        </div>
      </div>

      {showWeather && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl bg-[#071324] border border-cyan-500/50 shadow-2xl p-5"><div className="flex items-center justify-between"><div><h3 className="text-base font-bold text-white">Weather Details</h3><p className="text-[10px] text-cyan-400 font-mono">Authoritative Twin weather state</p></div><button onClick={()=>setShowWeather(false)} className="px-2 py-1 rounded bg-slate-800 text-slate-300">Close</button></div><div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">{[['Temperature',`${snapshot.weather.temperature.toFixed(1)} °C`],['Apparent',`${(snapshot.weather.apparentTemperature ?? snapshot.weather.temperature).toFixed(1)} °C`],['Wind',`${snapshot.weather.windSpeed.toFixed(1)} m/s ${snapshot.weather.windDirection}`],['Visibility',snapshot.weather.provenance === 'ENGINEERING MODEL' ? 'Unknown' : `${snapshot.weather.visibilityKm.toFixed(1)} km`],['Humidity',snapshot.weather.provenance === 'ENGINEERING MODEL' ? 'Unknown' : `${snapshot.weather.humidity.toFixed(0)} %`],['Pressure',snapshot.weather.provenance === 'ENGINEERING MODEL' ? 'Unknown' : `${snapshot.weather.pressureHpa.toFixed(0)} hPa`],['Snowfall',snapshot.weather.provenance === 'ENGINEERING MODEL' ? 'Unknown' : `${snapshot.weather.snowfallCm.toFixed(2)} cm`],['Solar',`${snapshot.weather.solarRadiation.toFixed(1)} W/m²`]].map(([l,v])=><div key={l} className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950"><span className="text-[9px] text-slate-500 block">{l}</span><span className="text-white font-bold">{v}</span></div>)}</div></div></div>}
    </div>
  );
};
