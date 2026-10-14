'use client';

import React, { useState, useEffect } from 'react';
import { backendBridge } from '@/lib/retro-sequencer/backend-bridge';
import { KeyMaskPayload } from '@/lib/retro-sequencer/types';
import { 
  Terminal, 
  Copy, 
  Download, 
  Sliders, 
  Check, 
  Zap, 
  Play, 
  Square, 
  Activity, 
  ShieldCheck,
  Radio,
  Trash2
} from 'lucide-react';

interface BackendTelemetryPanelProps {
  onBpmChange: (bpm: number) => void;
  currentBpm: number;
}

export const BackendTelemetryPanel: React.FC<BackendTelemetryPanelProps> = ({
  onBpmChange,
  currentBpm,
}) => {
  const [isSimActive, setIsSimActive] = useState<boolean>(false);
  const [manualVelocity, setManualVelocity] = useState<number>(0.9);
  const [telemetryList, setTelemetryList] = useState<any[]>([]);
  const [keyMaskList, setKeyMaskList] = useState<KeyMaskPayload[]>([]);
  const [totalKeyMaskDispatches, setTotalKeyMaskDispatches] = useState<number>(0);
  const [latestKeyMask, setLatestKeyMask] = useState<KeyMaskPayload | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedKeyMask, setCopiedKeyMask] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'simulator' | 'telemetry' | 'keymask_stream' | 'bridge_api'>('simulator');

  useEffect(() => {
    const updateLogs = () => {
      setTelemetryList([...backendBridge.getEmittedTelemetry()]);
      setIsSimActive(backendBridge.isSimActive());
      setKeyMaskList([...backendBridge.getKeyMaskTelemetry()]);
      setTotalKeyMaskDispatches(backendBridge.getTotalKeyMaskDispatched());
    };

    const interval = setInterval(updateLogs, 250);

    // Listen to custom emitted event
    const handleEmitted = () => updateLogs();
    window.addEventListener('sequencer:track_data_emitted', handleEmitted);

    // Listen to real-time keyMask stream dispatched by KeyboardInputLogger
    const unsubKeyMask = backendBridge.onKeyMask((payload) => {
      setLatestKeyMask(payload);
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('sequencer:track_data_emitted', handleEmitted);
      unsubKeyMask();
    };
  }, []);

  const handleToggleSimulator = () => {
    if (backendBridge.isSimActive()) {
      backendBridge.stopSimulator();
      setIsSimActive(false);
    } else {
      backendBridge.startSimulator(currentBpm, 64);
      setIsSimActive(true);
    }
  };

  const handleTriggerPad = (padIdx: number, noteName: string) => {
    backendBridge.simulateBeatTrigger(padIdx, manualVelocity, noteName);
  };

  const handleCopyJson = (data: any, idx: number) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadJson = (data: any, characterId: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sequencer_track_${characterId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3 font-mono">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold tracking-wider text-slate-200">
            BACKEND BRIDGE TELEMETRY & TEST CONTROL PANEL
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-2.5 py-1 rounded transition ${
              activeTab === 'simulator'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Debug Simulator
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
              activeTab === 'telemetry'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Telemetry Payloads</span>
            {telemetryList.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-bold flex items-center justify-center">
                {telemetryList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('keymask_stream')}
            className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
              activeTab === 'keymask_stream'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>rAF KeyMask Stream</span>
            {totalKeyMaskDispatches > 0 && (
              <span className="px-1 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                {totalKeyMaskDispatches > 999 ? `${Math.round(totalKeyMaskDispatches / 100) / 10}k` : totalKeyMaskDispatches}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('bridge_api')}
            className={`px-2.5 py-1 rounded transition ${
              activeTab === 'bridge_api'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bridge API Spec
          </button>
        </div>
      </div>

      {/* Tab 1: Debug Simulator */}
      {activeTab === 'simulator' && (
        <div className="space-y-3">
          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleSimulator}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition shadow ${
                  isSimActive
                    ? 'bg-rose-600 text-white shadow-rose-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                }`}
              >
                {isSimActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isSimActive ? 'STOP SIMULATOR' : 'START DEBUG SIMULATOR'}</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">MASTER BPM:</span>
                <input
                  type="range"
                  min={60}
                  max={180}
                  value={currentBpm}
                  onChange={(e) => onBpmChange(Number(e.target.value))}
                  className="w-28 accent-cyan-400"
                />
                <span className="text-xs font-bold text-cyan-400">{currentBpm}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">TRIGGER VELOCITY:</span>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={manualVelocity}
                onChange={(e) => setManualVelocity(Number(e.target.value))}
                className="w-20 accent-emerald-400"
              />
              <span className="text-xs font-bold text-emerald-400">{Math.round(manualVelocity * 100)}%</span>
            </div>
          </div>

          {/* Manual Pad Buttons for testing visual reactions */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              Simulate Incoming onBeatTrigger(padIndex, velocity):
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {[
                { id: 0, name: 'Kick' },
                { id: 1, name: 'Snare' },
                { id: 2, name: 'CHH' },
                { id: 3, name: 'OHH' },
                { id: 4, name: 'Clap' },
                { id: 5, name: 'Perc' },
                { id: 6, name: 'Bass' },
                { id: 7, name: 'Laser' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleTriggerPad(p.id, p.name)}
                  className="px-2 py-1.5 bg-slate-950 hover:bg-slate-800 active:bg-cyan-500/20 active:border-cyan-400 border border-slate-800 rounded text-center text-xs text-slate-300 font-bold transition"
                >
                  P{p.id + 1} {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Emitted Telemetry Payloads */}
      {activeTab === 'telemetry' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>EMITTED TRACK TELEMETRY BUFFER (SAVED OVERDUBS)</span>
            {telemetryList.length > 0 && (
              <button
                onClick={() => backendBridge.clearTelemetry()}
                className="text-rose-400 hover:underline"
              >
                Clear History
              </button>
            )}
          </div>

          {telemetryList.length === 0 ? (
            <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-lg text-center text-xs text-slate-500">
              No recorded overdub payloads emitted yet. Arm a character track and hit <strong className="text-rose-400">OVERDUB REC</strong> on the transport to sample movement locked to master clock steps.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {telemetryList.map((item, idx) => {
                const planBSize = item.planBJsonSizeKB || Math.max(0.1, Math.round((item.rawJsonSizeKB * 0.08) * 10) / 10);
                const percentSaved = Math.round((1 - planBSize / Math.max(0.01, item.rawJsonSizeKB)) * 100);

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-col gap-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-900 text-blue-200 font-bold text-[10px]">
                          {item.characterId}
                        </span>
                        <span className="text-slate-400">
                          {item.frameCount} frames sampled ({new Date(item.timestamp).toLocaleTimeString()})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyJson(item.frames, idx)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1"
                        >
                          {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedIndex === idx ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                        <button
                          onClick={() => handleDownloadJson(item.frames, item.characterId)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Export</span>
                        </button>
                      </div>
                    </div>

                    {/* Plan B Comparison Callout */}
                    <div className="p-2 bg-slate-900 rounded border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-400">Raw Coordinates JSON: </span>
                        <span className="font-bold text-amber-400">{item.rawJsonSizeKB} KB</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Plan B Tick-Mask JSON: </span>
                        <span className="font-bold text-emerald-400">{planBSize} KB</span>
                      </div>
                      <div className="text-emerald-400 font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>{percentSaved > 0 ? `${percentSaved}% Payload Compression` : 'Optimized'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Real-Time rAF KeyMask Stream (KeyboardInputLogger) */}
      {activeTab === 'keymask_stream' && (
        <div className="space-y-3">
          {/* Diagnostic overview banner */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-200">
                  KeyboardInputLogger Anti-Throttling Stream
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                  rAF SYNC ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-xl">
                Polls the boolean <code className="text-cyan-300">keysPressed</code> map on every frame and emits <code className="text-cyan-300">keyMask</code> payloads to the <code className="text-cyan-300">backendBridge</code>, completely bypassing browser DOM event-listener throttling and OS typematic repeat bottlenecks.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (keyMaskList.length > 0) {
                    navigator.clipboard.writeText(JSON.stringify(keyMaskList[0], null, 2));
                    setCopiedKeyMask(true);
                    setTimeout(() => setCopiedKeyMask(false), 2000);
                  }
                }}
                disabled={keyMaskList.length === 0}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded text-xs flex items-center gap-1.5 transition font-semibold"
              >
                {copiedKeyMask ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKeyMask ? 'Copied' : 'Copy Latest'}</span>
              </button>
              <button
                onClick={() => backendBridge.clearKeyMaskTelemetry()}
                className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded text-xs flex items-center gap-1 transition"
                title="Clear KeyMask stream buffer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Dispatches</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">
                {totalKeyMaskDispatches.toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Drops Prevented</span>
              <span className="text-lg font-bold text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>{latestKeyMask?.dropsPrevented || keyMaskList[0]?.dropsPrevented || 0}</span>
              </span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Current KeyMask</span>
              <span className="text-lg font-bold text-amber-400 font-mono">
                0x{(latestKeyMask?.keyMask ?? 0).toString(16).toUpperCase().padStart(2, '0')}{' '}
                <span className="text-xs text-slate-400 font-normal font-sans">
                  ({latestKeyMask?.keyMask ?? 0})
                </span>
              </span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Active Keys</span>
              <span className="text-xs font-bold text-slate-200 truncate block mt-1">
                {latestKeyMask && latestKeyMask.activeKeys.length > 0
                  ? latestKeyMask.activeKeys.join(', ')
                  : 'Idle (None held)'}
              </span>
            </div>
          </div>

          {/* Real-Time Payload Stream Log */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>RECENT DISPATCHED KEYMASK PAYLOADS (BUFFER: {keyMaskList.length})</span>
              <span className="text-[10px] text-emerald-400 font-mono">Real-Time WebSocket/IPC Mirror</span>
            </div>

            {keyMaskList.length === 0 ? (
              <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-lg text-center text-xs text-slate-500">
                Awaiting key input. Press WASD, Space, E, or F in the viewport or floating HUD to observe frame-perfect telemetry dispatches.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                {keyMaskList.slice(0, 20).map((payload, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded border flex flex-wrap items-center justify-between gap-2 transition ${
                      payload.keyMask > 0
                        ? 'bg-slate-950 border-cyan-800/80 text-cyan-200'
                        : 'bg-slate-950/60 border-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px]">
                        Frame #{payload.frameNumber}
                      </span>
                      <span className="text-cyan-300 font-bold">
                        mask: 0x{payload.keyMask.toString(16).toUpperCase().padStart(2, '0')}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        [{payload.activeKeys.length > 0 ? payload.activeKeys.join('+') : 'IDLE'}]
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-amber-400 font-bold uppercase">
                        {payload.action}
                      </span>
                      <span className="text-slate-500">
                        dir: ({payload.direction.x},{payload.direction.y})
                      </span>
                      {payload.dropsPrevented !== undefined && payload.dropsPrevented > 0 && (
                        <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" />
                          <span>+{payload.dropsPrevented} saved</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: BackendBridge API Specification */}
      {activeTab === 'bridge_api' && (
        <div className="space-y-2 text-xs text-slate-300">
          <p className="text-[11px] text-slate-400">
            The frontend connects strictly via the global <code className="text-cyan-400">window.BackendBridge</code> object, custom window events, or iframe <code className="text-cyan-400">postMessage</code>:
          </p>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] leading-relaxed overflow-x-auto text-emerald-400">
            <pre>{`// 1. Send Master Clock Tick to Frontend:
window.BackendBridge.tickClock({
  step: 14, timestamp: performance.now(), bpm: 124, bar: 1, beat: 4, totalSteps: 64
});

// 2. Trigger Pad Beat Event:
window.BackendBridge.triggerBeat(0, 0.95, "Kick");

// 3. Receive Recorded Player Overdub Telemetry from Frontend:
window.addEventListener("sequencer:track_data_emitted", (e) => {
  console.log("Track ID:", e.detail.characterId);
  console.log("Recorded Frames Array:", e.detail.frames);
});

// 4. Ingest High-Precision rAF KeyMask Stream (KeyboardInputLogger):
window.addEventListener("sequencer:key_mask_dispatched", (e) => {
  const { keyMask, activeKeys, action, dropsPrevented } = e.detail;
  // Bit flags: Bit 0=Left, 1=Right, 2=Up, 3=Down, 4=Jump, 5=Dance, 6=Spin
  console.log("Live KeyMask:", keyMask, "Active:", activeKeys);
});`}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
