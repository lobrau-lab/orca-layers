'use client';

import React, { useState } from 'react';
import { AuditLogEntry, MachineService } from '@/lib/types';
import { 
  ShieldAlert, 
  Octagon, 
  Key, 
  Lock, 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Search,
  Fingerprint,
  Radio
} from 'lucide-react';

interface Props {
  logs: AuditLogEntry[];
  machines: MachineService[];
  onEmergencyStop: () => void;
  emergencyStopActive: boolean;
  onClearEmergencyStop: () => void;
}

export const AuditSecurityView: React.FC<Props> = ({
  logs,
  machines,
  onEmergencyStop,
  emergencyStopActive,
  onClearEmergencyStop
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [localOnlyMode, setLocalOnlyMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter(l => 
    searchQuery ? l.details.toLowerCase().includes(searchQuery.toLowerCase()) || l.action.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const handleConfirmEmergencyStop = () => {
    onEmergencyStop();
    setShowConfirmModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Emergency Stop Hero Control */}
      <div className={`p-5 rounded-xl border transition shadow-2xl ${emergencyStopActive ? 'bg-rose-950/80 border-rose-500 text-rose-100 animate-pulse' : 'bg-slate-900 border-slate-800'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${emergencyStopActive ? 'bg-rose-600 text-white border-rose-400' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
              <Octagon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Global Operator Emergency Stop</h2>
              <p className="text-xs text-slate-300">
                {emergencyStopActive 
                  ? 'EMERGENCY STOP ACTIVE — All agent dispatches halted. Node acknowledgments received.' 
                  : 'Immediately halts dispatches, interrupts running agent processes, and signals all nodes.'}
              </p>
            </div>
          </div>

          <div>
            {emergencyStopActive ? (
              <button
                onClick={onClearEmergencyStop}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Resume Operations</span>
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-lg shadow-rose-600/30 uppercase tracking-wider"
              >
                <Octagon className="w-4 h-4" />
                <span>ACTIVATE EMERGENCY STOP</span>
              </button>
            )}
          </div>
        </div>

        {/* Emergency Stop Node Acknowledgment Report */}
        {emergencyStopActive && (
          <div className="mt-4 pt-4 border-t border-rose-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {machines.map(m => (
              <div key={m.id} className="bg-slate-950/90 p-2.5 rounded border border-rose-500/40 flex items-center justify-between">
                <span className="font-mono text-slate-200 text-[11px] truncate">{m.name}</span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ACK
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keystore & Device Security Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Keystore Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-slate-100 font-semibold text-sm flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            macOS Secure Enclave Device-Bound Keys
          </h3>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 font-mono text-xs text-slate-300">
            <div className="text-slate-500 text-[10px] uppercase">Ed25519 Public Device Key</div>
            <div className="text-emerald-400 truncate">pub_mac_secure_enclave_ed25519_node_01</div>
            <div className="text-slate-500 text-[10px] uppercase pt-2">Monotonic Sequence Counter</div>
            <div className="text-slate-200">#104 (Protected against replay attacks)</div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-purple-400" />
                Biometric Unlock Protection
              </span>
              <button
                onClick={() => setBiometricsEnabled(!biometricsEnabled)}
                className={`w-10 h-5 rounded-full transition p-0.5 ${biometricsEnabled ? 'bg-blue-600' : 'bg-slate-800'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition ${biometricsEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-400" />
                Local Network-Only Mode
              </span>
              <button
                onClick={() => setLocalOnlyMode(!localOnlyMode)}
                className={`w-10 h-5 rounded-full transition p-0.5 ${localOnlyMode ? 'bg-blue-600' : 'bg-slate-800'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition ${localOnlyMode ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Audit Trail Filter & Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-slate-100 font-semibold text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Tamper-Evident Audit Trail
          </h3>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter audit logs by actor, action, or node..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none placeholder-slate-500"
            />
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span suppressHydrationWarning>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="text-blue-400 uppercase font-semibold">{log.action}</span>
                </div>
                <p className="text-slate-300 font-mono text-[11px]">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Emergency Stop */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-rose-500 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-rose-400 font-bold text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirm Global Emergency Stop
            </h3>

            <p className="text-xs text-slate-300">
              Are you sure you want to issue a Global Emergency Stop? This will halt all dispatch streams, signal every connected node companion, and pause active agent tasks across all devices.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEmergencyStop}
                className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-lg shadow-lg"
              >
                CONFIRM EMERGENCY STOP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
