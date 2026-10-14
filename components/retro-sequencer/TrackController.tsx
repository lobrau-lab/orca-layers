'use client';

import React from 'react';
import { CharacterMode, CharacterTrack } from '@/lib/retro-sequencer/types';
import { 
  Gamepad2, 
  GitCommit, 
  Music, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Radio, 
  Trash2, 
  Sliders,
  Keyboard,
  Layers
} from 'lucide-react';

interface TrackControllerProps {
  tracks: CharacterTrack[];
  armedTrackId: string | null;
  onSelectArmedTrack: (trackId: string) => void;
  onChangeTrackMode: (trackId: string, mode: CharacterMode) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onClearRecording: (trackId: string) => void;
  onOpenSpriteConfig: (trackId: string) => void;
}

const MODE_CONFIGS: Record<CharacterMode, { label: string; icon: any; color: string; desc: string }> = {
  LIVE_PUPPET: {
    label: 'LIVE PUPPET',
    icon: Gamepad2,
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: 'Controlled live via WASD/Arrows, Space (Jump), E (Dance), F (Spin)',
  },
  RAIL_PATH: {
    label: 'RAIL PATH',
    icon: GitCommit,
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: 'Follows editable spline nodes locked to master clock steps',
  },
  IDLE_BEAT_SYNC: {
    label: 'BEAT SYNC',
    icon: Music,
    color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    desc: 'Passively dances, bounces, and pulses to backend pad triggers',
  },
  PLAYBACK_OVERDUB: {
    label: 'OVERDUB PLAY',
    icon: Repeat,
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    desc: 'Replays recorded movement locked to master timeline',
  },
};

export const TrackController: React.FC<TrackControllerProps> = ({
  tracks,
  armedTrackId,
  onSelectArmedTrack,
  onChangeTrackMode,
  onToggleMute,
  onToggleSolo,
  onClearRecording,
  onOpenSpriteConfig,
}) => {
  const armedTrack = tracks.find((t) => t.id === armedTrackId);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200">
            MULTI-TRACK CHARACTER PUPPETEER ({tracks.length} TRACKS)
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          ARM 1 TRACK TO RECORD LIVE WHILE OVERDUBBING OTHERS
        </span>
      </div>

      {/* Tracks List */}
      <div className="space-y-2.5">
        {tracks.map((track) => {
          const isArmed = track.id === armedTrackId;
          const modeInfo = MODE_CONFIGS[track.mode];
          const hasRecording = track.recordedFrames.length > 0;

          return (
            <div
              key={track.id}
              className={`p-3 rounded-lg border transition-all ${
                isArmed
                  ? 'bg-slate-800/80 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Track ID & Arm Toggle */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => onSelectArmedTrack(track.id)}
                    title={isArmed ? 'Armed for Live Control & Recording' : 'Click to Arm Track'}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 transition ${
                      isArmed
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/40 ring-2 ring-rose-400/50'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                    }`}
                  >
                    <Radio className={`w-3 h-3 ${isArmed ? 'animate-pulse' : ''}`} />
                    <span>{isArmed ? 'ARMED' : 'ARM'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: track.color }}
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-100">{track.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 ml-2">
                        [{track.characterType.toUpperCase()}]
                      </span>
                    </div>
                  </div>
                </div>

                {/* State Machine Mode Selector */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {(Object.keys(MODE_CONFIGS) as CharacterMode[]).map((modeKey) => {
                    const cfg = MODE_CONFIGS[modeKey];
                    const Icon = cfg.icon;
                    const isActive = track.mode === modeKey;
                    const isDisabled = modeKey === 'PLAYBACK_OVERDUB' && !hasRecording;

                    return (
                      <button
                        key={modeKey}
                        disabled={isDisabled}
                        onClick={() => onChangeTrackMode(track.id, modeKey)}
                        title={isDisabled ? 'No recorded data yet' : cfg.desc}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-semibold flex items-center gap-1 transition ${
                          isActive
                            ? `${cfg.color} border shadow-sm`
                            : isDisabled
                            ? 'opacity-30 cursor-not-allowed text-slate-600'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span className="hidden sm:inline">{cfg.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Telemetry Count, Sprite Config & Mute/Solo */}
                <div className="flex items-center gap-2">
                  {/* Telemetry info */}
                  {hasRecording ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      {track.recordedFrames.length} frames
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-600">No frames</span>
                  )}

                  {/* Clear recording button */}
                  {hasRecording && (
                    <button
                      onClick={() => onClearRecording(track.id)}
                      title="Clear recorded frames"
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Sprite Atlas Config */}
                  <button
                    onClick={() => onOpenSpriteConfig(track.id)}
                    title="Edit Sprite Sheet & Dimensions"
                    className="p-1 text-slate-400 hover:text-cyan-400 transition"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>

                  {/* Solo Button */}
                  <button
                    onClick={() => onToggleSolo(track.id)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                      track.isSolo
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    S
                  </button>

                  {/* Mute Button */}
                  <button
                    onClick={() => onToggleMute(track.id)}
                    className={`p-1 rounded transition ${
                      track.isMuted
                        ? 'bg-rose-950 text-rose-400'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {track.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Puppet Keyboard Controls Reference */}
      {armedTrack && armedTrack.mode === 'LIVE_PUPPET' && (
        <div className="mt-1 p-2.5 bg-slate-950 border border-emerald-500/30 rounded-lg flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <Keyboard className="w-4 h-4" />
            <span className="font-bold">LIVE PUPPET ARMED: {armedTrack.name}</span>
            <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[9px] bg-cyan-950 border border-cyan-800 text-cyan-300">
              HUD CAPTURE ACTIVE
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-slate-300">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white font-bold">W/A/S/D</kbd> Move
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-white font-bold">Space</kbd> Jump
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white font-bold">E</kbd> Dance
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white font-bold">F</kbd> Spin
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
