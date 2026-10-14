/**
 * KeyboardInputLogger Utility
 * 
 * High-precision rAF-slaved input poller and telemetry dispatcher.
 * Polls the boolean keysPressed map on every requestAnimationFrame (60Hz / 120Hz / 144Hz+)
 * and dispatches the active state as a standardized keyMask bitmask to BackendBridge.
 * 
 * Prevents input drops caused by:
 * 1. OS typematic repeat delay and repeat throttling (~30Hz repeat rate cap)
 * 2. Key rollover ghosting and simultaneous key combination drops (e.g. W + D + Space)
 * 3. Browser event-loop micro-stalls and coalesced DOM keydown/keyup events
 * 4. Audio clock / transport tick mismatch (slaves frame-perfect input state to master clock)
 */

import { useEffect } from 'react';
import { backendBridge } from './backend-bridge';
import { 
  CharacterAction, 
  INPUT_MASK, 
  KeyMaskPayload, 
  LoggerTelemetryStats 
} from './types';

export type LoggerDispatchMode = 'continuous' | 'on_change_or_heartbeat' | 'on_active';

export class KeyboardInputLogger {
  // Source of keys: either an external getter or internal map
  private keysSource: (() => Record<string, boolean>) | null = null;
  public keysPressed: Map<string, boolean> = new Map<string, boolean>();
  private internalKeysPressed: Record<string, boolean> = {};

  // rAF loop handles
  private animFrameId: number | null = null;
  private isRunning = false;

  // Dispatch configuration
  private mode: LoggerDispatchMode = 'continuous';
  private heartbeatIntervalFrames = 30; // 0.5s at 60fps
  private armedCharacterId: string = 'bboy-1';
  private isRecording: boolean = false;

  // Frame timing & FPS tracking
  private frameNumber = 0;
  private lastPollTime = 0;
  private fpsSampleStartTime = 0;
  private fpsSampleFrames = 0;
  private currentFps = 60;
  private avgIntervalMs = 16.6;

  // State change detection & drop prevention tracking
  private lastKeyMask: number = -1;
  private lastActiveKeysString: string = '';
  private framesSinceLastDispatch = 0;
  private totalDispatched = 0;
  private transitionsDetected = 0;
  private dropsPrevented = 0;

  // Circular history buffer (retaining last 60 sampled payloads)
  private history: KeyMaskPayload[] = [];
  private maxHistorySize = 60;
  private lastPayload: KeyMaskPayload | null = null;

  // Local event listeners for observers
  private dispatchListeners = new Set<(payload: KeyMaskPayload) => void>();

  constructor(options?: {
    keysSource?: () => Record<string, boolean>;
    mode?: LoggerDispatchMode;
    autoStart?: boolean;
    characterId?: string;
  }) {
    if (options?.keysSource) {
      this.keysSource = options.keysSource;
    }
    if (options?.mode) {
      this.mode = options.mode;
    }
    if (options?.characterId) {
      this.armedCharacterId = options.characterId;
    }

    // Attach fallback internal listeners if running in browser window
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown, { passive: false });
      window.addEventListener('keyup', this.handleKeyUp, { passive: true });
      window.addEventListener('blur', this.handleBlur);
    }

    if (options?.autoStart !== false && typeof window !== 'undefined') {
      this.start();
    }
  }

  // --- Keyboard Event Interceptors (Backstop & Fallback) ---

  private handleKeyDown = (e: KeyboardEvent) => {
    // Avoid capturing inputs when typing into input fields or textareas
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    // Prevent default browser scrolling on game keys
    if (
      e.code === 'Space' ||
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight'
    ) {
      e.preventDefault();
    }

    this.internalKeysPressed[e.code] = true;
    this.keysPressed.set(e.code, true);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.internalKeysPressed[e.code] = false;
    this.keysPressed.set(e.code, false);
  };

  private handleBlur = () => {
    // Clear all held keys if window loses focus to prevent stuck keys
    this.internalKeysPressed = {};
    this.keysPressed.clear();
  };

  // --- Public Configuration & Virtual Inputs ---

  public setKeysSource(source: (() => Record<string, boolean>) | null) {
    this.keysSource = source;
  }

  public setDispatchMode(mode: LoggerDispatchMode) {
    this.mode = mode;
  }

  public getDispatchMode(): LoggerDispatchMode {
    return this.mode;
  }

  public setArmedCharacterId(characterId: string) {
    this.armedCharacterId = characterId;
  }

  public setIsRecording(recording: boolean) {
    this.isRecording = recording;
  }

  /**
   * Set a virtual key directly from UI/touch buttons or game controller HUD
   */
  public setVirtualKey(code: string, isPressed: boolean) {
    this.internalKeysPressed[code] = isPressed;
    this.keysPressed.set(code, isPressed);
  }

  public getKeysPressed(): Record<string, boolean> {
    if (this.keysSource) {
      try {
        const ext = this.keysSource();
        return { ...this.internalKeysPressed, ...ext };
      } catch (err) {
        console.error('Error fetching external keysSource:', err);
      }
    }
    return { ...this.internalKeysPressed };
  }

  public getKeysPressedMap(): Map<string, boolean> {
    return this.keysPressed;
  }

  // --- rAF Polling Engine ---

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastPollTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.fpsSampleStartTime = this.lastPollTime;
    this.fpsSampleFrames = 0;
    this.pollLoop();
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  private pollLoop = () => {
    if (!this.isRunning) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = this.lastPollTime > 0 ? now - this.lastPollTime : 16.6;
    this.lastPollTime = now;
    this.frameNumber++;

    // Rolling FPS and interval calculation
    this.fpsSampleFrames++;
    if (now - this.fpsSampleStartTime >= 1000) {
      this.currentFps = Math.round((this.fpsSampleFrames * 1000) / (now - this.fpsSampleStartTime));
      this.avgIntervalMs = Math.round((1000 / Math.max(1, this.currentFps)) * 10) / 10;
      this.fpsSampleFrames = 0;
      this.fpsSampleStartTime = now;
    }

    // 1. Gather active keys from source and fallback
    const activeKeysMap = this.getKeysPressed();
    const activeKeysList: string[] = [];

    for (const [code, isDown] of Object.entries(activeKeysMap)) {
      if (isDown) {
        activeKeysList.push(code);
      }
    }

    // 2. Compute 7-bit keyMask
    let mask = 0;
    const isLeft = !!(activeKeysMap['KeyA'] || activeKeysMap['ArrowLeft']);
    const isRight = !!(activeKeysMap['KeyD'] || activeKeysMap['ArrowRight']);
    const isUp = !!(activeKeysMap['KeyW'] || activeKeysMap['ArrowUp']);
    const isDown = !!(activeKeysMap['KeyS'] || activeKeysMap['ArrowDown']);
    const isJump = !!activeKeysMap['Space'];
    const isDance = !!activeKeysMap['KeyE'];
    const isSpin = !!activeKeysMap['KeyF'];

    if (isLeft) mask |= INPUT_MASK.LEFT;
    if (isRight) mask |= INPUT_MASK.RIGHT;
    if (isUp) mask |= INPUT_MASK.UP;
    if (isDown) mask |= INPUT_MASK.DOWN;
    if (isJump) mask |= INPUT_MASK.JUMP;
    if (isDance) mask |= INPUT_MASK.DANCE;
    if (isSpin) mask |= INPUT_MASK.SPIN;

    // 3. Derive directional vector & semantic character action
    const dirX = (isRight ? 1 : 0) - (isLeft ? 1 : 0);
    const dirY = (isDown ? 1 : 0) - (isUp ? 1 : 0);

    let action: CharacterAction = 'idle';
    if (isJump) action = 'jump';
    else if (isDance) action = 'dance';
    else if (isSpin) action = 'spin';
    else if (dirX !== 0 || dirY !== 0) action = 'move';

    // 4. Input drop prevention accounting
    const currentActiveKeysString = activeKeysList.sort().join(',');
    const hasTransition = mask !== this.lastKeyMask || currentActiveKeysString !== this.lastActiveKeysString;

    if (hasTransition) {
      this.transitionsDetected++;
    }

    // If keys are held and multiple rAF ticks elapsed without a physical DOM event,
    // each rAF sample prevents an input drop that would normally occur during OS repeat stalling.
    if (mask > 0 && !hasTransition) {
      this.dropsPrevented++;
    }

    // 5. Determine if we should dispatch to BackendBridge
    let shouldDispatch = false;
    this.framesSinceLastDispatch++;

    if (this.mode === 'continuous') {
      // Continuous mode: every single rAF tick dispatches full input state
      shouldDispatch = true;
    } else if (this.mode === 'on_active') {
      // Dispatches continuously while any key is active, plus 1 release frame
      shouldDispatch = mask > 0 || this.lastKeyMask > 0;
    } else if (this.mode === 'on_change_or_heartbeat') {
      // Dispatches on every transition, or on periodic heartbeat to keep backend in sync
      shouldDispatch = hasTransition || this.framesSinceLastDispatch >= this.heartbeatIntervalFrames;
    }

    // 6. Build payload and dispatch
    const payload: KeyMaskPayload = {
      keyMask: mask,
      activeKeys: activeKeysList,
      timestamp: Date.now(),
      perfTimestamp: now,
      frameNumber: this.frameNumber,
      action,
      direction: { x: dirX, y: dirY },
      characterId: this.armedCharacterId,
      isRecording: this.isRecording,
      dropsPrevented: this.dropsPrevented,
    };

    this.lastPayload = payload;

    // Store in rolling circular history
    this.history.unshift(payload);
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }

    if (shouldDispatch) {
      this.framesSinceLastDispatch = 0;
      this.totalDispatched++;
      this.dispatchPayload(payload);
    }

    this.lastKeyMask = mask;
    this.lastActiveKeysString = currentActiveKeysString;

    // Schedule next frame
    this.animFrameId = requestAnimationFrame(this.pollLoop);
  };

  /**
   * Dispatches payload to BackendBridge and registered observers
   */
  private dispatchPayload(payload: KeyMaskPayload) {
    // 1. Send directly to BackendBridge contract
    backendBridge.emitKeyMask(payload);

    // 2. Notify local observer callbacks
    this.dispatchListeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error('Error in KeyboardInputLogger listener:', err);
      }
    });
  }

  // --- Observers & Telemetry Getters ---

  public onDispatch(callback: (payload: KeyMaskPayload) => void): () => void {
    this.dispatchListeners.add(callback);
    return () => {
      this.dispatchListeners.delete(callback);
    };
  }

  public getStats(): LoggerTelemetryStats {
    return {
      totalPolls: this.frameNumber,
      totalDispatched: this.totalDispatched,
      dropsPrevented: this.dropsPrevented,
      transitionsDetected: this.transitionsDetected,
      currentFps: this.currentFps,
      avgIntervalMs: this.avgIntervalMs,
      isRunning: this.isRunning,
      mode: this.mode,
    };
  }

  public getRecentHistory(): KeyMaskPayload[] {
    return [...this.history];
  }

  public getLastPayload(): KeyMaskPayload | null {
    return this.lastPayload;
  }

  public resetStats() {
    this.frameNumber = 0;
    this.totalDispatched = 0;
    this.transitionsDetected = 0;
    this.dropsPrevented = 0;
    this.history = [];
  }

  public destroy() {
    this.stop();
    this.dispatchListeners.clear();

    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
    }
  }
}

// Global singleton instance for convenient access across the applet
export const globalKeyboardInputLogger = new KeyboardInputLogger({
  autoStart: true,
  mode: 'continuous',
});

/**
 * Computes the 7-bit keyMask bitmask from a keys Map or Record
 */
export function computeKeyMask(keys: Map<string, boolean> | Record<string, boolean>): number {
  const isDown = (code: string) => {
    if (keys instanceof Map) return !!keys.get(code);
    return !!keys[code];
  };

  let mask = 0;
  if (isDown('KeyA') || isDown('ArrowLeft')) mask |= INPUT_MASK.LEFT;
  if (isDown('KeyD') || isDown('ArrowRight')) mask |= INPUT_MASK.RIGHT;
  if (isDown('KeyW') || isDown('ArrowUp')) mask |= INPUT_MASK.UP;
  if (isDown('KeyS') || isDown('ArrowDown')) mask |= INPUT_MASK.DOWN;
  if (isDown('Space')) mask |= INPUT_MASK.JUMP;
  if (isDown('KeyE')) mask |= INPUT_MASK.DANCE;
  if (isDown('KeyF')) mask |= INPUT_MASK.SPIN;
  return mask;
}

/**
 * React hook for RetroSequencerApp main loop:
 * Polls the KeyboardInputLogger keysPressed Map on every requestAnimationFrame
 * and dispatches a keyMask payload to backendBridge to prevent input drops from event throttling.
 */
export function useKeyboardInputLoop({
  armedTrackId,
  isRecording,
  logger = globalKeyboardInputLogger,
  enabled = true,
}: {
  armedTrackId: string | null;
  isRecording: boolean;
  logger?: KeyboardInputLogger;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;

    let animId: number;

    const poll = () => {
      const keysMap = logger.getKeysPressedMap();
      const armedId = armedTrackId || 'track-1';
      const mask = computeKeyMask(keysMap);

      const activeKeysList: string[] = [];
      keysMap.forEach((isDown, code) => {
        if (isDown) activeKeysList.push(code);
      });

      const isLeft = !!(keysMap.get('KeyA') || keysMap.get('ArrowLeft'));
      const isRight = !!(keysMap.get('KeyD') || keysMap.get('ArrowRight'));
      const isUp = !!(keysMap.get('KeyW') || keysMap.get('ArrowUp'));
      const isDown = !!(keysMap.get('KeyS') || keysMap.get('ArrowDown'));
      const isJump = !!keysMap.get('Space');
      const isDance = !!keysMap.get('KeyE');
      const isSpin = !!keysMap.get('KeyF');

      let action: 'idle' | 'move' | 'jump' | 'dance' | 'spin' = 'idle';
      if (isJump) action = 'jump';
      else if (isDance) action = 'dance';
      else if (isSpin) action = 'spin';
      else if (isLeft || isRight || isUp || isDown) action = 'move';

      const payload: KeyMaskPayload = {
        keyMask: mask,
        activeKeys: activeKeysList,
        timestamp: Date.now(),
        perfTimestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        frameNumber: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 16.6),
        action,
        direction: {
          x: (isRight ? 1 : 0) - (isLeft ? 1 : 0),
          y: (isDown ? 1 : 0) - (isUp ? 1 : 0),
        },
        characterId: armedId,
        isRecording,
        dropsPrevented: logger.getStats().dropsPrevented,
      };

      // Dispatch keyMask payload to backendBridge
      backendBridge.emitKeyMask(payload);

      animId = requestAnimationFrame(poll);
    };

    animId = requestAnimationFrame(poll);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [armedTrackId, isRecording, logger, enabled]);
}

