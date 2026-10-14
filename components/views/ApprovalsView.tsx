'use client';

import React, { useState } from 'react';
import { ApprovalRequest } from '@/lib/types';
import { 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Pause, 
  FileDiff, 
  Terminal, 
  Lock, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Edit3, 
  MessageSquare
} from 'lucide-react';

interface Props {
  approvals: ApprovalRequest[];
  onApprove: (id: string) => void;
  onDeny: (id: string, reason?: string) => void;
  onPauseAgent: (agentId: string) => void;
}

export const ApprovalsView: React.FC<Props> = ({ approvals, onApprove, onDeny, onPauseAgent }) => {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(approvals[0] || null);
  const [explanation, setExplanation] = useState('');
  const [showDenyModal, setShowDenyModal] = useState(false);

  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  const handleDenySubmit = () => {
    if (!selectedApproval) return;
    onDeny(selectedApproval.id, explanation);
    setExplanation('');
    setShowDenyModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Approvals Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-sm">Operator Approvals & Safety Inbox</h2>
            <p className="text-xs text-slate-400">Cryptographically signed command verification and risk gating</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-semibold">
            {pendingApprovals.length} Pending Actions
          </span>
        </div>
      </div>

      {/* Main Approvals Split Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Approvals List (1 col) */}
        <div className="space-y-3">
          {pendingApprovals.map((req) => (
            <div
              key={req.id}
              onClick={() => setSelectedApproval(req)}
              className={`bg-slate-900 border rounded-xl p-4 transition cursor-pointer hover:border-slate-700 space-y-2 ${selectedApproval?.id === req.id ? 'border-amber-500 shadow-lg shadow-amber-500/10' : 'border-slate-800'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Risk: {req.riskLevel.toUpperCase()}
                </span>
                {req.signatureVerified && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" /> Signed Envelope
                  </span>
                )}
              </div>

              <h3 className="text-slate-100 font-medium text-sm">{req.agentName}: {req.actionType.toUpperCase()}</h3>
              <p className="text-xs text-slate-400 line-clamp-2">{req.reason}</p>

              <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-800">
                Machine: {req.machineId}
              </div>
            </div>
          ))}

          {pendingApprovals.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <span>No pending approval requests. System operating within autonomy thresholds.</span>
            </div>
          )}
        </div>

        {/* Selected Approval Details & Action Surface (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          {selectedApproval ? (
            <>
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-500">#{selectedApproval.id}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-mono">
                      Risk Level: {selectedApproval.riskLevel}
                    </span>
                    <span className="text-xs text-slate-400">Reversibility: {selectedApproval.reversibility}</span>
                  </div>
                  <h3 className="text-slate-100 font-bold text-base">Requesting Action: {selectedApproval.proposedCommand}</h3>
                </div>

                <div className="text-right text-xs text-slate-400">
                  <span>Agent: <strong className="text-white">{selectedApproval.agentName}</strong></span>
                  <div className="text-[11px] text-slate-500 font-mono">{selectedApproval.machineId}</div>
                </div>
              </div>

              {/* Proposed Command Box */}
              <div>
                <span className="text-xs text-slate-400 block mb-1">Proposed Command:</span>
                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                  {selectedApproval.proposedCommand}
                </pre>
              </div>

              {/* File Diff (if available) */}
              {selectedApproval.fileDiff && (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">File Modification Diff:</span>
                  <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-blue-300 overflow-x-auto">
                    {selectedApproval.fileDiff}
                  </pre>
                </div>
              )}

              {/* Reason & Expected Effect */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block mb-1">Risk Justification:</span>
                  <p className="text-slate-300">{selectedApproval.reason}</p>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block mb-1">Expected Effect:</span>
                  <p className="text-slate-300">{selectedApproval.expectedEffect}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onApprove(selectedApproval.id)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve Once</span>
                  </button>

                  <button
                    onClick={() => setShowDenyModal(true)}
                    className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-medium text-xs rounded-lg flex items-center gap-2 transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Deny & Explain</span>
                  </button>
                </div>

                <button
                  onClick={() => onPauseAgent(selectedApproval.agentId)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg flex items-center gap-1.5 transition"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Agent ({selectedApproval.agentName})</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs">
              Select an approval request to inspect command envelopes and risk parameters
            </div>
          )}
        </div>
      </div>

      {/* Deny Modal */}
      {showDenyModal && selectedApproval && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-slate-100 font-bold text-sm flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              Deny Approval Request #{selectedApproval.id}
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Reason for Denial (Sent to Agent):</label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explain why this action was rejected (e.g. Unsafe shell flag, modify script first)..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDenyModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDenySubmit}
                className="px-4 py-2 bg-rose-600 text-white font-medium text-xs rounded-lg"
              >
                Confirm Denial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
