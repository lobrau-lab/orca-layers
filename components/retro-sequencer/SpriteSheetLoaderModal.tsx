'use client';

import React, { useState } from 'react';
import { CharacterTrack, SpriteAtlasConfig } from '@/lib/retro-sequencer/types';
import { getAtlasConfig, getProceduralCharacterAtlas } from '@/lib/retro-sequencer/sprites';
import { X, Check, Upload, Sliders, RefreshCw, Eye } from 'lucide-react';

interface SpriteSheetLoaderModalProps {
  track: CharacterTrack | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyConfig: (trackId: string, canvas: HTMLCanvasElement, config: SpriteAtlasConfig) => void;
}

export const SpriteSheetLoaderModal: React.FC<SpriteSheetLoaderModalProps> = ({
  track,
  isOpen,
  onClose,
  onApplyConfig,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(track?.characterType || 'retro_bot');
  const [frameWidth, setFrameWidth] = useState<number>(track?.spriteConfig.frameWidth || 32);
  const [frameHeight, setFrameHeight] = useState<number>(track?.spriteConfig.frameHeight || 32);
  const [scale, setScale] = useState<number>(track?.spriteConfig.scale || 2.5);
  const [fps, setFps] = useState<number>(track?.spriteConfig.animations.fps || 8);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [jsonSchema, setJsonSchema] = useState<string>(
    track ? JSON.stringify(track.spriteConfig.animations, null, 2) : '{}'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !track) return null;

  const presets = [
    { id: 'retro_bot', name: 'Retro Synth Bot (CRT Head)' },
    { id: 'bboy', name: '8-Bit B-Boy (Breakdancer)' },
    { id: 'cyberpunk', name: 'Cyberpunk Runner' },
    { id: 'chiptune_mage', name: 'Chiptune Wizard' },
    { id: 'pixel_kitty', name: 'Pixel Neon Kitty' },
  ];

  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const { config, canvas } = getProceduralCharacterAtlas(presetId as any);
    setFrameWidth(config.frameWidth);
    setFrameHeight(config.frameHeight);
    setScale(config.scale);
    setJsonSchema(JSON.stringify(config.animations, null, 2));
    onApplyConfig(track.id, canvas, {
      ...config,
      scale,
    });
    onClose();
  };

  const handleApplyCustomJson = () => {
    try {
      setErrorMsg(null);
      const parsedAnimations = JSON.parse(jsonSchema);

      if (customUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = img.width;
          offCanvas.height = img.height;
          const ctx = offCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const newConfig: SpriteAtlasConfig = {
              id: `custom_${Date.now()}`,
              name: `Custom Atlas (${track.name})`,
              sheetUrl: customUrl,
              frameWidth,
              frameHeight,
              scale,
              animations: { ...parsedAnimations, fps },
            };
            onApplyConfig(track.id, offCanvas, newConfig);
            onClose();
          }
        };
        img.onerror = () => {
          setErrorMsg('Failed to load image from URL. Ensure CORS is supported.');
        };
        img.src = customUrl;
      } else {
        // Apply procedural with modified JSON animation frames
        const { canvas, config } = getProceduralCharacterAtlas(selectedPreset as any);
        const updatedConfig: SpriteAtlasConfig = {
          ...config,
          frameWidth,
          frameHeight,
          scale,
          animations: { ...parsedAnimations, fps },
        };
        onApplyConfig(track.id, canvas, updatedConfig);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(`JSON Parse Error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-5 shadow-2xl flex flex-col gap-4 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono font-bold text-sm tracking-wide">
              SPRITE SHEET TEMPLATE & ATLAS LOADER
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Track */}
        <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Target Track:</span>
          <span className="font-bold text-cyan-400">{track.name}</span>
        </div>

        {/* Preset Character Atlas Picker */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Quick Procedural 8-Bit/16-Bit Presets:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p.id)}
                className={`p-2 rounded text-left text-xs font-mono transition border ${
                  selectedPreset === p.id
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Image URL (Hot Swap) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            External Sprite Sheet URL (Optional Hot Swap):
          </label>
          <input
            type="text"
            placeholder="https://example.com/spritesheet.png or data:image/png;base64,..."
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Dimensions & Scale */}
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">FRAME W (PX)</label>
            <input
              type="number"
              value={frameWidth}
              onChange={(e) => setFrameWidth(Number(e.target.value))}
              className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-center text-cyan-300"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">FRAME H (PX)</label>
            <input
              type="number"
              value={frameHeight}
              onChange={(e) => setFrameHeight(Number(e.target.value))}
              className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-center text-cyan-300"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">CANVAS SCALE</label>
            <input
              type="number"
              step="0.5"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-center text-cyan-300"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">ANIM FPS</label>
            <input
              type="number"
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-center text-cyan-300"
            />
          </div>
        </div>

        {/* JSON Animation Schema Parser */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Atlas Frame Rect Schema (JSON):
            </label>
            <span className="text-[10px] font-mono text-slate-500">idle, move, jump, dance, spin</span>
          </div>
          <textarea
            rows={7}
            value={jsonSchema}
            onChange={(e) => setJsonSchema(e.target.value)}
            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-emerald-400 focus:outline-none focus:border-cyan-500 font-mono resize-none"
          />
        </div>

        {errorMsg && (
          <div className="p-2 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyCustomJson}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-cyan-600/30"
          >
            <Check className="w-4 h-4" />
            <span>Apply Atlas Config</span>
          </button>
        </div>
      </div>
    </div>
  );
};
