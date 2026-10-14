'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CharacterTrack, INPUT_MASK, KeyMaskPayload } from '@/lib/retro-sequencer/types';
import { backendBridge } from '@/lib/retro-sequencer/backend-bridge';
import { globalKeyboardInputLogger, computeKeyMask } from '@/lib/retro-sequencer/keyboard-input-logger';
import {
  Gamepad2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCw,
  ArrowUp,
  Minimize2,
  Maximize2,
  Move,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export interface KeyInputDisplayProps {
  isRecording?: boolean;
  isPlaying?: boolean;
  armedTrack?: CharacterTrack | null;
  /** Optional custom keysPressed getter or map */
  keysPressedSource?: () => Map<string, boolean> | Record<string, boolean>;
  /** Default docking quadrant */
  defaultPosition?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
  onVirtualKeyPress?: (code: string, isPressed: boolean) => void;
}

interface KeyConfig {
  id: string;
  label: string;
  code: string;
  altCode?: string;
  action: string;
  bit: number;
  maskVal: number;
  icon: React.ReactNode;
  color: string;
}

const GAME_KEYS: KeyConfig[] = [
  {
    id: 'w',
    label: 'W',
    code: 'KeyW',
    altCode: 'ArrowUp',
    action: 'UP',
    bit: 2,
    maskVal: INPUT_MASK.UP,
    icon: <ChevronUp className="w-3.5 h-3.5" />,
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 'a',
    label: 'A',
    code: 'KeyA',
    altCode: 'ArrowLeft',
    action: 'LEFT',
    bit: 0,
    maskVal: INPUT_MASK.LEFT,
    icon: <ChevronLeft className="w-3.5 h-3.5" />,
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 's',
    label: 'S',
    code: 'KeyS',
    altCode: 'ArrowDown',
    action: 'DOWN',
    bit: 3,
    maskVal: INPUT_MASK.DOWN,
    icon: <ChevronDown className="w-3.5 h-3.5" />,
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 'd',
    label: 'D',
    code: 'KeyD',
    altCode: 'ArrowRight',
    action: 'RIGHT',
    bit: 1,
    maskVal: INPUT_MASK.RIGHT,
    icon: <ChevronRight className="w-3.5 h-3.5" />,
    color: 'from-cyan-500 to-blue-500',
  },
  {
    id: 'space',
    label: 'SPACE',
    code: 'Space',
    action: 'JUMP',
    bit: 4,
    maskVal: INPUT_MASK.JUMP,
    icon: <ArrowUp className="w-3.5 h-3.5" />,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'e',
    label: 'E',
    code: 'KeyE',
    action: 'DANCE',
    bit: 5,
    maskVal: INPUT_MASK.DANCE,
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'f',
    label: 'F',
    code: 'KeyF',
    action: 'SPIN',
    bit: 6,
    maskVal: INPUT_MASK.SPIN,
    icon: <RotateCw className="w-3.5 h-3.5" />,
    color: 'from-amber-500 to-orange-500',
  },
];

export const KeyInputDisplay: React.FC<KeyInputDisplayProps> = ({
  isRecording = false,
  isPlaying = false,
  armedTrack = null,
  keysPressedSource,
  defaultPosition = 'bottom-left',
  className = '',
  onVirtualKeyPress,
}) => {
  // Local active key map
  const [keysActive, setKeysActive] = useState<{ [code: string]: boolean }>({
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    Space: false,
    KeyE: false,
    KeyF: false,
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [position, setPosition] = useState<'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'>(defaultPosition);
  const [inputCount, setInputCount] = useState<number>(0);
  const [lastInputName, setLastInputName] = useState<string>('NONE');
  const [dropsPrevented, setDropsPrevented] = useState<number>(0);
  const [activeBitmask, setActiveBitmask] = useState<number>(0);
  const [fps, setFps] = useState<number>(60);

  // Raw local Map tracker for keys pressed
  const localKeysPressedRef = useRef<Map<string, boolean>>(new Map());

  // 1. Direct window listener to update local keysPressed Map instantly
  useEffect(() => {
    const localMap = localKeysPressedRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      localMap.set(e.code, true);
      globalKeyboardInputLogger.setVirtualKey(e.code, true);

      // Trigger tactile UI feedback
      setKeysActive((prev) => ({
        ...prev,
        [e.code]: true,
        ...(e.code === 'ArrowUp' ? { KeyW: true } : {}),
        ...(e.code === 'ArrowLeft' ? { KeyA: true } : {}),
        ...(e.code === 'ArrowDown' ? { KeyS: true } : {}),
        ...(e.code === 'ArrowRight' ? { KeyD: true } : {}),
      }));

      setInputCount((c) => c + 1);
      setLastInputName(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      localMap.set(e.code, false);
      globalKeyboardInputLogger.setVirtualKey(e.code, false);

      setKeysActive((prev) => ({
        ...prev,
        [e.code]: false,
        ...(e.code === 'ArrowUp' ? { KeyW: false } : {}),
        ...(e.code === 'ArrowLeft' ? { KeyA: false } : {}),
        ...(e.code === 'ArrowDown' ? { KeyS: false } : {}),
        ...(e.code === 'ArrowRight' ? { KeyD: false } : {}),
      }));
    };

    const handleBlur = () => {
      localMap.clear();
      setKeysActive({
        KeyW: false,
        KeyA: false,
        KeyS: false,
        KeyD: false,
        Space: false,
        KeyE: false,
        KeyF: false,
      });
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: true });
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // 2. High-frequency rAF poller slaved to keysPressed Map to verify inputs and compute bitmask
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const poll = (time: number) => {
      frameCount++;
      if (time - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (time - lastTime)));
        frameCount = 0;
        lastTime = time;
      }

      // Read from keysPressedSource or localKeysPressedRef or globalKeyboardInputLogger
      let activeMask = 0;
      if (keysPressedSource) {
        const src = keysPressedSource();
        activeMask = computeKeyMask(src);
      } else {
        const map = localKeysPressedRef.current;
        activeMask = computeKeyMask(map);
      }

      setActiveBitmask(activeMask);

      // Check stats from logger
      const stats = globalKeyboardInputLogger.getStats();
      if (stats.dropsPrevented !== dropsPrevented) {
        setDropsPrevented(stats.dropsPrevented);
      }

      animId = requestAnimationFrame(poll);
    };

    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [keysPressedSource, dropsPrevented]);

  // Subscribe to backendBridge keyMask payloads for confirmation
  useEffect(() => {
    const unsub = backendBridge.onKeyMask((payload: KeyMaskPayload) => {
      if (payload.dropsPrevented !== undefined) {
        setDropsPrevented(payload.dropsPrevented);
      }
    });
    return unsub;
  }, []);

  // Handle Virtual Click / Touch
  const handleVirtualKey = (code: string, isDown: boolean) => {
    localKeysPressedRef.current.set(code, isDown);
    globalKeyboardInputLogger.setVirtualKey(code, isDown);

    setKeysActive((prev) => ({
      ...prev,
      [code]: isDown,
    }));

    if (isDown) {
      setInputCount((c) => c + 1);
      setLastInputName(code);
    }

    if (onVirtualKeyPress) {
      onVirtualKeyPress(code, isDown);
    }
  };

  // Position Classes
  const positionClasses = {
    'bottom-left': 'bottom-3 left-3',
    'bottom-right': 'bottom-3 right-3',
    'top-left': 'top-3 left-3',
    'top-right': 'top-3 right-3',
  }[position];

  const hasAnyKeyActive = activeBitmask > 0;

  // Format binary 7-bit string
  const binaryString = activeBitmask.toString(2).padStart(7, '0');
  const hexString = '0x' + activeBitmask.toString(16).toUpperCase().padStart(2, '0');

  // Key check helper
  const isKeyActive = (key: KeyConfig) => {
    const byMap = !!keysActive[key.code] || (key.altCode ? !!keysActive[key.altCode] : false);
    const byMask = (activeBitmask & key.maskVal) !== 0;
    return byMap || byMask;
  };

  return (
    <div
      className={`absolute z-30 transition-all duration-150 select-none ${positionClasses} ${className}`}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className={`bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-2xl p-2.5 sm:p-3 text-slate-100 font-mono flex flex-col transition-all ${
          isRecording
            ? 'ring-2 ring-red-500/80 border-red-500 shadow-red-950/50'
            : hasAnyKeyActive
            ? 'border-cyan-400 shadow-cyan-900/40 ring-1 ring-cyan-500/50'
            : ''
        }`}
        style={{ minWidth: isMinimized ? '190px' : '280px' }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <div
              className={`p-1 rounded-md transition-colors ${
                hasAnyKeyActive
                  ? 'bg-cyan-500/30 text-cyan-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[11px] text-cyan-300 tracking-wider">
                  KEY INPUT HUD
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRecording
                      ? 'bg-red-500 animate-ping'
                      : hasAnyKeyActive
                      ? 'bg-emerald-400'
                      : 'bg-slate-600'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Quick HUD controls */}
          <div className="flex items-center gap-1 text-[10px]">
            {/* Position Cycler */}
            <button
              onClick={() => {
                const positions: ('bottom-left' | 'bottom-right' | 'top-left' | 'top-right')[] = [
                  'bottom-left',
                  'bottom-right',
                  'top-right',
                  'top-left',
                ];
                const nextIdx = (positions.indexOf(position) + 1) % positions.length;
                setPosition(positions[nextIdx]);
              }}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-300 transition"
              title="Dock Corner"
            >
              <Move className="w-3 h-3" />
            </button>

            {/* Minimize / Maximize */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-300 transition"
              title={isMinimized ? 'Expand HUD' : 'Minimize HUD'}
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Minimized compact status pill */}
        {isMinimized ? (
          <div className="flex items-center justify-between gap-2 text-[10px] py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">MASK:</span>
              <span
                className={`font-bold px-1.5 py-0.5 rounded ${
                  hasAnyKeyActive ? 'bg-cyan-900/60 text-cyan-300' : 'bg-slate-900 text-slate-500'
                }`}
              >
                {hexString}
              </span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <Zap className="w-3 h-3" />
              <span>{fps} FPS</span>
            </div>
          </div>
        ) : (
          <>
            {/* Input Verification Banner */}
            <div
              className={`mb-2.5 px-2 py-1 rounded-md text-[10px] flex items-center justify-between transition-colors ${
                isRecording
                  ? 'bg-red-950/70 border border-red-500/50 text-red-300 font-bold animate-pulse'
                  : hasAnyKeyActive
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isRecording ? (
                  <>
                    <Activity className="w-3 h-3 text-red-400" />
                    <span>REC PASS ACTIVE • CAPTURING</span>
                  </>
                ) : hasAnyKeyActive ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>INPUT VERIFIED & RESPONSIVE</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    <span>TEST INPUTS BEFORE OVERDUB</span>
                  </>
                )}
              </div>
              <span className="text-[9px] text-slate-400 font-normal">
                {armedTrack ? armedTrack.name : 'LIVE PUPPET'}
              </span>
            </div>

            {/* Grid of Interactive Key Icons (W, A, S, D, Space, E, F) */}
            <div className="flex flex-col gap-1.5">
              {/* Row 1: Top cluster - W (Up) centered over A S D, plus E and F action keys */}
              <div className="flex items-center justify-between gap-2">
                {/* Directional WASD Cluster */}
                <div className="flex flex-col items-center gap-1">
                  {/* W Key (Up) */}
                  <div className="flex justify-center">
                    {(() => {
                      const keyW = GAME_KEYS.find((k) => k.id === 'w')!;
                      const active = isKeyActive(keyW);
                      return (
                        <button
                          type="button"
                          onMouseDown={() => handleVirtualKey(keyW.code, true)}
                          onMouseUp={() => handleVirtualKey(keyW.code, false)}
                          onTouchStart={() => handleVirtualKey(keyW.code, true)}
                          onTouchEnd={() => handleVirtualKey(keyW.code, false)}
                          className={`w-9 h-8 rounded border flex flex-col items-center justify-center transition-all ${
                            active
                              ? 'bg-gradient-to-t from-cyan-600 to-blue-500 text-white border-cyan-300 shadow-md shadow-cyan-500/50 scale-95 translate-y-0.5'
                              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                          }`}
                          title="Key W or Arrow Up: Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5 -mb-0.5" />
                          <span className="text-[10px] font-bold leading-none">W</span>
                        </button>
                      );
                    })()}
                  </div>

                  {/* A, S, D Keys */}
                  <div className="flex items-center gap-1">
                    {['a', 's', 'd'].map((keyId) => {
                      const key = GAME_KEYS.find((k) => k.id === keyId)!;
                      const active = isKeyActive(key);
                      return (
                        <button
                          key={key.id}
                          type="button"
                          onMouseDown={() => handleVirtualKey(key.code, true)}
                          onMouseUp={() => handleVirtualKey(key.code, false)}
                          onTouchStart={() => handleVirtualKey(key.code, true)}
                          onTouchEnd={() => handleVirtualKey(key.code, false)}
                          className={`w-9 h-8 rounded border flex flex-col items-center justify-center transition-all ${
                            active
                              ? 'bg-gradient-to-t from-cyan-600 to-blue-500 text-white border-cyan-300 shadow-md shadow-cyan-500/50 scale-95 translate-y-0.5'
                              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                          }`}
                          title={`Key ${key.label} (${key.action})`}
                        >
                          <span className="opacity-70">{key.icon}</span>
                          <span className="text-[10px] font-bold leading-none">{key.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-16 bg-slate-800 mx-1" />

                {/* Action Buttons: E, F */}
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* E - Dance */}
                    {(() => {
                      const keyE = GAME_KEYS.find((k) => k.id === 'e')!;
                      const active = isKeyActive(keyE);
                      return (
                        <button
                          type="button"
                          onMouseDown={() => handleVirtualKey(keyE.code, true)}
                          onMouseUp={() => handleVirtualKey(keyE.code, false)}
                          onTouchStart={() => handleVirtualKey(keyE.code, true)}
                          onTouchEnd={() => handleVirtualKey(keyE.code, false)}
                          className={`h-8 rounded border flex flex-col items-center justify-center px-2 transition-all ${
                            active
                              ? 'bg-gradient-to-t from-purple-600 to-pink-500 text-white border-purple-300 shadow-md shadow-purple-500/50 scale-95 translate-y-0.5'
                              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                          }`}
                          title="Key E: Dance Animation"
                        >
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span className="text-[10px] font-bold">E</span>
                          </div>
                          <span className="text-[8px] text-purple-300 uppercase tracking-tighter">
                            DANCE
                          </span>
                        </button>
                      );
                    })()}

                    {/* F - Spin */}
                    {(() => {
                      const keyF = GAME_KEYS.find((k) => k.id === 'f')!;
                      const active = isKeyActive(keyF);
                      return (
                        <button
                          type="button"
                          onMouseDown={() => handleVirtualKey(keyF.code, true)}
                          onMouseUp={() => handleVirtualKey(keyF.code, false)}
                          onTouchStart={() => handleVirtualKey(keyF.code, true)}
                          onTouchEnd={() => handleVirtualKey(keyF.code, false)}
                          className={`h-8 rounded border flex flex-col items-center justify-center px-2 transition-all ${
                            active
                              ? 'bg-gradient-to-t from-amber-600 to-orange-500 text-white border-amber-300 shadow-md shadow-amber-500/50 scale-95 translate-y-0.5'
                              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                          }`}
                          title="Key F: Spin Animation"
                        >
                          <div className="flex items-center gap-1">
                            <RotateCw className="w-3 h-3 text-amber-400" />
                            <span className="text-[10px] font-bold">F</span>
                          </div>
                          <span className="text-[8px] text-amber-300 uppercase tracking-tighter">
                            SPIN
                          </span>
                        </button>
                      );
                    })()}
                  </div>

                  {/* SPACEBAR (Jump / Action) */}
                  {(() => {
                    const keySpace = GAME_KEYS.find((k) => k.id === 'space')!;
                    const active = isKeyActive(keySpace);
                    return (
                      <button
                        type="button"
                        onMouseDown={() => handleVirtualKey(keySpace.code, true)}
                        onMouseUp={() => handleVirtualKey(keySpace.code, false)}
                        onTouchStart={() => handleVirtualKey(keySpace.code, true)}
                        onTouchEnd={() => handleVirtualKey(keySpace.code, false)}
                        className={`w-full h-8 rounded border flex items-center justify-center gap-1.5 px-2 transition-all ${
                          active
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-emerald-300 shadow-md shadow-emerald-500/50 scale-95 translate-y-0.5'
                            : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                        }`}
                        title="Spacebar: Jump / Kick"
                      >
                        <ArrowUp className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-bold">SPACEBAR</span>
                        <span className="text-[8px] text-emerald-300/80 uppercase font-mono">
                          (JUMP)
                        </span>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Bitmask & Serialization Telemetry Bar */}
              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">BITS:</span>
                  <span className="font-mono px-1 py-0.2 bg-slate-900 border border-slate-800 rounded text-cyan-300">
                    {binaryString}
                  </span>
                  <span className="font-mono text-slate-500">{hexString}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center gap-1 text-emerald-400"
                    title="No-Drop Poller Active"
                  >
                    <Zap className="w-2.5 h-2.5" />
                    <span>{fps} FPS</span>
                  </span>

                  {dropsPrevented > 0 && (
                    <span
                      className="px-1 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-300 rounded font-bold"
                      title="Key repeat stalls bypassed by rAF poller"
                    >
                      +{dropsPrevented} SAVED
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
