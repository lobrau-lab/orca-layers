'use client';

import React, { useEffect, useState } from 'react';
import { backendBridge } from '@/lib/retro-sequencer/backend-bridge';
import { ClockTickPayload, TransportPayload } from '@/lib/retro-sequencer/types';
import { Play, Square, Circle, RotateCcw, Activity } from 'lucide-react';

interface ArcadeHudProps {
  onTogglePlay: () => void;
  onToggleRecord: () => void;
  onRewind: () => void;
  isPlaying: boolean;
  isRecording: boolean;
  currentStep: number;
  bpm: number;
}

const PAD_LABELS = [
  { id: 0, name: 'KICK', key: '1', color: 'from-amber-500 to-orange-600' },
  { id: 1, name: 'SNARE', key: '2', color: 'from-rose-500 to-pink-600' },
  { id: 2, name: 'CHH', key: '3', color: 'from-sky-400 to-blue-600' },
  { id: 3, name: 'OHH', key: '4', color: 'from-cyan-400 to-teal-500' },
  { id: 4, name: 'CLAP', key: '5', color: 'from-purple-500 to-indigo-600' },
  { id: 5, name: 'PERC', key: '6', color: 'from-emerald-400 to-green-600' },
  { id: 6, name: 'BASS', key: '7', color: 'from-yellow-400 to-amber-600' },
  { id: 7, name: 'FX', key: '8', color: 'from-fuchsia-500 to-pink-600' },
];

export const ArcadeHud: React.FC<ArcadeHudProps> = ({
  onTogglePlay,
  onToggleRecord,
  onRewind,
  isPlaying,
  isRecording,
  currentStep,
  bpm,
}) => {
  // Pad trigger visual decay states (0 to 1)
  const [padVelocities, setPadVelocities] = useState<number[]>(new Array(8).fill(0));
  const [clockData, setClockData] = useState<ClockTickPayload>({
    step: 0,
    timestamp: 0,
    bpm: 120,
    bar: 1,
    beat: 1,
    totalSteps: 64,
  });

  useEffect(() => {
    // Listen for beat triggers to flash pads
    const unsubBeat = backendBridge.onBeatTrigger((padIndex, velocity) => {
      setPadVelocities((prev) => {
        const next = [...prev];
        if (padIndex >= 0 && padIndex < 8) {
          next[padIndex] = Math.max(0.4, velocity);
        }
        return next;
      });
    });

    // Listen for clock ticks
    const unsubClock = backendBridge.onClockTick((payload) => {
      setClockData(payload);
    });

    return () => {
      unsubBeat();
      unsubClock();
    };
  }, []);

  // Decay pad lights smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setPadVelocities((prev) => {
        let changed = false;
        const next = prev.map((v) => {
          if (v > 0.05) {
            changed = true;
            return v * 0.82;
          }
          return 0;
        });
        return changed ? next : prev;
      });
    }, 30);

    return () => clearInterval(timer);
  }, []);

  const barDisplay = String(clockData.bar || Math.floor(currentStep / 16) + 1).padStart(2, '0');
  const beatDisplay = String(clockData.beat || (Math.floor(currentStep / 4) % 4) + 1).padStart(2, '0');
  const stepDisplay = String(currentStep % 16).padStart(2, '0');

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-2xl backdrop-blur-md">
      {/* Top Header: Master Transport & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        {/* Left: Clock Readout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">BAR:BEAT:STEP</span>
            <span className="text-sm font-mono font-bold text-amber-400 tracking-wider">
              {barDisplay}:{beatDisplay}:{stepDisplay}
            </span>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
            <span className="text-slate-500 text-[10px]">BPM</span>
            <span className="font-bold text-cyan-400">{bpm}</span>
          </div>

          {/* Sync indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${isPlaying ? 'opacity-75' : 'opacity-0'}`}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400">CLK SLAVED</span>
          </div>
        </div>

        {/* Center: Transport Controls (Emits to BackendBridge) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRewind}
            title="Rewind to Step 0"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded-lg transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition shadow ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            onClick={onToggleRecord}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition shadow ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/40'
                : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30'
            }`}
          >
            <Circle className={`w-3.5 h-3.5 ${isRecording ? 'fill-white' : 'fill-rose-500'}`} />
            <span>{isRecording ? 'RECORDING' : 'OVERDUB REC'}</span>
          </button>
        </div>

        {/* Right: Step Progress Bar */}
        <div className="w-full sm:w-44 flex flex-col gap-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>STEP {currentStep}</span>
            <span>LOOP / 64</span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-75"
              style={{ width: `${((currentStep + 1) / 64) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 8-Pad Visual Status Grid (Lights up on onBeatTrigger) */}
      <div className="pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>8-PAD BEAT TRIGGER BUS (onBeatTrigger Payload Reactive)</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500">PADS 1-8 / VELOCITY SENSITIVE</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {PAD_LABELS.map((pad) => {
            const vel = padVelocities[pad.id];
            const isLit = vel > 0.08;

            return (
              <div
                key={pad.id}
                onClick={() => backendBridge.simulateBeatTrigger(pad.id, 0.95, pad.name)}
                className={`relative flex flex-col justify-between p-2 rounded-lg cursor-pointer select-none transition-all duration-75 border ${
                  isLit
                    ? 'border-cyan-400 bg-slate-800 shadow-lg shadow-cyan-500/20 -translate-y-0.5'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }`}
                style={{
                  boxShadow: isLit ? `0 0 16px rgba(6, 182, 212, ${vel * 0.7})` : undefined,
                }}
              >
                {/* Glow bar fill */}
                <div
                  className="absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-75"
                  style={{
                    backgroundColor: isLit ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    opacity: vel,
                  }}
                />

                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400 font-bold">P{pad.id + 1}</span>
                  <span className="text-[9px] text-slate-500">[{pad.key}]</span>
                </div>

                <div className="my-1 text-center">
                  <span
                    className={`text-xs font-mono font-bold tracking-wider transition ${
                      isLit ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {pad.name}
                  </span>
                </div>

                {/* Velocity Meter Strip */}
                <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-rose-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, vel * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
