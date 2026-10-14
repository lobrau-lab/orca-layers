'use client';

import { 
  AgentProfile, 
  ApprovalRequest, 
  AuditLogEntry, 
  AutomationJob, 
  CreativeShot, 
  MachineService, 
  MissionTask, 
  ProjectArtifact, 
  ProjectMemoryItem, 
  SignedEnvelope, 
  ThemeMode, 
  TmuxSession 
} from './types';

// WebCrypto based HMAC or RSA/Ed25519 signature generator for envelopes
export async function createSignedEnvelope(
  commandId: string, 
  targetNode: string, 
  targetAgent: string, 
  sequence: number, 
  payload: string,
  privateKeySecret: string = 'orchestra_device_key_2026'
): Promise<SignedEnvelope> {
  const timestamp = new Date().toISOString();
  const nonce = Math.random().toString(36).substring(2, 10);
  
  // Calculate SHA-256 command hash
  const encoder = new TextEncoder();
  const dataToHash = encoder.encode(`${commandId}:${targetNode}:${targetAgent}:${sequence}:${nonce}:${timestamp}:${payload}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataToHash);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const commandHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Sign using HMAC-SHA256 for browser-compatible device signature
  const keyData = encoder.encode(privateKeySecret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', 
    keyData, 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(commandHash));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    commandId,
    targetNode,
    targetAgent,
    sequence,
    nonce,
    timestamp,
    commandHash,
    signature,
    publicKey: 'pub_mac_secure_enclave_ed25519_node_01',
    protocolVersion: '2026.1.0'
  };
}

export async function verifySignedEnvelope(
  envelope: SignedEnvelope,
  secretKey: string = 'orchestra_device_key_2026'
): Promise<{ valid: boolean; reason?: string }> {
  const now = new Date().getTime();
  const envTime = new Date(envelope.timestamp).getTime();
  
  // Replay check: timestamp within 60 seconds
  if (Math.abs(now - envTime) > 60000) {
    return { valid: false, reason: 'Timestamp expired (possible replay attack or clock drift)' };
  }

  // Recalculate signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', 
    keyData, 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['verify']
  );
  
  const signatureBytes = new Uint8Array(envelope.signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
  const valid = await crypto.subtle.verify('HMAC', cryptoKey, signatureBytes, encoder.encode(envelope.commandHash));

  if (!valid) {
    return { valid: false, reason: 'Cryptographic signature mismatch' };
  }

  return { valid: true };
}

// Initial Deterministic Timestamps for SSR/Hydration Consistency
const FIXED_NOW_ISO = '2026-07-27T19:00:00.000Z';
const FIXED_MINUS_45S_ISO = '2026-07-27T18:59:15.000Z';
const FIXED_MINUS_15M_ISO = '2026-07-27T18:45:00.000Z';
const FIXED_MINUS_30M_ISO = '2026-07-27T18:30:00.000Z';
const FIXED_MINUS_1H_ISO = '2026-07-27T18:00:00.000Z';
const FIXED_MINUS_2H_ISO = '2026-07-27T17:00:00.000Z';
const FIXED_MINUS_1D_ISO = '2026-07-26T19:00:00.000Z';
const FIXED_PLUS_1H_ISO = '2026-07-27T20:00:00.000Z';
const FIXED_PLUS_2H_ISO = '2026-07-27T21:00:00.000Z';

// Initial Mock Datasets
export const INITIAL_MACHINES: MachineService[] = [
  {
    id: 'node-desktop-rig',
    name: 'Rigel-GPU (RTX 4090 Desktop)',
    type: 'orchestra-node',
    host: '192.168.1.105',
    port: 8443,
    routeType: 'lan',
    status: 'healthy',
    latencyMs: 12,
    availableModels: ['llama3.3:70b', 'qwen2.5-coder:32b', 'deepseek-r1:14b', 'sdxl-turbo'],
    vramUsageGb: 18.2,
    vramTotalGb: 24.0,
    cpuLoadPct: 24,
    ramUsagePct: 42,
    thermalState: 'nominal',
    batteryPct: 100,
    agentCapacity: 6,
    activeAgentsCount: 4,
    lastHeartbeat: FIXED_NOW_ISO,
    supportsTmux: true,
    tags: ['production', 'gpu-cluster', 'primary-node'],
    version: 'orchestra-node-v1.4.2'
  },
  {
    id: 'node-macbook-m3',
    name: 'Hyperion-M3 (MacBook Pro M3 Max)',
    type: 'mlx',
    host: 'hyperion-m3.tailscale.net',
    port: 11434,
    routeType: 'tailscale',
    status: 'healthy',
    latencyMs: 38,
    availableModels: ['mlx-community/Llama-3.3-70B-Instruct-4bit', 'mlx-community/Qwen2.5-Coder-32B-Instruct-4bit'],
    vramUsageGb: 32.1,
    vramTotalGb: 64.0,
    cpuLoadPct: 18,
    ramUsagePct: 55,
    thermalState: 'nominal',
    batteryPct: 88,
    agentCapacity: 6,
    activeAgentsCount: 2,
    lastHeartbeat: FIXED_NOW_ISO,
    supportsTmux: true,
    tags: ['dev', 'apple-silicon', 'tailscale'],
    version: 'mlx-server-0.12'
  },
  {
    id: 'node-comfyui-gpu',
    name: 'VFX-Studio-Node (ComfyUI Generation Node)',
    type: 'comfyui',
    host: '192.168.1.110',
    port: 8188,
    routeType: 'lan',
    status: 'healthy',
    latencyMs: 15,
    availableModels: ['flux1-dev.safetensors', 'sd_xl_base_1.0.safetensors', 'animateDiff_v3.ckpt'],
    vramUsageGb: 12.4,
    vramTotalGb: 16.0,
    cpuLoadPct: 35,
    ramUsagePct: 30,
    thermalState: 'fair',
    batteryPct: 100,
    agentCapacity: 4,
    activeAgentsCount: 1,
    lastHeartbeat: FIXED_NOW_ISO,
    supportsTmux: false,
    tags: ['production', 'gpu-cluster', 'creative-vfx'],
    version: 'comfyui-v0.2.4'
  },
  {
    id: 'node-edge-pi',
    name: 'Lazarus-Edge (Raspberry Pi 5)',
    type: 'openclaw',
    host: '127.0.0.1',
    port: 9090,
    routeType: 'loopback',
    status: 'degraded',
    latencyMs: 85,
    availableModels: ['phi3:mini', 'gemma2:2b'],
    vramUsageGb: 0,
    vramTotalGb: 8.0,
    cpuLoadPct: 78,
    ramUsagePct: 81,
    thermalState: 'serious',
    batteryPct: 100,
    agentCapacity: 2,
    activeAgentsCount: 1,
    lastHeartbeat: FIXED_MINUS_45S_ISO,
    supportsTmux: true,
    tags: ['dev', 'edge-iot', 'backup-node'],
    version: 'openclaw-edge-1.0'
  }
];

export const INITIAL_AGENTS: AgentProfile[] = [
  {
    id: 'agent-coordinator',
    name: 'Aegis',
    role: 'Coordinator & Lead Architect',
    avatarColor: '#3b82f6',
    iconName: 'Compass',
    systemPrompt: 'You are the Orchestra Coordinator. Deconstruct complex operator objectives into modular agent workflows, manage dependencies, assign subtasks, and synthesize consolidated mission reports.',
    assignedMachineId: 'node-desktop-rig',
    model: 'qwen2.5-coder:32b',
    workingDirectory: '/home/operator/projects/orchestra-core',
    project: 'Orchestra Core',
    status: 'thinking',
    currentTask: 'Deconstructing Objective: Fullstack Rust microservice refactor',
    autonomyLevel: 'ask_sensitive_tools',
    contextUsagePct: 42,
    memoryUsageMb: 850,
    lastHeartbeat: FIXED_NOW_ISO,
    queueDepth: 2,
    elapsedSeconds: 140,
    temperature: 0.2,
    maxIterations: 20,
    timeoutSeconds: 300,
    latestOutput: 'Analyzing project dependency graph across 14 modules...'
  },
  {
    id: 'agent-implementer',
    name: 'Forge',
    role: 'Code Implementer & Refactoring Specialist',
    avatarColor: '#10b981',
    iconName: 'Code2',
    systemPrompt: 'Write clean, type-safe, production-ready code. Use isolated worktrees, prevent file conflicts, run unit tests, and format diffs clearly.',
    assignedMachineId: 'node-desktop-rig',
    model: 'qwen2.5-coder:32b',
    workingDirectory: '/home/operator/projects/orchestra-core/backend',
    project: 'Orchestra Core',
    status: 'generating',
    currentTask: 'Writing async gRPC stream handlers in Rust',
    autonomyLevel: 'ask_sensitive_tools',
    contextUsagePct: 65,
    memoryUsageMb: 1240,
    lastHeartbeat: FIXED_NOW_ISO,
    queueDepth: 1,
    elapsedSeconds: 310,
    temperature: 0.1,
    maxIterations: 15,
    timeoutSeconds: 300,
    latestOutput: 'Generated gRPC endpoint streaming protocol handlers with automatic backpressure control.'
  },
  {
    id: 'agent-researcher',
    name: 'Scout',
    role: 'Deep Research & Documentation Retrieval',
    avatarColor: '#8b5cf6',
    iconName: 'Search',
    systemPrompt: 'Conduct thorough technical investigations, verify library versions, summarize API specs, and cite all source documents.',
    assignedMachineId: 'node-macbook-m3',
    model: 'mlx-community/Llama-3.3-70B-Instruct-4bit',
    workingDirectory: '/Users/operator/research/docs',
    project: 'Orchestra Core',
    status: 'waiting',
    currentTask: 'Awaiting search queries for WebCrypto vs Sodium Benchmarks',
    autonomyLevel: 'trusted_tasks',
    contextUsagePct: 18,
    memoryUsageMb: 420,
    lastHeartbeat: FIXED_NOW_ISO,
    queueDepth: 0,
    elapsedSeconds: 85,
    temperature: 0.3,
    maxIterations: 10,
    timeoutSeconds: 180,
    latestOutput: 'Research complete: Verified HMAC-SHA256 latency is <0.4ms on Apple M3 Max hardware.'
  },
  {
    id: 'agent-critic',
    name: 'Sentinel',
    role: 'Security Reviewer & Tester/Critic',
    avatarColor: '#ef4444',
    iconName: 'ShieldCheck',
    systemPrompt: 'Audit code for vulnerability exposures, race conditions, secret leaks, and unhandled exception paths before deployment.',
    assignedMachineId: 'node-desktop-rig',
    model: 'deepseek-r1:14b',
    workingDirectory: '/home/operator/projects/orchestra-core/security-audit',
    project: 'Orchestra Core',
    status: 'approval_required',
    currentTask: 'Requesting permission to run cargo audit --all-features',
    autonomyLevel: 'ask_every_tool',
    contextUsagePct: 55,
    memoryUsageMb: 920,
    lastHeartbeat: FIXED_NOW_ISO,
    queueDepth: 1,
    elapsedSeconds: 220,
    temperature: 0.1,
    maxIterations: 12,
    timeoutSeconds: 240,
    latestOutput: 'APPROVAL REQUIRED: High risk command `cargo audit` requires local shell execution.'
  },
  {
    id: 'agent-creative',
    name: 'Lazarus-VFX',
    role: 'Motel Lazarus & Hyperion City Visual Director',
    avatarColor: '#f59e0b',
    iconName: 'Palette',
    systemPrompt: 'Generate high-fidelity visual concepts, cinematic prompts, ComfyUI render workflows, and character bible references.',
    assignedMachineId: 'node-comfyui-gpu',
    model: 'flux1-dev.safetensors',
    workingDirectory: '/media/storage/motel-lazarus/renders',
    project: 'Motel Lazarus',
    status: 'generating',
    currentTask: 'Rendering Shot 4B: Rain-slicked neon motel lobby in Cyberpunk Neo-Noir style',
    autonomyLevel: 'trusted_tasks',
    contextUsagePct: 78,
    memoryUsageMb: 2100,
    lastHeartbeat: FIXED_NOW_ISO,
    queueDepth: 3,
    elapsedSeconds: 45,
    temperature: 0.7,
    maxIterations: 10,
    timeoutSeconds: 600,
    latestOutput: 'ComfyUI Step 28/35 [flux1-dev]: Generating 1024x1024 preview frame...'
  },
  {
    id: 'agent-devops',
    name: 'Vector',
    role: 'Infrastructure & Container Deployer',
    avatarColor: '#06b6d4',
    iconName: 'Terminal',
    systemPrompt: 'Manage container deployments, systemctl services, network routing, and Tailscale VPN host setups.',
    assignedMachineId: 'node-edge-pi',
    model: 'phi3:mini',
    workingDirectory: '/var/orchestra/deployments',
    project: 'Orchestra Core',
    status: 'paused',
    currentTask: 'Paused due to high thermal load on Raspberry Pi node',
    autonomyLevel: 'ask_every_tool',
    contextUsagePct: 10,
    memoryUsageMb: 310,
    lastHeartbeat: FIXED_MINUS_45S_ISO,
    queueDepth: 0,
    elapsedSeconds: 0,
    temperature: 0.2,
    maxIterations: 5,
    timeoutSeconds: 120,
    latestOutput: 'Node temperature at 78°C. Thermal protection activated.'
  }
];

export const INITIAL_TASKS: MissionTask[] = [
  {
    id: 'task-001',
    title: 'Deconstruct Objective & Plan Rust Refactor',
    objective: 'Break down the Rust gRPC streaming service into modular crates with zero data race guarantees.',
    assignedAgentId: 'agent-coordinator',
    assignedMachineId: 'node-desktop-rig',
    model: 'qwen2.5-coder:32b',
    status: 'running',
    priority: 'high',
    project: 'Orchestra Core',
    workingDirectory: '/home/operator/projects/orchestra-core',
    createdAt: FIXED_MINUS_1H_ISO,
    updatedAt: FIXED_NOW_ISO,
    executionAttempts: 1,
    progressPct: 65,
    logs: [
      '[18:10:00] Initialized task context with objective.',
      '[18:10:15] Analyzed 14 Rust crate boundaries.',
      '[18:11:00] Generated subtask hierarchy for implementer and critic agents.'
    ],
    outputs: [
      'Subtask 1: Refactor stream_handler.rs to use tokio mpsc channels.',
      'Subtask 2: Audit cryptographic key wrapping logic for side-channel attacks.'
    ],
    artifacts: ['art-001'],
    requiresApproval: false,
    dependencies: []
  },
  {
    id: 'task-002',
    title: 'Implement gRPC Async Stream Handlers',
    objective: 'Write Rust async stream handlers supporting sequence-numbered reconnection.',
    assignedAgentId: 'agent-implementer',
    assignedMachineId: 'node-desktop-rig',
    model: 'qwen2.5-coder:32b',
    status: 'running',
    parentId: 'task-001',
    priority: 'critical',
    project: 'Orchestra Core',
    workingDirectory: '/home/operator/projects/orchestra-core/backend',
    createdAt: FIXED_MINUS_30M_ISO,
    updatedAt: FIXED_NOW_ISO,
    executionAttempts: 1,
    progressPct: 80,
    logs: [
      '[18:25:00] Started code generation for gRPC stream protocol.',
      '[18:28:12] Implemented monotonic sequence counter & token buffer.',
      '[18:32:00] Running cargo check on module stream_handler.rs'
    ],
    outputs: ['pub async fn handle_stream<S>(stream: S) -> Result<(), StreamError> {...}'],
    artifacts: ['art-002'],
    requiresApproval: false,
    dependencies: ['task-001']
  },
  {
    id: 'task-003',
    title: 'Security Audit & Dependency Scan',
    objective: 'Run cargo audit and static security checks on proposed gRPC stream code.',
    assignedAgentId: 'agent-critic',
    assignedMachineId: 'node-desktop-rig',
    model: 'deepseek-r1:14b',
    status: 'pending_approval',
    parentId: 'task-001',
    priority: 'high',
    project: 'Orchestra Core',
    workingDirectory: '/home/operator/projects/orchestra-core/security-audit',
    createdAt: FIXED_MINUS_15M_ISO,
    updatedAt: FIXED_NOW_ISO,
    executionAttempts: 1,
    progressPct: 30,
    logs: [
      '[18:40:00] Formulated shell execution command `cargo audit`.',
      '[18:40:05] Sensitive tool call intercepted by security policy. Request sent to Approvals Inbox.'
    ],
    outputs: [],
    artifacts: [],
    requiresApproval: true,
    approvalReason: 'Sensitive shell command execution on local rig: cargo audit --all-features',
    proposedCommand: 'cargo audit --all-features',
    dependencies: ['task-002']
  }
];

export const INITIAL_APPROVALS: ApprovalRequest[] = [
  {
    id: 'appr-101',
    agentId: 'agent-critic',
    agentName: 'Sentinel',
    taskId: 'task-003',
    objective: 'Security Audit & Dependency Scan',
    machineId: 'node-desktop-rig',
    workingDirectory: '/home/operator/projects/orchestra-core/security-audit',
    actionType: 'shell',
    proposedCommand: 'cargo audit --all-features && git commit -m "security audit passed"',
    fileDiff: '+ cargo audit report scan initialized\n+ 12 crates checked',
    riskLevel: 'high',
    reason: 'Executes package manager binary with full network capabilities to check Rust SecDB vulnerabilities.',
    expectedEffect: 'Runs security vulnerability database check and creates a signed git commit.',
    reversibility: 'reversible',
    expirationTime: FIXED_PLUS_1H_ISO,
    status: 'pending',
    signatureVerified: true
  },
  {
    id: 'appr-102',
    agentId: 'agent-implementer',
    agentName: 'Forge',
    taskId: 'task-002',
    objective: 'Write gRPC streaming code',
    machineId: 'node-desktop-rig',
    workingDirectory: '/home/operator/projects/orchestra-core/backend',
    actionType: 'file_edit',
    proposedCommand: 'cat << \'EOF\' > src/stream_handler.rs',
    fileDiff: '@@ -1,5 +1,18 @@\n- pub fn handle_raw() {}\n+ pub async fn handle_stream_v2() {\n+   println!("Stream connected with sequence check");\n+ }',
    riskLevel: 'medium',
    reason: 'Overwrites existing file `src/stream_handler.rs` in project workspace.',
    expectedEffect: 'Updates stream handler logic with token buffer recovery.',
    reversibility: 'reversible',
    expirationTime: FIXED_PLUS_2H_ISO,
    status: 'pending',
    signatureVerified: true
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-001',
    timestamp: FIXED_MINUS_1H_ISO,
    actor: 'operator',
    action: 'DISPATCH_MISSION',
    details: 'Submitted objective "Fullstack Rust microservice refactor with sequence recovery" to Aegis Coordinator.',
    riskLevel: 'low',
    signatureVerified: true,
    targetNode: 'node-desktop-rig'
  },
  {
    id: 'log-002',
    timestamp: FIXED_MINUS_45S_ISO,
    actor: 'agent-coordinator',
    action: 'DELEGATE_SUBTASK',
    details: 'Assigned Subtask #002 to Forge on Rigel-GPU.',
    riskLevel: 'low',
    signatureVerified: true,
    targetNode: 'node-desktop-rig'
  },
  {
    id: 'log-003',
    timestamp: FIXED_MINUS_15M_ISO,
    actor: 'agent-critic',
    action: 'INTERCEPT_TOOL',
    details: 'Tool `shell_execute` blocked by Autonomy policy (Level: Ask Before Every Tool). Approval request created.',
    riskLevel: 'high',
    signatureVerified: true,
    targetNode: 'node-desktop-rig'
  }
];

export const INITIAL_MEMORIES: ProjectMemoryItem[] = [
  {
    id: 'mem-001',
    scope: 'global',
    scopeName: 'Operator Preferences',
    keyFact: 'Always enforce HMAC-SHA256 signature envelopes for privileged commands on remote node companions.',
    confidence: 1.0,
    pinned: true,
    sourceCitation: 'Operator Keystore Config #01',
    createdAt: FIXED_MINUS_1D_ISO
  },
  {
    id: 'mem-002',
    scope: 'project',
    scopeName: 'Orchestra Core',
    keyFact: 'Project requires tokio v1.35 with full feature flags and zero global mutable state.',
    confidence: 0.95,
    pinned: true,
    sourceCitation: 'Cargo.toml Architecture Spec',
    createdAt: FIXED_MINUS_2H_ISO
  },
  {
    id: 'mem-003',
    scope: 'world_bible',
    scopeName: 'Motel Lazarus',
    keyFact: 'Motel Lazarus takes place in the neon-drenched coastal ruins of Neo-Veracruz, year 2089. Visual style: Cyan/magenta anamorphic lens flare.',
    confidence: 1.0,
    pinned: true,
    sourceCitation: 'Motel Lazarus Character & World Bible v2.4',
    createdAt: FIXED_MINUS_1D_ISO
  }
];

export const INITIAL_ARTIFACTS: ProjectArtifact[] = [
  {
    id: 'art-001',
    title: 'Rust Refactor Architecture Diagram & Spec',
    project: 'Orchestra Core',
    type: 'text',
    contentSnippet: '# Orchestra Core Refactor Spec\n\n- Modular Async Channels\n- Zero Data Race Verification\n- Monotonic Sequence Reconnection Protocol',
    originatingTaskId: 'task-001',
    agentId: 'agent-coordinator',
    machineId: 'node-desktop-rig',
    model: 'qwen2.5-coder:32b',
    createdAt: FIXED_MINUS_1H_ISO,
    approvalState: 'approved',
    tags: ['rust', 'architecture', 'spec'],
    hash: 'a7f3c9e128b4'
  },
  {
    id: 'art-002',
    title: 'Shot 4B - Motel Lazarus Lobby Render',
    project: 'Motel Lazarus',
    type: 'image',
    contentUrl: 'https://picsum.photos/seed/motellazarus/1024/1024',
    contentSnippet: 'Rendered with Flux1-Dev on VFX-Studio-Node. Seed: 84920194.',
    originatingTaskId: 'task-creative-01',
    agentId: 'agent-creative',
    machineId: 'node-comfyui-gpu',
    model: 'flux1-dev.safetensors',
    createdAt: FIXED_MINUS_2H_ISO,
    approvalState: 'approved',
    tags: ['motel-lazarus', 'flux1', 'comfyui'],
    hash: 'f9b2d8471a2c'
  }
];

export const INITIAL_TMUX_SESSIONS: TmuxSession[] = [
  {
    id: 'tmux-session-0',
    name: 'orchestra-main-tmux',
    machineId: 'node-desktop-rig',
    workingDirectory: '/home/operator/projects/orchestra-core',
    activeCommand: 'tail -f /var/log/orchestra-node.log',
    outputBuffer: [
      'orchestra-node v1.4.2 listening on 0.0.0.0:8443 (mDNS advertised)',
      '[INFO] Handshake verified from paired device pub_mac_secure_enclave_ed25519_node_01',
      '[INFO] Tmux session #0 attached. Terminal dimensions 120x36 color-mode 256color',
      'operator@Rigel-GPU:~/projects/orchestra-core$ cargo check --all-targets',
      '    Checking orchestra-core v0.1.0 (/home/operator/projects/orchestra-core)',
      '    Finished dev [unoptimized + debuginfo] target(s) in 2.14s'
    ],
    user: 'operator',
    isPrivileged: true
  },
  {
    id: 'tmux-session-1',
    name: 'hyperion-m3-agent-runner',
    machineId: 'node-macbook-m3',
    workingDirectory: '/Users/operator/research/docs',
    activeCommand: 'mlx_lm.server --model mlx-community/Llama-3.3-70B-Instruct-4bit',
    outputBuffer: [
      '[MLX] Server started at http://127.0.0.1:11434',
      '[MLX] Loaded model: Llama-3.3-70B-Instruct-4bit (Memory: 32.1GB)',
      '[INFO] Listening for HTTP & WebSocket connections...'
    ],
    user: 'operator',
    isPrivileged: false
  }
];

export const INITIAL_AUTOMATIONS: AutomationJob[] = [
  {
    id: 'auto-001',
    title: 'Hourly Node Health & VRAM Monitor',
    triggerType: 'scheduled',
    scheduleCron: '0 * * * *',
    targetAgentId: 'agent-devops',
    prompt: 'Query all registered node companions for CPU, RAM, VRAM, and thermal stats. Log anomalies to Audit trail.',
    status: 'active',
    lastRun: FIXED_MINUS_30M_ISO,
    nextRun: FIXED_PLUS_1H_ISO,
    idempotencyKey: 'job_health_check_hourly'
  },
  {
    id: 'auto-002',
    title: 'Auto-Trigger VFX Render on Script Update',
    triggerType: 'file_change',
    targetAgentId: 'agent-creative',
    prompt: 'When scene script file /motel-lazarus/script.md updates, queue corresponding visual concept shot in ComfyUI.',
    status: 'active',
    lastRun: FIXED_MINUS_2H_ISO,
    idempotencyKey: 'job_vfx_file_trigger'
  }
];
