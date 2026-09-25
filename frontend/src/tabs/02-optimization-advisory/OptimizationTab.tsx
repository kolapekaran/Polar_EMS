import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Check,
  Play,
  RotateCcw,
  TrendingUp,
  Thermometer,
  Battery,
  Fuel,
  Shield,
  Leaf,
  CloudSnow,
  Wind,
  Eye,
  Droplets,
  ChevronRight,
  Flame,
  Waves,
  Zap,
} from 'lucide-react';
import { TabType } from '../../types';
import { StationPageStrip } from '../../components/StationPageStrip';
import { applyStationStrategy, getStoredEMSStrategyDefaults } from '../../integration/api';
import { useStation } from '../../integration/StationContext';

interface OptimizationTabProps {
  onNavigateTab: (tab: TabType) => void;
}

const formatSignedDelta = (value: number, unit: string, negativeLabel: string, positiveLabel: string, zeroLabel: string) => {
  const n = Number(value ?? 0);
  if (n < -0.0005) return { label: negativeLabel, value: `${Math.abs(n).toFixed(1)} ${unit}` };
  if (n > 0.0005) return { label: positiveLabel, value: `+${n.toFixed(1)} ${unit}` };
  return { label: zeroLabel, value: `0.0 ${unit}` };
};

export const OptimizationTab: React.FC<OptimizationTabProps> = ({ onNavigateTab }) => {
  const { strategy, snapshot, refreshSnapshot, refreshStrategy, appliedStrategyCode, setAppliedStrategyCode, strategyLoading, strategyError } = useStation();
  // Toggle states for Optimization Goals
  const [minFuel, setMinFuel] = useState(true);
  const [maxRenewables, setMaxRenewables] = useState(true);
  const [maintainReliability, setMaintainReliability] = useState(true);
  const [reduceEmissions, setReduceEmissions] = useState(false);
  const [costEfficiency, setCostEfficiency] = useState(false);

  // Constraints
  const [minReserve, setMinReserve] = useState(() => Number(getStoredEMSStrategyDefaults().minReserve ?? 20));
  const [criticalPriority, setCriticalPriority] = useState('P0 - P1');
  const [wearLimit, setWearLimit] = useState('Standard');
  const [socRange, setSocRange] = useState('20 % - 95 %');
  const [renewableUtil, setRenewableUtil] = useState('Maximize');

  // Applied notification state
  const [applied, setApplied] = useState(false);
  const [impactMetric, setImpactMetric] = useState('Fuel Consumption');
  const [strategyMsg, setStrategyMsg] = useState('');
  const [recalculating, setRecalculating] = useState(false);
  const hasStrategy = Boolean(strategy?.recommendedStrategy?.code);
  const strategyUnavailable = !strategyLoading && !hasStrategy;
  useEffect(() => {
    const syncPolicy = () => setMinReserve(Number(getStoredEMSStrategyDefaults().minReserve ?? 20));
    window.addEventListener('polar-ems-settings-changed', syncPolicy);
    return () => window.removeEventListener('polar-ems-settings-changed', syncPolicy);
  }, []);
  // Predicted Conditions must use the same authoritative backend forecast shown by the chart.
  // If the decision endpoint is temporarily unavailable, presentation-only aggregation
  // from the already-fetched forecast keeps the UI honest instead of showing blank values.
  const forecastPoints = snapshot.horizonForecast ?? [];
  const strategyPredictionsAreFallback = !strategy && forecastPoints.length > 0;
  const predictedPeakLoad = strategy?.predictedPeakLoadKw ?? (forecastPoints.length ? Math.max(...forecastPoints.map(p => p.predictedTotalLoadKw)) : null);
  const predictedAvgWind = strategy?.predictedAvgWindMs ?? (forecastPoints.length ? forecastPoints.reduce((sum, p) => sum + p.windSpeedMs, 0) / forecastPoints.length : null);
  const predictedPeakSolar = strategy?.predictedPeakSolarKw ?? (forecastPoints.length ? Math.max(...forecastPoints.map(p => p.predictedSolarKw)) : null);
  const predictedMinTemp = strategy?.predictedMinTempC ?? (forecastPoints.length ? Math.min(...forecastPoints.map(p => p.temperatureC)) : null);
  const strategyHorizonLabel = `Backend decision horizon: ${Math.max(0, ...forecastPoints.map(p => p.hourOffset), 0)}h`;

  const handleApply = async () => {
    const code = strategy?.recommendedStrategy?.code;
    if (!code || !hasStrategy) return;
    try {
      await applyStationStrategy(code);
      setAppliedStrategyCode(code);
      await refreshSnapshot();
      setStrategyMsg(`Strategy ${code} applied to the authoritative Twin.`);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    } catch (error) {
      console.error('Strategy apply failed', error);
      setStrategyMsg(error instanceof Error ? error.message : 'Strategy apply failed');
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setStrategyMsg('Recalculating candidate strategies…');
    try {
      const result = await refreshStrategy({
        fuel: minFuel,
        renewables: maxRenewables,
        reliability: maintainReliability,
        emissions: reduceEmissions,
        cost: costEfficiency,
        minReserve,
        socRange,
      });
      if (!result?.recommendedStrategy?.code) throw new Error('Decision engine returned no strategy.');
      setStrategyMsg(`Decision engine updated · Strategy ${result.recommendedStrategy.code}`);
    } catch (error) {
      console.error('Strategy recalculation failed', error);
      setStrategyMsg(error instanceof Error ? error.message : 'Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-200">
      <StationPageStrip
        title="Optimization & Advisory"
        subtitle="AI-powered decisions for a reliable, efficient and sustainable Maitri Station"
        right={
          <div className="hidden lg:flex items-center gap-3">
            <div className="tracking-[0.18em] text-cyan-300/80 font-mono text-[10px] font-bold text-right">
              BETTER DECISIONS · MORE RESILIENT TOMORROW
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#040d1a]/85 border border-cyan-900/60 text-xs font-mono">
              <span className="font-bold text-white">{snapshot.weather.temperature.toFixed(1)}°C</span>
              <span className="text-slate-400 ml-2">Wind {snapshot.weather.windSpeed.toFixed(1)} m/s</span>
            </div>
          </div>
        }
      />

      {/* Main 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (3 cols): Optimization Goals & Constraints */}
        <div className="lg:col-span-3 space-y-4">
          {/* Optimization Goals */}
          <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-white font-sans">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Optimization Goals</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Customize what matters most</span>
            </div>

            <div className="space-y-2.5 pt-1 text-xs">
              {[
                { label: 'Minimize Fuel Consumption', value: minFuel, setter: setMinFuel, icon: Fuel },
                { label: 'Maximize Renewable Usage', value: maxRenewables, setter: setMaxRenewables, icon: Leaf },
                { label: 'Maintain Reliability (N+1)', value: maintainReliability, setter: setMaintainReliability, icon: Shield },
                { label: 'Reduce Emissions', value: reduceEmissions, setter: setReduceEmissions, icon: CloudSnow },
                { label: 'Cost Efficiency', value: costEfficiency, setter: setCostEfficiency, icon: Zap },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-slate-300 text-xs font-medium">{item.label}</span>
                  <button
                    onClick={() => item.setter(!item.value)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-all cursor-pointer ${
                      item.value ? 'bg-cyan-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        item.value ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    ></div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Constraints */}
          <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-white font-sans">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>Constraints</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Operational limits and requirements</span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-sans">Minimum Reserve</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={minReserve}
                    onChange={(e) => setMinReserve(Number(e.target.value))}
                    className="w-12 px-1.5 py-0.5 rounded bg-black/40 border border-cyan-900 text-center text-cyan-300 font-bold"
                  />
                  <span className="text-slate-400">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-sans">Critical Load Priority</span>
                <select
                  value={criticalPriority}
                  onChange={(e) => setCriticalPriority(e.target.value)}
                  className="px-2 py-1 rounded bg-black/40 border border-cyan-900 text-cyan-300 text-[11px]"
                >
                  <option>P0 - P1</option>
                  <option>P0 Only</option>
                  <option>All Loads</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-sans">Generator Wear Limit</span>
                <select
                  value={wearLimit}
                  onChange={(e) => setWearLimit(e.target.value)}
                  className="px-2 py-1 rounded bg-black/40 border border-cyan-900 text-cyan-300 text-[11px]"
                >
                  <option>Standard</option>
                  <option>Conservative</option>
                  <option>Aggressive</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-sans">Battery SoC Range</span>
                <select
                  value={socRange}
                  onChange={(e) => setSocRange(e.target.value)}
                  className="px-2 py-1 rounded bg-black/40 border border-cyan-900 text-cyan-300 text-[11px]"
                >
                  <option>20 % - 90 %</option>
                  <option>15 % - 95 %</option>
                  <option>30 % - 80 %</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-sans">Renewable Utilization</span>
                <select
                  value={renewableUtil}
                  onChange={(e) => setRenewableUtil(e.target.value)}
                  className="px-2 py-1 rounded bg-black/40 border border-cyan-900 text-cyan-300 text-[11px]"
                >
                  <option>Maximize</option>
                  <option>Balanced</option>
                </select>
              </div>

              <button
                onClick={handleRecalculate} disabled={recalculating || strategyLoading}
                className="w-full mt-2 py-2 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
                <span>{recalculating ? 'Recalculating…' : 'Update & Recalculate'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center Column (6 cols): AI Recommended Strategy + Alternative Strategies */}
        <div className="lg:col-span-6 space-y-4">
          {/* AI Recommended Strategy Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-[#06182c]/90 to-[#040d1a]/95 border border-cyan-500/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-base text-white font-sans">
                  AI Recommended Strategy
                </span>
                {strategyMsg && <span className="text-[10px] font-mono text-cyan-300">{strategyMsg}</span>}
                <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${hasStrategy ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300' : 'bg-slate-900 border border-slate-700 text-slate-400'}`}>
                  {strategyLoading ? 'Loading…' : hasStrategy ? 'Recommended' : 'Unavailable'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-xs font-mono text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Confidence {hasStrategy ? `${strategy!.recommendedStrategy.confidencePercent.toFixed(0)}%` : '—'}</span>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white font-sans">
                {strategyLoading ? 'Loading decision-engine strategy…' : (strategy?.recommendedStrategy?.name || 'Strategy unavailable')}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {strategyLoading ? 'Fetching the authoritative backend strategy.' : (strategy?.recommendedStrategy?.description || strategyError || 'Backend strategy is unavailable.')}
              </p>
            </div>

            {/* 4 Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
              <div className="p-2.5 rounded-xl bg-[#030a16] border border-cyan-950">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-sans">
                  <Fuel className="w-3 h-3 text-orange-400" />
                  {(() => { const d = formatSignedDelta(strategy?.recommendedStrategy?.fuelConsumptionDeltaL ?? 0, 'L', 'Fuel Saving vs Baseline', 'Additional Fuel vs Baseline', 'Fuel vs Baseline'); return <span>{d.label}</span>; })()}
                </div>
                <span className="text-base font-bold text-orange-400 mt-1 block">{strategy ? formatSignedDelta(strategy.recommendedStrategy.fuelConsumptionDeltaL, 'L', 'Fuel Saving vs Baseline', 'Additional Fuel vs Baseline', 'Fuel vs Baseline').value : "—"}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Backend strategy horizon</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#030a16] border border-cyan-950">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-sans">
                  <Leaf className="w-3 h-3 text-emerald-400" />
                  <span>Renewable Util</span>
                </div>
                <span className="text-base font-bold text-emerald-400 mt-1 block">{strategy ? `${strategy.recommendedStrategy.renewableUtilizationPercent.toFixed(0)} %` : "—"}</span>
                <span className="text-[9px] text-emerald-400">Backend strategy</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#030a16] border border-cyan-950">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-sans">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  <span>Reserve Level</span>
                </div>
                <span className="text-base font-bold text-cyan-300 mt-1 block">{strategy ? `${strategy.recommendedStrategy.reserveLevelPercent.toFixed(0)} %` : "—"}</span>
                <span className="text-[9px] text-cyan-400">Backend projection</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#030a16] border border-cyan-950">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-sans">
                  <CloudSnow className="w-3 h-3 text-sky-400" />
                  {(() => { const d = formatSignedDelta(strategy?.recommendedStrategy?.co2DeltaPercent ?? 0, '%', 'CO₂ Reduction vs Baseline', 'CO₂ Increase vs Baseline', 'CO₂ vs Baseline'); return <span>{d.label}</span>; })()}
                </div>
                <span className="text-base font-bold text-sky-300 mt-1 block">{strategy ? formatSignedDelta(strategy.recommendedStrategy.co2DeltaPercent, '%', 'CO₂ Reduction vs Baseline', 'CO₂ Increase vs Baseline', 'CO₂ vs Baseline').value : "—"}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Backend comparison</span>
              </div>
            </div>

            {/* Strategy Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                disabled={!hasStrategy || recalculating || strategyLoading}
                onClick={() => { if (hasStrategy) { localStorage.setItem('polar_ems_simulation_strategy', strategy!.recommendedStrategy.code); onNavigateTab('simulator'); } }}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Simulate This Strategy</span>
              </button>

              <button
                disabled={!hasStrategy || recalculating || strategyLoading}
                onClick={handleApply}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{applied ? 'Strategy Applied!' : 'Accept & Apply'}</span>
              </button>

              <button disabled={!strategy?.alternativeStrategies?.length} onClick={() => document.getElementById('optimization-alternatives')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="px-3 py-2 rounded-lg bg-black/40 hover:bg-black/60 border border-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                View Alternatives
              </button>
            </div>
          </div>

          {/* Alternative Strategies */}
          <div id="optimization-alternatives" className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-white font-sans">Alternative Strategies</span>
                <p className="text-[10px] text-slate-400">Compare backend-generated options and their impact</p>
              </div>
              <button disabled={!strategy?.alternativeStrategies?.length} onClick={() => document.getElementById('optimization-alternatives')?.scrollIntoView({behavior:'smooth',block:'center'})} className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                View All Strategies <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              {(strategy?.alternativeStrategies ?? []).map((option) => (
                <div key={option.code} className="p-3 rounded-xl bg-[#030914] border border-cyan-950/90 space-y-2 flex flex-col justify-between">
                  <div><div className="flex items-center justify-between font-sans"><span className="font-bold text-white text-xs flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-cyan-900 text-cyan-300 flex items-center justify-center text-[10px]">{option.code}</span>{option.name}</span><span className="text-[10px] text-slate-400 font-mono">Conf: {option.confidencePercent.toFixed(0)}%</span></div><p className="text-[10px] text-slate-400 font-sans mt-0.5">{option.description}</p></div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] pt-1 border-t border-cyan-950"><div><span className="text-[9px] text-slate-500 block">{formatSignedDelta(option.fuelConsumptionDeltaL, 'L', 'Saving', 'Additional', 'Change').label}</span><span className="text-emerald-400 font-bold">{formatSignedDelta(option.fuelConsumptionDeltaL, 'L', 'Saving', 'Additional', 'Change').value}</span></div><div><span className="text-[9px] text-slate-500 block">Reserve</span><span className="text-cyan-300 font-bold">{option.reserveLevelPercent.toFixed(0)} %</span></div><div><span className="text-[9px] text-slate-500 block">{formatSignedDelta(option.co2DeltaPercent, '%', 'Reduction', 'Increase', 'Change').label}</span><span className="text-sky-400 font-bold">{formatSignedDelta(option.co2DeltaPercent, '%', 'Reduction', 'Increase', 'Change').value}</span></div></div>
                  <button onClick={() => { localStorage.setItem('polar_ems_simulation_strategy', option.code); onNavigateTab('simulator'); }} className="w-full py-1 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/50 text-cyan-300 text-[11px] font-sans font-medium transition-all">Simulate</button>
                </div>
              ))}
              {!strategy?.alternativeStrategies?.length && <div className="col-span-full p-4 text-center text-xs text-slate-500">Backend alternatives unavailable.</div>}
            </div>
          </div>
        </div>

        {/* Right Column (3 cols): Why this recommendation & Energy Saving Opportunities */}
        <div className="lg:col-span-3 space-y-4">
          {/* Why this recommendation? */}
          <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-bold text-sm text-white font-sans block">Why this recommendation?</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Decision trace from the authoritative EMS strategy</span>
              </div>
              {hasStrategy && (
                <span className="px-2 py-1 rounded-md bg-cyan-950/70 border border-cyan-800/60 text-[9px] font-mono font-bold text-cyan-300 whitespace-nowrap">
                  STRATEGY {strategy!.recommendedStrategy.code}
                </span>
              )}
            </div>

            {hasStrategy && (
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#030914] border border-cyan-950 font-mono text-[10px]">
                <div><span className="text-slate-500 block">Reserve</span><span className="text-cyan-300 font-bold">{strategy!.recommendedStrategy.reserveLevelPercent.toFixed(0)}%</span></div>
                <div><span className="text-slate-500 block">Renewable</span><span className="text-emerald-300 font-bold">{strategy!.recommendedStrategy.renewableUtilizationPercent.toFixed(0)}%</span></div>
                <div><span className="text-slate-500 block">Confidence</span><span className="text-sky-300 font-bold">{strategy!.recommendedStrategy.confidencePercent.toFixed(0)}%</span></div>
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              {(strategy?.reasoningPoints ?? []).map((point, i) => <div key={i} className="flex items-start gap-2.5"><TrendingUp className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" /><span className="text-slate-300"><span className="font-semibold text-white">{point.title}:</span> {point.explanation}</span></div>)}
              {!strategy?.reasoningPoints?.length && <span className="text-slate-500">Backend reasoning unavailable.</span>}
            </div>

            {hasStrategy && (
              <div className="pt-2 border-t border-cyan-950 text-[9px] font-mono text-slate-500">
                DATA STATUS: ENGINEERING MODEL · Optimality claim: NOT GLOBAL OPTIMUM
              </div>
            )}
          </div>

          {/* Energy Saving Opportunities */}
          <div id="optimization-opportunities" className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-white font-sans">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                <span>Energy Saving Opportunities</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 font-mono font-bold">{strategy ? `${strategy.opportunities.length} Opportunities` : 'Unavailable'}</span>
            </div>

            <div className="space-y-2 text-xs">
              {(strategy?.opportunities ?? []).map((opp) => <div key={opp.id} className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950 space-y-1"><div className="flex items-center justify-between"><span className="font-semibold text-slate-200 text-xs">{opp.title}</span><button onClick={() => onNavigateTab('simulator')} className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] border border-cyan-800 font-sans">Simulate</button></div><p className="text-[10px] text-slate-400">{opp.description}</p><span className="text-[10px] font-mono text-emerald-400 block font-semibold">{opp.metricLabel}: {opp.metricValue} · {opp.potentialSavings}</span></div>)}
              {!strategy?.opportunities?.length && <span className="text-slate-500">No backend opportunities available.</span>}
            </div>

            <div className="text-right">
              <button disabled={!strategy?.opportunities?.length} onClick={() => document.getElementById('optimization-opportunities')?.scrollIntoView({behavior:'smooth',block:'center'})} className="text-[11px] text-cyan-400 hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">View All Opportunities →</button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Load & Generation Forecast, Predicted Conditions, Impact Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        {/* Widget 1: Load & Generation Forecast */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-white font-sans">Load & Generation Forecast</span>
            <span className="text-[10px] text-cyan-400">Backend Forecast · {forecastPoints.length ? `0–${Math.max(...forecastPoints.map(p => p.hourOffset))}h` : 'Unavailable'}</span>
          </div>

          <div className="flex flex-wrap gap-2 text-[9px] text-slate-400 pt-1">
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-red-400"></span> Total Load</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-yellow-400"></span> Diesel Gen</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-400"></span> Wind Gen</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-blue-400"></span> Solar Gen</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-purple-400"></span> Battery Chg</span>
          </div>

          <div className="h-28 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
              {(() => { const pts=snapshot.horizonForecast; const max=Math.max(1,...pts.map(p=>Math.max(p.predictedTotalLoadKw,p.predictedDieselKw,p.predictedWindKw,p.predictedSolarKw,Math.abs(p.predictedBatteryKw)))); const line=(vals:number[])=>vals.map((v,i)=>`${i/Math.max(1,vals.length-1)*300},${76-(v/max)*68}`).join(' '); return <><polyline points={line(pts.map(p=>p.predictedTotalLoadKw))} fill="none" stroke="#f87171" strokeWidth="2"/><polyline points={line(pts.map(p=>p.predictedDieselKw))} fill="none" stroke="#facc15" strokeWidth="1.8"/><polyline points={line(pts.map(p=>p.predictedWindKw))} fill="none" stroke="#34d399" strokeWidth="1.8"/><polyline points={line(pts.map(p=>p.predictedSolarKw))} fill="none" stroke="#60a5fa" strokeWidth="1.5"/></>; })()}
            </svg>
            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
              {forecastPoints.length ? [0,6,12,24,48,72].map(h => <span key={h}>{h === 0 ? 'Now' : `+${h}h`}</span>) : <span>Forecast unavailable</span>}
            </div>
          </div>
        </div>

        {/* Widget 2: Predicted Conditions */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2">
          <div className="flex items-center justify-between"><span className="font-bold text-xs text-white font-sans block">Predicted Conditions</span><span className="text-[9px] text-cyan-300 font-mono">{strategy ? 'DECISION ENGINE' : 'FORECAST-DERIVED'}</span></div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-[#030914] border border-cyan-950">
              <span className="text-[10px] text-slate-400 block font-sans">Peak Load</span>
              <span className="text-sm font-bold text-white block mt-0.5">{predictedPeakLoad != null ? predictedPeakLoad.toFixed(0) : '—'} kW</span>
              <span className="text-[9px] text-red-400">Forecast peak</span>
            </div>
            <div className="p-2 rounded-lg bg-[#030914] border border-cyan-950">
              <span className="text-[10px] text-slate-400 block font-sans">Avg Wind</span>
              <span className="text-sm font-bold text-white block mt-0.5">{predictedAvgWind != null ? predictedAvgWind.toFixed(1) : '—'} m/s</span>
              <span className="text-[9px] text-emerald-400">Forecast average</span>
            </div>
            <div className="p-2 rounded-lg bg-[#030914] border border-cyan-950">
              <span className="text-[10px] text-slate-400 block font-sans">Peak Solar</span>
              <span className="text-sm font-bold text-white block mt-0.5">{predictedPeakSolar != null ? predictedPeakSolar.toFixed(0) : '—'} kW</span>
              <span className="text-[9px] text-emerald-400">Forecast peak</span>
            </div>
            <div className="p-2 rounded-lg bg-[#030914] border border-cyan-950">
              <span className="text-[10px] text-slate-400 block font-sans">Min Temp</span>
              <span className="text-sm font-bold text-sky-300 block mt-0.5">{predictedMinTemp != null ? predictedMinTemp.toFixed(1) : '—'}°C</span>
              <span className="text-[9px] text-sky-400">Forecast minimum</span>
            </div>
          </div>
        </div>

        {/* Widget 3: Impact Comparison (Next 24 Hours) */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-white font-sans">Impact Comparison <span className="text-[10px] text-slate-400 font-mono">(Next 24h)</span></span>
            <span className="text-[10px] text-cyan-400">Fuel Consumption ▾</span>
          </div>

          {/* Bar Chart comparing 4 plans */}
          <div className="h-28 flex items-end justify-between gap-3 pt-4 px-2">
            {(strategy?.impactComparison ?? []).map((item, i) => { const max=Math.max(1,...(strategy?.impactComparison ?? []).map(x=>x.fuelLiters24h)); const h=Math.max(8,item.fuelLiters24h/max*80); return <div key={`${item.strategyName}-${i}`} className="flex-1 flex flex-col items-center gap-1"><span className="text-[10px] text-slate-300">{item.fuelLiters24h.toFixed(0)} L</span><div className="w-full rounded-t h-20 flex items-end"><div className="w-full rounded-t bg-cyan-600" style={{height:`${h}px`}}></div></div><span className="text-[9px] text-slate-400 font-sans text-center">{item.strategyName}</span></div>; })}
            {!strategy?.impactComparison?.length && <span className="text-xs text-slate-500 self-center">Backend impact comparison unavailable.</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
