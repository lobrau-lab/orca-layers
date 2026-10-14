/**
 * Pixel-Art Sprite Engine & Atlas Generator
 * Procedurally builds crisp 16x16 / 24x24 / 32x32 retro character atlases onto cached offscreen canvases,
 * and allows hot-swapping external sprite sheet URLs with frame-dimension schemas.
 */

import { CharacterAction, SpriteAtlasConfig } from './types';

// Pre-rendered offscreen canvas cache
const spriteCanvasCache = new Map<string, HTMLCanvasElement>();

/**
 * Creates a pixel-art canvas from a 2D color matrix (where each cell is a hex color or null)
 */
function createPixelCanvas(matrix: (string | null)[][], pixelScale = 2): HTMLCanvasElement {
  const height = matrix.length;
  const width = matrix[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = width * pixelScale;
  canvas.height = height * pixelScale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = matrix[y][x];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * pixelScale, y * pixelScale, pixelScale, pixelScale);
      }
    }
  }

  return canvas;
}

/**
 * Procedural Sprite Atlas Builders for 5 distinct retro characters
 */
export function getProceduralCharacterAtlas(
  type: 'bboy' | 'cyberpunk' | 'retro_bot' | 'chiptune_mage' | 'pixel_kitty'
): { config: SpriteAtlasConfig; canvas: HTMLCanvasElement } {
  const cacheKey = `atlas_${type}`;
  if (typeof document !== 'undefined' && spriteCanvasCache.has(cacheKey)) {
    const cachedCanvas = spriteCanvasCache.get(cacheKey)!;
    return { config: getAtlasConfig(type), canvas: cachedCanvas };
  }

  const frameW = 32;
  const frameH = 32;
  // Atlas layout:
  // Row 0: idle (4 frames)
  // Row 1: move (4 frames)
  // Row 2: jump (2 frames)
  // Row 3: dance (4 frames)
  // Row 4: spin (4 frames)

  const atlasCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : ({} as HTMLCanvasElement);
  if (typeof document === 'undefined') {
    return { config: getAtlasConfig(type), canvas: atlasCanvas };
  }

  atlasCanvas.width = frameW * 4;
  atlasCanvas.height = frameH * 5;
  const ctx = atlasCanvas.getContext('2d');
  if (!ctx) return { config: getAtlasConfig(type), canvas: atlasCanvas };

  ctx.imageSmoothingEnabled = false;

  // Render each frame procedurally
  renderCharacterFrames(ctx, type, frameW, frameH);

  spriteCanvasCache.set(cacheKey, atlasCanvas);
  return { config: getAtlasConfig(type), canvas: atlasCanvas };
}

export function getAtlasConfig(type: string): SpriteAtlasConfig {
  const frameW = 32;
  const frameH = 32;

  return {
    id: `atlas_${type}`,
    name: type.toUpperCase(),
    frameWidth: frameW,
    frameHeight: frameH,
    scale: 2.5,
    animations: {
      idle: [
        { x: 0 * frameW, y: 0 * frameH, w: frameW, h: frameH },
        { x: 1 * frameW, y: 0 * frameH, w: frameW, h: frameH },
        { x: 2 * frameW, y: 0 * frameH, w: frameW, h: frameH },
        { x: 3 * frameW, y: 0 * frameH, w: frameW, h: frameH },
      ],
      move: [
        { x: 0 * frameW, y: 1 * frameH, w: frameW, h: frameH },
        { x: 1 * frameW, y: 1 * frameH, w: frameW, h: frameH },
        { x: 2 * frameW, y: 1 * frameH, w: frameW, h: frameH },
        { x: 3 * frameW, y: 1 * frameH, w: frameW, h: frameH },
      ],
      jump: [
        { x: 0 * frameW, y: 2 * frameH, w: frameW, h: frameH },
        { x: 1 * frameW, y: 2 * frameH, w: frameW, h: frameH },
      ],
      dance: [
        { x: 0 * frameW, y: 3 * frameH, w: frameW, h: frameH },
        { x: 1 * frameW, y: 3 * frameH, w: frameW, h: frameH },
        { x: 2 * frameW, y: 3 * frameH, w: frameW, h: frameH },
        { x: 3 * frameW, y: 3 * frameH, w: frameW, h: frameH },
      ],
      spin: [
        { x: 0 * frameW, y: 4 * frameH, w: frameW, h: frameH },
        { x: 1 * frameW, y: 4 * frameH, w: frameW, h: frameH },
        { x: 2 * frameW, y: 4 * frameH, w: frameW, h: frameH },
        { x: 3 * frameW, y: 4 * frameH, w: frameW, h: frameH },
      ],
      fps: 8,
    },
  };
}

/**
 * Procedural Pixel-Art Frame Renderer
 */
function renderCharacterFrames(
  ctx: CanvasRenderingContext2D,
  type: string,
  fW: number,
  fH: number
) {
  // Palettes per character
  const palettes: Record<string, { main: string; alt: string; accent: string; skin: string; dark: string; eye: string }> = {
    bboy: { main: '#ef4444', alt: '#1e293b', accent: '#fbbf24', skin: '#fcd34d', dark: '#0f172a', eye: '#ffffff' },
    cyberpunk: { main: '#06b6d4', alt: '#3b82f6', accent: '#ec4899', skin: '#fed7aa', dark: '#020617', eye: '#a5f3fc' },
    retro_bot: { main: '#64748b', alt: '#475569', accent: '#22c55e', skin: '#94a3b8', dark: '#1e293b', eye: '#86efac' },
    chiptune_mage: { main: '#8b5cf6', alt: '#6d28d9', accent: '#f59e0b', skin: '#fde68a', dark: '#312e81', eye: '#fef08a' },
    pixel_kitty: { main: '#f43f5e', alt: '#fb7185', accent: '#38bdf8', skin: '#ffffff', dark: '#881337', eye: '#0284c7' },
  };

  const p = palettes[type] || palettes.bboy;

  // Draw 4 frames for Idle (Row 0)
  for (let f = 0; f < 4; f++) {
    const ox = f * fW;
    const oy = 0 * fH;
    const bob = f === 1 || f === 3 ? 1 : 0;
    drawCharacterBase(ctx, ox, oy + bob, p, type, 'idle', f);
  }

  // Draw 4 frames for Move (Row 1)
  for (let f = 0; f < 4; f++) {
    const ox = f * fW;
    const oy = 1 * fH;
    drawCharacterBase(ctx, ox, oy, p, type, 'move', f);
  }

  // Draw 2 frames for Jump (Row 2)
  for (let f = 0; f < 2; f++) {
    const ox = f * fW;
    const oy = 2 * fH;
    drawCharacterBase(ctx, ox, oy - 2, p, type, 'jump', f);
  }

  // Draw 4 frames for Dance (Row 3)
  for (let f = 0; f < 4; f++) {
    const ox = f * fW;
    const oy = 3 * fH;
    drawCharacterBase(ctx, ox, oy, p, type, 'dance', f);
  }

  // Draw 4 frames for Spin (Row 4)
  for (let f = 0; f < 4; f++) {
    const ox = f * fW;
    const oy = 4 * fH;
    drawCharacterBase(ctx, ox, oy, p, type, 'spin', f);
  }
}

/**
 * Draws an individual 32x32 character frame with pixel aesthetics
 */
function drawCharacterBase(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  p: { main: string; alt: string; accent: string; skin: string; dark: string; eye: string },
  type: string,
  action: CharacterAction,
  frame: number
) {
  // Clear region
  ctx.clearRect(ox, oy, 32, 32);

  // Pixel scale inside 32x32: 2x2 blocks for true retro chunkiness
  const s = 2;
  const drawRect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + x * s, oy + y * s, w * s, h * s);
  };

  const cx = 8; // Center x in 16x16 grid

  if (type === 'retro_bot') {
    // CRT Head Monitor Bot
    // Antenna
    drawRect(cx, 1, 1, 2, p.dark);
    drawRect(cx - 1, 0, 3, 1, p.accent);

    // CRT Screen
    drawRect(cx - 4, 3, 8, 6, p.dark);
    drawRect(cx - 3, 4, 6, 4, p.accent);
    // Face on screen
    if (action === 'dance') {
      // Equalizer smile
      drawRect(cx - 2, 6, 4, 1, '#ffffff');
      drawRect(cx - 2, 5, 1, 1, '#ffffff');
      drawRect(cx + 1, 5, 1, 1, '#ffffff');
    } else {
      // Glow eyes
      drawRect(cx - 2, 5, 1, 1, '#ffffff');
      drawRect(cx + 1, 5, 1, 1, '#ffffff');
    }

    // Metal Body
    drawRect(cx - 3, 9, 6, 4, p.main);
    drawRect(cx - 1, 10, 2, 2, p.alt);

    // Arms
    if (action === 'dance') {
      const armUp = frame % 2 === 0;
      drawRect(cx - 5, armUp ? 8 : 10, 2, 3, p.main);
      drawRect(cx + 3, armUp ? 10 : 8, 2, 3, p.main);
    } else if (action === 'spin') {
      drawRect(cx - 4, 10, 8, 2, p.main);
    } else {
      drawRect(cx - 5, 10, 2, 3, p.main);
      drawRect(cx + 3, 10, 2, 3, p.main);
    }

    // Legs / Wheels
    if (action === 'move') {
      const legOffset = frame % 2 === 0 ? 1 : -1;
      drawRect(cx - 3 + legOffset, 13, 2, 3, p.dark);
      drawRect(cx + 1 - legOffset, 13, 2, 3, p.dark);
    } else if (action === 'jump') {
      drawRect(cx - 3, 13, 6, 2, p.dark);
      // Jet flame!
      drawRect(cx - 2, 15, 4, 1, p.accent);
    } else {
      drawRect(cx - 3, 13, 2, 3, p.dark);
      drawRect(cx + 1, 13, 2, 3, p.dark);
    }
    return;
  }

  if (type === 'pixel_kitty') {
    // 8-Bit Dancing Cat with Headphones
    // Ears
    drawRect(cx - 4, 3, 2, 2, p.main);
    drawRect(cx + 2, 3, 2, 2, p.main);

    // Head
    drawRect(cx - 4, 5, 8, 5, p.skin);

    // Headphones
    drawRect(cx - 5, 5, 2, 4, p.accent);
    drawRect(cx + 3, 5, 2, 4, p.accent);
    drawRect(cx - 4, 4, 8, 1, p.dark);

    // Eyes / Shades
    drawRect(cx - 3, 6, 2, 2, p.dark);
    drawRect(cx + 1, 6, 2, 2, p.dark);
    drawRect(cx - 2, 6, 1, 1, p.eye);
    drawRect(cx + 2, 6, 1, 1, p.eye);

    // Pink Nose
    drawRect(cx - 1, 8, 2, 1, p.alt);

    // Hoodie
    drawRect(cx - 3, 10, 6, 4, p.main);

    // Paws & Tail
    const tailWiggle = frame % 2 === 0 ? 1 : 0;
    drawRect(cx + 3 + tailWiggle, 11, 2, 2, p.skin);

    // Feet
    if (action === 'move') {
      drawRect(cx - 3 + (frame % 2), 14, 2, 2, p.skin);
      drawRect(cx + 1 - (frame % 2), 14, 2, 2, p.skin);
    } else {
      drawRect(cx - 3, 14, 2, 2, p.skin);
      drawRect(cx + 1, 14, 2, 2, p.skin);
    }
    return;
  }

  // Humanoid base (bboy, cyberpunk, chiptune_mage)
  // Head / Cap / Visor / Hat
  if (type === 'chiptune_mage') {
    // Wizard Hat
    drawRect(cx, 1, 1, 1, p.accent);
    drawRect(cx - 1, 2, 3, 2, p.dark);
    drawRect(cx - 2, 4, 5, 2, p.dark);
    drawRect(cx - 5, 6, 10, 1, p.alt);
  } else if (type === 'bboy') {
    // Snapback Cap backwards
    drawRect(cx - 3, 3, 7, 2, p.main);
    drawRect(cx - 4, 4, 2, 1, p.accent); // Visor brim
  } else {
    // Cyberpunk hair / cyber visor
    drawRect(cx - 3, 3, 6, 2, p.dark);
    drawRect(cx - 4, 5, 8, 2, p.accent); // Glowing visor
  }

  // Face / Skin
  drawRect(cx - 3, 5, 6, 3, p.skin);
  if (type !== 'cyberpunk') {
    drawRect(cx - 2, 6, 1, 1, p.dark);
    drawRect(cx + 1, 6, 1, 1, p.dark);
  }

  // Torso / Jacket / Robe
  drawRect(cx - 3, 8, 6, 5, p.main);
  drawRect(cx - 1, 8, 2, 5, p.alt);

  // Arms according to action
  if (action === 'dance') {
    if (frame === 0) {
      drawRect(cx - 5, 7, 2, 3, p.main);
      drawRect(cx + 3, 9, 2, 3, p.main);
    } else if (frame === 1) {
      drawRect(cx - 5, 9, 2, 3, p.main);
      drawRect(cx + 3, 7, 2, 3, p.main);
    } else if (frame === 2) {
      drawRect(cx - 5, 6, 2, 2, p.accent);
      drawRect(cx + 3, 6, 2, 2, p.accent);
    } else {
      drawRect(cx - 4, 10, 8, 2, p.main);
    }
  } else if (action === 'spin') {
    // T-Pose spin
    drawRect(cx - 6, 9, 12, 2, p.main);
  } else if (action === 'jump') {
    // Arms up
    drawRect(cx - 5, 7, 2, 4, p.main);
    drawRect(cx + 3, 7, 2, 4, p.main);
  } else if (action === 'move') {
    // Swinging arms
    const swing = frame % 2 === 0 ? 1 : -1;
    drawRect(cx - 5, 8 + swing, 2, 4, p.main);
    drawRect(cx + 3, 8 - swing, 2, 4, p.main);
  } else {
    // Idle
    drawRect(cx - 4, 9, 1, 4, p.main);
    drawRect(cx + 3, 9, 1, 4, p.main);
  }

  // Legs / Sneakers
  if (type === 'chiptune_mage') {
    // Flowing Robe bottom
    drawRect(cx - 4, 13, 8, 3, p.dark);
  } else {
    // Pants
    drawRect(cx - 3, 13, 2, 2, p.dark);
    drawRect(cx + 1, 13, 2, 2, p.dark);

    // Kicks
    if (action === 'move') {
      const stride = frame % 2 === 0 ? 1 : -1;
      drawRect(cx - 3 - stride, 15, 3, 1, p.accent);
      drawRect(cx + 1 + stride, 15, 3, 1, p.accent);
    } else if (action === 'jump') {
      drawRect(cx - 2, 14, 2, 2, p.accent);
      drawRect(cx, 14, 2, 2, p.accent);
    } else {
      drawRect(cx - 4, 15, 3, 1, p.accent);
      drawRect(cx + 1, 15, 3, 1, p.accent);
    }
  }
}

/**
 * Loads an external sprite sheet image and validates dimensions
 */
export async function loadExternalSpriteSheet(
  imageUrl: string,
  frameWidth = 32,
  frameHeight = 32
): Promise<{ image: HTMLImageElement; valid: boolean; frameCount: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const cols = Math.floor(img.width / frameWidth);
      const rows = Math.floor(img.height / frameHeight);
      resolve({
        image: img,
        valid: cols > 0 && rows > 0,
        frameCount: cols * rows,
      });
    };
    img.onerror = () => {
      reject(new Error(`Failed to load sprite sheet from ${imageUrl}`));
    };
    img.src = imageUrl;
  });
}
