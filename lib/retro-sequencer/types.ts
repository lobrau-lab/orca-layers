/**
 * Types & Contracts for 8-Bit/16-Bit Retro Music Video Sequencer Overlay
 * Decoupled Frontend Viewport & UI Controller
 */

export type CharacterMode = 'IDLE_BEAT_SYNC' | 'RAIL_PATH' | 'LIVE_PUPPET' | 'PLAYBACK_OVERDUB';

export type CharacterAction = 'idle' | 'move' | 'jump' | 'dance' | 'spin';

export interface ClockTickPayload {
  step: number;        // Step counter, e.g. 0 to 63 (or continuous 16th notes)
  timestamp: number;   // Master backend clock timestamp (ms or audio context time)
  bpm: number;         // Beats per minute from master clock
  bar: number;         // 1-indexed bar count
  beat: number;        // 1-indexed beat (1-4)
  totalSteps: number;  // Loop length in steps (typically 64 or 32)
}

export interface TransportPayload {
  isPlaying: boolean;
  isRecording: boolean;
  currentStep: number;
  loopLengthSteps?: number;
}

export interface BeatTriggerPayload {
  padIndex: number;    // 0 to 7 (Pad 1 through 8)
  velocity: number;    // 0.0 to 1.0
  note?: string;       // e.g. "C1", "D#1", "Kick", "Snare"
  timestamp: number;   // Event timestamp
}

export interface RecordedFrame {
  step: number;        // Quantized to backend step
  timestamp: number;   // Master clock timestamp
  x: number;           // World X coordinate
  y: number;           // World Y coordinate
  action: CharacterAction; // Animation state (idle, move, jump, dance, spin)
  flipX: boolean;      // Facing left or right
  isGrounded: boolean; // Ground physics state
  keysMask: number;    // Bitmask for inputs (Plan B compact representation)
}

export interface TickInputEvent {
  step: number;
  keysMask: number;    // Bit flags: bit 0 = Left, 1 = Right, 2 = Up, 3 = Down, 4 = Jump, 5 = Dance, 6 = Spin
}

export const INPUT_MASK = {
  LEFT: 1 << 0,
  RIGHT: 1 << 1,
  UP: 1 << 2,
  DOWN: 1 << 3,
  JUMP: 1 << 4,
  DANCE: 1 << 5,
  SPIN: 1 << 6,
} as const;

export interface KeyMaskPayload {
  keyMask: number;            // Bitmask using INPUT_MASK (0 to 127)
  activeKeys: string[];       // e.g. ['KeyW', 'KeyD', 'Space']
  timestamp: number;          // Epoch timestamp Date.now()
  perfTimestamp: number;      // High-precision rAF timestamp performance.now()
  frameNumber: number;        // Monotonic rAF frame counter
  action: CharacterAction;    // 'idle' | 'move' | 'jump' | 'dance' | 'spin'
  direction: { x: number; y: number }; // Normalized or discrete directional vector
  characterId?: string;       // Currently armed character track ID
  isRecording?: boolean;      // Backend transport recording state
  dropsPrevented?: number;    // Count of drops prevented by rAF polling vs DOM throttling
}

export interface LoggerTelemetryStats {
  totalPolls: number;
  totalDispatched: number;
  dropsPrevented: number;
  transitionsDetected: number;
  currentFps: number;
  avgIntervalMs: number;
  isRunning: boolean;
  mode: 'continuous' | 'on_change_or_heartbeat' | 'on_active';
}

export interface RailNode {
  id: string;
  x: number;
  y: number;
  step: number; // The step subdivision at which character hits this node (0 to loopLength-1)
  action?: CharacterAction;
}

export interface RailSpline {
  id: string;
  name: string;
  color: string;
  closed: boolean;
  nodes: RailNode[];
}

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpriteAnimationSchema {
  idle: FrameRect[];
  move: FrameRect[];
  jump: FrameRect[];
  dance: FrameRect[];
  spin: FrameRect[];
  fps?: number;
}

export interface SpriteAtlasConfig {
  id: string;
  name: string;
  sheetUrl?: string; // Optional external image URL, otherwise drawn from procedural pixel cache
  frameWidth: number;
  frameHeight: number;
  scale: number;
  animations: SpriteAnimationSchema;
  paletteTheme?: string;
}

export interface CharacterTrack {
  id: string;
  name: string;
  color: string;
  characterType: 'bboy' | 'cyberpunk' | 'retro_bot' | 'chiptune_mage' | 'pixel_kitty' | 'custom';
  spriteConfig: SpriteAtlasConfig;
  mode: CharacterMode;
  isArmed: boolean;    // Armed for LIVE_PUPPET and RECORDING
  isMuted: boolean;    // Visual mute (hidden)
  isSolo: boolean;     // Visual solo (only this track visible)
  railSplineId?: string; // Active rail spline when in RAIL_PATH mode
  
  // Real-time world state (slaved to backend master clock & input polling)
  x: number;
  y: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  flipX: boolean;
  currentAction: CharacterAction;
  animFrame: number;
  animTimer: number;

  // Beat reaction spring/pulse
  beatPulseScale: number;
  beatBounceY: number;

  // Recorded track telemetry
  recordedFrames: RecordedFrame[];
  recordedInputEvents: TickInputEvent[];
}

export interface StageTheme {
  id: string;
  name: string;
  category: 'cyber_alley' | 'chiptune_rooftop' | 'synthwave_grid';
  groundY: number;
  skyGradient: [string, string];
  gridColor?: string;
  neonColors: string[];
}

/**
 * BackendBridge Contract
 * Decoupled communication interface between external audio engine and frontend viewport.
 */
export interface BackendBridge {
  // Listener Subscriptions
  onBeatTrigger: (callback: (padIndex: number, velocity: number, note?: string) => void) => () => void;
  onClockTick: (callback: (payload: ClockTickPayload) => void) => () => void;
  onTransportChange: (callback: (payload: TransportPayload) => void) => () => void;
  onKeyMask: (callback: (payload: KeyMaskPayload) => void) => () => void;

  // Emitter Hooks (Sending player recording and real-time input telemetry back to backend)
  emitTrackData: (characterId: string, recordedFramesArray: RecordedFrame[]) => void;
  emitTrackInputEvents: (characterId: string, recordedEvents: TickInputEvent[]) => void;
  emitTransportCommand: (action: 'PLAY' | 'STOP' | 'RECORD' | 'REWIND' | 'SEEK', step?: number) => void;
  emitKeyMask: (payload: KeyMaskPayload) => void;

  // Debug Simulation Hooks (for testing frontend overlay standalone)
  simulateClockTick: (step: number, bpm?: number) => void;
  simulateBeatTrigger: (padIndex: number, velocity?: number, note?: string) => void;
  simulateTransportChange: (isPlaying: boolean, isRecording: boolean, currentStep?: number) => void;
}
