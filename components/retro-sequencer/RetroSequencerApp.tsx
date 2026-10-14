'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SequencerEngine } from '@/lib/retro-sequencer/engine';
import { backendBridge } from '@/lib/retro-sequencer/backend-bridge';
import { CharacterMode, CharacterTrack, SpriteAtlasConfig } from '@/lib/retro-sequencer/types';
import { globalKeyboardInputLogger, useKeyboardInputLoop } from '@/lib/retro-sequencer/keyboard-input-logger';
import { RetroViewport } from './RetroViewport';
import { ArcadeHud } from './ArcadeHud';
import { TrackController } from './TrackController';
import { RailEditorPanel } from './RailEditorPanel';
import { BackendTelemetryPanel } from './BackendTelemetryPanel';
import { SpriteSheetLoaderModal } from './SpriteSheetLoaderModal';
import { Disc3, Radio, Sparkles, Terminal } from 'lucide-react';

export default function RetroSequencerApp() {
  const engineRef = useRef<SequencerEngine | null>(null);

  // Transport State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [bpm, setBpm] = useState<number>(124);

  // Multi-Track State
  const [tracks, setTracks] = useState<CharacterTrack[]>([]);
  const [armedTrackId, setArmedTrackId] = useState<string | null>('track-1');

  // Rail Editor Overlay State
  const [railSplines, setRailSplines] = useState<any[]>([]);
  const [isRailOverlayActive, setIsRailOverlayActive] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Sprite Loader Modal State
  const [isSpriteModalOpen, setIsSpriteModalOpen] = useState<boolean>(false);
  const [spriteModalTrack, setSpriteModalTrack] = useState<CharacterTrack | null>(null);

  // Sync with engine when ready
  const handleEngineReady = (engine: SequencerEngine) => {
    engineRef.current = engine;
    setTracks([...engine.getTracks()]);
    setRailSplines([...engine.getRailSplines()]);
  };

  // High-precision rAF-slaved input poller hook:
  // Polls the keysPressed Map on every requestAnimationFrame and dispatches
  // keyMask payload to backendBridge to prevent input drops from event-listener throttling
  useKeyboardInputLoop({
    armedTrackId,
    isRecording,
    logger: globalKeyboardInputLogger,
  });

  // Subscribe to backend transport & clock
  useEffect(() => {
    const unsubTransport = backendBridge.onTransportChange((payload) => {
      setIsPlaying(payload.isPlaying);
      setIsRecording(payload.isRecording);
      setCurrentStep(payload.currentStep);
    });

    const unsubClock = backendBridge.onClockTick((payload) => {
      setCurrentStep(payload.step);
      setBpm(payload.bpm);
    });

    return () => {
      unsubTransport();
      unsubClock();
    };
  }, []);

  // Periodic track state synchronization
  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current) {
        setTracks([...engineRef.current.getTracks()]);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // --- Transport Actions ---
  const handleTogglePlay = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    backendBridge.emitTransportCommand(nextPlay ? 'PLAY' : 'STOP');
  };

  const handleToggleRecord = () => {
    const nextRec = !isRecording;
    setIsRecording(nextRec);
    backendBridge.emitTransportCommand('RECORD');
  };

  const handleRewind = () => {
    setCurrentStep(0);
    backendBridge.emitTransportCommand('REWIND');
  };

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
    backendBridge.setSimulatorBpm(newBpm);
  };

  // --- Track Actions ---
  const handleSelectArmedTrack = (trackId: string) => {
    setArmedTrackId(trackId);
    if (engineRef.current) {
      engineRef.current.setArmedTrack(trackId);
      setTracks([...engineRef.current.getTracks()]);
    }
  };

  const handleChangeTrackMode = (trackId: string, mode: CharacterMode) => {
    if (engineRef.current) {
      engineRef.current.setTrackMode(trackId, mode);
      setTracks([...engineRef.current.getTracks()]);
    }
  };

  const handleToggleMute = (trackId: string) => {
    if (engineRef.current) {
      engineRef.current.toggleTrackMute(trackId);
      setTracks([...engineRef.current.getTracks()]);
    }
  };

  const handleToggleSolo = (trackId: string) => {
    if (engineRef.current) {
      engineRef.current.toggleTrackSolo(trackId);
      setTracks([...engineRef.current.getTracks()]);
    }
  };

  const handleClearRecording = (trackId: string) => {
    if (engineRef.current) {
      engineRef.current.clearTrackRecording(trackId);
      setTracks([...engineRef.current.getTracks()]);
    }
  };

  const handleOpenSpriteConfig = (trackId: string) => {
    const t = tracks.find((tr) => tr.id === trackId);
    if (t) {
      setSpriteModalTrack(t);
      setIsSpriteModalOpen(true);
    }
  };

  const handleApplySpriteConfig = (trackId: string, canvas: HTMLCanvasElement, config: SpriteAtlasConfig) => {
    if (engineRef.current) {
      engineRef.current.setCustomAtlas(trackId, canvas, config);
      setTracks([...engineRef.current.getTracks()]);
    }
  };

  // --- Rail Spline Actions ---
  const handleAddRailNode = (x: number, y: number, step: number) => {
    if (engineRef.current) {
      engineRef.current.addRailNode(x, y, step);
      setRailSplines([...engineRef.current.getRailSplines()]);
    }
  };

  const handleUpdateRailNode = (nodeId: string, updates: any) => {
    if (engineRef.current) {
      engineRef.current.updateRailNode(nodeId, updates);
      setRailSplines([...engineRef.current.getRailSplines()]);
    }
  };

  const handleDeleteRailNode = (nodeId: string) => {
    if (engineRef.current) {
      engineRef.current.removeRailNode(nodeId);
      setRailSplines([...engineRef.current.getRailSplines()]);
    }
  };

  const handleApplyRailPreset = (presetType: 'wave' | 'dive' | 'patrol') => {
    if (!engineRef.current) return;
    const groundY = 340;

    if (presetType === 'wave') {
      const spline = engineRef.current.getRailSplines()[0];
      spline.nodes = [
        { id: 'node-w1', x: 100, y: groundY - 60, step: 0, action: 'move' },
        { id: 'node-w2', x: 260, y: groundY - 180, step: 16, action: 'jump' },
        { id: 'node-w3', x: 420, y: groundY - 60, step: 32, action: 'dance' },
        { id: 'node-w4', x: 580, y: groundY - 170, step: 48, action: 'spin' },
        { id: 'node-w5', x: 720, y: groundY - 60, step: 64, action: 'move' },
      ];
    } else if (presetType === 'dive') {
      const spline = engineRef.current.getRailSplines()[0];
      spline.nodes = [
        { id: 'node-d1', x: 60, y: groundY - 160, step: 0, action: 'idle' },
        { id: 'node-d2', x: 200, y: groundY - 220, step: 16, action: 'jump' },
        { id: 'node-d3', x: 400, y: groundY - 60, step: 32, action: 'spin' },
        { id: 'node-d4', x: 600, y: groundY - 180, step: 48, action: 'dance' },
        { id: 'node-d5', x: 740, y: groundY - 60, step: 64, action: 'move' },
      ];
    } else if (presetType === 'patrol') {
      const spline = engineRef.current.getRailSplines()[0];
      spline.nodes = [
        { id: 'node-p1', x: 80, y: groundY - 60, step: 0, action: 'move' },
        { id: 'node-p2', x: 380, y: groundY - 60, step: 32, action: 'dance' },
        { id: 'node-p3', x: 720, y: groundY - 60, step: 64, action: 'move' },
      ];
    }
    setRailSplines([...engineRef.current.getRailSplines()]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Brand Bar */}
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl text-white shadow-lg shadow-cyan-500/20">
            <Disc3 className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-slate-100 tracking-wide font-mono">
                RETRO 8-BIT / 16-BIT MUSIC VIDEO SEQUENCER
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                VIEWPORT OVERLAY & CONTROLLER
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Decoupled Presentation Layer • Backend Clock Authority • Multi-Pass Overdub Engine
            </p>
          </div>
        </div>

        {/* Global Bridge Status */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>BACKENDBRIDGE ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-3 md:p-5 max-w-7xl mx-auto w-full flex flex-col gap-4">
        {/* 1. 2D Retro Viewport with Persistent Floating Key HUD */}
        <RetroViewport
          onEngineReady={handleEngineReady}
          isRailOverlayActive={isRailOverlayActive}
          onSelectRailNode={setSelectedNodeId}
          isRecording={isRecording}
          isPlaying={isPlaying}
          armedTrack={tracks.find((t) => t.id === armedTrackId) || null}
        />

        {/* 2. 8-Pad HUD & Master Transport Overlay */}
        <ArcadeHud
          isPlaying={isPlaying}
          isRecording={isRecording}
          currentStep={currentStep}
          bpm={bpm}
          onTogglePlay={handleTogglePlay}
          onToggleRecord={handleToggleRecord}
          onRewind={handleRewind}
        />

        {/* 3. Multi-Track Character Puppeteering Panel */}
        <TrackController
          tracks={tracks}
          armedTrackId={armedTrackId}
          onSelectArmedTrack={handleSelectArmedTrack}
          onChangeTrackMode={handleChangeTrackMode}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          onClearRecording={handleClearRecording}
          onOpenSpriteConfig={handleOpenSpriteConfig}
        />

        {/* 4. Trolley / Rail Spline Sequencing Mode Panel */}
        <RailEditorPanel
          railSplines={railSplines}
          activeSplineId="spline-1"
          isOpen={isRailOverlayActive}
          onToggleOverlay={() => setIsRailOverlayActive(!isRailOverlayActive)}
          onAddNode={handleAddRailNode}
          onUpdateNode={handleUpdateRailNode}
          onDeleteNode={handleDeleteRailNode}
          onApplyPreset={handleApplyRailPreset}
        />

        {/* 5. Minimal Debug Control Panel & Telemetry Inspector */}
        <BackendTelemetryPanel
          currentBpm={bpm}
          onBpmChange={handleBpmChange}
        />
      </main>

      {/* Sprite Sheet Template & Atlas Loader Modal */}
      <SpriteSheetLoaderModal
        track={spriteModalTrack}
        isOpen={isSpriteModalOpen}
        onClose={() => setIsSpriteModalOpen(false)}
        onApplyConfig={handleApplySpriteConfig}
      />
    </div>
  );
}
