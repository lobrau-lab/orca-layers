'use client';

import React, { useState, useMemo } from 'react';
import { MachineService, ServiceType } from '@/lib/types';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Zap, 
  QrCode, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Globe, 
  ShieldCheck, 
  Activity, 
  Flame, 
  Download,
  Copy,
  Check,
  Radio,
  Sliders,
  Bell,
  BellOff,
  Gauge,
  Tag,
  Filter,
  X
} from 'lucide-react';

interface Props {
  machines: MachineService[];
  onAddMachine: (m: MachineService) => void;
  onProbeMachine: (id: string, explicitLatency?: number) => void;
}

export const MachinesServicesView: React.FC<Props> = ({ machines, onAddMachine, onProbeMachine }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Machine Tag Filter State
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');

  // Latency Alert System State
  const [latencyThresholdMs, setLatencyThresholdMs] = useState<number>(50);
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [isPingingAll, setIsPingingAll] = useState<boolean>(false);
  const [pingResults, setPingResults] = useState<Record<string, { rtt: number; time: string }>>({});

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<ServiceType>('orchestra-node');
  const [host, setHost] = useState('192.168.1.120');
  const [port, setPort] = useState(8443);
  const [routeType, setRouteType] = useState<'loopback' | 'lan' | 'tailscale'>('lan');
  const [tagsInput, setTagsInput] = useState('production, gpu-cluster');

  // Extract all unique tags dynamically
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    machines.forEach(m => {
      if (m.tags && Array.isArray(m.tags)) {
        m.tags.forEach(t => set.add(t));
      }
    });
    return Array.from(set).sort();
  }, [machines]);

  // Compute tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { all: machines.length };
    machines.forEach(m => {
      if (m.tags && Array.isArray(m.tags)) {
        m.tags.forEach(t => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });
    return counts;
  }, [machines]);

  // Filter machines based on selected tag
  const filteredMachines = useMemo(() => {
    if (selectedTagFilter === 'all') return machines;
    return machines.filter(m => m.tags?.includes(selectedTagFilter));
  }, [machines, selectedTagFilter]);

  const alertingMachinesCount = machines.filter(m => alertsEnabled && m.latencyMs > latencyThresholdMs).length;

  const handlePing = (id: string) => {
    setPingingId(id);
    setTimeout(() => {
      onProbeMachine(id);
      const m = machines.find(item => item.id === id);
      const currentLatency = m ? m.latencyMs : Math.floor(Math.random() * 40) + 10;
      setPingResults(prev => ({
        ...prev,
        [id]: {
          rtt: currentLatency,
          time: new Date().toLocaleTimeString()
        }
      }));
      setPingingId(null);
    }, 400);
  };

  const handlePingAll = () => {
    setIsPingingAll(true);
    let index = 0;
    const interval = setInterval(() => {
      if (index >= machines.length) {
        clearInterval(interval);
        setIsPingingAll(false);
        return;
      }
      const m = machines[index];
      onProbeMachine(m.id);
      setPingResults(prev => ({
        ...prev,
        [m.id]: {
          rtt: m.latencyMs,
          time: new Date().toLocaleTimeString()
        }
      }));
      index++;
    }, 250);
  };

  const handleToggleSpike = (m: MachineService) => {
    const newLat = m.latencyMs > latencyThresholdMs 
      ? Math.floor(Math.random() * 15) + 5 
      : latencyThresholdMs + Math.floor(Math.random() * 50) + 25;
    onProbeMachine(m.id, newLat);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !host) return;

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const newMachine: MachineService = {
      id: `node-${Date.now()}`,
      name,
      type,
      host,
      port,
      routeType,
      status: 'healthy',
      latencyMs: Math.floor(Math.random() * 20) + 10,
      availableModels: ['llama3.3:70b', 'qwen2.5-coder:32b'],
      vramUsageGb: 8.0,
      vramTotalGb: 16.0,
      cpuLoadPct: 15,
      ramUsagePct: 35,
      thermalState: 'nominal',
      batteryPct: 100,
      agentCapacity: 6,
      activeAgentsCount: 0,
      lastHeartbeat: new Date().toISOString(),
      supportsTmux: true,
      tags: parsedTags.length > 0 ? parsedTags : ['dev'],
      version: 'orchestra-node-v2026.1'
    };

    onAddMachine(newMachine);
    setShowAddModal(false);
    setName('');
    setTagsInput('production, gpu-cluster');
  };

  const handleCopyInstallScript = () => {
    const cmd = `curl -sSL ${window.location.origin}/api/node-agent/script -o orchestra-node-agent.js && node orchestra-node-agent.js`;
    navigator.clipboard.writeText(cmd);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Machines Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-sm">Multi-Machine LAN & Tailscale Node Discovery</h2>
            <p className="text-xs text-slate-400">mDNS probes: _ollama, _openai, _mlx, _comfyui, _orchestra-node</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScriptModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 transition border border-slate-700"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Node Companion Script</span>
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 transition border border-slate-700"
          >
            <QrCode className="w-4 h-4 text-purple-400" />
            <span>QR Pairing</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Host / Service</span>
          </button>
        </div>
      </div>

      {/* Tag Filtering System Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-md">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-200">Deployment Tag Filter</span>
              <p className="text-[11px] text-slate-400">Filter large-scale machine clusters by operational environment and tier</p>
            </div>
          </div>

          {selectedTagFilter !== 'all' && (
            <button
              onClick={() => setSelectedTagFilter('all')}
              className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs rounded-lg flex items-center gap-1 transition border border-purple-500/40 font-mono"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter ({selectedTagFilter})</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <button
            onClick={() => setSelectedTagFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 border ${
              selectedTagFilter === 'all'
                ? 'bg-purple-600 text-white border-purple-500 font-bold shadow-md shadow-purple-600/20'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            <Filter className="w-3 h-3 text-purple-300" />
            <span>All Machines</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded text-[10px] ${selectedTagFilter === 'all' ? 'bg-purple-800 text-purple-100' : 'bg-slate-800 text-slate-400'}`}>
              {tagCounts.all}
            </span>
          </button>

          {availableTags.map(tag => {
            const isSelected = selectedTagFilter === tag;
            const count = tagCounts[tag] || 0;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTagFilter(isSelected ? 'all' : tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1 border ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-500 font-bold shadow-md shadow-purple-600/20'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>#{tag}</span>
                <span className={`ml-1 px-1.5 py-0.2 rounded text-[10px] ${isSelected ? 'bg-purple-800 text-purple-100' : 'bg-slate-800 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Latency Threshold & Alert System Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg border ${alertingMachinesCount > 0 ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'}`}>
              <AlertTriangle className={`w-4 h-4 ${alertingMachinesCount > 0 ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">Latency Alert System</span>
                {alertsEnabled ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ACTIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                    DISABLED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Highlights machines in red when round-trip latency exceeds threshold
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Summary Pill */}
            {alertingMachinesCount > 0 ? (
              <div className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-xs font-mono font-semibold flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>{alertingMachinesCount} {alertingMachinesCount === 1 ? 'Node' : 'Nodes'} Exceeding Threshold (&gt;{latencyThresholdMs}ms)</span>
              </div>
            ) : (
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All Nodes Nominal (&le;{latencyThresholdMs}ms)</span>
              </div>
            )}

            <button
              onClick={handlePingAll}
              disabled={isPingingAll}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5 transition border border-slate-700 font-medium"
            >
              <Radio className={`w-3.5 h-3.5 text-blue-400 ${isPingingAll ? 'animate-spin' : ''}`} />
              <span>{isPingingAll ? 'Pinging Nodes...' : 'Ping All Nodes'}</span>
            </button>

            <button
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              className={`p-1.5 rounded-lg border transition ${alertsEnabled ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
              title={alertsEnabled ? 'Disable Alert Highlights' : 'Enable Alert Highlights'}
            >
              {alertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Threshold Adjustment Controls */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <Sliders className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 font-medium">Latency Threshold:</span>
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded px-2 py-1">
              <input
                type="number"
                min="5"
                max="1000"
                step="5"
                value={latencyThresholdMs}
                onChange={(e) => setLatencyThresholdMs(Math.max(5, Number(e.target.value)))}
                className="w-14 bg-transparent text-white font-mono text-xs focus:outline-none text-right"
              />
              <span className="text-slate-400 font-mono text-[11px]">ms</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 text-[11px]">Presets:</span>
            {[15, 30, 50, 80, 120].map((preset) => (
              <button
                key={preset}
                onClick={() => setLatencyThresholdMs(preset)}
                className={`px-2 py-1 rounded text-[11px] font-mono border transition ${
                  latencyThresholdMs === preset
                    ? 'bg-blue-600 text-white border-blue-500 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {preset}ms
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State when tag filter yields zero nodes */}
      {filteredMachines.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center border border-purple-500/20">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="text-slate-200 font-semibold text-sm">No machines match tag &quot;#{selectedTagFilter}&quot;</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            Try selecting a different tag filter or clear the tag selection to view all deployment nodes.
          </p>
          <button
            onClick={() => setSelectedTagFilter('all')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition"
          >
            Show All {machines.length} Machines
          </button>
        </div>
      )}

      {/* Grid of Discovered Nodes and AI Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMachines.map((m) => {
          const isAlerting = alertsEnabled && m.latencyMs > latencyThresholdMs;
          const isPinging = pingingId === m.id || isPingingAll;
          const lastPing = pingResults[m.id];

          return (
            <div
              key={m.id}
              className={`rounded-xl p-4 space-y-3 transition relative shadow-lg ${
                isAlerting 
                  ? 'bg-slate-900/95 border-2 border-red-500/90 shadow-red-950/60 ring-2 ring-red-500/40 bg-gradient-to-b from-red-950/30 via-slate-900 to-slate-900' 
                  : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Visual Alert Banner when threshold is exceeded */}
              {isAlerting && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-xs font-mono animate-pulse">
                  <div className="flex items-center gap-1.5 font-bold text-red-400">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>HIGH LATENCY ALERT</span>
                  </div>
                  <span className="font-bold">{m.latencyMs}ms &gt; {latencyThresholdMs}ms threshold</span>
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold text-white">{m.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                      {m.type}
                    </span>
                  </div>
                  
                  <div className="text-xs font-mono text-slate-400 flex items-center gap-2 mb-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    <span>{m.host}:{m.port}</span>
                    <span className="text-slate-600">({m.routeType})</span>
                  </div>

                  {/* Machine Tags Badges */}
                  {m.tags && m.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {m.tags.map(t => {
                        const isCurrentFilter = selectedTagFilter === t;
                        return (
                          <button
                            key={t}
                            onClick={() => setSelectedTagFilter(isCurrentFilter ? 'all' : t)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition flex items-center gap-1 border ${
                              isCurrentFilter
                                ? 'bg-purple-600 text-white border-purple-400 font-bold'
                                : 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-400'
                            }`}
                            title={`Filter by tag #${t}`}
                          >
                            <Tag className="w-2.5 h-2.5 opacity-70" />
                            <span>#{t}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Latency Badge */}
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 ${
                      isAlerting
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30 animate-pulse'
                        : m.status === 'healthy'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    <Gauge className="w-3 h-3" />
                    {m.latencyMs}ms
                  </span>

                  {/* Ping Button */}
                  <button
                    onClick={() => handlePing(m.id)}
                    disabled={isPinging}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm border ${
                      isPinging 
                        ? 'bg-blue-600/40 text-blue-200 border-blue-500/50 cursor-wait' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/60 shadow-blue-600/20'
                    }`}
                    title="Ping machine endpoint"
                  >
                    <Radio className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-white' : ''}`} />
                    <span>{isPinging ? 'Pinging' : 'Ping'}</span>
                  </button>

                  {/* Probe Refresh Button */}
                  <button
                    onClick={() => onProbeMachine(m.id)}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition border border-transparent hover:border-slate-700"
                    title="Probe Endpoint Capabilities"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Ping Feedback & Spike Simulator Strip */}
              <div className="flex items-center justify-between text-[11px] font-mono bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-400 truncate">
                  <Activity className="w-3 h-3 text-blue-400 shrink-0" />
                  {lastPing ? (
                    <span>
                      Last Ping: <strong className="text-slate-200">{lastPing.rtt}ms</strong> at {lastPing.time}
                    </span>
                  ) : (
                    <span className="text-slate-500">ICMP / HTTP Ping Ready</span>
                  )}
                </div>

                <button
                  onClick={() => handleToggleSpike(m)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition shrink-0 ${
                    m.latencyMs > latencyThresholdMs
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                  }`}
                  title="Toggle latency spike to test alert system"
                >
                  {m.latencyMs > latencyThresholdMs ? 'Lower Latency' : 'Simulate Spike'}
                </button>
              </div>

              {/* Hardware & Resource Gauge Grid */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">CPU Load</span>
                  <span className="text-slate-200 font-mono">{m.cpuLoadPct}%</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">RAM Usage</span>
                  <span className="text-slate-200 font-mono">{m.ramUsagePct}%</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">VRAM</span>
                  <span className="text-slate-200 font-mono">{m.vramUsageGb} / {m.vramTotalGb} GB</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Thermals</span>
                  <span className={`font-mono ${m.thermalState === 'serious' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {m.thermalState}
                  </span>
                </div>
              </div>

              {/* Available Models */}
              <div>
                <span className="text-slate-500 text-xs block mb-1">Advertised Capabilities & Models:</span>
                <div className="flex flex-wrap gap-1">
                  {m.availableModels.map((mdl, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-slate-300">
                      {mdl}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Host Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-slate-100 font-bold text-sm">Add Machine or Local AI Endpoint</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Friendly Name:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Workstation RTX 4090"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Service Type:</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ServiceType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                >
                  <option value="orchestra-node">Orchestra Node Companion</option>
                  <option value="ollama">Ollama Server</option>
                  <option value="openai">OpenAI Compatible API</option>
                  <option value="mlx">MLX Server (Apple Silicon)</option>
                  <option value="comfyui">ComfyUI Generation Server</option>
                  <option value="llamacpp">llama.cpp Server</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Host IP / Domain:</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Port:</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Route Type:</label>
                <select
                  value={routeType}
                  onChange={(e) => setRouteType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                >
                  <option value="lan">Local Area Network (LAN)</option>
                  <option value="tailscale">Tailscale VPN</option>
                  <option value="loopback">Loopback (127.0.0.1)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Deployment Tags (comma-separated):</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. production, gpu-cluster, dev"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  e.g., <span className="font-mono text-purple-400">production, dev, gpu-cluster, apple-silicon, edge-iot</span>
                </span>
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
                className="px-4 py-2 bg-blue-600 text-white font-medium text-xs rounded-lg"
              >
                Add Node
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg w-full space-y-4">
            <h3 className="text-slate-100 font-bold text-sm flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-400" />
              Run Orchestra Node Companion Script
            </h3>

            <p className="text-xs text-slate-300">
              Execute this command on your desktop or laptop machine to start the Orchestra Node Agent. It manages tmux sessions, reports CPU/GPU metrics, and executes signed operator envelopes.
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between gap-2">
              <span className="truncate">curl -sSL {typeof window !== 'undefined' ? window.location.origin : ''}/api/node-agent/script -o orchestra-node-agent.js && node orchestra-node-agent.js</span>
              <button
                onClick={handleCopyInstallScript}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded shrink-0"
              >
                {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowScriptModal(false)}
                className="px-4 py-2 bg-blue-600 text-white font-medium text-xs rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full text-center space-y-4">
            <h3 className="text-slate-100 font-bold text-sm">Scan QR Code or Token to Pair Mac Workstation</h3>
            <div className="p-4 bg-white rounded-xl inline-block shadow-xl">
              {/* QR Mockup Canvas */}
              <div className="w-44 h-44 bg-slate-900 flex items-center justify-center text-white font-mono text-[10px] rounded p-2 text-center">
                [ORCHESTRA PAIRING QR: pub_mac_secure_enclave_ed25519_node_01]
              </div>
            </div>
            <p className="text-xs text-slate-400">Registers macOS Secure Enclave Ed25519 public key and device-bound token into Keystore.</p>
            <button
              onClick={() => setShowQrModal(false)}
              className="px-4 py-2 bg-slate-800 text-slate-200 text-xs rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
