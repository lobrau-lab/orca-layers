'use client';

import React, { useState } from 'react';
import { ProjectMemoryItem } from '@/lib/types';
import { Brain, Pin, Search, Plus, AlertCircle, CheckCircle, Edit2, Trash2 } from 'lucide-react';

interface Props {
  memories: ProjectMemoryItem[];
  onAddMemory: (mem: ProjectMemoryItem) => void;
}

export const ProjectsMemoryView: React.FC<Props> = ({ memories, onAddMemory }) => {
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [keyFact, setKeyFact] = useState('');
  const [scope, setScope] = useState<'global' | 'project' | 'agent' | 'mission' | 'world_bible'>('project');
  const [scopeName, setScopeName] = useState('Orchestra Core');
  const [citation, setCitation] = useState('Operator Manual Note');

  const filteredMemories = memories.filter(m => {
    if (selectedScope !== 'all' && m.scope !== selectedScope) return false;
    if (searchQuery && !m.keyFact.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyFact) return;

    onAddMemory({
      id: `mem-${Date.now()}`,
      scope,
      scopeName,
      keyFact,
      confidence: 1.0,
      pinned: true,
      sourceCitation: citation,
      createdAt: new Date().toISOString()
    });

    setShowAddModal(false);
    setKeyFact('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-sm">Scoped Knowledge & Agent Memory Inspector</h2>
            <p className="text-xs text-slate-400">&quot;What this agent currently believes&quot; — prevents cross-project context leaks</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Pin New Knowledge Fact</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Semantic search across memory scopes, world bibles, and agent citations..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <span className="text-slate-400">Scope:</span>
          <select
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none"
          >
            <option value="all">All Scopes</option>
            <option value="global">Global Preferences</option>
            <option value="project">Project Scope</option>
            <option value="world_bible">World Bible</option>
            <option value="agent">Agent Memory</option>
          </select>
        </div>
      </div>

      {/* Memory List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMemories.map((m) => (
          <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 relative hover:border-slate-700 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {m.scope}
                </span>
                <span className="text-xs font-semibold text-slate-200">{m.scopeName}</span>
              </div>

              {m.pinned && (
                <span className="text-amber-400 flex items-center gap-1 text-[11px]" title="Pinned Fact">
                  <Pin className="w-3.5 h-3.5" /> Pinned
                </span>
              )}
            </div>

            <p className="text-xs text-slate-100 bg-slate-950 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
              &quot;{m.keyFact}&quot;
            </p>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <span>Source: <strong className="text-slate-300">{m.sourceCitation}</strong></span>
              <span>Confidence: <strong className="text-emerald-400">{(m.confidence * 100).toFixed(0)}%</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Fact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-slate-100 font-bold text-sm">Pin Knowledge Fact to Memory Scope</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Scope Type:</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                >
                  <option value="global">Global Operator Preferences</option>
                  <option value="project">Project Scope</option>
                  <option value="world_bible">Character & World Bible</option>
                  <option value="agent">Agent Memory</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Scope Identifier:</label>
                <input
                  type="text"
                  value={scopeName}
                  onChange={(e) => setScopeName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Fact Statement:</label>
                <textarea
                  value={keyFact}
                  onChange={(e) => setKeyFact(e.target.value)}
                  rows={3}
                  placeholder="Enter explicit fact or policy..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Source Citation:</label>
                <input
                  type="text"
                  value={citation}
                  onChange={(e) => setCitation(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white font-medium text-xs rounded-lg"
              >
                Pin Fact
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
