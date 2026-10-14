/**
 * BackendBridge Implementation
 * Strictly decoupled communication layer between the audio engine / orchestrator
 * and the 2D visual viewport.
 */

import {
  BackendBridge,
  BeatTriggerPayload,
  ClockTickPayload,
  KeyMaskPayload,
  RecordedFrame,
  TickInputEvent,
  TransportPayload,
} from './types';

type BeatTriggerCallback = (padIndex: number, velocity: number, note?: string) => void;
type ClockTickCallback = (payload: ClockTickPayload) => void;
type TransportCallback = (payload: TransportPayload) => void;
type KeyMaskCallback = (payload: KeyMaskPayload) => void;

class BackendBridgeService implements BackendBridge {
  private beatListeners = new Set<BeatTriggerCallback>();
  private clockListeners = new Set<ClockTickCallback>();
  private transportListeners = new Set<TransportCallback>();
  private keyMaskListeners = new Set<KeyMaskCallback>();

  // Real-time keyMask stream buffer from KeyboardInputLogger
  private keyMaskTelemetry: KeyMaskPayload[] = [];
  private totalKeyMaskDispatched = 0;

  // Telemetry buffer for verification and inspection
  private emittedTrackPayloads: Array<{
    timestamp: number;
    characterId: string;
    frameCount: number;
    rawJsonSizeKB: number;
    planBJsonSizeKB: number;
    frames: RecordedFrame[];
    events: TickInputEvent[];
  }> = [];

  // Standalone Debug Simulator state
  private simulatorRunning = false;
  private simTimer: any = null;
  private simBpm = 120;
  private simCurrentStep = 0;
  private simTotalSteps = 64;
  private simIsPlaying = false;
  private simIsRecording = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Expose bridge globally for IPC/Host/Iframe integration
      (window as any).BackendBridge = this;

      // Ingest events from window messages or custom events
      window.addEventListener('message', this.handleWindowMessage);
      window.addEventListener('sequencer:external_tick', this.handleCustomTick as EventListener);
      window.addEventListener('sequencer:external_beat', this.handleCustomBeat as EventListener);
      window.addEventListener('sequencer:external_transport', this.handleCustomTransport as EventListener);
    }
  }

  // --- Subscriptions ---

  public onBeatTrigger(callback: BeatTriggerCallback): () => void {
    this.beatListeners.add(callback);
    return () => {
      this.beatListeners.delete(callback);
    };
  }

  public onClockTick(callback: ClockTickCallback): () => void {
    this.clockListeners.add(callback);
    return () => {
      this.clockListeners.delete(callback);
    };
  }

  public onTransportChange(callback: TransportCallback): () => void {
    this.transportListeners.add(callback);
    return () => {
      this.transportListeners.delete(callback);
    };
  }

  public onKeyMask(callback: KeyMaskCallback): () => void {
    this.keyMaskListeners.add(callback);
    return () => {
      this.keyMaskListeners.delete(callback);
    };
  }

  // --- Ingestion from Backend ---

  public triggerBeat(padIndex: number, velocity: number = 0.9, note?: string) {
    const clampedVelocity = Math.max(0, Math.min(1, velocity));
    this.beatListeners.forEach((fn) => {
      try {
        fn(padIndex, clampedVelocity, note);
      } catch (err) {
        console.error('Error in onBeatTrigger callback:', err);
      }
    });
  }

  public tickClock(payload: ClockTickPayload) {
    this.simCurrentStep = payload.step;
    this.clockListeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error('Error in onClockTick callback:', err);
      }
    });
  }

  public setTransport(payload: TransportPayload) {
    this.simIsPlaying = payload.isPlaying;
    this.simIsRecording = payload.isRecording;
    this.simCurrentStep = payload.currentStep;
    this.transportListeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error('Error in onTransportChange callback:', err);
      }
    });
  }

  // --- Emitters to Backend ---

  public emitTrackData(characterId: string, recordedFramesArray: RecordedFrame[]) {
    const rawJson = JSON.stringify({ characterId, frames: recordedFramesArray });
    const rawSize = Math.round((new Blob([rawJson]).size / 1024) * 100) / 100;

    // Log telemetry emission
    this.emittedTrackPayloads.unshift({
      timestamp: Date.now(),
      characterId,
      frameCount: recordedFramesArray.length,
      rawJsonSizeKB: rawSize,
      planBJsonSizeKB: 0,
      frames: recordedFramesArray,
      events: [],
    });

    // Notify backend via Window event or postMessage
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('sequencer:track_data_emitted', {
        detail: { characterId, frames: recordedFramesArray, jsonSizeKB: rawSize },
      });
      window.dispatchEvent(event);

      // If embedded in an iframe or parent window
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'SEQUENCER_TRACK_DATA',
          payload: { characterId, frames: recordedFramesArray },
        }, '*');
      }
    }
  }

  public emitTrackInputEvents(characterId: string, recordedEvents: TickInputEvent[]) {
    const planBJson = JSON.stringify({ characterId, events: recordedEvents });
    const planBSize = Math.round((new Blob([planBJson]).size / 1024) * 100) / 100;

    if (this.emittedTrackPayloads.length > 0 && this.emittedTrackPayloads[0].characterId === characterId) {
      this.emittedTrackPayloads[0].planBJsonSizeKB = planBSize;
      this.emittedTrackPayloads[0].events = recordedEvents;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sequencer:track_inputs_emitted', {
        detail: { characterId, events: recordedEvents, jsonSizeKB: planBSize },
      }));

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'SEQUENCER_INPUT_EVENTS',
          payload: { characterId, events: recordedEvents },
        }, '*');
      }
    }
  }

  public emitKeyMask(payload: KeyMaskPayload) {
    this.totalKeyMaskDispatched++;

    // Maintain recent keyMask telemetry history (capped at 120 items)
    this.keyMaskTelemetry.unshift(payload);
    if (this.keyMaskTelemetry.length > 120) {
      this.keyMaskTelemetry.pop();
    }

    // Notify registered frontend listeners
    this.keyMaskListeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error('Error in onKeyMask callback:', err);
      }
    });

    // Notify backend/host via Window CustomEvent and postMessage
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sequencer:key_mask_dispatched', {
          detail: payload,
        })
      );

      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'SEQUENCER_KEY_MASK',
            payload,
          },
          '*'
        );
      }
    }
  }

  public emitTransportCommand(action: 'PLAY' | 'STOP' | 'RECORD' | 'REWIND' | 'SEEK', step?: number) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sequencer:transport_command', {
        detail: { action, step },
      }));

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'SEQUENCER_TRANSPORT_COMMAND',
          action,
          step,
        }, '*');
      }
    }

    // Also update local simulator if simulator mode is active
    if (this.simulatorRunning) {
      if (action === 'PLAY') {
        this.simIsPlaying = true;
        this.setTransport({ isPlaying: true, isRecording: this.simIsRecording, currentStep: this.simCurrentStep });
      } else if (action === 'STOP') {
        this.simIsPlaying = false;
        this.simIsRecording = false;
        this.setTransport({ isPlaying: false, isRecording: false, currentStep: this.simCurrentStep });
      } else if (action === 'RECORD') {
        this.simIsRecording = !this.simIsRecording;
        this.simIsPlaying = true;
        this.setTransport({ isPlaying: true, isRecording: this.simIsRecording, currentStep: this.simCurrentStep });
      } else if (action === 'REWIND') {
        this.simCurrentStep = 0;
        this.setTransport({ isPlaying: this.simIsPlaying, isRecording: this.simIsRecording, currentStep: 0 });
        this.simulateClockTick(0, this.simBpm);
      } else if (action === 'SEEK' && typeof step === 'number') {
        this.simCurrentStep = step;
        this.setTransport({ isPlaying: this.simIsPlaying, isRecording: this.simIsRecording, currentStep: step });
        this.simulateClockTick(step, this.simBpm);
      }
    }
  }

  // --- External Window Event Handlers ---

  private handleWindowMessage = (event: MessageEvent) => {
    if (!event.data || typeof event.data !== 'object') return;
    const { type, payload } = event.data;

    switch (type) {
      case 'CLOCK_TICK':
        if (payload) this.tickClock(payload);
        break;
      case 'BEAT_TRIGGER':
        if (payload) this.triggerBeat(payload.padIndex, payload.velocity, payload.note);
        break;
      case 'TRANSPORT_CHANGE':
        if (payload) this.setTransport(payload);
        break;
      default:
        break;
    }
  };

  private handleCustomTick = (e: CustomEvent<ClockTickPayload>) => {
    if (e.detail) this.tickClock(e.detail);
  };

  private handleCustomBeat = (e: CustomEvent<BeatTriggerPayload>) => {
    if (e.detail) this.triggerBeat(e.detail.padIndex, e.detail.velocity, e.detail.note);
  };

  private handleCustomTransport = (e: CustomEvent<TransportPayload>) => {
    if (e.detail) this.setTransport(e.detail);
  };

  // --- Standalone Simulator (Debug Control Surface) ---

  public startSimulator(bpm = 124, loopSteps = 64) {
    this.stopSimulator();
    this.simulatorRunning = true;
    this.simBpm = bpm;
    this.simTotalSteps = loopSteps;
    this.simIsPlaying = true;

    // 16th note interval = (60,000 / BPM) / 4
    const intervalMs = (60000 / this.simBpm) / 4;

    this.simTimer = setInterval(() => {
      if (!this.simIsPlaying) return;

      const step = this.simCurrentStep;
      const bar = Math.floor(step / 16) + 1;
      const beat = (Math.floor(step / 4) % 4) + 1;

      this.tickClock({
        step,
        timestamp: performance.now(),
        bpm: this.simBpm,
        bar,
        beat,
        totalSteps: this.simTotalSteps,
      });

      // Auto-trigger rhythmic pads for live visual test feel if simulator is running
      // Pad 0 (Kick) on every beat (steps 0, 4, 8, 12, etc.)
      if (step % 4 === 0) {
        this.triggerBeat(0, 0.95, 'Kick');
      }
      // Pad 1 (Snare/Clap) on beats 2 and 4 (steps 4, 12, 20, 28)
      if (step % 8 === 4) {
        this.triggerBeat(1, 0.85, 'Snare');
      }
      // Pad 2 (Hi-Hat) on 8th notes
      if (step % 2 === 0) {
        this.triggerBeat(2, 0.55, 'Hi-Hat');
      }
      // Pad 6 (Synth Bass) on syncope
      if (step % 16 === 10 || step % 16 === 14) {
        this.triggerBeat(6, 0.7, 'Bass');
      }

      this.simCurrentStep = (this.simCurrentStep + 1) % this.simTotalSteps;
    }, intervalMs);

    this.setTransport({
      isPlaying: true,
      isRecording: this.simIsRecording,
      currentStep: this.simCurrentStep,
      loopLengthSteps: this.simTotalSteps,
    });
  }

  public stopSimulator() {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    this.simulatorRunning = false;
    this.simIsPlaying = false;
    this.setTransport({
      isPlaying: false,
      isRecording: false,
      currentStep: this.simCurrentStep,
      loopLengthSteps: this.simTotalSteps,
    });
  }

  public setSimulatorBpm(newBpm: number) {
    this.simBpm = Math.max(40, Math.min(240, newBpm));
    if (this.simulatorRunning && this.simIsPlaying) {
      this.startSimulator(this.simBpm, this.simTotalSteps);
    }
  }

  public simulateClockTick(step: number, bpm: number = 120) {
    this.simCurrentStep = step;
    const bar = Math.floor(step / 16) + 1;
    const beat = (Math.floor(step / 4) % 4) + 1;
    this.tickClock({
      step,
      timestamp: performance.now(),
      bpm,
      bar,
      beat,
      totalSteps: this.simTotalSteps,
    });
  }

  public simulateBeatTrigger(padIndex: number, velocity: number = 0.9, note?: string) {
    this.triggerBeat(padIndex, velocity, note);
  }

  public simulateTransportChange(isPlaying: boolean, isRecording: boolean, currentStep?: number) {
    if (typeof currentStep === 'number') {
      this.simCurrentStep = currentStep;
    }
    this.setTransport({
      isPlaying,
      isRecording,
      currentStep: this.simCurrentStep,
      loopLengthSteps: this.simTotalSteps,
    });
  }

  public getEmittedTelemetry() {
    return this.emittedTrackPayloads;
  }

  public clearTelemetry() {
    this.emittedTrackPayloads = [];
  }

  public getKeyMaskTelemetry(): KeyMaskPayload[] {
    return this.keyMaskTelemetry;
  }

  public getTotalKeyMaskDispatched(): number {
    return this.totalKeyMaskDispatched;
  }

  public clearKeyMaskTelemetry() {
    this.keyMaskTelemetry = [];
    this.totalKeyMaskDispatched = 0;
  }

  public isSimActive() {
    return this.simulatorRunning;
  }

  public getSimBpm() {
    return this.simBpm;
  }
}

// Export singleton bridge instance
export const backendBridge = new BackendBridgeService();
