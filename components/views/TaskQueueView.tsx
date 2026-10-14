'use client';

import React, { useState } from 'react';
import { MissionTask, TaskStatus } from '@/lib/types';
import { ListTodo, CheckCircle2, Clock, AlertCircle, Play, Pause, RefreshCw, ChevronRight, Layers, FileCode } from 'lucide-react';

interface Props {
  tasks: MissionTask[];
  onRetryTask: (taskId: string) => void;
  onPauseTask: (taskId: string) => void;
  onCancelAllPending?: () => void;
}

export const TaskQueueView: React.FC<Props> = ({ tasks, onRetryTask, onPauseTask, onCancelAllPending }) => {
  const [selectedTask, setSelectedTask] = useState<MissionTask | null>(tasks[0] || null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const pendingCount = tasks.filter(t => t.status === 'pending_approval' || t.status === 'running' || (t.status as string) === 'pending').length;

  const handleCancelConfirm = () => {
    if (onCancelAllPending) {
      onCancelAllPending();
    }
    setShowCancelConfirm(false);
  };

  const filteredTasks = tasks.filter(t => filterStatus === 'all' ? true : t.status === filterStatus);

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'running':
        return <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><Clock className="w-3 h-3 animate-spin" /> Running</span>;
      case 'pending_approval':
        return <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">Pending Approval</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Task Queue Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-sm">Persistent Room Task Queue</h2>
            <p className="text-xs text-slate-400">Durable local state synchronized with node companions</p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {/* Cancel All Pending Button */}
          <button
            onClick={() => setShowCancelConfirm(true)}
            disabled={pendingCount === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border shadow-sm ${
              pendingCount > 0
                ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border-rose-500/40 hover:border-rose-500/60'
                : 'bg-slate-950 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
            }`}
            title="Clean up queues with multiple stalled or redundant tasks"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Cancel All Pending ({pendingCount})</span>
          </button>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-medium focus:outline-none"
            >
              <option value="all">All States</option>
              <option value="running">Running</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cancel All Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-slate-100 font-bold text-sm">Cancel All Pending Queue Tasks</h3>
                <p className="text-xs text-slate-400">Clean up stalled, blocked, or redundant task queue items</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                Are you sure you want to cancel <strong className="text-rose-400 font-mono">{pendingCount}</strong> pending and running tasks in the queue?
              </p>
              <p className="text-[11px] text-slate-400">
                All associated approval envelopes will be marked as denied and task statuses will be set to cancelled in the room state.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-700 transition"
              >
                Keep Queue
              </button>
              <button
                onClick={handleCancelConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-lg transition shadow-lg shadow-rose-600/20"
              >
                Confirm Cancel All ({pendingCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Task Split Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Task List (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          {filteredTasks.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTask(t)}
              className={`bg-slate-900 border rounded-xl p-4 transition cursor-pointer hover:border-slate-700 space-y-3 ${selectedTask?.id === t.id ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-slate-800'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-500">#{t.id}</span>
                    {getStatusBadge(t.status)}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase">{t.priority}</span>
                  </div>
                  <h3 className="text-slate-100 font-semibold text-sm">{t.title}</h3>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onRetryTask(t.id)}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                    title="Retry Task"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2">{t.objective}</p>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Execution Attempts: {t.executionAttempts}</span>
                  <span>{t.progressPct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${t.progressPct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Task Details Inspector (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          {selectedTask ? (
            <>
              <div className="border-b border-slate-800 pb-3">
                <span className="text-xs font-mono text-slate-500">Task Details #{selectedTask.id}</span>
                <h3 className="text-slate-100 font-semibold text-sm mt-1">{selectedTask.title}</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Objective:</span>
                  <p className="text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 mt-1">{selectedTask.objective}</p>
                </div>

                <div>
                  <span className="text-slate-500 block">Assigned Node & Working Directory:</span>
                  <div className="font-mono text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 mt-1">
                    {selectedTask.assignedMachineId}
                    <div className="text-[11px] text-slate-500">{selectedTask.workingDirectory}</div>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block">Execution Logs:</span>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-emerald-400/90 space-y-1 max-h-48 overflow-y-auto mt-1">
                    {selectedTask.logs.map((l, i) => (
                      <div key={i}>{l}</div>
                    ))}
                  </div>
                </div>

                {selectedTask.outputs.length > 0 && (
                  <div>
                    <span className="text-slate-500 block">Outputs:</span>
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-blue-300 space-y-1 mt-1">
                      {selectedTask.outputs.map((o, i) => (
                        <div key={i}>&gt; {o}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">Select a task to view execution details</div>
          )}
        </div>
      </div>
    </div>
  );
};
