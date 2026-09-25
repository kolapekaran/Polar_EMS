import React, { useEffect, useMemo, useState } from 'react';
import { Fuel, Leaf, Clock, CloudSnow, Sparkles, FileSpreadsheet, FileText } from 'lucide-react';
import { StationPageStrip } from '../../components/StationPageStrip';
import { useStation } from '../../integration/StationContext';
import { fetchStationAnalyticsProjection, downloadStationReport } from '../../integration/api';

export const AnalyticsTab: React.FC = () => {
  const { snapshot } = useStation();
  const [timeRange, setTimeRange] = useState('This Day');
  const [report, setReport] = useState<any | null>(null);
  const [downloadMsg, setDownloadMsg] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [customHours, setCustomHours] = useState(24);
  const [showCustom, setShowCustom] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const rangeHours: Record<string, number> = {
    'This Day': 24, 'This Week': 168, 'This Month': 720, 'This Season': 2160, 'Full Year': 8760, 'Custom Range': customHours,
  };
  const hours = rangeHours[timeRange] ?? 24;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setReportLoading(true);
    setReportError('');
    (hours === 24 ? fetchStationAnalyticsProjection(hours) : fetchStationAnalyticsProjection(hours, controller.signal)).then((projection) => {
      if (cancelled) return;
      const metrics = projection?.metrics ?? {};
      const points = Array.isArray(projection?.points) ? projection.points : [];
      setReport({
        report_generated_at: new Date().toISOString(),
        station: 'Maitri Research Station',
        horizon_hours: Number(projection?.horizon_hours ?? hours),
        data_status: projection?.synthetic_weather ? 'ENGINEERING_MODEL' : 'REFERENCE',
        calibration_note: 'Reference Digital Twin projection; not field-calibrated telemetry unless supplied by ingestion.',
        current: points[0] ? {
          timestamp: points[0].timestamp,
          temperature_celsius: points[0].temperature_celsius,
          wind_speed_mps: points[0].wind_speed_mps,
          battery_soc_percent: Number(points[0].battery_soc_ratio ?? 0) * 100,
          fuel_remaining_liters: points[0].fuel_remaining_liters,
          load_kw: points[0].load_kw,
          served_load_kw: points[0].served_load_kw,
          renewable_power_kw: Number(points[0].solar_power_kw ?? 0) + Number(points[0].wind_power_kw ?? 0),
          diesel_power_kw: points[0].diesel_power_kw,
        } : {},
        forecast_summary: {
          solar_energy_kwh: Number(metrics.solar_energy_kwh ?? 0),
          wind_energy_kwh: Number(metrics.wind_energy_kwh ?? 0),
          renewable_energy_kwh: Number(metrics.renewable_energy_kwh ?? 0),
          diesel_energy_kwh: Number(metrics.diesel_energy_kwh ?? 0),
          renewable_share_percent: Number(metrics.renewable_share ?? 0) * 100,
          diesel_share_percent: Number(metrics.diesel_share ?? 0) * 100,
          load_energy_kwh: Number(metrics.load_energy_kwh ?? 0),
          served_energy_kwh: Number(metrics.served_energy_kwh ?? 0),
          load_shed_energy_kwh: Number(metrics.load_shed_energy_kwh ?? 0),
          generator_runtime_hours: Number(metrics.diesel_runtime_hours ?? 0),
        },
        resilience: {
          minimum_soc_percent: Number(metrics.minimum_soc_ratio ?? 0) * 100,
          final_soc_percent: Number(metrics.final_soc_ratio ?? 0) * 100,
          fuel_consumed_liters: Number(metrics.fuel_consumed_liters ?? 0),
          final_fuel_liters: Number(metrics.final_fuel_liters ?? 0),
          autonomy_days: metrics.estimated_autonomy_days,
          critical_load_failure_steps: Number(metrics.critical_load_failure_steps ?? 0),
          blackout_risk_percent: Number(metrics.blackout_risk_percent ?? 0),
          fuel_reserve_reached: Boolean(metrics.fuel_reserve_reached),
        },
        risk: {
          blackout_risk_percent: Number(metrics.blackout_risk_percent ?? 0),
        },
        series: points,
      });
    }).catch((error) => {
      if (!cancelled && !controller.signal.aborted) {
        setReport(null);
        setReportError(error instanceof Error ? error.message : 'Backend analytics projection unavailable');
      }
    }).finally(() => { if (!cancelled) setReportLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [hours]);

  const summary = report?.forecast_summary;
  const current = report?.current;
  const resilience = report?.resilience;
  const series = useMemo(() => report?.series ?? snapshot.horizonForecast, [report, snapshot.horizonForecast]);
  // Derive the displayed average from the authoritative projection series first.
  // This prevents a malformed/legacy summary metric from ever collapsing a
  // full-horizon demand display to an obviously incorrect value.
  const seriesLoads = series.map((x: any) => Number(x.load_kw ?? x.predictedTotalLoadKw ?? 0)).filter((v: number) => Number.isFinite(v));
  const avgLoad = seriesLoads.length
    ? seriesLoads.reduce((sum: number, value: number) => sum + value, 0) / seriesLoads.length
    : (summary?.load_energy_kwh != null && hours ? summary.load_energy_kwh / hours : snapshot.powerBalance.totalLoadKw);
  const peakLoad = seriesLoads.length ? Math.max(...seriesLoads) : snapshot.powerBalance.totalLoadKw;
  const renewableShare = summary?.renewable_share_percent ?? snapshot.powerBalance.renewableSharePercent;
  const fuelRate = snapshot.fuel.currentConsumptionRateLhr;
  const unserved = summary?.load_shed_energy_kwh;
  const fuelConsumed = report?.resilience?.fuel_consumed_liters;
  const generatorRuntime = summary?.generator_runtime_hours;
  const chartPoints = useMemo(() => {
    if (!series.length) return [];
    const targetBins = hours <= 24 ? 8 : hours <= 168 ? 7 : 12;
    const bins = Math.min(targetBins, series.length);
    const out: any[] = [];
    for (let i = 0; i < bins; i++) {
      const start = Math.floor(i * series.length / bins);
      const end = Math.max(start + 1, Math.floor((i + 1) * series.length / bins));
      const bucket = series.slice(start, end);
      const avg = (key: string) => bucket.reduce((sum: number, row: any) => sum + Number(row[key] ?? 0), 0) / Math.max(1, bucket.length);
      const firstOffset = Number(bucket[0]?.hour_offset ?? start);
      let label = `+${firstOffset}h`;
      if (hours > 720) label = `M${i + 1}`;
      else if (hours > 168) label = `D${Math.floor(firstOffset / 24) + 1}`;
      else if (hours > 24) label = `D${Math.floor(firstOffset / 24) + 1}`;
      out.push({
        wind_power_kw: avg('wind_power_kw'),
        solar_power_kw: avg('solar_power_kw'),
        diesel_power_kw: avg('diesel_power_kw'),
        hour_offset: firstOffset,
        label,
      });
    }
    return out;
  }, [series, hours]);

  const handleDownload = async (type: string) => {
    try {
      const format = type === 'CSV Data' ? 'csv' : 'pdf';
      const blob = await downloadStationReport(hours, format);
      const extension = format === 'csv' ? 'csv' : 'pdf';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `polar-ems-${hours}h.${extension}`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloadMsg(`${extension.toUpperCase()} downloaded successfully.`);
    } catch (e) {
      setDownloadMsg(`Export unavailable: ${e instanceof Error ? e.message : 'backend error'}`);
    }
    setTimeout(() => setDownloadMsg(''), 3000);
  };

  return <div className="space-y-4 text-slate-200">
    <StationPageStrip title="Analytics" subtitle="History, prediction performance, anomalies, decision outcomes and model learning" right={<div className="flex items-center gap-1 overflow-x-auto max-w-full text-xs font-sans">{Object.keys(rangeHours).map((range) => <button key={range} onClick={() => { setTimeRange(range); if (range === 'Custom Range') setShowCustom(true); }} className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${timeRange === range ? 'bg-cyan-600 text-black font-bold shadow-md' : 'bg-[#040d1a]/85 text-slate-300 hover:text-white border border-cyan-950'}`}>{range}</button>)}{showCustom && <div className="flex items-center gap-1 ml-1"><input type="number" min={1} max={8760} value={customHours} onChange={e=>setCustomHours(Math.max(1,Math.min(8760,Number(e.target.value)||1)))} className="w-16 px-2 py-1 rounded bg-[#030914] border border-cyan-700 text-cyan-300"/><span className="text-[9px] text-slate-500">h</span></div>}</div>} />

    {(reportLoading || reportError) && <div className={`px-3 py-2 rounded-lg border text-xs font-mono ${reportError ? 'border-red-900/70 bg-red-950/30 text-red-300' : 'border-cyan-900/60 bg-cyan-950/20 text-cyan-300'}`}>{reportLoading ? `Loading authoritative analytics projection (${hours}h)…` : `Backend analytics projection unavailable: ${reportError}`}</div>}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
      <Metric icon={<Fuel className="w-4 h-4 text-emerald-400" />} label="Fuel Consumed" value={fuelConsumed != null ? `${fuelConsumed.toFixed(1)} L` : '—'} note={`${hours}h backend projection`} />
      <Metric icon={<Leaf className="w-4 h-4 text-cyan-400" />} label="Renewable Share" value={`${renewableShare.toFixed(1)} %`} note="Backend forecast summary" />
      <Metric icon={<Clock className="w-4 h-4 text-blue-400" />} label="Generator Runtime" value={generatorRuntime != null ? `${generatorRuntime.toFixed(1)} hrs` : '—'} note={`${hours}h projected runtime`} />
      <Metric icon={<CloudSnow className="w-4 h-4 text-emerald-400" />} label="Unserved Energy" value={unserved != null ? `${unserved.toFixed(2)} kWh` : '—'} note={unserved == null ? 'Backend report unavailable' : unserved <= 0.01 ? 'No projected load shed' : 'Projected load shed'} />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-7 space-y-4">
        <div className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3 font-mono">
          <div className="flex items-center justify-between"><div><span className="font-bold text-sm text-white font-sans">Forecast Generation Mix <span className="text-xs font-mono text-slate-400">({timeRange}, {hours}h · average power kW)</span></span><div className="flex items-center gap-3 text-[9px] text-slate-500 font-mono mt-1"><span><i className="inline-block w-2 h-2 bg-emerald-400 mr-1"/>Wind</span><span><i className="inline-block w-2 h-2 bg-yellow-400 mr-1"/>Solar</span><span><i className="inline-block w-2 h-2 bg-orange-500 mr-1"/>Diesel</span></div></div><span className="text-[10px] text-slate-500">{report?.data_status ?? snapshot.provenance.forecastModelSource}</span></div>
          <div className="h-48 flex items-end justify-between gap-2 pt-6 px-2">
            {chartPoints.map((bar: any, i: number) => {
              const wind = Number(bar.wind_power_kw ?? bar.predictedWindKw ?? 0);
              const solar = Number(bar.solar_power_kw ?? bar.predictedSolarKw ?? 0);
              const diesel = Number(bar.diesel_power_kw ?? bar.predictedDieselKw ?? 0);
              const total = wind + solar + diesel;
              const max = Math.max(1, total);
              const label = bar.label ?? `+${bar.hour_offset ?? i}h`;
              return (
                <div
                  key={i}
                  className="relative flex-1 flex flex-col items-center gap-1 h-full justify-end"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {hoveredBar === i && (
                    <div className="absolute z-20 bottom-20 left-1/2 -translate-x-1/2 w-44 p-2.5 rounded-lg bg-[#020814] border border-cyan-700/80 shadow-xl text-[10px] font-mono text-slate-200 pointer-events-none">
                      <div className="font-bold text-cyan-300 mb-1.5">{label} Forecast</div>
                      <div className="flex justify-between"><span className="text-emerald-300">Wind</span><span>{wind.toFixed(1)} kW</span></div>
                      <div className="flex justify-between"><span className="text-yellow-300">Solar</span><span>{solar.toFixed(1)} kW</span></div>
                      <div className="flex justify-between"><span className="text-orange-300">Diesel</span><span>{diesel.toFixed(1)} kW</span></div>
                      <div className="border-t border-cyan-950 my-1.5" />
                      <div className="flex justify-between font-bold text-white"><span>Total</span><span>{total.toFixed(1)} kW</span></div>
                      <div className="mt-1.5 text-[8px] text-amber-300">{report?.data_status ?? snapshot.provenance.forecastModelSource}</div>
                    </div>
                  )}
                  <span className="text-[9px] text-slate-400">{total.toFixed(0)} kW</span>
                  <div className="w-full h-32 rounded-t overflow-hidden bg-slate-800 flex flex-col justify-end cursor-crosshair">
                    <div className="w-full bg-emerald-400" style={{height:`${wind/max*100}%`}}/>
                    <div className="w-full bg-yellow-400" style={{height:`${solar/max*100}%`}}/>
                    <div className="w-full bg-orange-500" style={{height:`${diesel/max*100}%`}}/>
                  </div>
                  <span className="text-[9px] text-slate-500">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
          <span className="font-bold text-sm text-white font-sans">Backend Risk & Resilience</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <Stat label="Peak Load" value={`${peakLoad.toFixed(1)} kW`} /><Stat label="Avg Load" value={`${avgLoad.toFixed(1)} kW`} /><Stat label="Min SOC" value={`${(resilience?.minimum_soc_percent ?? snapshot.battery.socPercent).toFixed(1)} %`} /><Stat label="Final Fuel" value={`${(resilience?.final_fuel_liters ?? snapshot.fuel.currentVolumeLiters).toFixed(0)} L`} />
          </div>
        </div>
        <div className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
          <div className="flex items-center justify-between"><span className="font-bold text-sm text-white font-sans">Validation & Model Quality</span><span className="text-[10px] font-mono text-amber-300">REFERENCE DATA</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
            <Stat label="MAE" value="Unavailable" /><Stat label="RMSE" value="Unavailable" /><Stat label="MAPE" value="Unavailable" />
          </div>
          <p className="text-[10px] text-slate-500 font-sans">Actual prediction-error metrics are not shown because the current dataset is synthetic/reference and does not contain field-calibrated validation observations.</p>
        </div>
      </div>
      <div className="lg:col-span-5 space-y-4">
        <div className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
          <span className="font-bold text-sm text-white font-sans block">KPI Summary</span>
          <div className="space-y-2 font-mono text-xs divide-y divide-cyan-950/60">
            <Row label="Average Demand" value={`${avgLoad.toFixed(1)} kW`} /><Row label="Peak Demand" value={`${peakLoad.toFixed(1)} kW`} /><Row label="Renewable Penetration" value={`${renewableShare.toFixed(1)} %`} /><Row label="Current Fuel Rate (instantaneous)" value={`${fuelRate.toFixed(1)} L/hr`} /><Row label="Unserved Energy" value={unserved != null ? `${unserved.toFixed(2)} kWh` : '—'} /><Row label="Blackout Risk" value={report?.risk?.blackout_risk_percent != null ? `${Number(report.risk.blackout_risk_percent).toFixed(1)} %` : '—'} />
          </div>
        </div>
        <div className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-sm text-white font-sans"><Sparkles className="w-4 h-4 text-cyan-400" /><span>AI / Model Insights</span></div>
          <div className="space-y-2 text-xs font-sans">
            <div className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950 text-slate-300">Forecast confidence is derived from the backend forecast intervals; current weather source: <span className="text-cyan-300 font-semibold">{snapshot.weather.provenance}</span>.</div>
            <div className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950 text-slate-300">Thermal recovery is <span className="text-orange-400 font-semibold">{snapshot.thermal.recoveredHeatKw.toFixed(1)} kW</span> in the current Twin state.</div>
            <div className="p-2.5 rounded-lg bg-[#030914] border border-cyan-950 text-slate-300">Data mode: <span className="text-amber-300 font-semibold">{report?.data_status ?? snapshot.provenance.powerTelemetrySource}</span>. Values are not presented as field telemetry unless supplied by ingestion. Validation metrics require actual field observations.</div>
          </div>
        </div>
        <div className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
          <div className="flex items-center justify-between"><span className="font-bold text-sm text-white font-sans">Anomaly Monitor</span><span className="text-[10px] font-mono text-slate-500">REFERENCE DATA</span></div>
          <p className="text-xs text-slate-400 font-sans">No field-calibrated anomaly stream is available in the current reference dataset. Risk indicators above are projection-derived, not confirmed field anomalies.</p>
        </div>
        <div className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
          <div className="flex items-center justify-between"><span className="font-bold text-sm text-white font-sans">Decision Outcomes</span><span className="text-[10px] font-mono text-slate-500">NO HISTORY</span></div>
          <p className="text-xs text-slate-400 font-sans">No authoritative applied-strategy outcome history is currently stored. Expected-vs-actual decision performance will appear here when validated operational history is available.</p>
        </div>
        <div className="p-4 sm:p-5 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg space-y-3">
          <div className="flex items-center justify-between"><span className="font-bold text-sm text-white font-sans">Export Reports</span>{downloadMsg && <span className="text-[11px] font-mono text-emerald-400">{downloadMsg}</span>}</div>
          <div className="grid grid-cols-2 gap-2.5 font-sans"><button onClick={() => void handleDownload('PDF Report')} className="py-2 px-3 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"><FileText className="w-4 h-4"/>PDF / Print</button><button onClick={() => void handleDownload('CSV Data')} className="py-2 px-3 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"><FileSpreadsheet className="w-4 h-4"/>CSV Export</button></div>
        </div>
      </div>
    </div>
  </div>;
};

const Metric = ({icon,label,value,note}:{icon:React.ReactNode;label:string;value:string;note:string}) => <div className="p-4 rounded-xl bg-[#040d1a]/90 border border-cyan-900/60 shadow-lg"><div className="flex items-center justify-between text-slate-400 text-xs font-sans"><span>{label}</span>{icon}</div><div className="my-2 text-2xl font-bold text-cyan-300">{value}</div><span className="text-[10px] text-slate-400 font-sans">{note}</span></div>;
const Row = ({label,value}:{label:string;value:string}) => <div className="flex justify-between pt-1.5"><span className="text-slate-400 font-sans">{label}</span><span className="font-bold text-white">{value}</span></div>;
const Stat = ({label,value}:{label:string;value:string}) => <div className="p-3 rounded-lg bg-[#030914] border border-cyan-950"><span className="text-[10px] text-slate-500 block">{label}</span><span className="font-bold text-white">{value}</span></div>;
