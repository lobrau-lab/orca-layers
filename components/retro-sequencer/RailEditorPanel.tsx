'use client';

import React from 'react';
import { RailNode, RailSpline } from '@/lib/retro-sequencer/types';
import { GitCommit, Plus, Trash2, Sliders, CheckSquare, Square, CornerDownRight } from 'lucide-react';

interface RailEditorPanelProps {
  railSplines: RailSpline[];
  activeSplineId: string;
  isOpen: boolean;
  onToggleOverlay: () => void;
  onAddNode: (x: number, y: number, step: number) => void;
  onUpdateNode: (nodeId: string, updates: Partial<RailNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onApplyPreset: (presetType: 'wave' | 'dive' | 'patrol') => void;
}

export const RailEditorPanel: React.FC<RailEditorPanelProps> = ({
  railSplines,
  activeSplineId,
  isOpen,
  onToggleOverlay,
  onAddNode,
  onUpdateNode,
  onDeleteNode,
  onApplyPreset,
}) => {
  const activeSpline = railSplines.find((s) => s.id === activeSplineId) || railSplines[0];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200">
            TROLLEY / RAIL SEQUENCER MODE
          </h2>
        </div>

        {/* Toggle Canvas Rail Overlay */}
        <button
          onClick={onToggleOverlay}
          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 transition ${
            isOpen
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {isOpen ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          <span>{isOpen ? 'RAIL OVERLAY ON' : 'ENABLE RAIL OVERLAY'}</span>
        </button>
      </div>

      {isOpen && activeSpline && (
        <div className="space-y-3">
          {/* Presets and Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <span className="text-slate-400">PRESETS:</span>
              <button
                onClick={() => onApplyPreset('wave')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
              >
                Figure-8 Wave
              </button>
              <button
                onClick={() => onApplyPreset('dive')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
              >
                High Dive
              </button>
              <button
                onClick={() => onApplyPreset('patrol')}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
              >
                Floor Patrol
              </button>
            </div>

            <button
              onClick={() => onAddNode(400, 260, 32)}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-mono font-bold flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>ADD NODE</span>
            </button>
          </div>

          <p className="text-[10px] font-mono text-slate-400">
            Interactive Editor: Click and drag nodes directly on the canvas above, or adjust coordinates & step subdivisions below. Characters set to <span className="text-amber-400 font-bold">RAIL PATH</span> will follow this curve locked to master ticks.
          </p>

          {/* Keyframe Nodes Table */}
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {activeSpline.nodes.map((node, index) => (
              <div
                key={node.id}
                className="p-2 bg-slate-950/80 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-amber-500/20 text-amber-400 rounded flex items-center justify-center font-bold text-[10px]">
                    #{index + 1}
                  </span>
                  <span className="text-slate-400">
                    X:<strong className="text-slate-200 ml-0.5">{node.x}</strong> Y:<strong className="text-slate-200 ml-0.5">{node.y}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Step Subdivision */}
                  <label className="flex items-center gap-1 text-slate-400">
                    <span>STEP:</span>
                    <input
                      type="number"
                      min={0}
                      max={64}
                      value={node.step}
                      onChange={(e) => onUpdateNode(node.id, { step: Number(e.target.value) })}
                      className="w-14 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-amber-300 text-center font-bold"
                    />
                  </label>

                  {/* Node Action */}
                  <label className="flex items-center gap-1 text-slate-400">
                    <span>ACTION:</span>
                    <select
                      value={node.action || 'move'}
                      onChange={(e) => onUpdateNode(node.id, { action: e.target.value as any })}
                      className="px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                    >
                      <option value="move">Move</option>
                      <option value="jump">Jump</option>
                      <option value="dance">Dance</option>
                      <option value="spin">Spin</option>
                      <option value="idle">Idle</option>
                    </select>
                  </label>

                  {/* Delete Node */}
                  {activeSpline.nodes.length > 2 && (
                    <button
                      onClick={() => onDeleteNode(node.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="Delete Node"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
