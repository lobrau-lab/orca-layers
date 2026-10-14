'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CharacterTrack, INPUT_MASK, KeyMaskPayload } from '@/lib/retro-sequencer/types';
import { SequencerEngine } from '@/lib/retro-sequencer/engine';
import { backendBridge } from '@/lib/retro-sequencer/backend-bridge';
import { LoggerDispatchMode } from '@/lib/retro-sequencer/keyboard-input-logger';
import { 
  Gamepad2, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  RotateCw, 
  ArrowUpCircle,
  Minimize2,
  Maximize2,
  Move,
  Radio,
  CheckCircle2,
  Activity,
  Layers,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface InputCaptureHudProps {
  isRecording?: boolean;
  isPlaying?: boolean;
  armedTrack?: CharacterTrack | null;
  engine?: SequencerEngine | null;
  defaultPosition?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
}

export const InputCaptureHud: React.FC<InputCaptureHudProps> = ({
  isRecording = false,
  isPlaying = false,
  armedTrack = null,
  engine = null,
  defaultPosition = 'bottom-left',
  className = '',
}) => {
  // Key press states (raw keyCode mapping)
  const [keys, setKeys] = useState<{
    w: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
    space: boolean;
    e: boolean;
    f: boolean;
  }>({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    e: false,
    f: false,
  });

  // UI display state
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [position, setPosition] = useState<'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'>(defaultPosition);
  const [lastInputTime, setLastInputTime] = useState<number>(0);
  const [inputCount, setInputCount] = useState<number>(0);

  // KeyboardInputLogger Telemetry & Drop-Prevention State
  const [loggerStats, setLoggerStats] = useState<{
    fps: number;
    dropsPrevented: number;
    totalDispatched: number;
    mode: LoggerDispatchMode;
  }>({
    fps: 60,
    dropsPrevented: 0,
    totalDispatched: 0,
    mode: 'continuous',
  });
  const [lastDispatchedMask, setLastDispatchedMask] = useState<number>(0);

  // Keep track of engine ref
  const engineRef = useRef<SequencerEngine | null>(engine);
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  // Subscribe to real-time BackendBridge keyMask payloads dispatched by KeyboardInputLogger
  useEffect(() => {
    const unsubKeyMask = backendBridge.onKeyMask((payload) => {
      setLastDispatchedMask(payload.keyMask);
      setLoggerStats((prev) => ({
        ...prev,
        dropsPrevented: payload.dropsPrevented || prev.dropsPrevented,
        totalDispatched: prev.totalDispatched + 1,
      }));
    });

    const statsInterval = setInterval(() => {
      if (engineRef.current) {
        const logger = engineRef.current.getInputLogger();
        if (logger) {
          const stats = logger.getStats();
          setLoggerStats({
            fps: stats.currentFps,
            dropsPrevented: stats.dropsPrevented,
            totalDispatched: stats.totalDispatched,
            mode: stats.mode,
          });
        }
      }
    }, 250);

    return () => {
      unsubKeyMask();
      clearInterval(statsInterval);
    };
  }, []);

  // Window key listener with real-time state sync
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      let matched = false;
      setKeys((prev) => {
        const next = { ...prev };
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
          if (!prev.w) matched = true;
          next.w = true;
        }
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
          if (!prev.a) matched = true;
          next.a = true;
        }
        if (e.code === 'KeyS' || e.code === 'ArrowDown') {
          if (!prev.s) matched = true;
          next.s = true;
        }
        if (e.code === 'KeyD' || e.code === 'ArrowRight') {
          if (!prev.d) matched = true;
          next.d = true;
        }
        if (e.code === 'Space') {
          if (!prev.space) matched = true;
          next.space = true;
        }
        if (e.code === 'KeyE') {
          if (!prev.e) matched = true;
          next.e = true;
        }
        if (e.code === 'KeyF') {
          if (!prev.f) matched = true;
          next.f = true;
        }
        return next;
      });

      if (matched) {
        setLastInputTime(Date.now());
        setInputCount((c) => c + 1);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => {
        const next = { ...prev };
        if (e.code === 'KeyW' || e.code === 'ArrowUp') next.w = false;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') next.a = false;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') next.s = false;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') next.d = false;
        if (e.code === 'Space') next.space = false;
        if (e.code === 'KeyE') next.e = false;
        if (e.code === 'KeyF') next.f = false;
        return next;
      });
    };

    // Reset when window loses focus to avoid stuck keys
    const handleBlur = () => {
      setKeys({
        w: false,
        a: false,
        s: false,
        d: false,
        space: false,
        e: false,
        f: false,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Calculate current bitmask based on active keys
  const bitmask = (() => {
    let mask = 0;
    if (keys.a) mask |= INPUT_MASK.LEFT;
    if (keys.d) mask |= INPUT_MASK.RIGHT;
    if (keys.w) mask |= INPUT_MASK.UP;
    if (keys.s) mask |= INPUT_MASK.DOWN;
    if (keys.space) mask |= INPUT_MASK.JUMP;
    if (keys.e) mask |= INPUT_MASK.DANCE;
    if (keys.f) mask |= INPUT_MASK.SPIN;
    return mask;
  })();

  const anyKeyPressed = keys.w || keys.a || keys.s || keys.d || keys.space || keys.e || keys.f;

  // Determine active action label
  const activeActionLabel = (() => {
    if (keys.space) return 'JUMP';
    if (keys.e) return 'DANCE';
    if (keys.f) return 'SPIN';
    if (keys.a && !keys.d) return 'MOVE LEFT';
    if (keys.d && !keys.a) return 'MOVE RIGHT';
    if (keys.w) return 'UP';
    if (keys.s) return 'DOWN';
    return 'IDLE';
  })();

  // Support virtual button press (mouse/touch) for testing & accessibility
  const handleVirtualPress = (code: string, isDown: boolean) => {
    if (engineRef.current) {
      engineRef.current.setVirtualKey(code, isDown);
    }
    setKeys((prev) => {
      const next = { ...prev };
      if (code === 'KeyW') next.w = isDown;
      if (code === 'KeyA') next.a = isDown;
      if (code === 'KeyS') next.s = isDown;
      if (code === 'KeyD') next.d = isDown;
      if (code === 'Space') next.space = isDown;
      if (code === 'KeyE') next.e = isDown;
      if (code === 'KeyF') next.f = isDown;
      return next;
    });
    if (isDown) {
      setLastInputTime(Date.now());
      setInputCount((c) => c + 1);
    }
  };

  // Position class mapping
  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-12 left-4',
    'top-right': 'top-12 right-4',
  }[position];

  return (
    <aside
      aria-label="Input Capture HUD"
      className={`absolute z-30 transition-all duration-200 select-none ${positionClasses} ${className}`}
    >
      {isMinimized ? (
        // Minimized Floating Pill
        <div className="flex items-center gap-2 bg-slate-950/90 border border-cyan-800/80 rounded-xl px-3 py-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isRecording
                  ? 'bg-red-500 animate-ping'
                  : anyKeyPressed
                  ? 'bg-cyan-400 animate-pulse'
                  : 'bg-slate-600'
              }`}
            />
            <span className="text-[10px] font-mono font-bold text-cyan-300">KEYS:</span>
          </div>

          {/* Mini Key Badges */}
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <span
              className={`px-1 rounded ${
                keys.w ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_#06b6d4]' : 'bg-slate-800 text-slate-400'
              }`}
            >
              W
            </span>
            <span
              className={`px-1 rounded ${
                keys.a ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_#06b6d4]' : 'bg-slate-800 text-slate-400'
              }`}
            >
              A
            </span>
            <span
              className={`px-1 rounded ${
                keys.s ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_#06b6d4]' : 'bg-slate-800 text-slate-400'
              }`}
            >
              S
            </span>
            <span
              className={`px-1 rounded ${
                keys.d ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_#06b6d4]' : 'bg-slate-800 text-slate-400'
              }`}
            >
              D
            </span>
            <span className="text-slate-600 font-bold">|</span>
            <span
              className={`px-1.5 rounded ${
                keys.space
                  ? 'bg-emerald-400 text-slate-950 font-bold shadow-[0_0_8px_#10b981]'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              SPC
            </span>
            <span
              className={`px-1 rounded ${
                keys.e ? 'bg-fuchsia-500 text-white font-bold shadow-[0_0_8px_#d946ef]' : 'bg-slate-800 text-slate-400'
              }`}
            >
              E
            </span>
            <span
              className={`px-1 rounded ${
                keys.f ? 'bg-amber-400 text-slate-950 font-bold shadow-[0_0_8px_#fbbf24]' : 'bg-slate-800 text-slate-400'
              }`}
            >
              F
            </span>
          </div>

          {/* Expand Button */}
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition ml-1"
            title="Expand Full Input HUD"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      ) : (
        // Expanded Full Retro Input HUD
        <div className="w-72 sm:w-80 bg-slate-950/95 border border-cyan-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md font-mono text-slate-200">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isRecording
                    ? 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse'
                    : isPlaying
                    ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                    : 'bg-cyan-500'
                }`}
              />
              <span className="font-bold text-xs text-cyan-300 tracking-wider flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5" />
                INPUT CAPTURE HUD
              </span>
            </div>

            {/* Position & Minimize controls */}
            <div className="flex items-center gap-1 text-slate-400">
              {/* Corner cycler */}
              <button
                onClick={() => {
                  const cycle: Record<string, 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'> = {
                    'bottom-left': 'bottom-right',
                    'bottom-right': 'top-right',
                    'top-right': 'top-left',
                    'top-left': 'bottom-left',
                  };
                  setPosition(cycle[position]);
                }}
                className="p-1 hover:bg-slate-800 rounded hover:text-cyan-300 transition text-[10px]"
                title={`Move HUD Corner (Current: ${position})`}
              >
                <Move className="w-3 h-3" />
              </button>

              {/* Minimize */}
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:bg-slate-800 rounded hover:text-white transition"
                title="Minimize HUD to floating pill"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800/80 rounded-lg px-2.5 py-1.5 mb-2.5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span className="text-slate-400">STATE:</span>
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                  isRecording
                    ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                    : isPlaying
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isRecording ? 'RECORDING ON-BEAT' : isPlaying ? 'PLAYBACK ACTIVE' : 'STANDBY'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-400">ACTION:</span>
              <span
                className={`font-bold ${
                  anyKeyPressed ? 'text-amber-300 underline' : 'text-slate-400'
                }`}
              >
                {activeActionLabel}
              </span>
            </div>
          </div>

          {/* Main Key Display: D-Pad + Action Cluster */}
          <div className="grid grid-cols-2 gap-3 mb-2.5">
            {/* Left Column: WASD D-Pad */}
            <div className="flex flex-col items-center justify-center p-2 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="text-[9px] text-cyan-400/80 font-bold mb-1.5 tracking-wider">
                DIRECTIONAL (WASD)
              </div>

              {/* D-Pad Layout */}
              <div className="flex flex-col items-center gap-1">
                {/* W key */}
                <button
                  onMouseDown={() => handleVirtualPress('KeyW', true)}
                  onMouseUp={() => handleVirtualPress('KeyW', false)}
                  onMouseLeave={() => handleVirtualPress('KeyW', false)}
                  onTouchStart={() => handleVirtualPress('KeyW', true)}
                  onTouchEnd={() => handleVirtualPress('KeyW', false)}
                  className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center border transition-all duration-75 text-xs ${
                    keys.w
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.9)] scale-95 font-bold'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                  title="W / Up Arrow"
                >
                  <ChevronUp className="w-3.5 h-3.5 -mb-0.5" />
                  <span className="text-[10px] font-bold leading-none">W</span>
                </button>

                {/* A, S, D row */}
                <div className="flex items-center gap-1">
                  {/* A key */}
                  <button
                    onMouseDown={() => handleVirtualPress('KeyA', true)}
                    onMouseUp={() => handleVirtualPress('KeyA', false)}
                    onMouseLeave={() => handleVirtualPress('KeyA', false)}
                    onTouchStart={() => handleVirtualPress('KeyA', true)}
                    onTouchEnd={() => handleVirtualPress('KeyA', false)}
                    className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center border transition-all duration-75 text-xs ${
                      keys.a
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.9)] scale-95 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                    title="A / Left Arrow (Move Left)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 -mb-0.5" />
                    <span className="text-[10px] font-bold leading-none">A</span>
                  </button>

                  {/* S key */}
                  <button
                    onMouseDown={() => handleVirtualPress('KeyS', true)}
                    onMouseUp={() => handleVirtualPress('KeyS', false)}
                    onMouseLeave={() => handleVirtualPress('KeyS', false)}
                    onTouchStart={() => handleVirtualPress('KeyS', true)}
                    onTouchEnd={() => handleVirtualPress('KeyS', false)}
                    className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center border transition-all duration-75 text-xs ${
                      keys.s
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.9)] scale-95 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                    title="S / Down Arrow (Crouch / Down)"
                  >
                    <ChevronDown className="w-3.5 h-3.5 -mb-0.5" />
                    <span className="text-[10px] font-bold leading-none">S</span>
                  </button>

                  {/* D key */}
                  <button
                    onMouseDown={() => handleVirtualPress('KeyD', true)}
                    onMouseUp={() => handleVirtualPress('KeyD', false)}
                    onMouseLeave={() => handleVirtualPress('KeyD', false)}
                    onTouchStart={() => handleVirtualPress('KeyD', true)}
                    onTouchEnd={() => handleVirtualPress('KeyD', false)}
                    className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center border transition-all duration-75 text-xs ${
                      keys.d
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.9)] scale-95 font-bold'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                    title="D / Right Arrow (Move Right)"
                  >
                    <ChevronRight className="w-3.5 h-3.5 -mb-0.5" />
                    <span className="text-[10px] font-bold leading-none">D</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Actions (Space, E, F) */}
            <div className="flex flex-col justify-between p-2 bg-slate-900/60 rounded-lg border border-slate-800">
              <div className="text-[9px] text-fuchsia-400/80 font-bold mb-1.5 text-center tracking-wider">
                ACTIONS (SPACE / E / F)
              </div>

              {/* Spacebar Button */}
              <button
                onMouseDown={() => handleVirtualPress('Space', true)}
                onMouseUp={() => handleVirtualPress('Space', false)}
                onMouseLeave={() => handleVirtualPress('Space', false)}
                onTouchStart={() => handleVirtualPress('Space', true)}
                onTouchEnd={() => handleVirtualPress('Space', false)}
                className={`w-full py-1.5 px-2 rounded-lg flex items-center justify-between border transition-all duration-75 ${
                  keys.space
                    ? 'bg-emerald-400 text-slate-950 border-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.9)] scale-95 font-bold'
                    : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
                title="Spacebar (Jump Physics)"
              >
                <div className="flex items-center gap-1.5">
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">[ SPACE ]</span>
                </div>
                <span className="text-[9px] font-bold px-1 rounded bg-black/40">JUMP</span>
              </button>

              {/* E & F Action Buttons */}
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {/* E: Dance */}
                <button
                  onMouseDown={() => handleVirtualPress('KeyE', true)}
                  onMouseUp={() => handleVirtualPress('KeyE', false)}
                  onMouseLeave={() => handleVirtualPress('KeyE', false)}
                  onTouchStart={() => handleVirtualPress('KeyE', true)}
                  onTouchEnd={() => handleVirtualPress('KeyE', false)}
                  className={`py-1.5 px-2 rounded-lg flex flex-col items-center justify-center border transition-all duration-75 ${
                    keys.e
                      ? 'bg-fuchsia-500 text-white border-fuchsia-300 shadow-[0_0_16px_rgba(217,70,239,0.9)] scale-95 font-bold'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                  title="Key E: Trigger Dance Animation"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3" />
                    <span>[ E ]</span>
                  </div>
                  <span className="text-[8px] text-fuchsia-300 font-semibold mt-0.5">DANCE</span>
                </button>

                {/* F: Spin */}
                <button
                  onMouseDown={() => handleVirtualPress('KeyF', true)}
                  onMouseUp={() => handleVirtualPress('KeyF', false)}
                  onMouseLeave={() => handleVirtualPress('KeyF', false)}
                  onTouchStart={() => handleVirtualPress('KeyF', true)}
                  onTouchEnd={() => handleVirtualPress('KeyF', false)}
                  className={`py-1.5 px-2 rounded-lg flex flex-col items-center justify-center border transition-all duration-75 ${
                    keys.f
                      ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.9)] scale-95 font-bold'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                  title="Key F: Trigger Spin Animation"
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <RotateCw className="w-3 h-3" />
                    <span>[ F ]</span>
                  </div>
                  <span className="text-[8px] text-amber-300 font-semibold mt-0.5">SPIN</span>
                </button>
              </div>
            </div>
          </div>

          {/* KeyboardInputLogger Telemetry & Plan B KeyMask Verification Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-[10px] space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 font-bold text-cyan-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>KEYBOARD INPUT LOGGER:</span>
              </span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                  <span>rAF {loggerStats.fps} FPS</span>
                </span>
                <span className="font-mono text-cyan-300 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-cyan-900 text-[10px]">
                  0x{bitmask.toString(16).toUpperCase().padStart(2, '0')} ({bitmask})
                </span>
              </div>
            </div>

            {/* Individual Bit Flags: L R U D J D S */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px]">
              <div
                className={`py-0.5 rounded ${
                  keys.a ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-500'
                }`}
                title="Left (Bit 0)"
              >
                L
              </div>
              <div
                className={`py-0.5 rounded ${
                  keys.d ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-500'
                }`}
                title="Right (Bit 1)"
              >
                R
              </div>
              <div
                className={`py-0.5 rounded ${
                  keys.w ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-500'
                }`}
                title="Up (Bit 2)"
              >
                U
              </div>
              <div
                className={`py-0.5 rounded ${
                  keys.s ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-500'
                }`}
                title="Down (Bit 3)"
              >
                D
              </div>
              <div
                className={`py-0.5 rounded ${
                  keys.space ? 'bg-emerald-400 text-slate-950 font-bold' : 'bg-slate-950 text-slate-500'
                }`}
                title="Jump (Bit 4)"
              >
                J
              </div>
              <div
                className={`py-0.5 rounded ${
                  keys.e ? 'bg-fuchsia-500 text-white font-bold' : 'bg-slate-950 text-slate-500'
                }`}
                title="Dance (Bit 5)"
              >
                D
              </div>
              <div
                className={`py-0.5 rounded ${
                  keys.f ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-950 text-slate-500'
                }`}
                title="Spin (Bit 6)"
              >
                S
              </div>
            </div>

            {/* Anti-Throttling Telemetry Banner */}
            <div className="p-1.5 bg-slate-950/80 rounded border border-slate-800 flex items-center justify-between text-[9px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Anti-Throttling:</span>
                <span className="text-slate-300 font-normal">
                  {loggerStats.dropsPrevented > 0
                    ? `${loggerStats.dropsPrevented} drops prevented`
                    : 'Frame-perfect rAF active'}
                </span>
              </div>

              {/* Mode Toggle */}
              <button
                onClick={() => {
                  const nextMode: LoggerDispatchMode =
                    loggerStats.mode === 'continuous'
                      ? 'on_change_or_heartbeat'
                      : loggerStats.mode === 'on_change_or_heartbeat'
                      ? 'on_active'
                      : 'continuous';
                  if (engineRef.current) {
                    engineRef.current.getInputLogger().setDispatchMode(nextMode);
                  }
                  setLoggerStats((s) => ({ ...s, mode: nextMode }));
                }}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[8px] font-mono transition"
                title="Cycle KeyboardInputLogger dispatch mode"
              >
                {loggerStats.mode.toUpperCase()}
              </button>
            </div>

            {/* Armed Character Target info */}
            {armedTrack && (
              <div className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-800 text-slate-400">
                <span className="truncate">
                  TARGET:{' '}
                  <span className="text-cyan-300 font-bold">{armedTrack.name}</span>
                </span>
                <span className="text-slate-500">
                  {armedTrack.mode === 'LIVE_PUPPET' ? 'PUPPET ARMED' : armedTrack.mode}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
