import React, { useState } from 'react';
import {
  CloudSnow,
  Wind,
  Eye,
  Droplets,
  Search,
  Sparkles,
  Zap,
  BatteryCharging,
  Fuel,
  Shield,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { DigitalTwinStation } from '../../components/DigitalTwinStation';
import { StationNode, TabType } from '../../types';
import { useStation } from '../../integration/StationContext';
import { askStationBrain } from '../../integration/api';
import { OperationalIntelligencePanel } from '../../components/OperationalIntelligencePanel';

interface CommandCenterTabProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenAnalyticsModal: (node: StationNode) => void;
}

export const CommandCenterTab: React.FC<CommandCenterTabProps> = ({
  onNavigateTab,
  onOpenAnalyticsModal,
}) => {
  const { snapshot, systemMode, setSystemMode, timeOffset: timelineHour, setTimeOffset: setTimelineHour, setIsStationBrainOpen } = useStation();
  const [searchQuery, setSearchQuery] = useState('');
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotAnswer, setCopilotAnswer] = useState('');
  const [copilotFacts, setCopilotFacts] = useState<string[]>([]);
  const [copilotLoading, setCopilotLoading] = useState(false);

  const handleCopilotQuery = async (prompt?: string) => {
    const text = (prompt ?? copilotQuery).trim();
    if (!text || copilotLoading) return;
    setCopilotQuery('');
    setCopilotLoading(true);
    try {
      const result = await askStationBrain(text);
      setCopilotAnswer(result.answer);
      setCopilotFacts(result.groundedFacts ?? []);
    } catch {
      setCopilotAnswer('POLAR Energy Copilot could not obtain an authoritative backend answer. No operational conclusion was inferred from missing data.');
      setCopilotFacts(['Backend response unavailable']);
    } finally {
      setCopilotLoading(false);
    }
  };
  const timelinePoint = timelineHour > 0 ? snapshot.horizonForecast.find((p) => p.hourOffset === timelineHour) : undefined;
  const displayLoad = timelinePoint?.predictedTotalLoadKw ?? snapshot.powerBalance.totalLoadKw;
  const displayWind = timelinePoint?.predictedWindKw ?? snapshot.powerBalance.windGenKw;
  const displaySolar = timelinePoint?.predictedSolarKw ?? snapshot.powerBalance.solarGenKw;
  const displayDiesel = timelinePoint?.predictedDieselKw ?? snapshot.powerBalance.dieselGenKw;
  const displayBattery = timelinePoint?.predictedBatteryKw ?? snapshot.battery.currentPowerKw;
  const displayGeneration = displayWind + displaySolar + displayDiesel;
  const displayBalance = displayGeneration + displayBattery - displayLoad;
  const displaySoc = timelinePoint?.batterySocPercent ?? snapshot.battery.socPercent;
  const displayFuel = timelinePoint?.fuelRemainingLiters ?? snapshot.fuel.currentVolumeLiters;
  const displayReserve = timelinePoint?.dynamicReserveTargetPercent ?? snapshot.reserve.currentReservePercent;

  return (
    <div className="space-y-4">
      {/* Mission-control Digital Twin viewport. Controls intentionally sit on the station image. */}
      {/* Main Digital Twin Interactive Viewport */}
      <div className="relative w-full">
        <DigitalTwinStation
          mode="command"
          onOpenAnalyticsModal={onOpenAnalyticsModal}
          timelineHour={timelineHour}
          setTimelineHour={setTimelineHour}
        />

        <div className="absolute top-4 left-5 z-40 flex items-center gap-3">
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#040d1a]/88 border border-cyan-900/70 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
              <CloudSnow className="w-7 h-7 text-cyan-300" />
              <div>
                <div className="font-bold text-xl font-mono leading-none text-white">{(timelinePoint?.temperatureC ?? snapshot.weather.temperature).toFixed(0)}°C</div>
                <div className="text-[11px] text-slate-300 mt-1">{timelinePoint ? 'Forecast' : snapshot.weather.condition}</div>
              </div>
            </div>
            <div className="h-8 w-px bg-cyan-900/80" />
            <div className="grid grid-cols-3 gap-3 text-[10px] font-mono text-slate-300">
              <span><Wind className="inline w-3 h-3 text-cyan-400 mr-1" />{(timelinePoint?.windSpeedMs ?? snapshot.weather.windSpeed).toFixed(1)} m/s ({timelinePoint ? 'Forecast' : snapshot.weather.windDirection})</span>
              <span><Eye className="inline w-3 h-3 text-cyan-400 mr-1" />{snapshot.weather.provenance === 'ENGINEERING MODEL' ? '—' : `${snapshot.weather.visibilityKm.toFixed(1)} km`}</span>
              <span><Droplets className="inline w-3 h-3 text-cyan-400 mr-1" />{snapshot.weather.provenance === 'ENGINEERING MODEL' ? '—' : `${snapshot.weather.humidity.toFixed(0)}%`}</span>
            </div>
          </div>
        </div>

        <div className="absolute top-4 right-5 z-40 flex items-center gap-2.5">
          <div className="relative w-64 hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search anything on station..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#040d1a]/90 border border-cyan-900/70 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400" />
          </div>
          <div className="flex rounded-xl bg-[#040d1a]/95 border border-cyan-900/70 p-0.5">
            <button onClick={() => setSystemMode('LIVE')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${systemMode === 'LIVE' ? 'bg-cyan-500 text-black' : 'text-slate-400'}`}>Live</button>
            <button onClick={() => { setSystemMode('SIMULATION'); onNavigateTab('simulator'); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${systemMode === 'SIMULATION' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}>Simulation</button>
          </div>
        </div>

        <div className="absolute top-7 left-1/2 -translate-x-1/2 z-30 hidden xl:block tracking-[0.35em] text-cyan-300/80 font-mono text-[10px] font-bold">CLEAN ENERGY. RESILIENT TOMORROW.</div>
        {searchQuery.trim() && <div className="absolute top-16 right-5 z-40 w-64 p-3 rounded-xl bg-[#061224]/95 border border-cyan-700/60 shadow-2xl backdrop-blur-md"><div className="text-[10px] text-cyan-400 font-mono mb-2">SEARCH RESULTS</div>{(() => { const q=searchQuery.toLowerCase(); const assets=[...snapshot.generators,...snapshot.renewables].filter(a=>`${a.id} ${a.name} ${a.type}`.toLowerCase().includes(q)); const loads=snapshot.loads.filter(l=>`${l.id} ${l.name} ${l.category}`.toLowerCase().includes(q)); return assets.length||loads.length ? <div className="space-y-1">{assets.map(a=><button key={a.id} onClick={()=>{localStorage.setItem('polar_ems_focus_asset', a.id); onNavigateTab('assets-loads')}} className="w-full text-left p-2 rounded bg-[#030914] border border-cyan-950 text-xs text-white hover:border-cyan-600">{a.name}<span className="block text-[9px] text-slate-500">{a.id} · {a.currentOutputKw.toFixed(1)} kW</span></button>)}{loads.map(l=><button key={l.id} onClick={()=>{localStorage.setItem('polar_ems_focus_asset', l.id); onNavigateTab('assets-loads')}} className="w-full text-left p-2 rounded bg-[#030914] border border-cyan-950 text-xs text-white hover:border-cyan-600">{l.name}<span className="block text-[9px] text-slate-500">{l.priority} · {l.currentLoadKw.toFixed(1)} kW</span></button>)}</div> : <div className="text-xs text-slate-500">No station asset or load matches.</div>; })()}</div>}
      </div>

      {/* Bottom KPI Row (5 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Generation vs Load (Live) */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-sans">
                Generation vs Load <span className="text-cyan-400 font-mono text-[11px]">({timelineHour === 0 ? (systemMode === 'LIVE' ? 'Live' : 'Simulation') : `+${timelineHour}h Forecast`})</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 mt-2 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Generation</span>
                <span className="text-sm font-bold text-white">{displayGeneration.toFixed(0)} kW</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Total Load</span>
                <span className="text-sm font-bold text-white">{displayLoad.toFixed(0)} kW</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Battery</span>
                <span className={`text-sm font-bold ${displayBattery >= 0 ? 'text-cyan-300' : 'text-amber-300'}`}>{displayBattery >= 0 ? '+' : ''}{displayBattery.toFixed(0)} kW</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Net Balance</span>
                <span className={`text-sm font-bold ${displayBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{displayBalance >= 0 ? '+' : ''}{displayBalance.toFixed(0)} kW</span>
              </div>
            </div>
          </div>

          {/* Graph */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Load
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Gen
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Solar
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Wind
              </span>
            </div>
            <div className="h-16 w-full">
              <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
                {(() => {
                  const pts = snapshot.horizonForecast;
                  const max = Math.max(1, ...pts.map(p => Math.max(p.predictedTotalLoadKw, p.predictedWindKw + p.predictedSolarKw + p.predictedDieselKw)));
                  const path = (values:number[]) => values.map((v,i) => `${i/(Math.max(1,values.length-1))*200},${56 - (v/max)*48}`).join(' ');
                  return <><polyline points={path(pts.map(p => p.predictedTotalLoadKw))} fill="none" stroke="#06b6d4" strokeWidth="2"/><polyline points={path(pts.map(p => p.predictedWindKw + p.predictedSolarKw + p.predictedDieselKw))} fill="none" stroke="#10b981" strokeWidth="2"/><polyline points={path(pts.map(p => p.predictedSolarKw))} fill="none" stroke="#f59e0b" strokeWidth="1.5"/><polyline points={path(pts.map(p => p.predictedWindKw))} fill="none" stroke="#22c55e" strokeWidth="1.5"/></>;
                })()}
              </svg>
            </div>
            <div className="grid grid-cols-6 font-mono text-[9px] text-slate-500">
              {[0,6,12,24,48,72].map((h) => (
                <button key={h} type="button" onClick={() => setTimelineHour(h)} className={`text-center transition-colors ${timelineHour === h ? 'text-cyan-300 font-bold' : 'hover:text-slate-300'}`}>
                  {h === 0 ? 'Now' : `+${h}h`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Battery State of Charge */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg flex flex-col justify-between">
          <span className="text-xs font-bold text-white font-sans">Battery State of Charge</span>
          <div className="flex items-center gap-3 my-2">
            {/* Donut Gauge */}
            <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
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
                  strokeDasharray={`${displaySoc}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center font-mono">
                <span className="text-sm font-bold text-white leading-none">{displaySoc.toFixed(0)}%</span>
                <span className="text-[9px] text-slate-400 leading-none mt-0.5">SoC</span>
              </div>
            </div>

            <div className="font-mono text-xs space-y-1">
              <div>
                <span className="text-[10px] text-slate-400 font-sans block">Available Energy</span>
                <span className="font-bold text-white">{(displaySoc / 100 * snapshot.battery.capacityKwh).toFixed(0)} kWh</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-sans block">Total Capacity</span>
                <span className="font-semibold text-slate-300">{snapshot.battery.capacityKwh.toFixed(0)} kWh</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 pt-1 border-t border-cyan-950">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Status: {timelinePoint ? (displayBattery < 0 ? 'CHARGING' : displayBattery > 0 ? 'DISCHARGING' : 'IDLE') : snapshot.battery.status} ({displayBattery >= 0 ? '+' : ''}{displayBattery.toFixed(0)} kW)</span>
          </div>
        </div>

        {/* Card 3: Fuel Level */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg flex flex-col justify-between">
          <span className="text-xs font-bold text-white font-sans">Fuel Level</span>
          <div className="my-1">
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-orange-400" />
              <div className="font-mono">
                <span className="text-base font-bold text-white">{displayFuel.toFixed(0)} L</span>
                <span className="text-[11px] text-slate-400 ml-1.5">of {snapshot.fuel.capacityLiters.toFixed(0)} L ({(displayFuel / Math.max(1, snapshot.fuel.capacityLiters) * 100).toFixed(0)}%)</span>
              </div>
            </div>

            {/* Segmented Fuel Bar */}
            <div className="grid grid-cols-10 gap-1 my-3">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`h-4 rounded-xs ${
                    i < Math.round((displayFuel / Math.max(1, snapshot.fuel.capacityLiters)) * 10)
                      ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                      : 'bg-slate-800'
                  }`}
                ></div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-cyan-950">
            <span className="text-slate-400 font-sans">Estimated Autonomy:</span>
            <span className="font-bold text-cyan-300">{timelinePoint ? 'Forecast' : (snapshot.fuel.estimatedAutonomyDays != null ? `${snapshot.fuel.estimatedAutonomyDays.toFixed(1)} days` : 'Unavailable')}</span>
          </div>
        </div>

        {/* Card 4: Dynamic Reserve */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg flex flex-col justify-between">
          <span className="text-xs font-bold text-white font-sans">Dynamic Reserve</span>
          <div className="flex items-center justify-center my-1">
            <div className="relative w-20 h-20 flex items-center justify-center">
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
                  strokeDasharray={`${displayReserve}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center font-mono">
                <span className="text-base font-bold text-white leading-none">{displayReserve.toFixed(0)}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-cyan-950">
            <span className="text-slate-400">Target ≥ {displayReserve.toFixed(0)}%</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Status: {timelinePoint ? 'FORECAST' : snapshot.reserve.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Card 5: Top AI Recommendation */}
        <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Top AI Recommendation
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${snapshot.topRecommendation.actionable ? 'bg-amber-950/80 border border-amber-500/50 text-amber-300' : 'bg-slate-900 border border-slate-700 text-slate-400'}`}>
                {snapshot.topRecommendation.actionable ? snapshot.topRecommendation.urgency : 'UNAVAILABLE'}
              </span>
            </div>

            <div className="mt-2 flex items-start gap-2">
              <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-200 block leading-snug">
                  {snapshot.topRecommendation.title}
                </span>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  {snapshot.topRecommendation.description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3 pt-2 border-t border-cyan-950 font-sans">
            <button
              disabled={!snapshot.topRecommendation.actionable || !snapshot.topRecommendation.strategyCode}
              onClick={() => { localStorage.setItem('polar_ems_simulation_strategy', snapshot.topRecommendation.strategyCode); onNavigateTab('simulator'); }}
              className="flex-1 py-1.5 rounded-lg border border-cyan-700/60 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-200 text-xs font-medium text-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Simulate
            </button>
            <button
              onClick={() => onNavigateTab('optimization')}
              className="flex-1 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold text-center transition-colors cursor-pointer shadow-md shadow-cyan-600/30"
            >
              View Details
            </button>
          </div>
        </div>
      </div>

      {/* Unified operational intelligence: audit, performance, alerts, timeline and provenance */}
      <OperationalIntelligencePanel />

      {/* Backend-grounded Energy Copilot */}
      <section className="rounded-xl bg-[#040d1a]/95 border border-cyan-900/60 shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-cyan-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">POLAR ENERGY COPILOT</div>
              <div className="text-[10px] font-mono text-slate-500">Digital Twin · ML forecast · EMS optimization · resilience grounded</div>
            </div>
          </div>
          <button type="button" onClick={() => setIsStationBrainOpen(true)} className="px-2.5 py-1.5 rounded-lg border border-cyan-800/60 bg-cyan-950/40 text-[10px] font-mono text-cyan-300 hover:bg-cyan-900/60 transition-colors">Open full Copilot</button>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          <div>
            <div className="flex gap-2">
              <input
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCopilotQuery()}
                placeholder="Ask why, what-if, forecast, fuel, risk, or critical-load questions..."
                className="flex-1 min-w-0 bg-[#09172f] border border-slate-700/80 focus:border-cyan-400 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button type="button" onClick={() => handleCopilotQuery()} disabled={copilotLoading || !copilotQuery.trim()} className="px-3.5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-black text-xs font-bold">{copilotLoading ? '...' : 'Ask'}</button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {[
                'Why is diesel increasing tomorrow?',
                'What is the biggest risk in the next 24 hours?',
                'Are critical loads protected?',
                'Why did POLAR choose this strategy?',
              ].map((q) => (
                <button key={q} type="button" onClick={() => handleCopilotQuery(q)} className="px-2.5 py-1 rounded-full border border-slate-800 bg-slate-950/70 text-[9px] font-mono text-slate-400 hover:text-cyan-300 hover:border-cyan-800 transition-colors">{q}</button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-[#061224] border border-cyan-950/80 p-3 min-h-[92px]">
            <div className="text-[9px] font-mono text-cyan-500 mb-1.5">BACKEND-GROUNDED RESPONSE</div>
            <div className="text-xs text-slate-200 leading-relaxed min-h-[34px]">{copilotLoading ? 'Analyzing Digital Twin, ML forecast and EMS constraints...' : (copilotAnswer || 'Ask a question to inspect the current station state or forecast-driven decision.')}</div>
            {copilotFacts.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{copilotFacts.slice(0, 4).map((fact, i) => <span key={i} className="px-1.5 py-1 rounded bg-cyan-950/50 border border-cyan-900/60 text-[8px] font-mono text-cyan-300">{fact}</span>)}</div>}
          </div>
        </div>
      </section>
    </div>
  );
};
