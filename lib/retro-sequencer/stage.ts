/**
 * 2D Retro Stage Renderer & Beat-Reactive Props
 * Features layered parallax backgrounds, pixel-art stage props, neon lighting,
 * and subwoofer speakers that pulse with incoming backend pad triggers.
 */

import { StageTheme } from './types';

export const STAGE_THEMES: Record<string, StageTheme> = {
  cyber_alley: {
    id: 'cyber_alley',
    name: 'Cyber Alley 1986',
    category: 'cyber_alley',
    groundY: 340,
    skyGradient: ['#090915', '#1a103c'],
    gridColor: '#00f0ff',
    neonColors: ['#ff0055', '#00f0ff', '#ffe600', '#00ff66'],
  },
  chiptune_rooftop: {
    id: 'chiptune_rooftop',
    name: 'Chiptune Rooftop',
    category: 'chiptune_rooftop',
    groundY: 350,
    skyGradient: ['#04061a', '#0d1b3e'],
    neonColors: ['#fbbf24', '#f43f5e', '#a855f7', '#38bdf8'],
  },
  synthwave_grid: {
    id: 'synthwave_grid',
    name: 'Synthwave Vector Grid',
    category: 'synthwave_grid',
    groundY: 330,
    skyGradient: ['#18052e', '#3c094d'],
    gridColor: '#ec4899',
    neonColors: ['#f43f5e', '#ec4899', '#8b5cf6', '#06b6d4'],
  },
};

export class StageRenderer {
  private theme: StageTheme;
  private speakerPulseLeft = 0;
  private speakerPulseRight = 0;
  private neonFlashIntensity = 0;
  private activeNeonIndex = 0;
  private floorRumbleOffset = 0;

  constructor(theme: StageTheme = STAGE_THEMES.cyber_alley) {
    this.theme = theme;
  }

  public setTheme(theme: StageTheme) {
    this.theme = theme;
  }

  public getTheme() {
    return this.theme;
  }

  /**
   * Called on incoming onBeatTrigger event to animate stage props
   */
  public triggerPadReaction(padIndex: number, velocity: number) {
    if (padIndex === 0) {
      // Kick: Heavy speaker pulse and floor shake
      this.speakerPulseLeft = Math.max(this.speakerPulseLeft, 1.35 * velocity);
      this.speakerPulseRight = Math.max(this.speakerPulseRight, 1.35 * velocity);
      this.floorRumbleOffset = 4 * velocity;
    } else if (padIndex === 1) {
      // Snare: Flash active neon sign
      this.neonFlashIntensity = 1.0 * velocity;
      this.activeNeonIndex = (this.activeNeonIndex + 1) % this.theme.neonColors.length;
    } else if (padIndex === 2 || padIndex === 3) {
      // Hi-Hats: Subtle speaker flutter
      this.speakerPulseRight = Math.max(this.speakerPulseRight, 0.4 * velocity);
      this.neonFlashIntensity = Math.max(this.neonFlashIntensity, 0.5 * velocity);
    } else {
      // Synths / Toms / FX: Rotate neon lights
      this.neonFlashIntensity = Math.max(this.neonFlashIntensity, 0.8 * velocity);
      this.activeNeonIndex = padIndex % this.theme.neonColors.length;
    }
  }

  public update(dt: number) {
    // Decay spring physics for speaker cones & neon glows
    this.speakerPulseLeft = Math.max(0, this.speakerPulseLeft - dt * 5.0);
    this.speakerPulseRight = Math.max(0, this.speakerPulseRight - dt * 5.0);
    this.neonFlashIntensity = Math.max(0, this.neonFlashIntensity - dt * 4.0);
    this.floorRumbleOffset = Math.max(0, this.floorRumbleOffset - dt * 10.0);
  }

  /**
   * Render Background Layer (Sky, Skyline, Distant Neon Signs, Stars)
   */
  public renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number, cameraX = 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.theme.groundY);
    skyGrad.addColorStop(0, this.theme.skyGradient[0]);
    skyGrad.addColorStop(1, this.theme.skyGradient[1]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    if (this.theme.category === 'synthwave_grid') {
      this.renderSynthwaveSky(ctx, width, height);
    } else if (this.theme.category === 'chiptune_rooftop') {
      this.renderRooftopSky(ctx, width, height, cameraX);
    } else {
      this.renderCyberAlleySky(ctx, width, height, cameraX);
    }

    ctx.restore();
  }

  /**
   * Render Midground / Stage Floor Layer
   */
  public renderFloor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const groundY = Math.round(this.theme.groundY + (Math.random() - 0.5) * this.floorRumbleOffset);

    if (this.theme.category === 'synthwave_grid') {
      // Perspective Retro Grid
      ctx.fillStyle = '#080114';
      ctx.fillRect(0, groundY, width, height - groundY);

      // Horizontal grid lines getting closer towards horizon
      const baseColor = this.theme.gridColor || '#ec4899';
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1;

      for (let y = groundY; y < height; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical converging lines
      const cx = width / 2;
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 25, groundY);
        ctx.lineTo(cx + i * 80, height);
        ctx.stroke();
      }
    } else {
      // 8-bit Pixelated Street / Rooftop Tiles
      const floorH = height - groundY;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, groundY, width, floorH);

      // Stage curb / neon line
      ctx.fillStyle = this.neonFlashIntensity > 0.1
        ? this.theme.neonColors[this.activeNeonIndex]
        : '#334155';
      ctx.fillRect(0, groundY, width, 4);

      // Brick / tile pattern
      const tileSize = 24;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += tileSize) {
        for (let y = groundY + 4; y < height; y += tileSize / 2) {
          ctx.strokeRect(Math.round(x), Math.round(y), tileSize, tileSize / 2);
        }
      }

      // Wet pavement neon reflection
      if (this.theme.category === 'cyber_alley' && this.neonFlashIntensity > 0.05) {
        ctx.fillStyle = this.theme.neonColors[this.activeNeonIndex];
        ctx.globalAlpha = this.neonFlashIntensity * 0.15;
        ctx.fillRect(width * 0.2, groundY + 8, width * 0.6, 20);
        ctx.globalAlpha = 1.0;
      }
    }

    ctx.restore();
  }

  /**
   * Render Stage Props: Giant Boombox Subwoofers on stage flanks
   */
  public renderProps(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const groundY = this.theme.groundY;

    // Left Speaker Stack
    this.drawSubwoofer(ctx, 30, groundY - 100, 50, 100, this.speakerPulseLeft);

    // Right Speaker Stack
    this.drawSubwoofer(ctx, width - 80, groundY - 100, 50, 100, this.speakerPulseRight);

    // Stage Overhead Neon Sign
    this.drawOverheadSign(ctx, width / 2 - 90, 20, 180, 42);

    ctx.restore();
  }

  private drawSubwoofer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    pulse: number
  ) {
    // Cabinet
    ctx.fillStyle = '#111827';
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x), Math.round(y), w, h);

    // Tweeter (Top)
    const twRadius = 8 + pulse * 2;
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(Math.round(x + w / 2), Math.round(y + 25), twRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4b5563';
    ctx.stroke();

    // Bass Woofer Cone (Bottom)
    const wooferRadius = 16 + pulse * 6;
    ctx.fillStyle = pulse > 0.2 ? '#0284c7' : '#1e293b';
    ctx.beginPath();
    ctx.arc(Math.round(x + w / 2), Math.round(y + 70), wooferRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pulse > 0.3 ? '#38bdf8' : '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center dust cap
    ctx.fillStyle = pulse > 0.4 ? '#ffffff' : '#0f172a';
    ctx.beginPath();
    ctx.arc(Math.round(x + w / 2), Math.round(y + 70), 5 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawOverheadSign(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    // Truss support cables
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 20, 0);
    ctx.lineTo(x + 20, y);
    ctx.moveTo(x + w - 20, 0);
    ctx.lineTo(x + w - 20, y);
    ctx.stroke();

    // Sign Box
    ctx.fillStyle = '#090d16';
    ctx.fillRect(Math.round(x), Math.round(y), w, h);

    const neonColor = this.theme.neonColors[this.activeNeonIndex];
    ctx.strokeStyle = this.neonFlashIntensity > 0.2 ? neonColor : '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x), Math.round(y), w, h);

    // Text: 8-BIT SEQUENCER or BEAT BOX
    ctx.fillStyle = this.neonFlashIntensity > 0.2 ? '#ffffff' : neonColor;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ 8-BIT OVERDUB ⚡', Math.round(x + w / 2), Math.round(y + h / 2));
  }

  private renderCyberAlleySky(ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number) {
    // Pixel City Skyline Silhouettes
    const groundY = this.theme.groundY;

    // Distant buildings
    ctx.fillStyle = '#0a0d24';
    const buildingWidths = [45, 60, 35, 70, 50, 65, 40, 80, 55, 90, 45, 60];
    let curX = -20 - (cameraX * 0.2) % 40;
    for (let i = 0; i < buildingWidths.length; i++) {
      const bw = buildingWidths[i];
      const bh = 140 + (i % 5) * 30;
      ctx.fillRect(Math.round(curX), groundY - bh, bw, bh);

      // Building windows
      ctx.fillStyle = (i % 2 === 0) ? '#ff005522' : '#00f0ff22';
      for (let wy = groundY - bh + 10; wy < groundY - 20; wy += 15) {
        for (let wx = curX + 6; wx < curX + bw - 6; wx += 10) {
          if ((wx + wy) % 7 !== 0) {
            ctx.fillRect(Math.round(wx), Math.round(wy), 4, 6);
          }
        }
      }
      ctx.fillStyle = '#0a0d24';
      curX += bw + 8;
    }
  }

  private renderRooftopSky(ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number) {
    // Twinkling stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 37 + (cameraX * 0.05)) % width;
      const sy = (i * 19) % (this.theme.groundY - 80);
      const size = (i % 3 === 0) ? 2 : 1;
      ctx.fillRect(Math.round(sx), Math.round(sy), size, size);
    }

    // Moon / Giant Orb
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(width - 90, 70, 30, 0, Math.PI * 2);
    ctx.fill();

    // Water tower on roof
    const groundY = this.theme.groundY;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(width - 160, groundY - 110, 44, 40);
    // Legs
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width - 155, groundY);
    ctx.lineTo(width - 150, groundY - 70);
    ctx.moveTo(width - 125, groundY);
    ctx.lineTo(width - 130, groundY - 70);
    ctx.stroke();
  }

  private renderSynthwaveSky(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const cx = width / 2;
    const cy = this.theme.groundY - 60;

    // Glowing Retro Sun
    const sunGrad = ctx.createLinearGradient(0, cy - 70, 0, cy + 50);
    sunGrad.addColorStop(0, '#fef08a');
    sunGrad.addColorStop(0.5, '#f43f5e');
    sunGrad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.fill();

    // Horizontal Sun Venetian Blinds lines
    ctx.fillStyle = '#18052e';
    for (let y = cy - 20; y < cy + 60; y += 8) {
      const thickness = (y - (cy - 20)) / 10 + 1;
      ctx.fillRect(cx - 65, Math.round(y), 130, thickness);
    }

    // Distant Neon Wireframe Mountains
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.theme.groundY);
    ctx.lineTo(cx - 140, this.theme.groundY - 80);
    ctx.lineTo(cx - 50, this.theme.groundY);
    ctx.lineTo(cx + 60, this.theme.groundY - 100);
    ctx.lineTo(cx + 170, this.theme.groundY);
    ctx.lineTo(width, this.theme.groundY - 60);
    ctx.stroke();
  }
}
