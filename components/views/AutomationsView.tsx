'use client';

import React, { useState } from 'react';
import { AutomationJob } from '@/lib/types';
import { Zap, Clock, Play, Pause, Plus, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';

interface Props {
  automations: AutomationJob[];
  onToggleAutomation: (id: string) => void;
}

export const AutomationsView: React.FC<Props> = ({ automations, onToggleAutomation }) => {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-sm">Automations & WorkManager Durable Jobs</h2>
            <p className="text-xs text-slate-400">Node companions continue execution autonomously even when control surface disconnects</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {automations.map((job) => (
          <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {job.triggerType}
                </span>
                <h3 className="text-slate-100 font-semibold text-sm">{job.title}</h3>
              </div>

              <button
                onClick={() => onToggleAutomation(job.id)}
                className={`p-1.5 rounded transition ${job.status === 'active' ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                {job.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono">
              {job.prompt}
            </p>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <span>Target Agent: <strong className="text-white">{job.targetAgentId}</strong></span>
              <span>Idempotency Key: <code className="text-slate-400">{job.idempotencyKey}</code></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
