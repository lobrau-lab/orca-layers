export type ThemeMode = 'modern' | 'matrix' | 'monokai';

export type MachineStatus = 'healthy' | 'degraded' | 'disconnected' | 'unreachable';

export type ServiceType = 
  | 'ollama' 
  | 'openai' 
  | 'llamacpp' 
  | 'mlx' 
  | 'comfyui' 
  | 'openclaw' 
  | 'orchestra-node';

export interface MachineService {
  id: string;
  name: string;
  type: ServiceType;
  host: string;
  port: number;
  routeType: 'loopback' | 'lan' | 'tailscale';
  status: MachineStatus;
  latencyMs: number;
  availableModels: string[];
  vramUsageGb?: number;
  vramTotalGb?: number;
  cpuLoadPct?: number;
  ramUsagePct?: number;
  thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
  batteryPct?: number;
  agentCapacity: number;
  activeAgentsCount: number;
  lastHeartbeat: string; // ISO string
  supportsTmux: boolean;
  tags?: string[];
  version?: string;
}

export type AgentStatus = 
  | 'thinking' 
  | 'generating' 
  | 'calling_tool' 
  | 'waiting' 
  | 'blocked' 
  | 'approval_required'
  | 'disconnected' 
  | 'cancelled' 
  | 'completed' 
  | 'failed'
  | 'paused';

export type AutonomyLevel = 
  | 'chat_only' 
  | 'ask_every_tool' 
  | 'ask_sensitive_tools' 
  | 'trusted_tasks' 
  | 'autonomous_workspace';

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  iconName: string;
  systemPrompt: string;
  assignedMachineId: string;
  model: string;
  workingDirectory: string;
  project: string;
  status: AgentStatus;
  currentTask?: string;
  autonomyLevel: AutonomyLevel;
  contextUsagePct: number;
  memoryUsageMb: number;
  lastHeartbeat: string;
  queueDepth: number;
  elapsedSeconds: number;
  temperature: number;
  maxIterations: number;
  timeoutSeconds: number;
  latestOutput?: string;
  unreadCount?: number;
}

export type TaskStatus = 
  | 'draft' 
  | 'queued' 
  | 'waiting_trigger' 
  | 'pending_approval' 
  | 'assigned' 
  | 'running' 
  | 'waiting_agent' 
  | 'waiting_user' 
  | 'paused' 
  | 'blocked' 
  | 'retrying' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface MissionTask {
  id: string;
  parentId?: string;
  title: string;
  objective: string;
  assignedAgentId?: string;
  assignedMachineId?: string;
  model?: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  project: string;
  workingDirectory: string;
  createdAt: string;
  updatedAt: string;
  executionAttempts: number;
  progressPct: number;
  logs: string[];
  outputs: string[];
  artifacts: string[];
  requiresApproval: boolean;
  approvalReason?: string;
  proposedCommand?: string;
  errorDetails?: string;
  finalReport?: string;
  dependencies: string[]; // Task IDs
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ApprovalRequest {
  id: string;
  agentId: string;
  agentName: string;
  taskId: string;
  objective: string;
  machineId: string;
  workingDirectory: string;
  actionType: 'shell' | 'file_edit' | 'file_delete' | 'git_push' | 'network' | 'package_install' | 'secret_access';
  proposedCommand: string;
  fileDiff?: string;
  riskLevel: RiskLevel;
  reason: string;
  expectedEffect: string;
  reversibility: 'reversible' | 'irreversible' | 'difficult';
  expirationTime: string;
  status: 'pending' | 'approved' | 'denied' | 'paused';
  signatureVerified: boolean;
}

export interface SignedEnvelope {
  commandId: string;
  targetNode: string;
  targetAgent: string;
  sequence: number;
  nonce: string;
  timestamp: string;
  commandHash: string;
  signature: string;
  publicKey: string;
  protocolVersion: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string; // 'operator' | agentId
  action: string;
  details: string;
  riskLevel: RiskLevel;
  signatureVerified?: boolean;
  targetNode?: string;
}

export interface CreativeShot {
  id: string;
  project: string;
  sceneName: string;
  character: string;
  loraTrigger?: string;
  prompt: string;
  negativePrompt?: string;
  seed: number;
  width: number;
  height: number;
  sampler: string;
  status: 'draft' | 'queued' | 'rendering' | 'completed' | 'failed';
  previewUrl?: string;
  aspectRatio: string;
  createdAt: string;
}

export interface ProjectMemoryItem {
  id: string;
  scope: 'global' | 'project' | 'agent' | 'mission' | 'world_bible';
  scopeName: string;
  keyFact: string;
  confidence: number; // 0..1
  pinned: boolean;
  sourceCitation: string;
  createdAt: string;
  hasConflict?: boolean;
  conflictDetails?: string;
}

export interface ProjectArtifact {
  id: string;
  title: string;
  project: string;
  type: 'image' | 'code' | 'text' | 'audio' | 'log' | 'diff';
  contentUrl?: string;
  contentSnippet?: string;
  originatingTaskId: string;
  agentId: string;
  machineId: string;
  model: string;
  createdAt: string;
  approvalState: 'approved' | 'pending' | 'rejected';
  tags: string[];
  hash: string;
}

export interface TmuxSession {
  id: string;
  name: string;
  machineId: string;
  workingDirectory: string;
  activeCommand?: string;
  outputBuffer: string[];
  user: string;
  isPrivileged: boolean;
}

export interface AutomationJob {
  id: string;
  title: string;
  triggerType: 'one_time' | 'scheduled' | 'file_change' | 'device_online' | 'render_complete';
  scheduleCron?: string;
  targetAgentId: string;
  prompt: string;
  status: 'active' | 'paused' | 'running';
  lastRun?: string;
  nextRun?: string;
  idempotencyKey: string;
}
