'use client';

import React from 'react';
import { ThemeMode } from '@/lib/types';
import { Sliders, Palette, Mic, Volume2, Shield, HeartPulse, Sparkles, Key } from 'lucide-react';

interface Props {
  themeMode: ThemeMode;
  onChangeTheme: (mode: ThemeMode) => void;
  heartbeatThreshold: number;
  onChangeHeartbeatThreshold: (val: number) => void;
}

export const SettingsView: React.FC<Props> = ({
  themeMode,
  onChangeTheme,
  heartbeatThreshold,
  onChangeHeartbeatThreshold
}) => {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-sm">Orchestra Mission Control Preferences</h2>
            <p className="text-xs text-slate-400">Desktop theme, heartbeat timers, and local control settings</p>
          </div>
        </div>
      </div>

      {/* Theme Selection Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-slate-100 font-semibold text-sm flex items-center gap-2">
          <Palette className="w-4 h-4 text-blue-400" />
          Aesthetic Visual Themes
        </h3>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <button
            onClick={() => onChangeTheme('modern')}
            className={`p-3 rounded-xl border text-left transition ${themeMode === 'modern' ? 'bg-blue-600/20 border-blue-500 text-white font-semibold' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
          >
            <div className="text-sm font-bold text-white mb-1">Modern Dark</div>
            <p className="text-[11px] opacity-80">Futuristic cyan & slate glassmorphism UI</p>
          </button>

          <button
            onClick={() => onChangeTheme('matrix')}
            className={`p-3 rounded-xl border text-left transition ${themeMode === 'matrix' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-semibold' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
          >
            <div className="text-sm font-bold text-emerald-400 mb-1 font-mono">Matrix CRT</div>
            <p className="text-[11px] opacity-80 font-mono">Retro phosphor green with scanlines</p>
          </button>

          <button
            onClick={() => onChangeTheme('monokai')}
            className={`p-3 rounded-xl border text-left transition ${themeMode === 'monokai' ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-semibold' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
          >
            <div className="text-sm font-bold text-amber-300 mb-1">Monokai Pro</div>
            <p className="text-[11px] opacity-80">High-contrast developer palette</p>
          </button>
        </div>
      </div>

      {/* Heartbeat Threshold Config */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-slate-100 font-semibold text-sm flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-emerald-400" />
          Node Companion Heartbeat Thresholds
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Healthy Heartbeat Window:</span>
            <span className="font-mono text-emerald-400 font-bold">{heartbeatThreshold} Seconds</span>
          </div>

          <input
            type="range"
            min={10}
            max={120}
            value={heartbeatThreshold}
            onChange={(e) => onChangeHeartbeatThreshold(Number(e.target.value))}
            className="w-full accent-blue-500"
          />

          <p className="text-[11px] text-slate-400">
            Node companions sending heartbeats within this window display as Healthy Green. Beyond 2x window displays Degraded Yellow, then Disconnected Red.
          </p>
        </div>
      </div>
    </div>
  );
};
