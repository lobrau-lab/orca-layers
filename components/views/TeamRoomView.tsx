'use client';

import React, { useState } from 'react';
import { AgentProfile } from '@/lib/types';
import { Users, Send, Bot, ShieldAlert, Sparkles, Terminal, FileCode, Paperclip } from 'lucide-react';

interface Props {
  agents: AgentProfile[];
  onSendMessage: (msg: string) => void;
}

interface TeamMessage {
  id: string;
  sender: string; // 'Operator' or agent name
  role: string;
  avatarColor: string;
  content: string;
  timestamp: string;
  type?: 'chat' | 'code' | 'approval' | 'artifact';
  codeSnippet?: string;
}

export const TeamRoomView: React.FC<Props> = ({ agents, onSendMessage }) => {
  const [messages, setMessages] = useState<TeamMessage[]>([
    {
      id: 'msg-1',
      sender: 'Operator',
      role: 'Mission Director',
      avatarColor: '#3b82f6',
      content: 'Team, deconstruct the Rust microservice refactor and verify sequence reconnection logic.',
      timestamp: '18:10:00',
      type: 'chat'
    },
    {
      id: 'msg-2',
      sender: 'Aegis',
      role: 'Coordinator & Lead Architect',
      avatarColor: '#3b82f6',
      content: 'Objective analyzed. Deconstructed into 3 subtasks. Assigned code implementation to Forge and security review to Sentinel.',
      timestamp: '18:10:15',
      type: 'chat'
    },
    {
      id: 'msg-3',
      sender: 'Forge',
      role: 'Code Implementer',
      avatarColor: '#10b981',
      content: 'Generated stream handler module supporting token buffer reconnection. Here is the async Rust signature:',
      timestamp: '18:25:00',
      type: 'code',
      codeSnippet: `pub async fn handle_stream_reconnect<S>(
    mut stream: S,
    expected_seq: u64
) -> Result<(), StreamError> {
    while let Some(chunk) = stream.next().await {
        verify_sequence(&chunk, expected_seq)?;
    }
    Ok(())
}`
    },
    {
      id: 'msg-4',
      sender: 'Sentinel',
      role: 'Security Reviewer & Tester',
      avatarColor: '#ef4444',
      content: 'APPROVAL REQUIRED: Requesting operator authorization to execute `cargo audit --all-features` on local rig Rigel-GPU.',
      timestamp: '18:40:00',
      type: 'approval'
    }
  ]);

  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg: TeamMessage = {
      id: `msg-${Date.now()}`,
      sender: 'Operator',
      role: 'Mission Director',
      avatarColor: '#3b82f6',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'chat'
    };

    setMessages(prev => [...prev, newMsg]);
    onSendMessage(input);
    setInput('');

    // Simulate Agent response
    setTimeout(() => {
      const respMsg: TeamMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'Aegis',
        role: 'Coordinator & Lead Architect',
        avatarColor: '#3b82f6',
        content: `Acknowledged: "${input}". Coordinating agent pipeline across connected nodes.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'chat'
      };
      setMessages(prev => [...prev, respMsg]);
    }, 1200);
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-140px)]">
      {/* Team Room Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-sm">All-Agent Team Channel</h2>
            <p className="text-xs text-slate-400">Shared collaborative workspace for all 6 active agents</p>
          </div>
        </div>

        {/* Active Members Bar */}
        <div className="flex items-center -space-x-2">
          {agents.map(a => (
            <div
              key={a.id}
              className="w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-white text-[10px] font-bold shadow"
              style={{ backgroundColor: a.avatarColor }}
              title={`${a.name} (${a.role})`}
            >
              {a.name.substring(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Messages Scrollable Container */}
      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow shrink-0 mt-0.5"
              style={{ backgroundColor: m.avatarColor }}
            >
              {m.sender.substring(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-100 font-medium text-xs">{m.sender}</span>
                <span className="text-[10px] text-slate-500">({m.role})</span>
                <span className="text-[10px] text-slate-600 ml-auto">{m.timestamp}</span>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-200">
                <p className="leading-relaxed">{m.content}</p>

                {m.type === 'code' && m.codeSnippet && (
                  <pre className="mt-2 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                    {m.codeSnippet}
                  </pre>
                )}

                {m.type === 'approval' && (
                  <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Action routed to Operator Approvals Inbox</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSend} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-2">
        <button type="button" className="p-2 text-slate-400 hover:text-white transition">
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Broadcast prompt or directive to all agents in Team Room..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
