'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TmuxSession, ThemeMode } from '@/lib/types';
import { 
  Terminal as TerminalIcon, 
  Search, 
  Mic, 
  MicOff, 
  Split, 
  Copy, 
  Check, 
  Maximize2, 
  Sliders, 
  CornerDownLeft, 
  ShieldCheck, 
  FileText, 
  Code2, 
  Eye
} from 'lucide-react';

interface Props {
  sessions: TmuxSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onSendCommand: (sessionId: string, cmd: string) => void;
  themeMode: ThemeMode;
  onChangeTheme: (mode: ThemeMode) => void;
}

export const FocusedTerminalView: React.FC<Props> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onSendCommand,
  themeMode,
  onChangeTheme
}) => {
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const [commandInput, setCommandInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [splitViewMode, setSplitViewMode] = useState<'none' | 'files' | 'logs' | 'diff'>('none');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.outputBuffer]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim() || !activeSession) return;
    onSendCommand(activeSession.id, commandInput);
    setCommandInput('');
  };

  const handleInsertShortcut = (text: string) => {
    setCommandInput(prev => prev + text);
  };

  const handleCopyBuffer = () => {
    if (!activeSession) return;
    navigator.clipboard.writeText(activeSession.outputBuffer.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMicToggle = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTimeout(() => {
        setCommandInput('cargo test --all-features -- --nocapture');
        setIsRecording(false);
      }, 2000);
    } else {
      setIsRecording(false);
    }
  };

  const filteredLogs = activeSession?.outputBuffer.filter(line => 
    searchQuery ? line.toLowerCase().includes(searchQuery.toLowerCase()) : true
  ) || [];

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-140px)]">
      {/* Session Header and Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <TerminalIcon className="w-4 h-4 text-emerald-400" />
            <span>Persistent Tmux Terminal</span>
          </div>

          {/* Session Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`px-3 py-1 rounded transition flex items-center gap-1.5 font-mono ${activeSessionId === s.id ? 'bg-emerald-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                <span>{s.name}</span>
                {s.isPrivileged && <span title="Privileged Session"><ShieldCheck className="w-3 h-3 text-amber-300" /></span>}
              </button>
            ))}
          </div>
        </div>

        {/* View Controls & Theme Switcher */}
        <div className="flex items-center gap-2 text-xs">
          {/* Split View Options */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setSplitViewMode(splitViewMode === 'none' ? 'logs' : 'none')}
              className={`px-2 py-1 rounded transition flex items-center gap-1 ${splitViewMode !== 'none' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Toggle Split View"
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={themeMode}
              onChange={(e) => onChangeTheme(e.target.value as ThemeMode)}
              className="bg-transparent focus:outline-none text-white font-mono text-xs pr-1"
            >
              <option value="modern" className="bg-slate-900">Modern Dark</option>
              <option value="matrix" className="bg-slate-900">Matrix CRT</option>
              <option value="monokai" className="bg-slate-900">Monokai Pro</option>
            </select>
          </div>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1.5 bg-slate-950 border border-slate-800 rounded hover:text-white text-slate-400 transition"
            title="Search Scrollback"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopyBuffer}
            className="p-1.5 bg-slate-950 border border-slate-800 rounded hover:text-white text-slate-400 transition flex items-center gap-1"
            title="Copy Buffer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Optional Search Bar */}
      {showSearch && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter scrollback history..."
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-slate-500 font-mono"
          />
        </div>
      )}

      {/* Terminal Layout Area (Supports Single or Split Pane) */}
      <div className={`flex-1 grid gap-4 ${splitViewMode !== 'none' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Terminal Screen Box */}
        <div className={`bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs flex flex-col justify-between shadow-2xl relative overflow-hidden ${themeMode === 'matrix' ? 'crt-overlay border-emerald-900' : ''}`}>
          
          {/* Host & Context Info Bar */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeSession?.user}@{activeSession?.machineId}:{activeSession?.workingDirectory}
            </span>
            <span>Tmux Session: #{activeSession?.name}</span>
          </div>

          {/* Terminal Output Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-1 my-2 pr-2 font-mono">
            {filteredLogs.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                {line.startsWith('operator@') || line.includes('$') ? (
                  <span className="text-emerald-400 font-semibold">{line}</span>
                ) : line.includes('[ERROR]') || line.includes('Failed') ? (
                  <span className="text-rose-400">{line}</span>
                ) : line.includes('[INFO]') || line.includes('Checking') ? (
                  <span className="text-blue-300">{line}</span>
                ) : (
                  <span className="text-slate-300">{line}</span>
                )}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Touch-Friendly Shortcut Bar */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => handleInsertShortcut('Ctrl+C ')}
              className="px-2 py-1 bg-slate-900 hover:bg-rose-900/50 text-rose-300 border border-slate-800 rounded transition font-mono text-[11px]"
            >
              Ctrl+C
            </button>
            <button
              onClick={() => handleInsertShortcut('Ctrl+Z ')}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition font-mono text-[11px]"
            >
              Ctrl+Z
            </button>
            <button
              onClick={() => handleInsertShortcut('Tab ')}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition font-mono text-[11px]"
            >
              Tab
            </button>
            <button
              onClick={() => handleInsertShortcut('| ')}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition font-mono text-[11px]"
            >
              | (Pipe)
            </button>
            <button
              onClick={() => handleInsertShortcut('/ ')}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition font-mono text-[11px]"
            >
              /
            </button>
            <button
              onClick={() => handleInsertShortcut('&& ')}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition font-mono text-[11px]"
            >
              &&
            </button>
            <button
              onClick={() => handleInsertShortcut('ls -la ')}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition font-mono text-[11px]"
            >
              ls -la
            </button>
          </div>

          {/* Interactive Input Form */}
          <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <span className="text-emerald-400 font-bold">$</span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Type or speak terminal command..."
              className="flex-1 bg-transparent text-slate-100 font-mono text-xs focus:outline-none placeholder-slate-600"
            />
            <button
              type="button"
              onClick={handleMicToggle}
              className={`p-1.5 rounded transition ${isRecording ? 'bg-rose-600 text-white animate-pulse' : 'text-slate-400 hover:text-white'}`}
              title="Voice to Command"
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              type="submit"
              disabled={!commandInput.trim()}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded transition"
            >
              <CornerDownLeft className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Split View Side Pane (Files/Diffs/Logs Preview) */}
        {splitViewMode !== 'none' && (
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-sm text-slate-200 font-medium">
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  Split View: Live Artifact & Diff Inspector
                </span>
                <button
                  onClick={() => setSplitViewMode('none')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs text-slate-300">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1 font-sans">Active Workspace Diff:</div>
                  <pre className="text-emerald-400 whitespace-pre-wrap">
                    {`@@ -12,6 +12,14 @@\n+ pub async fn execute_signed_envelope(\n+     envelope: SignedEnvelope\n+ ) -> Result<CommandOutput, SecError> {\n+     verify_hmac_sha256(&envelope)?;\n+ }`}
                  </pre>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400 mb-1 font-sans">Node Companion Heartbeat Log:</div>
                  <div className="text-slate-300">[18:50:12] HMAC-SHA256 envelope verified sequence #104</div>
                  <div className="text-slate-300">[18:50:14] Tmux session #0 scrollback buffer flushed</div>
                  <div className="text-slate-300">[18:50:20] Memory pressure nominal (1.2GB/24GB VRAM)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
