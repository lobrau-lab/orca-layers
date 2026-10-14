/**
 * 2D Retro Viewport & Character Puppeteering Engine
 * 
 * Strict Clock Authority: Movement recording and playback are slaved to
 * BackendBridge master ticks. Render loop is presentation-only.
 * Prevents sub-pixel blurring via Math.round().
 * Eliminates key ghosting via polled key-state map.
 */

import {
  CharacterAction,
  CharacterMode,
  CharacterTrack,
  ClockTickPayload,
  INPUT_MASK,
  RailNode,
  RailSpline,
  RecordedFrame,
  TickInputEvent,
  TransportPayload,
} from './types';
import { backendBridge } from './backend-bridge';
import { KeyboardInputLogger } from './keyboard-input-logger';
import { getAtlasConfig, getProceduralCharacterAtlas } from './sprites';
import { StageRenderer, STAGE_THEMES } from './stage';

export interface ViewportConfig {
  width: number;
  height: number;
  pixelScale: number;
  enableCrtFilter: boolean;
  enableScreenShake: boolean;
  enableRailOverlay: boolean;
}

export class SequencerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: ViewportConfig;
  private stageRenderer: StageRenderer;

  // Characters & Tracks
  private tracks: CharacterTrack[] = [];
  private armedTrackId: string | null = null;

  // Rail Paths
  private railSplines: RailSpline[] = [];
  private activeSplineId: string = 'spline-1';
  private selectedNodeId: string | null = null;
  private isDraggingNode = false;

  // Master Clock & Transport State (Slaved strictly to BackendBridge)
  private currentStep = 0;
  private currentBpm = 120;
  private totalSteps = 64;
  private isPlaying = false;
  private isRecording = false;
  private lastTickTimestamp = 0;

  // Visual Screen Shake Modifier
  private shakeX = 0;
  private shakeY = 0;
  private shakeDecay = 15;

  // Input Polling (Eliminates OS repeat stalls and key rollover ghosting)
  private keysPressed: Record<string, boolean> = {};

  // High-precision rAF-slaved KeyboardInputLogger utility (prevents input drops from DOM event throttling)
  private inputLogger: KeyboardInputLogger;

  // Animation & Render Loop
  private animFrameId: number | null = null;
  private lastRenderTime = 0;

  // Unsubscribe handlers
  private unsubBeat: (() => void) | null = null;
  private unsubClock: (() => void) | null = null;
  private unsubTransport: (() => void) | null = null;

  // Pre-cached atlas canvases
  private atlasCanvases = new Map<string, HTMLCanvasElement>();

  constructor(canvas: HTMLCanvasElement, config: Partial<ViewportConfig> = {}) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D context');
    this.ctx = context;

    this.config = {
      width: config.width || 800,
      height: config.height || 450,
      pixelScale: config.pixelScale || 1,
      enableCrtFilter: config.enableCrtFilter ?? true,
      enableScreenShake: config.enableScreenShake ?? true,
      enableRailOverlay: config.enableRailOverlay ?? false,
    };

    this.stageRenderer = new StageRenderer(STAGE_THEMES.cyber_alley);

    this.initDefaultTracks();
    this.initDefaultSplines();
    this.initPreloadedAtlases();
    this.initBridgeListeners();
    this.initInputListeners();

    // Initialize KeyboardInputLogger hooked directly to keysPressed map
    this.inputLogger = new KeyboardInputLogger({
      keysSource: () => this.keysPressed,
      mode: 'continuous',
      autoStart: true,
      characterId: this.armedTrackId || 'track-1',
    });
  }

  // --- Initial Setup ---

  private initPreloadedAtlases() {
    const types: Array<'bboy' | 'cyberpunk' | 'retro_bot' | 'chiptune_mage' | 'pixel_kitty'> = [
      'bboy', 'cyberpunk', 'retro_bot', 'chiptune_mage', 'pixel_kitty'
    ];
    for (const t of types) {
      const { canvas } = getProceduralCharacterAtlas(t);
      this.atlasCanvases.set(`atlas_${t}`, canvas);
    }
  }

  private initDefaultTracks() {
    const groundY = this.stageRenderer.getTheme().groundY - 64;

    const track1: CharacterTrack = {
      id: 'track-1',
      name: 'Beatbox Bot',
      color: '#38bdf8',
      characterType: 'retro_bot',
      spriteConfig: getAtlasConfig('retro_bot'),
      mode: 'LIVE_PUPPET',
      isArmed: true,
      isMuted: false,
      isSolo: false,
      x: 180,
      y: groundY,
      vx: 0,
      vy: 0,
      isGrounded: true,
      flipX: false,
      currentAction: 'idle',
      animFrame: 0,
      animTimer: 0,
      beatPulseScale: 1,
      beatBounceY: 0,
      recordedFrames: [],
      recordedInputEvents: [],
    };

    const track2: CharacterTrack = {
      id: 'track-2',
      name: 'B-Boy Flash',
      color: '#ef4444',
      characterType: 'bboy',
      spriteConfig: getAtlasConfig('bboy'),
      mode: 'IDLE_BEAT_SYNC',
      isArmed: false,
      isMuted: false,
      isSolo: false,
      x: 380,
      y: groundY,
      vx: 0,
      vy: 0,
      isGrounded: true,
      flipX: true,
      currentAction: 'dance',
      animFrame: 0,
      animTimer: 0,
      beatPulseScale: 1,
      beatBounceY: 0,
      recordedFrames: [],
      recordedInputEvents: [],
    };

    const track3: CharacterTrack = {
      id: 'track-3',
      name: 'Neon Runner',
      color: '#ec4899',
      characterType: 'cyberpunk',
      spriteConfig: getAtlasConfig('cyberpunk'),
      mode: 'RAIL_PATH',
      railSplineId: 'spline-1',
      isArmed: false,
      isMuted: false,
      isSolo: false,
      x: 580,
      y: groundY - 40,
      vx: 0,
      vy: 0,
      isGrounded: true,
      flipX: false,
      currentAction: 'move',
      animFrame: 0,
      animTimer: 0,
      beatPulseScale: 1,
      beatBounceY: 0,
      recordedFrames: [],
      recordedInputEvents: [],
    };

    this.tracks = [track1, track2, track3];
    this.armedTrackId = 'track-1';
  }

  private initDefaultSplines() {
    const groundY = this.stageRenderer.getTheme().groundY;
    const defaultSpline: RailSpline = {
      id: 'spline-1',
      name: 'Stage Figure 8 / Wave',
      color: '#f59e0b',
      closed: true,
      nodes: [
        { id: 'node-1', x: 120, y: groundY - 80, step: 0, action: 'move' },
        { id: 'node-2', x: 280, y: groundY - 180, step: 16, action: 'jump' },
        { id: 'node-3', x: 440, y: groundY - 80, step: 32, action: 'dance' },
        { id: 'node-4', x: 620, y: groundY - 160, step: 48, action: 'spin' },
        { id: 'node-5', x: 700, y: groundY - 80, step: 64, action: 'move' },
      ],
    };

    this.railSplines = [defaultSpline];
  }

  // --- Backend Bridge Integration ---

  private initBridgeListeners() {
    // 1. Beat Triggers
    this.unsubBeat = backendBridge.onBeatTrigger((padIndex, velocity) => {
      this.handleBeatTrigger(padIndex, velocity);
    });

    // 2. Master Clock Ticks (Single source of truth for synchronization)
    this.unsubClock = backendBridge.onClockTick((payload: ClockTickPayload) => {
      this.handleClockTick(payload);
    });

    // 3. Transport Change
    this.unsubTransport = backendBridge.onTransportChange((payload: TransportPayload) => {
      this.handleTransportChange(payload);
    });
  }

  private handleBeatTrigger(padIndex: number, velocity: number) {
    // Stage reactive visuals (speakers, neon lights, floor)
    this.stageRenderer.triggerPadReaction(padIndex, velocity);

    // Screen Shake based on pad & velocity
    if (this.config.enableScreenShake) {
      const shakeAmt = (padIndex === 0 ? 9 : 4) * velocity;
      this.shakeX = (Math.random() - 0.5) * shakeAmt;
      this.shakeY = (Math.random() - 0.5) * shakeAmt;
    }

    // Passive beat reactions for characters
    const isHeavyBeat = padIndex === 0 || padIndex === 1;
    this.tracks.forEach((track) => {
      if (track.mode === 'IDLE_BEAT_SYNC') {
        track.beatPulseScale = 1 + 0.25 * velocity;
        track.beatBounceY = -(8 * velocity);
        if (isHeavyBeat) {
          track.animFrame = (track.animFrame + 1) % 4;
        }
      }
    });
  }

  private handleClockTick(payload: ClockTickPayload) {
    this.currentStep = payload.step;
    this.currentBpm = payload.bpm;
    this.totalSteps = payload.totalSteps || 64;
    this.lastTickTimestamp = payload.timestamp;

    // Advance characters on master tick
    this.tracks.forEach((track) => {
      // 1. RAIL_PATH Mode: Calculate position strictly from master step subdivision
      if (track.mode === 'RAIL_PATH' && track.railSplineId) {
        const spline = this.railSplines.find((s) => s.id === track.railSplineId);
        if (spline && spline.nodes.length > 1) {
          const pos = this.interpolateSplineAtStep(spline, payload.step, payload.totalSteps);
          track.x = pos.x;
          track.y = pos.y;
          if (pos.action) track.currentAction = pos.action;
          track.flipX = pos.vx < 0;
        }
      }

      // 2. PLAYBACK_OVERDUB Mode: Replay recorded frame matching current step
      if (track.mode === 'PLAYBACK_OVERDUB' && track.recordedFrames.length > 0) {
        const frame = track.recordedFrames.find((f) => f.step === payload.step);
        if (frame) {
          track.x = frame.x;
          track.y = frame.y;
          track.currentAction = frame.action;
          track.flipX = frame.flipX;
          track.isGrounded = frame.isGrounded;
        }
      }

      // 3. RECORDING Multi-Pass Overdub:
      // If transport is recording and this track is armed in LIVE_PUPPET mode,
      // sample state locked to master clock step!
      if (this.isRecording && track.id === this.armedTrackId && track.mode === 'LIVE_PUPPET') {
        const keysMask = this.getCurrentKeyMask();
        const newFrame: RecordedFrame = {
          step: payload.step,
          timestamp: payload.timestamp,
          x: Math.round(track.x),
          y: Math.round(track.y),
          action: track.currentAction,
          flipX: track.flipX,
          isGrounded: track.isGrounded,
          keysMask,
        };

        // Replace or add frame for this step
        const existingIdx = track.recordedFrames.findIndex((f) => f.step === payload.step);
        if (existingIdx >= 0) {
          track.recordedFrames[existingIdx] = newFrame;
        } else {
          track.recordedFrames.push(newFrame);
        }

        // Plan B: Record tick input event
        const newEvent: TickInputEvent = { step: payload.step, keysMask };
        const existingEvtIdx = track.recordedInputEvents.findIndex((e) => e.step === payload.step);
        if (existingEvtIdx >= 0) {
          track.recordedInputEvents[existingEvtIdx] = newEvent;
        } else {
          track.recordedInputEvents.push(newEvent);
        }

        // Loop wrap: If loop wraps to 0 or length, emit live telemetry to backend
        if (payload.step === payload.totalSteps - 1 || payload.step === 0) {
          backendBridge.emitTrackData(track.id, [...track.recordedFrames]);
          backendBridge.emitTrackInputEvents(track.id, [...track.recordedInputEvents]);
        }
      }
    });
  }

  private handleTransportChange(payload: TransportPayload) {
    const wasRecording = this.isRecording;
    this.isPlaying = payload.isPlaying;
    this.isRecording = payload.isRecording;
    this.currentStep = payload.currentStep;

    // Update KeyboardInputLogger state
    if (this.inputLogger) {
      this.inputLogger.setIsRecording(payload.isRecording);
    }

    // When recording stops, emit full recorded telemetry
    if (wasRecording && !payload.isRecording && this.armedTrackId) {
      const armed = this.tracks.find((t) => t.id === this.armedTrackId);
      if (armed && armed.recordedFrames.length > 0) {
        backendBridge.emitTrackData(armed.id, armed.recordedFrames);
        backendBridge.emitTrackInputEvents(armed.id, armed.recordedInputEvents);
      }
    }
  }

  // --- Input Polling & Focus Handling ---

  private initInputListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // CRITICAL: Prevent focus stealing & page scrolling on Spacebar & Arrow keys
    // when user is puppeteering in the canvas overlay
    const target = e.target as HTMLElement | null;
    const isTypingInInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

    if (isTypingInInput) return;

    if (
      e.code === 'Space' ||
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight'
    ) {
      e.preventDefault();
    }

    this.keysPressed[e.code] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysPressed[e.code] = false;
  };

  public setVirtualKey(code: string, isPressed: boolean) {
    this.keysPressed[code] = isPressed;
    if (this.inputLogger) {
      this.inputLogger.setVirtualKey(code, isPressed);
    }
  }

  public getKeysPressed(): Record<string, boolean> {
    return { ...this.keysPressed };
  }

  public getInputLogger(): KeyboardInputLogger {
    return this.inputLogger;
  }

  private getCurrentKeyMask(): number {
    let mask = 0;
    if (this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft']) mask |= INPUT_MASK.LEFT;
    if (this.keysPressed['KeyD'] || this.keysPressed['ArrowRight']) mask |= INPUT_MASK.RIGHT;
    if (this.keysPressed['KeyW'] || this.keysPressed['ArrowUp']) mask |= INPUT_MASK.UP;
    if (this.keysPressed['KeyS'] || this.keysPressed['ArrowDown']) mask |= INPUT_MASK.DOWN;
    if (this.keysPressed['Space']) mask |= INPUT_MASK.JUMP;
    if (this.keysPressed['KeyE']) mask |= INPUT_MASK.DANCE;
    if (this.keysPressed['KeyF']) mask |= INPUT_MASK.SPIN;
    return mask;
  }

  // --- Main Tick & Render Loop ---

  public start() {
    if (this.animFrameId !== null) return;
    this.lastRenderTime = performance.now();
    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - this.lastRenderTime) / 1000, 0.1);
      this.lastRenderTime = timestamp;

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public destroy() {
    this.stop();
    if (this.inputLogger) {
      this.inputLogger.destroy();
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.unsubBeat) this.unsubBeat();
    if (this.unsubClock) this.unsubClock();
    if (this.unsubTransport) this.unsubTransport();
  }

  // --- Update Loop (Physics, Puppeteering & Spring Decay) ---

  private update(dt: number) {
    this.stageRenderer.update(dt);

    // Decay viewport screen shake
    if (this.config.enableScreenShake) {
      this.shakeX *= Math.max(0, 1 - dt * this.shakeDecay);
      this.shakeY *= Math.max(0, 1 - dt * this.shakeDecay);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    const groundY = this.stageRenderer.getTheme().groundY - 64;
    const gravity = 1800; // px/s^2
    const moveSpeed = 220; // px/s
    const jumpVelocity = -520; // px/s

    // Update armed track physics if LIVE_PUPPET
    const armed = this.tracks.find((t) => t.id === this.armedTrackId);
    if (armed && armed.mode === 'LIVE_PUPPET') {
      const isLeft = this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft'];
      const isRight = this.keysPressed['KeyD'] || this.keysPressed['ArrowRight'];
      const isJump = this.keysPressed['Space'];
      const isDance = this.keysPressed['KeyE'];
      const isSpin = this.keysPressed['KeyF'];

      // Horizontal movement
      if (isLeft && !isRight) {
        armed.vx = -moveSpeed;
        armed.flipX = true;
      } else if (isRight && !isLeft) {
        armed.vx = moveSpeed;
        armed.flipX = false;
      } else {
        armed.vx = 0;
      }

      // Jump Physics
      if (isJump && armed.isGrounded) {
        armed.vy = jumpVelocity;
        armed.isGrounded = false;
        armed.currentAction = 'jump';
      }

      // Apply Gravity
      armed.vy += gravity * dt;
      armed.y += armed.vy * dt;
      armed.x += armed.vx * dt;

      // Ground Collision
      if (armed.y >= groundY) {
        armed.y = groundY;
        armed.vy = 0;
        armed.isGrounded = true;
      }

      // Screen boundaries
      armed.x = Math.max(20, Math.min(this.config.width - 60, armed.x));

      // Action determination
      if (!armed.isGrounded) {
        armed.currentAction = 'jump';
      } else if (isSpin) {
        armed.currentAction = 'spin';
      } else if (isDance) {
        armed.currentAction = 'dance';
      } else if (Math.abs(armed.vx) > 10) {
        armed.currentAction = 'move';
      } else {
        armed.currentAction = 'idle';
      }
    }

    // Animation frame timing for all tracks
    this.tracks.forEach((track) => {
      // Spring decay for beat pulse
      track.beatPulseScale += (1 - track.beatPulseScale) * Math.min(1, dt * 10);
      track.beatBounceY += (0 - track.beatBounceY) * Math.min(1, dt * 10);

      // Animation tick
      track.animTimer += dt;
      const animFps = track.spriteConfig.animations.fps || 8;
      if (track.animTimer >= 1 / animFps) {
        track.animTimer = 0;
        track.animFrame = (track.animFrame + 1) % 4;
      }
    });
  }

  // --- Render Loop (Pixelated & Sub-Pixel Blurring Prevention) ---

  private render() {
    const { width, height } = this.config;
    const ctx = this.ctx;

    ctx.save();

    // 1. Viewport Screen Shake
    const shakeOffsetX = Math.round(this.shakeX);
    const shakeOffsetY = Math.round(this.shakeY);
    ctx.translate(shakeOffsetX, shakeOffsetY);

    // 2. Stage Background
    this.stageRenderer.renderBackground(ctx, width, height, 0);

    // 3. Stage Floor
    this.stageRenderer.renderFloor(ctx, width, height);

    // 4. Rail Paths Overlay (if enabled in Rail Editor mode)
    if (this.config.enableRailOverlay) {
      this.renderRailOverlay(ctx);
    }

    // 5. Stage Props (Subwoofer speakers, neon sign)
    this.stageRenderer.renderProps(ctx, width, height);

    // 6. Character Entities (Multi-track)
    // Filter solo/mute
    const soloTrack = this.tracks.find((t) => t.isSolo);
    const visibleTracks = this.tracks.filter((t) => {
      if (soloTrack) return t.id === soloTrack.id;
      return !t.isMuted;
    });

    // Sort by Y for natural depth
    visibleTracks.sort((a, b) => a.y - b.y);

    visibleTracks.forEach((track) => {
      this.renderCharacter(ctx, track);
    });

    // 7. CRT / Scanline filter if enabled
    if (this.config.enableCrtFilter) {
      this.renderCrtFilter(ctx, width, height);
    }

    ctx.restore();
  }

  /**
   * Character Rendering with Pixel Precision
   * Sub-pixel blur prevention: forces Math.round() on draw calls.
   */
  private renderCharacter(ctx: CanvasRenderingContext2D, track: CharacterTrack) {
    const atlasCanvas = this.atlasCanvases.get(track.spriteConfig.id);
    if (!atlasCanvas) return;

    ctx.save();

    const scale = track.spriteConfig.scale * track.beatPulseScale;
    const fW = track.spriteConfig.frameWidth;
    const fH = track.spriteConfig.frameHeight;

    // Pixel-perfect rounded coordinates
    const drawX = Math.round(track.x);
    const drawY = Math.round(track.y + track.beatBounceY);

    // Pick frame rectangle based on action & frame
    const action = track.currentAction || 'idle';
    const frames = track.spriteConfig.animations[action] || track.spriteConfig.animations.idle;
    const frameIndex = track.animFrame % frames.length;
    const frameRect = frames[frameIndex];

    ctx.translate(drawX, drawY);

    if (track.flipX) {
      ctx.scale(-1, 1);
      ctx.translate(-fW * scale, 0);
    }

    // Armed indicator ring / shadow
    if (track.id === this.armedTrackId) {
      ctx.fillStyle = this.isRecording ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.ellipse((fW * scale) / 2, fH * scale - 2, (fW * scale) / 2.2, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw sprite slice onto canvas with nearest-neighbor crispness
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      atlasCanvas,
      frameRect.x,
      frameRect.y,
      frameRect.w,
      frameRect.h,
      0,
      0,
      Math.round(fW * scale),
      Math.round(fH * scale)
    );

    // Character Label Tag
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = track.color;
    ctx.textAlign = 'center';
    const labelX = Math.round(track.x + (fW * scale) / 2);
    const labelY = Math.round(track.y - 6);
    ctx.fillText(`${track.name} [${track.mode.split('_')[0]}]`, labelX, labelY);
    ctx.restore();
  }

  /**
   * Rail Editor Spline Renderer
   */
  private renderRailOverlay(ctx: CanvasRenderingContext2D) {
    this.railSplines.forEach((spline) => {
      const isSelected = spline.id === this.activeSplineId;
      ctx.save();
      ctx.strokeStyle = isSelected ? spline.color : '#64748b';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.setLineDash([4, 4]);

      // Connect nodes with dashed spline lines
      if (spline.nodes.length > 1) {
        ctx.beginPath();
        ctx.moveTo(Math.round(spline.nodes[0].x), Math.round(spline.nodes[0].y));
        for (let i = 1; i < spline.nodes.length; i++) {
          const prev = spline.nodes[i - 1];
          const curr = spline.nodes[i];
          const midX = (prev.x + curr.x) / 2;
          const midY = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        const last = spline.nodes[spline.nodes.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }

      ctx.setLineDash([]);

      // Draw Keyframe Nodes
      spline.nodes.forEach((node, idx) => {
        const isNodeSelected = node.id === this.selectedNodeId;
        ctx.fillStyle = isNodeSelected ? '#ffffff' : spline.color;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;

        const nx = Math.round(node.x);
        const ny = Math.round(node.y);

        ctx.beginPath();
        ctx.arc(nx, ny, isNodeSelected ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Node step badge
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`P${idx + 1}:${node.step}`, nx, ny - 10);
      });

      ctx.restore();
    });
  }

  /**
   * Spline Interpolator locked to master clock step
   */
  private interpolateSplineAtStep(
    spline: RailSpline,
    step: number,
    totalSteps: number
  ): { x: number; y: number; vx: number; action?: CharacterAction } {
    if (spline.nodes.length === 0) return { x: 200, y: 300, vx: 0 };
    if (spline.nodes.length === 1) return { x: spline.nodes[0].x, y: spline.nodes[0].y, vx: 0 };

    const sorted = [...spline.nodes].sort((a, b) => a.step - b.step);
    const cycleStep = step % totalSteps;

    // Find bounding nodes
    let prevNode = sorted[0];
    let nextNode = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i++) {
      if (cycleStep >= sorted[i].step && cycleStep <= sorted[i + 1].step) {
        prevNode = sorted[i];
        nextNode = sorted[i + 1];
        break;
      }
    }

    const stepDiff = Math.max(1, nextNode.step - prevNode.step);
    const progress = Math.min(1, Math.max(0, (cycleStep - prevNode.step) / stepDiff));

    // Smooth Hermite/Cosine easing
    const t = 0.5 * (1 - Math.cos(progress * Math.PI));
    const x = prevNode.x + (nextNode.x - prevNode.x) * t;
    const y = prevNode.y + (nextNode.y - prevNode.y) * t;
    const vx = nextNode.x - prevNode.x;

    return {
      x,
      y,
      vx,
      action: nextNode.action || 'move',
    };
  }

  /**
   * Retro Scanline & Vignette Effect
   */
  private renderCrtFilter(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    // Scanlines
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }

    // Radial vignette
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.35,
      width / 2,
      height / 2,
      width * 0.7
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  // --- Public API & Controls for UI ---

  public setStageTheme(themeId: string) {
    if (STAGE_THEMES[themeId]) {
      this.stageRenderer.setTheme(STAGE_THEMES[themeId]);
    }
  }

  public getTracks() {
    return this.tracks;
  }

  public setArmedTrack(trackId: string) {
    this.armedTrackId = trackId;
    if (this.inputLogger) {
      this.inputLogger.setArmedCharacterId(trackId);
    }
    this.tracks.forEach((t) => {
      t.isArmed = t.id === trackId;
      if (t.id === trackId) {
        t.mode = 'LIVE_PUPPET';
      }
    });
  }

  public setTrackMode(trackId: string, mode: CharacterMode) {
    const t = this.tracks.find((tr) => tr.id === trackId);
    if (t) {
      t.mode = mode;
      if (mode === 'PLAYBACK_OVERDUB' && t.recordedFrames.length === 0) {
        // If no recorded frames yet, switch back to beat sync
        t.mode = 'IDLE_BEAT_SYNC';
      }
    }
  }

  public toggleTrackMute(trackId: string) {
    const t = this.tracks.find((tr) => tr.id === trackId);
    if (t) t.isMuted = !t.isMuted;
  }

  public toggleTrackSolo(trackId: string) {
    const t = this.tracks.find((tr) => tr.id === trackId);
    if (t) {
      const willSolo = !t.isSolo;
      this.tracks.forEach((tr) => (tr.isSolo = false));
      t.isSolo = willSolo;
    }
  }

  public clearTrackRecording(trackId: string) {
    const t = this.tracks.find((tr) => tr.id === trackId);
    if (t) {
      t.recordedFrames = [];
      t.recordedInputEvents = [];
      if (t.mode === 'PLAYBACK_OVERDUB') {
        t.mode = 'IDLE_BEAT_SYNC';
      }
    }
  }

  public setCustomAtlas(trackId: string, canvas: HTMLCanvasElement, config: any) {
    this.atlasCanvases.set(config.id, canvas);
    const t = this.tracks.find((tr) => tr.id === trackId);
    if (t) {
      t.spriteConfig = config;
    }
  }

  public getRailSplines() {
    return this.railSplines;
  }

  public addRailNode(x: number, y: number, step: number) {
    const spline = this.railSplines.find((s) => s.id === this.activeSplineId);
    if (spline) {
      const newNode: RailNode = {
        id: `node-${Date.now()}`,
        x: Math.round(x),
        y: Math.round(y),
        step: Math.round(step),
        action: 'move',
      };
      spline.nodes.push(newNode);
      spline.nodes.sort((a, b) => a.step - b.step);
      this.selectedNodeId = newNode.id;
    }
  }

  public updateRailNode(nodeId: string, updates: Partial<RailNode>) {
    this.railSplines.forEach((spline) => {
      const node = spline.nodes.find((n) => n.id === nodeId);
      if (node) {
        Object.assign(node, updates);
      }
    });
  }

  public removeRailNode(nodeId: string) {
    this.railSplines.forEach((spline) => {
      spline.nodes = spline.nodes.filter((n) => n.id !== nodeId);
    });
  }

  public selectRailNodeAt(canvasX: number, canvasY: number): RailNode | null {
    const spline = this.railSplines.find((s) => s.id === this.activeSplineId);
    if (!spline) return null;

    for (const node of spline.nodes) {
      const dist = Math.hypot(node.x - canvasX, node.y - canvasY);
      if (dist <= 12) {
        this.selectedNodeId = node.id;
        return node;
      }
    }
    this.selectedNodeId = null;
    return null;
  }

  public setConfig(updates: Partial<ViewportConfig>) {
    Object.assign(this.config, updates);
  }

  public getConfig() {
    return this.config;
  }
}
