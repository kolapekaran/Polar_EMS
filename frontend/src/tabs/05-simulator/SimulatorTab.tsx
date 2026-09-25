import React, { useEffect, useState } from 'react';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  AlertTriangle,
  ThermometerSnowflake,
  Wind,
  Sun,
  BatteryWarning,
  Fuel,
  Flame,
  FileText,
  Sliders,
  ChevronRight,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  ClipboardCheck,
} from 'lucide-react';
import { DigitalTwinStation } from '../../components/DigitalTwinStation';
import { SIMULATION_SCENARIOS } from '../../data/stationData';
import { SimulatorScenario } from '../../types';
import { API_BASE, simulateFailureScenario, compareWhatIfScenario, fetchStationStrategy } from '../../integration/api';

export const SimulatorTab: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<SimulatorScenario>(
    SIMULATION_SCENARIOS.find((s) => s.id === 'generator-failure') || SIMULATION_SCENARIOS[4]
  );
  const [duration, setDuration] = useState('24 hours');
  const [startTime, setStartTime] = useState('Now');
  const [enableAiReopt, setEnableAiReopt] = useState(true);
  const [showStepByStep, setShowStepByStep] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationRan, setSimulationRan] = useState(false);
  const [simulationResult, setSimulationResult] = useState<import('../../integration/types').ResilienceScenarioResult | null>(null);
  const [simulatorMode, setSimulatorMode] = useState<'builder' | 'failure' | 'compare' | 'contingency'>('builder');
  const [scenarioMode, setScenarioMode] = useState<'predefined'|'custom'>('predefined');
  const [showReport, setShowReport] = useState(false);
  const [simulationError, setSimulationError] = useState('');
  const [custom, setCustom] = useState({ windReduction: 0, solarReduction: 0, windSpeed: 8, loadIncrease: 0, temperature: -25, batteryHealth: 100, initialSoc: 60, fuelLiters: 15000, dieselAvailable: true });
  const [strategyHint, setStrategyHint] = useState('');
  const [whatIfResult, setWhatIfResult] = useState<import('../../integration/types').WhatIfComparisonResult | null>(null);
  const [contingencyPlan, setContingencyPlan] = useState<{
    station: string; horizon_hours: number; data_status: string; forecast_source: string;
    baseline: { service_level_percent:number; minimum_soc_percent:number; fuel_remaining_liters:number; fuel_consumed_liters:number };
    contingencies: Array<{name:string;description:string;status:string;service_level_percent:number;critical_load_failure_steps:number;load_shed_energy_kwh:number;minimum_soc_percent:number;fuel_remaining_liters:number;fuel_consumed_liters:number;fuel_delta_liters:number;autonomy_days:number|null;recovery_time_hours:number}>
  } | null>(null);
  const [contingencyLoading, setContingencyLoading] = useState(false);
  const [contingencyError, setContingencyError] = useState('');
  const failureScenarioIds = ['generator-failure', 'battery-failure', 'renewable-collapse', 'extreme-cold', 'fuel-shortage', 'storm-high-wind', 'low-wind', 'low-solar', 'multiple-failures'];
  const visibleScenarios = simulatorMode === 'failure'
    ? SIMULATION_SCENARIOS.filter((scenario) => failureScenarioIds.includes(scenario.id))
    : SIMULATION_SCENARIOS;
  const failedNodeId = scenarioMode === 'custom'
    ? (!custom.dieselAvailable ? 'diesel-generators' : custom.batteryHealth <= 0 ? 'battery-system' : undefined)
    : (selectedScenario.id === 'generator-failure' || selectedScenario.id === 'multiple-failures' ? 'diesel-generators' : selectedScenario.id === 'battery-failure' ? 'battery-system' : selectedScenario.id === 'fuel-shortage' ? 'fuel-tanks' : selectedScenario.id === 'low-solar' ? 'solar-array' : selectedScenario.id === 'low-wind' || selectedScenario.id === 'storm-high-wind' ? 'wind-turbines' : undefined);
  useEffect(() => { const code=localStorage.getItem('polar_ems_simulation_strategy'); if(code){ setStrategyHint(`Prepared from Strategy ${code}`); localStorage.removeItem('polar_ems_simulation_strategy'); } }, []);

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setSimulationRan(false);
    setSimulationError('');
    setShowReport(false);
    const scenarioMap: Record<string, string> = {
      'generator-failure': 'DG1_FAILURE', 'battery-failure': 'BATTERY_FAILURE', 'renewable-collapse': 'RENEWABLE_COLLAPSE',
      'extreme-cold': 'EXTREME_COLD', 'fuel-shortage': 'FUEL_SHORTAGE', 'high-research-load': 'HIGH_RESEARCH_LOAD',
      'storm-high-wind': 'STORM_HIGH_WIND',
      'low-wind': 'LOW_WIND',
      'low-solar': 'LOW_SOLAR',
      'multiple-failures': 'MULTIPLE_FAILURES',
    };
    try {
      const offset = startTime === 'Now' ? 0 : Number(startTime.replace('+','').replace('h','')) || 0;
      const hours = parseInt(duration, 10) || 24;
      const key = scenarioMode === 'custom' ? 'CUSTOM_SCENARIO' : (scenarioMap[selectedScenario.id] || selectedScenario.id.toUpperCase().replaceAll('-', '_'));
      const overrides = scenarioMode === 'custom' ? {
        wind_reduction_percent: custom.windReduction, wind_speed_override_mps: custom.windSpeed, solar_reduction_percent: custom.solarReduction,
        load_increase_percent: custom.loadIncrease, temperature_override_celsius: custom.temperature,
        battery_health_percent: custom.batteryHealth, initial_soc_percent: custom.initialSoc, initial_fuel_liters: custom.fuelLiters, diesel_available: custom.dieselAvailable,
      } : {};
      const result = await simulateFailureScenario(key, hours, offset, overrides, enableAiReopt);
      setSimulationResult(result);
      setSimulationRan(true);
      if (enableAiReopt) { void fetchStationStrategy().catch(() => null); }
    } catch (error) {
      console.error('Scenario simulation failed', error);
      setSimulationError(error instanceof Error ? error.message : 'Simulation failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunWhatIf = async () => {
    setIsRunning(true);
    setSimulationError('');
    setWhatIfResult(null);
    const scenarioMap: Record<string, string> = {
      'generator-failure': 'DG1_FAILURE', 'battery-failure': 'BATTERY_FAILURE', 'renewable-collapse': 'RENEWABLE_COLLAPSE',
      'extreme-cold': 'EXTREME_COLD', 'fuel-shortage': 'FUEL_SHORTAGE', 'high-research-load': 'HIGH_RESEARCH_LOAD',
      'storm-high-wind': 'STORM_HIGH_WIND', 'low-wind': 'LOW_WIND', 'low-solar': 'LOW_SOLAR', 'multiple-failures': 'MULTIPLE_FAILURES',
    };
    try {
      const offset = startTime === 'Now' ? 0 : Number(startTime.replace('+','').replace('h','')) || 0;
      const hours = parseInt(duration, 10) || 24;
      const key = scenarioMode === 'custom' ? 'CUSTOM_SCENARIO' : (scenarioMap[selectedScenario.id] || selectedScenario.id.toUpperCase().replaceAll('-', '_'));
      const overrides = scenarioMode === 'custom' ? {
        wind_reduction_percent: custom.windReduction, wind_speed_override_mps: custom.windSpeed, solar_reduction_percent: custom.solarReduction,
        load_increase_percent: custom.loadIncrease, temperature_override_celsius: custom.temperature,
        battery_health_percent: custom.batteryHealth, initial_soc_percent: custom.initialSoc, initial_fuel_liters: custom.fuelLiters, diesel_available: custom.dieselAvailable,
      } : {};
      const result = await compareWhatIfScenario(key, hours, offset, overrides, enableAiReopt);
      setWhatIfResult(result);
    } catch (error) {
      console.error('What-if comparison failed', error);
      setSimulationError(error instanceof Error ? error.message : 'What-if comparison failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunContingencyPlan = async () => {
    setContingencyLoading(true);
    setContingencyError('');
    try {
      const hours = parseInt(duration, 10) || 72;
      const res = await fetch(`${API_BASE}/scenarios/contingency-plan?hours=${hours}`, {
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`Contingency planning API ${res.status}`);
      setContingencyPlan(await res.json());
    } catch (error) {
      console.error('Contingency planning failed', error);
      setContingencyError(error instanceof Error ? error.message : 'Contingency planning failed');
    } finally {
      setContingencyLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-sans tracking-wide">
            Simulator
          </h1>
          <p className="text-xs text-cyan-400 font-mono mt-0.5">
            What happens if something changes?
          </p>
        </div>
      </div>

      {/* Simulator modes: keep the main navigation compact while separating normal scenario design from failure injection. */}
      <div className="flex rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 p-1 shadow-lg max-w-xl">
        <button
          type="button"
          disabled={isRunning}
          onClick={() => { setSimulatorMode('builder'); setSimulationRan(false); setSimulationResult(null); setShowReport(false); setSimulationError(''); setWhatIfResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold font-sans transition-all ${simulatorMode === 'builder' ? 'bg-cyan-600 text-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-cyan-950/50'}`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Scenario Builder
        </button>
        <button
          type="button"
          disabled={isRunning}
          onClick={() => {
            setSimulatorMode('failure');
            setScenarioMode('predefined');
            if (!failureScenarioIds.includes(selectedScenario.id)) {
              const generatorFailure = SIMULATION_SCENARIOS.find((scenario) => scenario.id === 'generator-failure');
              if (generatorFailure) setSelectedScenario(generatorFailure);
            }
            setSimulationRan(false);
            setSimulationResult(null);
            setShowReport(false);
            setSimulationError('');
            setWhatIfResult(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold font-sans transition-all ${simulatorMode === 'failure' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-amber-950/30'}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Failure Injection
        </button>
        <button
          type="button"
          disabled={isRunning}
          onClick={() => {
            setSimulatorMode('compare');
            setScenarioMode('predefined');
            if (!selectedScenario || selectedScenario.id === 'generator-failure') {
              const lowWind = SIMULATION_SCENARIOS.find((scenario) => scenario.id === 'low-wind');
              if (lowWind) setSelectedScenario(lowWind);
            }
            setSimulationRan(false);
            setSimulationResult(null);
            setShowReport(false);
            setSimulationError('');
            setWhatIfResult(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold font-sans transition-all ${simulatorMode === 'compare' ? 'bg-violet-500 text-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-violet-950/30'}`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          What-If Comparison
        </button>
        <button
          type="button"
          disabled={isRunning || contingencyLoading}
          onClick={() => {
            setSimulatorMode('contingency');
            setContingencyPlan(null);
            setContingencyError('');
            setSimulationRan(false);
            setSimulationResult(null);
            setWhatIfResult(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold font-sans transition-all ${simulatorMode === 'contingency' ? 'bg-emerald-500 text-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-emerald-950/30'}`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Contingency Planning
        </button>
      </div>

      {/* Main Grid: Scenario Builder (4 cols) & Digital Twin Simulation View (8 cols) */}
      {simulatorMode === 'contingency' ? (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/95 border border-emerald-900/60 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                  Mission Contingency Planner
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Backend-simulated compound contingencies using one shared forecast. This is planning intelligence, not a live station command.
                </p>
              </div>
              <button disabled={contingencyLoading} onClick={handleRunContingencyPlan}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black text-xs font-bold">
                {contingencyLoading ? 'Evaluating…' : 'Evaluate Contingencies'}
              </button>
            </div>
            {contingencyError && <div className="mt-3 p-2 rounded bg-red-950/40 border border-red-800/60 text-xs text-red-300">{contingencyError}</div>}
            {contingencyPlan && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
                  {[
                    ['Horizon', `${contingencyPlan.horizon_hours} h`],
                    ['Baseline Service', `${contingencyPlan.baseline.service_level_percent.toFixed(1)} %`],
                    ['Baseline Min SOC', `${contingencyPlan.baseline.minimum_soc_percent.toFixed(1)} %`],
                    ['Baseline Fuel', `${contingencyPlan.baseline.fuel_remaining_liters.toFixed(0)} L`],
                    ['Data Status', contingencyPlan.data_status],
                  ].map(([label,value]) => <div key={label} className="p-2 rounded-lg bg-[#030914] border border-cyan-950">
                    <span className="text-[9px] text-slate-500 block">{label}</span>
                    <span className="text-xs font-bold text-white font-mono">{value}</span>
                  </div>)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
                  {contingencyPlan.contingencies.map((c) => (
                    <div key={c.name} className={`p-3 rounded-xl border ${c.status === 'PASS' ? 'border-emerald-800/70 bg-emerald-950/20' : 'border-amber-800/70 bg-amber-950/20'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-white">{c.name}</div>
                          <div className="text-[10px] text-slate-400 mt-1">{c.description}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono ${c.status === 'PASS' ? 'text-emerald-300 bg-emerald-950' : 'text-amber-300 bg-amber-950'}`}>{c.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] font-mono">
                        <span className="text-slate-400">Service <b className="text-white">{c.service_level_percent.toFixed(1)}%</b></span>
                        <span className="text-slate-400">Min SOC <b className="text-white">{c.minimum_soc_percent.toFixed(1)}%</b></span>
                        <span className="text-slate-400">Load shed <b className="text-white">{c.load_shed_energy_kwh.toFixed(2)} kWh</b></span>
                        <span className="text-slate-400">Fuel left <b className="text-white">{c.fuel_remaining_liters.toFixed(0)} L</b></span>
                        <span className="text-slate-400">Fuel Δ <b className="text-white">{c.fuel_delta_liters >= 0 ? '+' : ''}{c.fuel_delta_liters.toFixed(0)} L</b></span>
                        <span className="text-slate-400">Critical failures <b className="text-white">{c.critical_load_failure_steps}</b></span>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800 text-[9px] text-slate-500 font-mono">
                        MODEL: {contingencyPlan.data_status} · Forecast: {contingencyPlan.forecast_source}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Scenario Builder / Failure Injection (4 cols) */}
        <div className="lg:col-span-4 p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm text-white font-sans block">{simulatorMode === 'failure' ? 'Failure Injection' : simulatorMode === 'compare' ? 'What-If Comparison' : 'Scenario Builder'}</span>
              {(simulatorMode === 'failure' || simulatorMode === 'compare') && <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-700/50 text-[9px] font-mono text-amber-300">BACKEND + ML SIMULATION</span>}
            </div>
            {simulatorMode !== 'failure' && (
              <div className="flex rounded-lg bg-black/40 border border-cyan-950 p-0.5 mt-2 text-xs">
                <button disabled={isRunning}
                  onClick={() => setScenarioMode('predefined')} className={`flex-1 py-1 rounded-md font-sans ${scenarioMode === 'predefined' ? 'bg-cyan-600 text-black font-bold' : 'text-slate-400 hover:text-white'}`}>
                  Predefined Scenarios
                </button>
                <button disabled={isRunning}
                  onClick={() => setScenarioMode('custom')} className={`flex-1 py-1 rounded-md font-sans ${scenarioMode === 'custom' ? 'bg-cyan-600 text-black font-bold' : 'text-slate-400 hover:text-white'}`}>
                  Custom Scenario
                </button>
              </div>
            )}
            {simulatorMode === 'failure' && (
              <p className="text-[10px] text-slate-400 font-sans mt-1.5 leading-relaxed">Inject a controlled equipment or environmental failure into the cloned Digital Twin, then evaluate the backend recovery strategy.</p>
            )}
            {simulatorMode === 'compare' && (
              <p className="text-[10px] text-slate-400 font-sans mt-1.5 leading-relaxed">Compare the unmodified baseline against a controlled what-if trajectory using one shared ML forecast and the same closed-loop EMS optimizer.</p>
            )}
          </div>

          {scenarioMode === 'custom' && simulatorMode !== 'failure' && (
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-700/50 space-y-2 text-xs font-mono">
              <div className="text-cyan-300 font-bold font-sans">Custom Scenario Parameters</div>
              <Range label="Wind reduction" value={custom.windReduction} min={0} max={100} unit="%" onChange={v=>setCustom(c=>({...c,windReduction:v}))} disabled={isRunning}/>
              <Range label="Solar reduction" value={custom.solarReduction} min={0} max={100} unit="%" onChange={v=>setCustom(c=>({...c,solarReduction:v}))} disabled={isRunning}/>
              <Range label="Wind speed override" value={custom.windSpeed} min={0} max={30} unit=" m/s" step={0.5} onChange={v=>setCustom(c=>({...c,windSpeed:v}))} disabled={isRunning}/>
              <Range label="Load increase" value={custom.loadIncrease} min={0} max={100} unit="%" onChange={v=>setCustom(c=>({...c,loadIncrease:v}))} disabled={isRunning}/>
              <Range label="Temperature" value={custom.temperature} min={-60} max={0} unit="°C" onChange={v=>setCustom(c=>({...c,temperature:v}))} disabled={isRunning}/>
              <Range label="Battery health" value={custom.batteryHealth} min={0} max={100} unit="%" onChange={v=>setCustom(c=>({...c,batteryHealth:v}))} disabled={isRunning}/>
              <Range label="Initial SoC" value={custom.initialSoc} min={0} max={100} unit="%" onChange={v=>setCustom(c=>({...c,initialSoc:v}))} disabled={isRunning}/>
              <Range label="Initial fuel" value={custom.fuelLiters} min={0} max={20000} unit="L" step={100} onChange={v=>setCustom(c=>({...c,fuelLiters:v}))} disabled={isRunning}/>
              <button disabled={isRunning}
                onClick={()=>setCustom(c=>({...c,dieselAvailable:!c.dieselAvailable}))} className={`w-full py-1.5 rounded border text-[10px] ${custom.dieselAvailable?'bg-emerald-950 border-emerald-700 text-emerald-300':'bg-red-950 border-red-700 text-red-300'}`}>Diesel availability: {custom.dieselAvailable?'AVAILABLE':'UNAVAILABLE'}</button>
            </div>
          )}

          {/* Scenario List */}
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {visibleScenarios.map((sc) => {
              const isSelected = selectedScenario.id === sc.id;
              return (
                <div
                  key={sc.id}
                  onClick={() => { if (!isRunning) setSelectedScenario(sc); }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400/50'
                      : 'bg-[#030914] border-cyan-950/80 text-slate-400 hover:text-slate-200 hover:bg-cyan-950/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white font-sans">{sc.name}</span>
                    <span className="text-[10px] font-mono text-cyan-400/80">{sc.category}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5 leading-snug">
                    {sc.description}
                  </p>
                </div>
              );
            })}
          </div>

          {simulatorMode !== 'failure' && (
            <button disabled={isRunning}
            onClick={() => setScenarioMode('custom')} className="w-full py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 font-semibold text-xs transition-all cursor-pointer font-sans">
              + Create Custom Scenario
            </button>
          )}
        </div>

        {/* Center / Right: Active Scenario Controls & Digital Twin (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white font-sans flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Scenario: {scenarioMode === 'custom' ? 'Custom Scenario' : selectedScenario.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {scenarioMode === 'custom' ? 'Operator-defined disturbance and operating constraints' : selectedScenario.description}
              </p>
            </div>

            <button
              onClick={simulatorMode === 'compare' ? handleRunWhatIf : handleRunSimulation}
              disabled={isRunning}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer shrink-0 font-sans"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>{isRunning ? (simulatorMode === 'compare' ? 'Comparing...' : 'Simulating...') : (simulatorMode === 'compare' ? 'Run What-If Comparison' : 'Run Simulation')}</span>
            </button>
            {strategyHint && <span className="text-[10px] text-cyan-300 font-mono">{strategyHint}</span>}
            {simulationError && <span className="text-[10px] text-red-300 font-mono">{simulationError}</span>}
            {simulationRan && !simulationError && <span className="text-[10px] text-emerald-300 font-mono">Simulation complete · {simulationResult?.resilienceOutcome} · {simulationResult?.failureDurationHours}h</span>}
          </div>
          {simulationRan && simulationResult && <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{[['Average Generation',`${simulationResult.totalGenerationKw.toFixed(1)} kW`],['Fuel',`${simulationResult.fuelConsumptionLhr.toFixed(1)} L/hr`],['Min SOC',`${simulationResult.batterySocMinPercent.toFixed(1)} %`],['Unserved',`${simulationResult.unservedLoadKw.toFixed(1)} kWh`]].map(([label,value])=><div key={label} className="p-2 rounded-lg bg-[#040d1a]/90 border border-cyan-800/60"><span className="text-[9px] text-slate-500 block">{label}</span><span className="text-xs font-bold text-white font-mono">{value}</span></div>)}</div>}

          {/* Digital Twin View with Failure Marker */}
          <div className="relative">
            <DigitalTwinStation
              mode="simulator"
              showInspector={false}
              showTimeline={false}
              showFailureMarker={Boolean(failedNodeId && simulationRan)}
              failedAssetId={failedNodeId}
              simulationPoint={simulationResult?.points?.[0]}
            />
          </div>

          {/* Simulation Settings Bar */}
          <div className="p-3 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-sans">Failure Duration:</span>
              <select
                value={duration}
                disabled={isRunning}
                onChange={(e) => setDuration(e.target.value)}
                className="px-2 py-1 rounded bg-[#030914] border border-cyan-950 text-cyan-300 text-xs"
              >
                <option>24 hours</option>
                <option>48 hours</option>
                <option>72 hours</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-sans">Start Time:</span>
              <select
                value={startTime}
                disabled={isRunning}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-2 py-1 rounded bg-[#030914] border border-cyan-950 text-cyan-300 text-xs"
              >
                <option>Now</option>
                <option>+6h</option>
                <option>+12h</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-sans">Enable AI Re-optimization</span>
              <button
                disabled={isRunning}
                onClick={() => setEnableAiReopt(!enableAiReopt)}
                className={`w-8 h-4.5 rounded-full p-0.5 transition-all cursor-pointer ${
                  enableAiReopt ? 'bg-cyan-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    enableAiReopt ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-sans">Show Step-by-Step</span>
              <button
                disabled={isRunning}
                onClick={() => setShowStepByStep(!showStepByStep)}
                className={`w-8 h-4.5 rounded-full p-0.5 transition-all cursor-pointer ${
                  showStepByStep ? 'bg-cyan-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    showStepByStep ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Bottom Section: Results Comparison, Load & Generation Graph, AI Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Results Comparison (5 cols) */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-white font-sans">Results Comparison</span>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> Current Plan
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span> After Failure
              </span>
            </div>
          </div>

          <div className="space-y-2.5 font-mono text-xs pt-1">
            <div className="p-2 rounded-lg bg-[#030914] border border-cyan-950 flex justify-between items-center">
              <span className="text-slate-400 font-sans">Average Generation</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Backend baseline</span>
                <span className="text-cyan-400">→</span>
                <span className="font-bold text-white">{simulationResult ? simulationResult.totalGenerationKw.toFixed(0) : "—"} kW</span>
                <span className="text-orange-400 text-[11px]">{simulationResult ? `${simulationResult.generationDeltaPercent.toFixed(0)}%` : "—"}</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#030914] border border-cyan-950 flex justify-between items-center">
              <span className="text-slate-400 font-sans">Fuel Consumption</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Backend baseline</span>
                <span className="text-cyan-400">→</span>
                <span className="font-bold text-white">{simulationResult ? simulationResult.fuelConsumptionLhr.toFixed(1) : "—"} L/hr</span>
                <span className="text-slate-500 text-[11px]">scenario delta below</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#030914] border border-cyan-950 flex justify-between items-center">
              <span className="text-slate-400 font-sans">Battery SoC (min)</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Twin baseline</span>
                <span className="text-cyan-400">→</span>
                <span className="font-bold text-white">{simulationResult ? simulationResult.batterySocMinPercent.toFixed(1) : "—"} %</span>
                <span className="text-orange-400 text-[11px]">scenario minimum</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#030914] border border-cyan-950 flex justify-between items-center">
              <span className="text-slate-400 font-sans">Reserve Level</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Twin target</span>
                <span className="text-cyan-400">→</span>
                <span className="font-bold text-white">{simulationResult ? simulationResult.reserveLevelPercent.toFixed(1) : "—"} %</span>
                <span className="text-amber-400 text-[11px]">scenario reserve</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#030914] border border-cyan-950 flex justify-between items-center">
              <span className="text-slate-400 font-sans">Unserved Load</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Baseline</span>
                <span className="text-cyan-400">→</span>
                <span className="font-bold text-emerald-400">{simulationResult ? `${simulationResult.unservedLoadKw.toFixed(2)} kWh` : "—"}</span>
                <span className="text-emerald-400 text-[11px] font-sans font-semibold">{simulationResult ? (simulationResult.unservedLoadKw <= 0.01 ? 'No projected shed' : 'Projected shed') : 'Run scenario'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Load & Generation (Next 24 Hours) (4 cols) */}
        <div className="lg:col-span-4 p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2 flex flex-col justify-between">
          <span className="font-bold text-sm text-white font-sans block">
            Load & Generation <span className="text-xs font-mono text-slate-400">(Next 24 Hours)</span>
          </span>

          <div className="h-36 w-full">
            <svg className="w-full h-full" viewBox="0 0 250 90" preserveAspectRatio="none">
              {(() => { const pts:any[] = simulationResult?.points ?? []; const max=Math.max(1,...pts.map(p=>Math.max(Number(p.load_kw||0),Number(p.solar_power_kw||0)+Number(p.wind_power_kw||0)+Number(p.diesel_power_kw||0)))); const line=(vals:number[])=>vals.map((v,i)=>`${i/Math.max(1,vals.length-1)*250},${82-(v/max)*65}`).join(' '); return pts.length ? <><polyline points={line(pts.map(p=>Number(p.load_kw||0)))} fill="none" stroke="#ef4444" strokeWidth="1.8"/><polyline points={line(pts.map(p=>Number(p.solar_power_kw||0)+Number(p.wind_power_kw||0)+Number(p.diesel_power_kw||0)))} fill="none" stroke="#06b6d4" strokeWidth="1.8"/></> : <><path d="M0,50 Q50,45 100,40 T200,45 T250,40" fill="none" stroke="#475569" strokeWidth="1.8"/><text x="125" y="45" textAnchor="middle" fill="#64748b" fontSize="8">Run simulation</text></>; })()}
            </svg>
          </div>

          <div className="flex justify-between font-mono text-[9px] text-slate-500">
            <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span>
          </div>
        </div>

        {/* AI Analysis (3 cols) */}
        <div className="lg:col-span-3 p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-white font-sans">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>AI Analysis</span>
            </div>
            <div className="p-3 rounded-xl bg-[#030914] border border-cyan-950 mt-2 text-xs text-slate-300 leading-relaxed font-sans">
              {simulationResult ? simulationResult.aiAnalysis : "Run the scenario to obtain the backend simulation result."}
            </div>
          </div>

          <button disabled={!simulationResult} onClick={() => setShowReport(true)} className="w-full py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans disabled:opacity-40 disabled:cursor-not-allowed">
            <span>{showReport ? 'Report Ready' : 'View Detailed Report'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {simulatorMode === 'compare' && whatIfResult && (
        <div className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/95 border border-violet-500/40 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-white">Baseline vs What-If</div>
              <p className="text-[10px] text-slate-400 mt-0.5">{whatIfResult.title} · {whatIfResult.horizonHours}h · same ML forecast bundle · closed-loop EMS</p>
            </div>
            <span className="px-2 py-1 rounded bg-violet-950/60 border border-violet-700/50 text-[9px] font-mono text-violet-300">{whatIfResult.dataStatus}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <CompareCard label="Fuel consumed" base={`${whatIfResult.baseline.fuelConsumedLiters.toFixed(1)} L`} scenario={`${whatIfResult.whatIf.fuelConsumedLiters.toFixed(1)} L`} delta={`${whatIfResult.delta.fuelConsumedLiters >= 0 ? '+' : ''}${whatIfResult.delta.fuelConsumedLiters.toFixed(1)} L`} tone="amber" />
            <CompareCard label="Renewable share" base={`${whatIfResult.baseline.renewableSharePercent.toFixed(1)} %`} scenario={`${whatIfResult.whatIf.renewableSharePercent.toFixed(1)} %`} delta={`${whatIfResult.delta.renewableSharePercent >= 0 ? '+' : ''}${whatIfResult.delta.renewableSharePercent.toFixed(1)} pp`} tone="cyan" />
            <CompareCard label="Minimum battery SOC" base={`${whatIfResult.baseline.minimumSocPercent.toFixed(1)} %`} scenario={`${whatIfResult.whatIf.minimumSocPercent.toFixed(1)} %`} delta={`${whatIfResult.delta.minimumSocPercent >= 0 ? '+' : ''}${whatIfResult.delta.minimumSocPercent.toFixed(1)} pp`} tone="violet" />
            <CompareCard label="Load shed" base={`${whatIfResult.baseline.loadShedEnergyKwh.toFixed(2)} kWh`} scenario={`${whatIfResult.whatIf.loadShedEnergyKwh.toFixed(2)} kWh`} delta={`${whatIfResult.delta.loadShedEnergyKwh >= 0 ? '+' : ''}${whatIfResult.delta.loadShedEnergyKwh.toFixed(2)} kWh`} tone="red" />
            <CompareCard label="Critical coverage" base={`${whatIfResult.baseline.criticalLoadCoveragePercent.toFixed(1)} %`} scenario={`${whatIfResult.whatIf.criticalLoadCoveragePercent.toFixed(1)} %`} delta={`${whatIfResult.delta.criticalLoadCoveragePercent >= 0 ? '+' : ''}${whatIfResult.delta.criticalLoadCoveragePercent.toFixed(1)} pp`} tone="emerald" />
            <CompareCard label="Average generation" base={`${whatIfResult.baseline.averageGenerationKw.toFixed(1)} kW`} scenario={`${whatIfResult.whatIf.averageGenerationKw.toFixed(1)} kW`} delta={`${whatIfResult.delta.averageGenerationKw >= 0 ? '+' : ''}${whatIfResult.delta.averageGenerationKw.toFixed(1)} kW`} tone="cyan" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#030914] border border-cyan-950">
              <div className="text-[10px] font-bold text-white mb-2">POLAR interpretation</div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                {whatIfResult.delta.fuelConsumedLiters > 0 ? 'The what-if trajectory increases modeled fuel consumption.' : 'The what-if trajectory does not increase modeled fuel consumption.'}{' '}
                {whatIfResult.delta.renewableSharePercent < 0 ? 'Renewable contribution decreases under the scenario.' : 'Renewable contribution is maintained or increased.'}{' '}
                {whatIfResult.delta.criticalLoadCoveragePercent < 0 ? 'Critical-load coverage is reduced and should be reviewed.' : 'Critical-load coverage remains at or above the baseline.'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#030914] border border-cyan-950">
              <div className="text-[10px] font-bold text-white mb-2">Provenance & decision path</div>
              <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono text-slate-400">
                <span>Forecast</span><span className="text-cyan-300">ML-backed · {whatIfResult.forecastSource}</span>
                <span>Weather</span><span className="text-amber-300">{whatIfResult.forecastSyntheticWeather ? 'REFERENCE / SYNTHETIC' : 'EXTERNAL'}</span>
                <span>Re-optimization</span><span className="text-emerald-300">{whatIfResult.aiReoptimizationApplied ? 'ENABLED' : 'DISABLED'}</span>
                <span>Critical load</span><span className={whatIfResult.whatIf.criticalLoadCoveragePercent >= 100 ? 'text-emerald-300' : 'text-red-300'}>{whatIfResult.whatIf.criticalLoadCoveragePercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStepByStep && simulationRan && simulationResult && (
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg">
          <div className="text-sm font-bold text-white">Simulation Execution Trace</div>
          <div className="grid md:grid-cols-4 gap-2 mt-3 text-[10px] font-mono">
            {[['1','Clone current Twin','Baseline preserved'],['2','Inject scenario','Failure/disturbance applied'],['3','Recalculate dispatch','AI re-optimization '+(simulationResult.aiReoptimizationApplied ? 'enabled' : 'disabled')],['4','Evaluate resilience',simulationResult.resilienceOutcome]].map(([n,t,d])=><div key={n} className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950"><span className="text-cyan-400 font-bold">STEP {n}</span><div className="text-white mt-1">{t}</div><div className="text-slate-500 mt-0.5">{d}</div></div>)}
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[10px] font-mono text-left">
              <thead className="text-slate-500 border-b border-cyan-950"><tr><th className="py-1">Step</th><th>Load</th><th>Generation</th><th>SOC</th><th>Fuel</th><th>Served</th></tr></thead>
              <tbody>{(simulationResult.points ?? []).filter((_, i) => i % Math.max(1, Math.ceil((simulationResult.points?.length ?? 1) / 8)) === 0).map((p) => <tr key={p.hour_offset} className="border-b border-cyan-950/50"><td className="py-1 text-cyan-300">+{p.hour_offset}h</td><td>{p.load_kw.toFixed(1)} kW</td><td>{(p.solar_power_kw+p.wind_power_kw+p.diesel_power_kw).toFixed(1)} kW</td><td>{p.battery_soc_percent.toFixed(1)}%</td><td>{p.fuel_remaining_liters.toFixed(0)} L</td><td>{p.served_load_kw.toFixed(1)} kW</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {showReport && simulationResult && (
        <div id="simulation-report" className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/95 border border-cyan-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between"><div><span className="font-bold text-sm text-white">Detailed Simulation Report</span><p className="text-[10px] text-slate-400">Scenario: {simulationResult.title} · Duration: {simulationResult.failureDurationHours}h · Backend model</p></div><span className="px-2 py-1 rounded bg-cyan-950 text-cyan-300 text-[10px] font-mono">{simulationResult.resilienceOutcome}</span></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <ReportStat label="Average Generation" value={`${simulationResult.totalGenerationKw.toFixed(1)} kW`} />
            <ReportStat label="Fuel" value={`${simulationResult.fuelConsumptionLhr.toFixed(2)} L/hr`} />
            <ReportStat label="Min SOC" value={`${simulationResult.batterySocMinPercent.toFixed(1)} %`} />
            <ReportStat label="Reserve" value={`${simulationResult.reserveLevelPercent.toFixed(1)} %`} />
            <ReportStat label="Critical coverage" value={`${simulationResult.criticalLoadCoveragePercent.toFixed(1)} %`} />
          </div>
          <div className="p-3 rounded-lg bg-[#030914] border border-cyan-950 text-xs text-slate-300"><span className="text-cyan-300 font-semibold">Analysis:</span> {simulationResult.aiAnalysis}</div>
          <div className="p-3 rounded-lg bg-[#030914] border border-cyan-950"><span className="text-xs font-semibold text-white">Recommended actions</span><div className="mt-2 grid md:grid-cols-2 gap-1.5">{simulationResult.recommendedActions.length ? simulationResult.recommendedActions.map((a,i)=><div key={i} className="text-[10px] text-slate-300">{i+1}. {a}</div>) : <div className="text-[10px] text-slate-500">No additional actions returned by the backend scenario model.</div>}</div></div>
        </div>
      )}
    </div>
  );
};

const CompareCard = ({label,base,scenario,delta,tone}:{label:string;base:string;scenario:string;delta:string;tone:'amber'|'cyan'|'violet'|'red'|'emerald'}) => {
  const toneClass = { amber:'text-amber-300', cyan:'text-cyan-300', violet:'text-violet-300', red:'text-red-300', emerald:'text-emerald-300' }[tone];
  return <div className="p-3 rounded-xl bg-[#030914] border border-violet-950/80"><span className="text-[9px] text-slate-500 block">{label}</span><div className="grid grid-cols-[1fr_auto] gap-x-2 text-[10px] font-mono mt-1"><span className="text-slate-500">Baseline</span><span className="text-slate-200">{base}</span><span className="text-slate-500">What-if</span><span className="font-bold text-white">{scenario}</span></div><div className={`mt-1.5 font-mono text-[10px] font-bold ${toneClass}`}>Δ {delta}</div></div>;
};
const Range = ({label,value,min,max,unit,step=1,onChange,disabled}:{label:string;value:number;min:number;max:number;unit:string;step?:number;onChange:(v:number)=>void;disabled?:boolean}) => <label className="block"><div className="flex justify-between text-[10px] text-slate-400"><span>{label}</span><span className="text-cyan-300">{value}{unit}</span></div><input className="w-full accent-cyan-400" type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))}/></label>;
const ReportStat = ({label,value}:{label:string;value:string}) => <div className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950"><span className="text-[9px] text-slate-500 block">{label}</span><span className="text-sm font-bold text-white font-mono">{value}</span></div>;
