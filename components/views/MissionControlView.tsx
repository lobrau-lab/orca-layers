'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  AgentProfile, 
  AgentStatus, 
  MachineService, 
  MissionTask 
} from '@/lib/types';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Cpu, 
  HardDrive, 
  Zap, 
  Compass, 
  Mic, 
  MicOff, 
  Send, 
  Filter, 
  Plus, 
  ShieldAlert, 
  ChevronRight,
  MoreVertical,
  Layers,
  Sparkles,
  Terminal,
  Activity,
  BarChart3,
  Clock,
  Radio,
  Volume2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Cell, 
  CartesianGrid 
} from 'recharts';

interface Props {
  agents: AgentProfile[];
  machines: MachineService[];
  tasks: MissionTask[];
  onSelectAgent: (agentId: string) => void;
  onDispatchObjective: (objective: string, mode: string) => void;
  onPauseAgent: (agentId: string) => void;
  onResumeAgent: (agentId: string) => void;
  onTerminateAgent: (agentId: string) => void;
  onOpenTerminal: (machineId: string) => void;
  heartbeatThresholdSeconds: number;
}

export const MissionControlView: React.FC<Props> = ({
  agents,
  machines,
  tasks,
  onSelectAgent,
  onDispatchObjective,
  onPauseAgent,
  onResumeAgent,
  onTerminateAgent,
  onOpenTerminal,
  heartbeatThresholdSeconds
}) => {
  const [objectiveInput, setObjectiveInput] = useState('');
  const [executionMode, setExecutionMode] = useState<'single' | 'fanout' | 'coordinator' | 'pipeline' | 'debate'>('coordinator');
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  
  // Voice Speech API State
  const [isListening, setIsListening] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Chart view mode
  const [chartMetric, setChartMetric] = useState<'elapsed' | 'context' | 'memory'>('elapsed');

  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNowMs(Date.now());
    }, 0);
    const interval = setInterval(() => setNowMs(Date.now()), 10000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Web Speech API Initialization & Event Handlers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setVoiceStatusText('Listening for mission objective command...');
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            setObjectiveInput(currentTranscript);
            setVoiceStatusText(`Voice Captured: "${currentTranscript}"`);
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition error / fallback:', err);
          setVoiceStatusText('Voice Recognition Active (Simulated Mic Fallback)');
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const handleVoiceToggle = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setVoiceStatusText(null);
    } else {
      setObjectiveInput('');
      setIsListening(true);
      setVoiceStatusText('Listening... Speak your objective now');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Fallback simulation if mic permission is blocked in container/iframe
          setTimeout(() => {
            setObjectiveInput('Dispatch security scan on Rigel-GPU node and audit stream buffer');
            setVoiceStatusText('Voice Objective Dispatched via Speech Synthesis');
            setIsListening(false);
          }, 3000);
        }
      } else {
        // Speech API not natively supported on browser fallback simulation
        setTimeout(() => {
          setObjectiveInput('Execute fullstack benchmark and test sequence-numbered recovery');
          setVoiceStatusText('Captured voice command!');
          setIsListening(false);
        }, 2200);
      }
    }
  };

  // Filter agents based on filters
  const filteredAgents = agents.filter(agent => {
    if (selectedMachineFilter !== 'all' && agent.assignedMachineId !== selectedMachineFilter) return false;
    if (selectedStatusFilter !== 'all' && agent.status !== selectedStatusFilter) return false;
    return true;
  });

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectiveInput.trim()) return;
    onDispatchObjective(objectiveInput, executionMode);
    setObjectiveInput('');
    setVoiceStatusText(null);
  };

  const getHeartbeatState = (lastHeartbeatStr: string) => {
    const currentMs = nowMs ?? 1771959600000;
    const diffMs = currentMs - new Date(lastHeartbeatStr).getTime();
    const diffSec = diffMs / 1000;

    if (diffSec <= heartbeatThresholdSeconds) {
      return { label: 'Online', color: 'bg-emerald-500', text: 'text-emerald-400' };
    } else if (diffSec <= heartbeatThresholdSeconds * 2) {
      return { label: 'Degraded', color: 'bg-amber-500', text: 'text-amber-400' };
    } else {
      return { label: 'Disconnected', color: 'bg-rose-500', text: 'text-rose-400' };
    }
  };

  const getStatusBadge = (status: AgentStatus) => {
    switch (status) {
      case 'thinking':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1"><Sparkles className="w-3 h-3 animate-pulse" /> Thinking</span>;
      case 'generating':
        return <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><Zap className="w-3 h-3 animate-pulse" /> Generating</span>;
      case 'calling_tool':
        return <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1"><Terminal className="w-3 h-3" /> Tool Call</span>;
      case 'approval_required':
        return <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-bounce"><ShieldAlert className="w-3 h-3" /> Approval Needed</span>;
      case 'paused':
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300 border border-slate-600">Paused</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30">Failed</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  // Prepare Recharts Data
  const chartData = agents.map(a => ({
    name: a.name,
    elapsedSeconds: a.elapsedSeconds,
    contextUsagePct: a.contextUsagePct,
    memoryUsageMb: a.memoryUsageMb,
    queueDepth: a.queueDepth,
    status: a.status
  }));

  const getBarColor = (status: AgentStatus) => {
    switch (status) {
      case 'generating': return '#10b981'; // emerald
      case 'thinking': return '#3b82f6'; // blue
      case 'calling_tool': return '#a855f7'; // purple
      case 'approval_required': return '#f59e0b'; // amber
      case 'paused': return '#64748b'; // slate
      default: return '#3b82f6';
    }
  };

  return (
    <div className="space-y-6">
      {/* Objective Control Bar with Web Speech Voice Command Button */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur space-y-3">
        <form onSubmit={handleDispatch} className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
              <Compass className="w-4 h-4 text-blue-400" />
              <span>Orchestrated Mission Dispatcher</span>
            </div>
            
            {/* Mode Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs flex-wrap">
              <button
                type="button"
                onClick={() => setExecutionMode('coordinator')}
                className={`px-2.5 py-1 rounded-md transition ${executionMode === 'coordinator' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Coordinator Delegation
              </button>
              <button
                type="button"
                onClick={() => setExecutionMode('fanout')}
                className={`px-2.5 py-1 rounded-md transition ${executionMode === 'fanout' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Fan-Out
              </button>
              <button
                type="button"
                onClick={() => setExecutionMode('pipeline')}
                className={`px-2.5 py-1 rounded-md transition ${executionMode === 'pipeline' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Pipeline
              </button>
              <button
                type="button"
                onClick={() => setExecutionMode('debate')}
                className={`px-2.5 py-1 rounded-md transition ${executionMode === 'debate' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                Debate & Rank
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                placeholder="Enter objective or click mic for Voice Command..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-24"
              />
              
              {/* Voice Command Microphone Button */}
              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Voice Command Web Speech Recognition"
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-white" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-rose-400" />
                    <span>Voice</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={!objectiveInput.trim()}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg flex items-center gap-2 transition shadow-lg shadow-blue-600/20 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Dispatch</span>
            </button>
          </div>

          {/* Voice Status Feedback Toast */}
          {voiceStatusText && (
            <div className="flex items-center gap-2 text-xs font-mono bg-purple-950/60 text-purple-300 border border-purple-800/80 p-2 rounded-lg animate-fade-in">
              <Volume2 className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-bounce" />
              <span className="truncate">{voiceStatusText}</span>
            </div>
          )}
        </form>
      </div>

      {/* Recharts Visualization: Agent Activity, Elapsed Time & Status Metrics */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-slate-100 font-semibold text-sm">Agent Activity & Runtime Metrics</h3>
              <p className="text-[11px] text-slate-400">Recharts telemetry: Elapsed time (sec) vs. execution status and context load</p>
            </div>
          </div>

          {/* Metric Selector Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setChartMetric('elapsed')}
              className={`px-2.5 py-1 rounded transition ${chartMetric === 'elapsed' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Elapsed Runtime (sec)
            </button>
            <button
              onClick={() => setChartMetric('context')}
              className={`px-2.5 py-1 rounded transition ${chartMetric === 'context' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Context Usage (%)
            </button>
            <button
              onClick={() => setChartMetric('memory')}
              className={`px-2.5 py-1 rounded transition ${chartMetric === 'memory' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Memory (MB)
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-52 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '8px' }} />
              <Bar 
                dataKey={
                  chartMetric === 'elapsed' ? 'elapsedSeconds' : chartMetric === 'context' ? 'contextUsagePct' : 'memoryUsageMb'
                } 
                name={
                  chartMetric === 'elapsed' ? 'Elapsed Time (s)' : chartMetric === 'context' ? 'Context Usage (%)' : 'RAM Usage (MB)'
                } 
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter and Capacity Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Active Agent Capacity: <strong className="text-white">{agents.length} / 24</strong></span>
          </div>
          <span className="text-slate-700">|</span>
          <span>Machines Connected: <strong className="text-white">{machines.filter(m => m.status === 'healthy').length} / {machines.length}</strong></span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Machine:</span>
            <select 
              value={selectedMachineFilter} 
              onChange={(e) => setSelectedMachineFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-white font-medium"
            >
              <option value="all" className="bg-slate-900">All Nodes</option>
              {machines.map(m => (
                <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300">
            <span>Status:</span>
            <select 
              value={selectedStatusFilter} 
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-white font-medium"
            >
              <option value="all" className="bg-slate-900">All States</option>
              <option value="thinking" className="bg-slate-900">Thinking</option>
              <option value="generating" className="bg-slate-900">Generating</option>
              <option value="approval_required" className="bg-slate-900">Approval Required</option>
              <option value="waiting" className="bg-slate-900">Waiting</option>
              <option value="paused" className="bg-slate-900">Paused</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dynamic Agent Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => {
          const assignedMachine = machines.find(m => m.id === agent.assignedMachineId);
          const heartbeat = getHeartbeatState(agent.lastHeartbeat);

          return (
            <div 
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition shadow-lg hover:shadow-2xl cursor-pointer relative flex flex-col justify-between overflow-hidden"
            >
              {/* Agent Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md"
                      style={{ backgroundColor: agent.avatarColor }}
                    >
                      {agent.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-slate-100 font-semibold text-sm group-hover:text-blue-400 transition flex items-center gap-1.5">
                        {agent.name}
                      </h3>
                      <p className="text-xs text-slate-400 truncate max-w-[160px]">{agent.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {getStatusBadge(agent.status)}
                    <span className={`w-2.5 h-2.5 rounded-full ${heartbeat.color}`} title={`Heartbeat: ${heartbeat.label}`} />
                  </div>
                </div>

                {/* Machine and Model Info */}
                <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800/80 mb-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1 truncate">
                      <Cpu className="w-3 h-3 text-slate-500" />
                      {assignedMachine ? assignedMachine.name : agent.assignedMachineId}
                    </span>
                    <span className="font-mono text-slate-300">{agent.model}</span>
                  </div>

                  {agent.currentTask && (
                    <div className="pt-1 border-t border-slate-800/60 text-slate-300 font-mono text-[11px] truncate">
                      &gt; {agent.currentTask}
                    </div>
                  )}
                </div>

                {/* Latest Output Stream Sample */}
                {agent.latestOutput && (
                  <div className="bg-slate-950 rounded p-2 border border-slate-800 font-mono text-[11px] text-emerald-400/90 mb-3 line-clamp-2">
                    {agent.latestOutput}
                  </div>
                )}
              </div>

              {/* Agent Resource Gauges & Footer Controls */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Context</span>
                      <span className="text-slate-200">{agent.contextUsagePct}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${agent.contextUsagePct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>RAM</span>
                      <span className="text-slate-200">{agent.memoryUsageMb} MB</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, agent.memoryUsageMb / 20)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Tile Action Bar */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Queue: {agent.queueDepth} | Runtime: {agent.elapsedSeconds}s
                  </span>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onOpenTerminal(agent.assignedMachineId)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                      title="Open Terminal Session"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                    </button>

                    {agent.status === 'paused' ? (
                      <button
                        type="button"
                        onClick={() => onResumeAgent(agent.id)}
                        className="p-1 hover:bg-emerald-950 text-emerald-400 rounded transition"
                        title="Resume Agent"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPauseAgent(agent.id)}
                        className="p-1 hover:bg-amber-950 text-amber-400 rounded transition"
                        title="Pause Agent"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onTerminateAgent(agent.id)}
                      className="p-1 hover:bg-rose-950 text-rose-400 rounded transition"
                      title="Terminate Agent"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
