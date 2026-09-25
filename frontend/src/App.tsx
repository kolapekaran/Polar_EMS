/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { AssetDetailModal } from './components/AssetDetailModal';

import { CommandCenterTab } from './tabs/01-command-center/CommandCenterTab';
import { OptimizationTab } from './tabs/02-optimization-advisory/OptimizationTab';
import { EnergyTab } from './tabs/03-energy/EnergyTab';
import { AssetsLoadsTab } from './tabs/04-assets-loads/AssetsLoadsTab';
import { SimulatorTab } from './tabs/05-simulator/SimulatorTab';
import { ResilienceTab } from './tabs/06-resilience/ResilienceTab';
import { AnalyticsTab } from './tabs/07-analytics/AnalyticsTab';

import { TabType, StationNode, AssetRecord } from './types';

import { StationProvider, useStation } from './integration/StationContext';
import { StationBrainModal } from './components/advanced/StationBrainModal';

function AppContent() {
  const { snapshot, activeTab, setActiveTab, startupReady, startupLoading } = useStation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Asset detail modal
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);

  const handleOpenAssetModal = (asset: AssetRecord) => {
    setSelectedAsset(asset);
  };

  if (!startupReady) {
    return (
      <div className="min-h-screen w-full bg-[#020712] text-slate-100 flex items-center justify-center font-sans">
        <div className="w-full max-w-xl px-8 text-center">
          <div className="mx-auto mb-6 w-16 h-16 rounded-2xl border border-cyan-500/50 bg-[#061426] flex items-center justify-center shadow-[0_0_35px_rgba(0,200,255,0.18)]">
            <div className="w-7 h-7 rounded-full border-2 border-cyan-300 border-t-transparent animate-spin" />
          </div>
          <div className="text-2xl font-extrabold tracking-tight">POLAR EMS</div>
          <div className="mt-1 text-xs tracking-[0.22em] text-cyan-300/80 font-mono uppercase">Maitri Research Station · Operational Intelligence</div>
          <div className="mt-8 rounded-xl border border-cyan-900/60 bg-[#040d1a]/90 p-5 text-left shadow-lg">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Preparing authoritative station data</span>
              <span className="text-cyan-300">{startupLoading ? 'INITIALIZING' : 'READY'}</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full w-2/3 bg-cyan-400 animate-pulse" /></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
              <span>● Digital Twin / Forecast</span><span>● Decision Engine</span>
              <span>● Resilience Intelligence</span><span>● Analytics Projection</span>
            </div>
          </div>
          <div className="mt-4 text-[10px] text-slate-600 font-mono">The control interface will open after the initial data pass completes.</div>
        </div>
      </div>
    );
  }

  const handleOpenNodeModal = (node: StationNode) => {
    const generator = snapshot.generators.find(g => node.name.toLowerCase().includes(g.name.toLowerCase().replace('diesel generator ', '')) || node.name.toLowerCase().includes('diesel'));
    const renewable = snapshot.renewables.find(r => node.name.toLowerCase().includes(r.type === 'Wind Turbine' ? 'wind' : 'solar'));
    const load = snapshot.loads.find(l => node.name.toLowerCase().includes(l.name.toLowerCase()) || (l.name === 'Research & Labs' && node.name.toLowerCase().includes('research')));
    const source: any = generator || renewable || load;
    if (source) {
      const isGen = 'capacityKw' in source && 'healthPercent' in source;
      setSelectedAsset({
        id: source.id.replace('-', ''), name: source.name, type: source.type,
        status: source.status === 'ONLINE' ? 'Online' : source.status === 'STANDBY' ? 'Standby' : source.status === 'OFFLINE' ? 'Maintenance' : 'Online',
        capacity: isGen ? `${source.capacityKw.toFixed(0)} kW` : ('capacityKw' in source ? `${source.capacityKw.toFixed(0)} kW` : `${source.currentLoadKw.toFixed(0)} kW`),
        currentOutput: isGen || 'currentOutputKw' in source ? `${source.currentOutputKw.toFixed(0)} kW` : `${source.currentLoadKw.toFixed(0)} kW`,
        efficiency: isGen ? `${(source.electricalEfficiency * 100).toFixed(0)}%` : 'Modelled',
        health: isGen ? `${source.healthPercent.toFixed(0)}%` : 'Unknown',
        nextMaintenance: isGen ? `${source.nextMaintenanceHours.toFixed(0)} hrs` : '—',
        fuelRate: isGen ? `${source.fuelConsumptionLhr.toFixed(1)} L/hr` : undefined,
        runtime: isGen ? `${source.runtimeHours.toFixed(0)} hrs` : undefined,
      });
      return;
    }
    setSelectedAsset(null);
  };
  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#020712] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Background radial ambiance */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#072444]/25 via-[#020712]/70 to-[#020712] -z-10"></div>

      {/* Main App Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Primary Dashboard Content Area */}
      <main className="flex-1 w-full px-0 py-0">
        {activeTab === 'command-center' && (
          <CommandCenterTab
            onNavigateTab={setActiveTab}
            onOpenAnalyticsModal={handleOpenNodeModal}
          />
        )}

        {activeTab === 'optimization' && (
          <OptimizationTab onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'energy' && (
          <EnergyTab
            onNavigateTab={setActiveTab}
            onOpenAnalyticsModal={handleOpenNodeModal}
          />
        )}

        {activeTab === 'assets-loads' && (
          <AssetsLoadsTab
            onOpenAssetDetail={handleOpenAssetModal}
            onOpenNodeDetail={handleOpenNodeModal}
          />
        )}

        {activeTab === 'simulator' && <SimulatorTab />}

        {activeTab === 'resilience' && <ResilienceTab />}

        {activeTab === 'analytics' && <AnalyticsTab />}
      </main>

      {/* Station Footer */}
      <Footer />

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenSettings={() => {
          setIsProfileOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AssetDetailModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
      />
      <StationBrainModal />
    </div>
  );
}

export default function App() {
  return <StationProvider><AppContent /></StationProvider>;
}
