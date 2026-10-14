'use client';

import React, { useRef, useEffect, useState } from 'react';
import { SequencerEngine } from '@/lib/retro-sequencer/engine';
import { STAGE_THEMES } from '@/lib/retro-sequencer/stage';
import { 
  Tv, 
  Sparkles, 
  Maximize2, 
  Layers, 
  Monitor, 
  HelpCircle,
  Eye,
  Gamepad2
} from 'lucide-react';
import { CharacterTrack } from '@/lib/retro-sequencer/types';
import { KeyInputDisplay } from './KeyInputDisplay';
import { InputCaptureHud } from './InputCaptureHud';

interface RetroViewportProps {
  onEngineReady?: (engine: SequencerEngine) => void;
  isRailOverlayActive: boolean;
  onSelectRailNode?: (nodeId: string | null) => void;
  isRecording?: boolean;
  isPlaying?: boolean;
  armedTrack?: CharacterTrack | null;
}

export const RetroViewport: React.FC<RetroViewportProps> = ({
  onEngineReady,
  isRailOverlayActive,
  onSelectRailNode,
  isRecording = false,
  isPlaying = false,
  armedTrack = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SequencerEngine | null>(null);

  // Viewport Settings
  const [stageTheme, setStageTheme] = useState<string>('cyber_alley');
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);
  const [shakeEnabled, setShakeEnabled] = useState<boolean>(true);
  const [showKeyHud, setShowKeyHud] = useState<boolean>(true);
  const [isFocused, setIsFocused] = useState<boolean>(true);
  const [isDraggingNode, setIsDraggingNode] = useState<boolean>(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const [engineInstance, setEngineInstance] = useState<SequencerEngine | null>(null);

  const onEngineReadyRef = useRef(onEngineReady);
  useEffect(() => {
    onEngineReadyRef.current = onEngineReady;
  }, [onEngineReady]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = 800;
    canvas.height = 450;

    const engine = new SequencerEngine(canvas, {
      width: 800,
      height: 450,
      enableCrtFilter: crtEnabled,
      enableScreenShake: shakeEnabled,
      enableRailOverlay: isRailOverlayActive,
    });

    engine.setStageTheme(stageTheme);
    engine.start();
    engineRef.current = engine;
    setEngineInstance(engine);

    if (onEngineReadyRef.current) {
      onEngineReadyRef.current(engine);
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
      setEngineInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync config toggles to active engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setConfig({
        enableCrtFilter: crtEnabled,
        enableScreenShake: shakeEnabled,
        enableRailOverlay: isRailOverlayActive,
      });
    }
  }, [crtEnabled, shakeEnabled, isRailOverlayActive]);

  // Sync stage theme
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setStageTheme(stageTheme);
    }
  }, [stageTheme]);

  // Handle Canvas Mouse Events for Rail Editor Dragging & Node Placement
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isRailOverlayActive || !engineRef.current) return;
    const { x, y } = getCanvasCoords(e);
    const node = engineRef.current.selectRailNodeAt(x, y);
    if (node) {
      setIsDraggingNode(true);
      setDraggedNodeId(node.id);
      if (onSelectRailNode) onSelectRailNode(node.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingNode || !draggedNodeId || !engineRef.current) return;
    const { x, y } = getCanvasCoords(e);
    engineRef.current.updateRailNode(draggedNodeId, {
      x: Math.round(x),
      y: Math.round(y),
    });
  };

  const handleMouseUp = () => {
    setIsDraggingNode(false);
    setDraggedNodeId(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isRailOverlayActive || !engineRef.current) return;
    const { x, y } = getCanvasCoords(e);
    const step = Math.round((x / 800) * 64);
    engineRef.current.addRailNode(x, y, step);
  };

  const handleToggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch((err) => console.error(err));
      } else {
        document.exitFullscreen().catch((err) => console.error(err));
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl"
    >
      {/* Viewport Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-slate-200">RETRO VIEWPORT (800x450 PIXELATED)</span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline text-emerald-400">MATH.ROUND() SUB-PIXEL LOCK</span>
        </div>

        {/* Viewport Options Toolbar */}
        <div className="flex items-center gap-2">
          {/* Stage Selector */}
          <select
            value={stageTheme}
            onChange={(e) => setStageTheme(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-300 text-[11px] focus:outline-none focus:border-cyan-500"
          >
            {Object.values(STAGE_THEMES).map((st) => (
              <option key={st.id} value={st.id}>
                Stage: {st.name}
              </option>
            ))}
          </select>

          {/* CRT Scanlines Toggle */}
          <button
            onClick={() => setCrtEnabled(!crtEnabled)}
            className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition ${
              crtEnabled ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle Retro CRT Scanlines & Vignette"
          >
            <Tv className="w-3 h-3" />
            <span className="hidden md:inline">CRT Filter</span>
          </button>

          {/* Screen Shake Toggle */}
          <button
            onClick={() => setShakeEnabled(!shakeEnabled)}
            className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition ${
              shakeEnabled ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle Beat Screen Shake"
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden md:inline">Beat Shake</span>
          </button>

          {/* Key Capture HUD Toggle */}
          <button
            onClick={() => setShowKeyHud(!showKeyHud)}
            className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition ${
              showKeyHud ? 'bg-cyan-600 text-white font-medium shadow-sm shadow-cyan-500/30' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle Real-Time Input Capture HUD"
          >
            <Gamepad2 className="w-3 h-3" />
            <span className="hidden sm:inline">Input HUD</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
            title="Fullscreen Viewport"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Canvas Container with strict pixelated rendering */}
      <div
        className="relative w-full aspect-video bg-black flex items-center justify-center cursor-crosshair overflow-hidden"
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          className="w-full h-full object-contain pixelated select-none"
          style={{
            imageRendering: 'pixelated',
          }}
        />

        {/* Persistent Semi-Transparent Floating Key Input HUD Overlay */}
        {showKeyHud && (
          <KeyInputDisplay
            isRecording={isRecording}
            isPlaying={isPlaying}
            armedTrack={armedTrack}
            defaultPosition="bottom-left"
            keysPressedSource={() => (engineInstance ? engineInstance.getKeysPressed() : {})}
            onVirtualKeyPress={(code, isPressed) => {
              if (engineInstance) {
                engineInstance.setVirtualKey(code, isPressed);
              }
            }}
          />
        )}

        {/* Rail Editor Hint Overlay if active */}
        {isRailOverlayActive && (
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-slate-900/90 border border-amber-500/50 rounded-lg text-amber-300 text-[11px] font-mono shadow-lg backdrop-blur-sm pointer-events-none">
            ⚡ Double-click to place keyframe node • Drag node to reposition
          </div>
        )}

        {/* Focus Hint */}
        {!isFocused && (
          <div
            onClick={() => canvasRef.current?.focus()}
            className="absolute bottom-3 right-3 px-2 py-1 bg-slate-900/80 border border-slate-700 rounded text-slate-400 text-[10px] font-mono cursor-pointer hover:text-white"
          >
            Click viewport to activate keyboard controls
          </div>
        )}
      </div>
    </div>
  );
};
