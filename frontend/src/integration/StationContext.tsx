/**
 * Central Station Context (Data Layer)
 * Provides authoritative station snapshot, decision strategy, resilience status,
 * time machine scrubber offsets, and asset inspector state.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import {
  StationSnapshot,
  UnifiedStrategyResponse,
  StationResilienceOverview,
  NavigationTab,
  SystemMode,
} from './types';
import {
  fetchStationSnapshot,
  getOfflineSnapshot,
  fetchStationStrategy,
  fetchStationResilience,
  prefetchStationStrategy,
  prefetchStationResilience,
  fallbackSnapshot,
  API_BASE,
  prefetchStationAnalyticsProjection,
} from './api';

interface StationContextType {
  snapshot: StationSnapshot;
  strategy: UnifiedStrategyResponse | null;
  resilience: StationResilienceOverview | null;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  timeOffset: number; // 0, 6, 12, 24, 48, 72
  setTimeOffset: (offset: number) => void;
  isPlayingTimeline: boolean;
  setIsPlayingTimeline: (play: boolean) => void;
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  systemMode: SystemMode;
  setSystemMode: (mode: SystemMode) => void;
  isStationBrainOpen: boolean;
  setIsStationBrainOpen: (open: boolean) => void;
  refreshSnapshot: (offset?: number) => Promise<void>;
  refreshStrategy: (params?: Parameters<typeof fetchStationStrategy>[0]) => Promise<UnifiedStrategyResponse | null>;
  refreshResilience: (hours?: number, forceRefresh?: boolean) => Promise<StationResilienceOverview | null>;
  resilienceLoading: boolean;
  resilienceError: string;
  backendConnected: boolean;
  appliedOpportunities: Record<string, boolean>;
  toggleOpportunity: (id: string) => void;
  appliedStrategyCode: string;
  setAppliedStrategyCode: (code: string) => void;
  strategyLoading: boolean;
  strategyError: string;
  startupReady: boolean;
  startupLoading: boolean;
}

const StationContext = createContext<StationContextType | undefined>(undefined);

export const StationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState<StationSnapshot>(fallbackSnapshot);
  const [strategy, setStrategy] = useState<UnifiedStrategyResponse | null>(null);
  const [strategyLoading, setStrategyLoading] = useState<boolean>(false);
  const [strategyError, setStrategyError] = useState<string>('');
  const snapshotRequestId = useRef(0);
  const snapshotAbortController = useRef<AbortController | null>(null);
  const strategyRequestId = useRef(0);
  const strategyAbortController = useRef<AbortController | null>(null);
  // A manual operator recalculation must remain authoritative until the next
  // scheduled refresh; background snapshot/prefetch work must not overwrite it.
  const strategyManualHold = useRef(false);
  const resilienceAbortController = useRef<AbortController | null>(null);
  const resilienceRequestId = useRef(0);
  const resilienceInFlight = useRef<{ hours: number; promise: Promise<StationResilienceOverview | null> } | null>(null);
  const [resilience, setResilience] = useState<StationResilienceOverview | null>(null);
  const [resilienceLoading, setResilienceLoading] = useState(false);
  const [resilienceError, setResilienceError] = useState('');
  const [backendConnected, setBackendConnected] = useState(true);
  const [startupReady, setStartupReady] = useState(false);
  const [startupLoading, setStartupLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavigationTab>('command-center');
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [systemMode, setSystemModeState] = useState<SystemMode>('LIVE');
  const timeOffsetRef = useRef(0);
  const systemModeRef = useRef<SystemMode>('LIVE');
  timeOffsetRef.current = timeOffset;
  systemModeRef.current = systemMode;

  // The application mode is UI-wide state. Backend snapshots remain the data source,
  // but their legacy `mode` field must never override the operator-selected mode.
  const setSystemMode = (mode: SystemMode) => {
    setSystemModeState(mode);
    setSnapshot(prev => ({ ...prev, mode }));
  };
  const [isStationBrainOpen, setIsStationBrainOpen] = useState<boolean>(false);
  const [appliedStrategyCode, setAppliedStrategyCode] = useState<string>('');
  const [appliedOpportunities, setAppliedOpportunities] = useState<Record<string, boolean>>({
    'opp-1': true,
    'opp-2': false,
    'opp-3': false,
  });

  const refreshStrategy = useCallback(async (params?: Parameters<typeof fetchStationStrategy>[0]) => {
    const requestId = ++strategyRequestId.current;
    strategyAbortController.current?.abort();
    const controller = new AbortController();
    strategyAbortController.current = controller;
    setStrategyLoading(true);
    setStrategyError('');
    try {
      const result = await fetchStationStrategy(params, controller.signal);
      if (!result?.recommendedStrategy?.code) throw new Error('Decision engine returned no feasible strategy.');
      if (requestId !== strategyRequestId.current || controller.signal.aborted) return result;
      setStrategy(result);
      strategyManualHold.current = true;
      return result;
    } catch (err) {
      if (controller.signal.aborted && requestId !== strategyRequestId.current) return null;
      console.warn('Refresh strategy error:', err);
      if (requestId === strategyRequestId.current) {
        const message = err instanceof Error ? (err.name === 'AbortError' ? 'Decision engine request timed out or was cancelled.' : err.message) : 'Decision engine unavailable';
        setStrategyError(message);
        throw new Error(message);
      }
      return null;
    } finally {
      if (requestId === strategyRequestId.current) {
        strategyAbortController.current = null;
        setStrategyLoading(false);
      }
    }
  }, []);

  const refreshResilience = useCallback((hours: number = 72, forceRefresh: boolean = false): Promise<StationResilienceOverview | null> => {
    // React StrictMode/tab remounts must never launch duplicate expensive work.
    if (!forceRefresh && resilienceInFlight.current?.hours === hours) return resilienceInFlight.current.promise;

    const requestId = ++resilienceRequestId.current;
    resilienceAbortController.current?.abort();
    const controller = new AbortController();
    resilienceAbortController.current = controller;
    setResilienceLoading(true);
    setResilienceError('');

    let promise: Promise<StationResilienceOverview | null>;
    promise = (async () => {
      try {
        const result = forceRefresh
          ? await fetchStationResilience(hours, controller.signal)
          : await prefetchStationResilience(hours);
        if (requestId !== resilienceRequestId.current || controller.signal.aborted) return result;
        setResilience(result);
        setResilienceError('');
        return result;
      } catch (err) {
        if (controller.signal.aborted && requestId !== resilienceRequestId.current) return null;
        const message = err instanceof Error ? err.message : 'Resilience backend unavailable';
        if (requestId === resilienceRequestId.current) setResilienceError(message);
        console.warn('Refresh resilience error:', err);
        return null;
      } finally {
        if (requestId === resilienceRequestId.current) {
          resilienceAbortController.current = null;
          setResilienceLoading(false);
        }
        if (resilienceInFlight.current?.promise === promise) resilienceInFlight.current = null;
      }
    })();

    resilienceInFlight.current = { hours, promise };
    return promise;
  }, []);

  const refreshSnapshot = useCallback(async (offset?: number) => {
    const effectiveOffset = offset ?? timeOffsetRef.current;
    const requestId = ++snapshotRequestId.current;
    snapshotAbortController.current?.abort();
    const controller = new AbortController();
    snapshotAbortController.current = controller;
    try {
      const snap = await fetchStationSnapshot(effectiveOffset, controller.signal);
      if (requestId !== snapshotRequestId.current) return;
      setBackendConnected(true);
      const normalizedSnapshot = { ...snap, selectedHourOffset: snap.selectedHourOffset ?? effectiveOffset, mode: systemModeRef.current };
      setSnapshot(normalizedSnapshot);
      // A snapshot may already contain the same decision-engine response. Use it
      // immediately; otherwise consume the shared startup strategy promise.
      if (snap.decisionStrategy?.recommendedStrategy?.code) {
        if (!strategyManualHold.current) {
          setStrategy(snap.decisionStrategy);
          setStrategyError('');
        }
      } else if (effectiveOffset === 0) {
        // Some compatible backend snapshots do not embed the decision result.
        // Consume the shared startup strategy promise instead of launching a
        // second request that could cancel the startup request.
        void prefetchStationStrategy().then(setStrategy).catch(() => undefined);
      }
    } catch (err) {
      if (requestId !== snapshotRequestId.current) return;
      if (controller.signal.aborted) return;
      setBackendConnected(false);
      setSnapshot({ ...getOfflineSnapshot(), selectedHourOffset: effectiveOffset, mode: 'SIMULATION' });
      setStrategyError(prev => prev || 'Backend connection unavailable.');
      console.warn('Refresh snapshot error:', err);
    } finally {
      if (requestId === snapshotRequestId.current) snapshotAbortController.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const prepareStartupData = async () => {
      setStartupLoading(true);
      setStartupReady(false);
      // Prepare the complete default operational view together. These requests
      // start from the provider, not from individual tabs, and their promises
      // are shared/cached so opening a tab never creates a second calculation.
      const results = await Promise.allSettled([
        refreshSnapshot(0),
        prefetchStationStrategy(),
        prefetchStationResilience(72),
        prefetchStationAnalyticsProjection(24),
      ]);

      if (cancelled) return;

      const strategyResult = results[1];
      if (strategyResult.status === 'fulfilled' && strategyResult.value?.recommendedStrategy?.code) {
        setStrategy(strategyResult.value);
        setStrategyError('');
      } else if (strategyResult.status === 'rejected') {
        setStrategyError(strategyResult.reason instanceof Error ? strategyResult.reason.message : 'Decision engine unavailable');
      }

      const resilienceResult = results[2];
      if (resilienceResult.status === 'fulfilled') {
        setResilience(resilienceResult.value);
        setResilienceError('');
      } else {
        setResilienceError(resilienceResult.reason instanceof Error ? resilienceResult.reason.message : 'Resilience backend unavailable');
      }

      // The application becomes interactive only after the startup data pass has
      // settled. This guarantees that switching to Optimization/Resilience/
      // Analytics after startup reads prepared data instead of showing a first-load spinner.
      setStartupReady(true);
      setStartupLoading(false);
    };

    void prepareStartupData();

    return () => { cancelled = true; };
  }, [refreshSnapshot]);

  // Keep the current station state fresh after the initial operational data pass.
  // This effect never controls startup readiness and never launches the expensive
  // resilience/analytics calculations on tab changes.
  useEffect(() => {
    const handleSettingsChanged = () => {
      // Settings are a local operator policy, but the resulting strategy/resilience
      // values must still come from the backend. Re-evaluate them immediately so
      // saving a new reserve floor never leaves Command Center/Resilience stale.
      void refreshStrategy().catch(() => undefined);
      void refreshResilience(72, true).catch(() => undefined);
    };
    window.addEventListener('polar-ems-settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('polar-ems-settings-changed', handleSettingsChanged);
  }, [refreshStrategy, refreshResilience]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (timeOffset === 0) {
        // Refresh station telemetry every minute. If the operator has just
        // recalculated a strategy, preserve that decision for this refresh
        // cycle rather than replacing it with the startup/default policy.
        void refreshSnapshot(0);
        if (strategyManualHold.current) {
          strategyManualHold.current = false;
        } else {
          void prefetchStationStrategy().then(setStrategy).catch(() => undefined);
        }
        void refreshResilience(72).catch(() => undefined);
        void prefetchStationAnalyticsProjection(24).catch(() => undefined);
      } else {
        void refreshSnapshot(timeOffset);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [timeOffset, refreshSnapshot, refreshResilience]);


  useEffect(() => {
    const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws/live';
    let socket: WebSocket | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);
        socket.onopen = () => {
          heartbeat = setInterval(() => socket?.send('ping'), 10000);
        };
        socket.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            if (raw?.weather && raw?.generation && raw?.loads) {
              void refreshSnapshot();
            }
          } catch { /* ignore malformed live frames */ }
        };
        socket.onclose = () => {
          if (heartbeat) clearInterval(heartbeat);
          if (!stopped) setTimeout(connect, 5000);
        };
      } catch { /* polling remains authoritative fallback */ }
    };
    connect();
    return () => {
      stopped = true;
      if (heartbeat) clearInterval(heartbeat);
      socket?.close();
    };
  }, [timeOffset, systemMode]);




  useEffect(() => () => { snapshotAbortController.current?.abort(); strategyAbortController.current?.abort(); resilienceAbortController.current?.abort(); }, []);

  // Timeline playback animation loop
  useEffect(() => {
    if (!isPlayingTimeline) return;
    const offsets = [0, 6, 12, 24, 48, 72];
    const timer = setInterval(() => {
      setTimeOffset((prev) => {
        const idx = offsets.indexOf(prev);
        if (idx === -1 || idx === offsets.length - 1) {
          return 0;
        }
        return offsets[idx + 1];
      });
    }, 2800);
    return () => clearInterval(timer);
  }, [isPlayingTimeline]);

  const toggleOpportunity = (id: string) => {
    setAppliedOpportunities((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <StationContext.Provider
      value={{
        snapshot,
        strategy,
        resilience,
        activeTab,
        setActiveTab,
        timeOffset,
        setTimeOffset,
        isPlayingTimeline,
        setIsPlayingTimeline,
        selectedAssetId,
        setSelectedAssetId,
        systemMode,
        setSystemMode,
        isStationBrainOpen,
        setIsStationBrainOpen,
        refreshSnapshot,
        refreshStrategy,
        refreshResilience,
        resilienceLoading,
        resilienceError,
        backendConnected,
        strategyLoading,
        strategyError,
        startupReady,
        startupLoading,
        appliedOpportunities,
        toggleOpportunity,
        appliedStrategyCode,
        setAppliedStrategyCode,
      }}
    >
      {children}
    </StationContext.Provider>
  );
};

export const useStation = (): StationContextType => {
  const context = useContext(StationContext);
  if (!context) {
    throw new Error('useStation must be used within a StationProvider');
  }
  return context;
};
