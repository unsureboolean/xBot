import { useEffect, useRef, useCallback } from 'react';
import type { GameState, Direction } from './types';
import { MAPS, NPCS, TILE_COLORS } from './gameData';
import { CANVAS_W, CANVAS_H } from './useGameState';

interface Props {
  state: GameState;
  onMove: (dir: Direction) => void;
  onInteract: () => void;
}

// Building label mapping
const BUILDING_LABELS: Record<string, string> = {
  house: 'YOUR PLACE',
  record_store: 'VINYL VAULT',
  cafe: "CASS'S CAFE",
  dj_club: 'THE FREQUENCY',
  bar: 'BASSLINE BAR',
};

// ── Building color palettes ────────────────────────────────────────────────────
const BUILDING_PALETTES: Record<string, {
  roof: [string, string, string, string];
  wall: [string, string, string, string];
  win: string;
  trim: string;
}> = {
  house: {
    roof: ['#f07878', '#c83838', '#901818', '#500808'],
    wall: ['#e0cca8', '#c4a070', '#9a7048', '#6a4020'],
    win: '#a0d8f0', trim: '#804020',
  },
  record_store: {
    roof: ['#e090f8', '#9030c8', '#5818a0', '#300070'],
    wall: ['#9080c0', '#604888', '#3c2860', '#1c1038'],
    win: '#ff90e8', trim: '#200058',
  },
  cafe: {
    roof: ['#f8c060', '#d08028', '#9a5810', '#623810'],
    wall: ['#d4a878', '#a87848', '#7a5028', '#4a2810'],
    win: '#fff090', trim: '#603818',
  },
  dj_club: {
    roof: ['#5090f0', '#2050c0', '#0c2870', '#060c30'],
    wall: ['#2828a8', '#181858', '#0c0c38', '#060618'],
    win: '#00ffff', trim: '#0030c0',
  },
  bar: {
    roof: ['#78c050', '#407828', '#204810', '#0c2808'],
    wall: ['#987050', '#6a4828', '#402810', '#201408'],
    win: '#ffb040', trim: '#3a1808',
  },
};

// Building zone definition: tile coords (inclusive)
interface BuildingZone {
  building: string;
  rowMin: number; rowMax: number;
  colMin: number; colMax: number;
}
const BUILDING_ZONES: BuildingZone[] = [
  { building: 'house',        rowMin: 1, rowMax: 4,  colMin: 2,  colMax: 4  },
  { building: 'record_store', rowMin: 1, rowMax: 4,  colMin: 13, colMax: 15 },
  { building: 'cafe',         rowMin: 8, rowMax: 10, colMin: 9,  colMax: 11 },
  { building: 'dj_club',      rowMin: 14, rowMax: 17, colMin: 2, colMax: 4  },
  { building: 'bar',          rowMin: 14, rowMax: 17, colMin: 13, colMax: 15 },
];

interface BuildingContext {
  building: string;
  isTopRow: boolean;
  isBottomRow: boolean;
  isLeftCol: boolean;
  isRightCol: boolean;
  isCenterCol: boolean;
  isCenterRow: boolean;
}

function getBuildingZone(row: number, col: number): BuildingContext | null {
  for (const z of BUILDING_ZONES) {
    if (row >= z.rowMin && row <= z.rowMax && col >= z.colMin && col <= z.colMax) {
      const midCol = Math.floor((z.colMin + z.colMax) / 2);
      const midRow = Math.floor((z.rowMin + z.rowMax) / 2);
      return {
        building: z.building,
        isTopRow: row === z.rowMin,
        isBottomRow: row === z.rowMax,
        isLeftCol: col === z.colMin,
        isRightCol: col === z.colMax,
        isCenterCol: col === midCol,
        isCenterRow: row === midRow,
      };
    }
  }
  return null;
}

// ── GBA-quality tile renderers ─────────────────────────────────────────────────

function drawGrass(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, row: number, col: number) {
  // Base
  ctx.fillStyle = '#5a9a3c';
  ctx.fillRect(px, py, ts, ts);

  // Subtle variation using deterministic pattern
  const h1 = (row * 7 + col * 13) % ts;
  const h2 = (row * 11 + col * 5) % ts;
  const h3 = (row * 3 + col * 17) % ts;

  // Dark specks for texture
  ctx.fillStyle = '#426e2a';
  if ((row * 7 + col * 13) % 5 === 0) ctx.fillRect(px + h1 % (ts - 4), py + h2 % (ts - 4), 2, 2);
  if ((row * 11 + col * 7) % 7 === 0) ctx.fillRect(px + h2 % (ts - 4), py + h3 % (ts - 4), 1, 1);

  // 2px tufts
  ctx.fillStyle = '#3a6a1a';
  const tuftX = (row * 7 + col * 13) % (ts - 4);
  const tuftX2 = (row * 13 + col * 7) % (ts - 4);
  if ((row + col) % 3 !== 0) {
    ctx.fillRect(px + tuftX, py + ts - 8, 2, 4);
  }
  if ((row * 5 + col * 9) % 4 === 0) {
    ctx.fillRect(px + tuftX2, py + ts / 2, 1, 3);
  }

  // Top-left subtle highlight
  ctx.fillStyle = '#6ab040';
  if ((row + col) % 4 === 1) {
    ctx.fillRect(px + 2, py + 2, 3, 1);
    ctx.fillRect(px + 2, py + 2, 1, 3);
  }
}

function drawPath(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, row: number, col: number) {
  // Base stone color
  ctx.fillStyle = '#c8a87c';
  ctx.fillRect(px, py, ts, ts);

  // Draw 2-3 stone blocks per tile
  const stoneLayout = (col % 2 === 0)
    ? [{ x: 1, y: 1, w: ts / 2 - 2, h: ts - 2 }, { x: ts / 2 + 1, y: 1, w: ts / 2 - 2, h: ts - 2 }]
    : [{ x: 1, y: 1, w: ts - 2, h: ts / 2 - 2 }, { x: 1, y: ts / 2 + 1, w: ts - 2, h: ts / 2 - 2 }];

  for (const s of stoneLayout) {
    // Stone body highlight
    ctx.fillStyle = '#e0c89a';
    ctx.fillRect(px + s.x, py + s.y, s.w, s.h);
    // Top-left highlight
    ctx.fillStyle = '#ead4aa';
    ctx.fillRect(px + s.x, py + s.y, s.w, 1);
    ctx.fillRect(px + s.x, py + s.y, 1, s.h);
    // Bottom-right shadow
    ctx.fillStyle = '#9a7848';
    ctx.fillRect(px + s.x + s.w - 1, py + s.y, 1, s.h);
    ctx.fillRect(px + s.x, py + s.y + s.h - 1, s.w, 1);
    // Moss crack detail
    const crackX = (row * 5 + col * 11) % (s.w - 4) + 2;
    ctx.fillStyle = '#7a6038';
    ctx.fillRect(px + s.x + crackX, py + s.y + 2, 1, s.h - 4);
  }

  // Mortar lines
  ctx.fillStyle = '#9a7848';
  if (col % 2 === 0) {
    ctx.fillRect(px + ts / 2, py, 1, ts);
  } else {
    ctx.fillRect(px, py + ts / 2, ts, 1);
  }
}

function drawRoofTile(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, bz: BuildingContext) {
  const pal = BUILDING_PALETTES[bz.building];
  if (!pal) return;

  // Overhang / eave strip (top 4px = darkest)
  ctx.fillStyle = pal.roof[3];
  ctx.fillRect(px, py, ts, 4);

  // Mid-dark band
  ctx.fillStyle = pal.roof[2];
  ctx.fillRect(px, py + 4, ts, 3);

  // Shingle body: alternating 3px bands dark/mid-dark
  const body = ts - 7;
  for (let r = 0; r < body; r += 3) {
    const shade = (Math.floor(r / 3) % 2 === 0) ? pal.roof[2] : pal.roof[1];
    ctx.fillStyle = shade;
    ctx.fillRect(px, py + 7 + r, ts, Math.min(3, body - r));
  }

  // Left edge inside-facing shadow
  if (bz.isLeftCol) {
    ctx.fillStyle = pal.roof[3];
    ctx.fillRect(px, py, 2, ts);
  }
  // Right edge inside-facing shadow
  if (bz.isRightCol) {
    ctx.fillStyle = pal.roof[3];
    ctx.fillRect(px + ts - 2, py, 2, ts);
  }

  // Center roof peak detail
  if (bz.isCenterCol) {
    ctx.fillStyle = pal.roof[2];
    ctx.fillRect(px + ts / 2 - 1, py + 4, 2, ts - 4);
  }

  // Pixel row variation in mid-dark band
  ctx.fillStyle = pal.roof[1];
  if ((px / ts + py / ts) % 3 === 0) {
    ctx.fillRect(px + 4, py + 5, 3, 1);
    ctx.fillRect(px + ts - 8, py + 5, 3, 1);
  }

  // 1px black outline on top
  ctx.fillStyle = '#080808';
  ctx.fillRect(px, py, ts, 1);
  if (bz.isLeftCol) ctx.fillRect(px, py, 1, ts);
  if (bz.isRightCol) ctx.fillRect(px + ts - 1, py, 1, ts);
}

function drawWallTile(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, bz: BuildingContext, row: number, col: number) {
  const pal = BUILDING_PALETTES[bz.building];
  if (!pal) return;

  // Base wall color
  ctx.fillStyle = pal.wall[1];
  ctx.fillRect(px, py, ts, ts);

  // Brick/stone texture
  // Horizontal mortar lines every 8px
  ctx.fillStyle = pal.wall[2];
  for (let my = 0; my < ts; my += 8) {
    ctx.fillRect(px, py + my, ts, 1);
  }
  // Vertical brick offsets alternating every 16px
  const brickOff = (row % 2 === 0) ? 8 : 0;
  ctx.fillStyle = pal.wall[2];
  for (let bx = brickOff; bx < ts; bx += 16) {
    ctx.fillRect(px + bx, py, 1, ts);
  }

  // Top edge highlight
  ctx.fillStyle = pal.wall[0];
  ctx.fillRect(px, py, ts, 2);
  // Left edge highlight
  ctx.fillStyle = pal.wall[0];
  ctx.fillRect(px, py + 2, 2, ts - 2);

  // Bottom edge deep shadow
  ctx.fillStyle = pal.wall[3];
  ctx.fillRect(px, py + ts - 2, ts, 2);
  // Right edge deep shadow
  ctx.fillStyle = pal.wall[3];
  ctx.fillRect(px + ts - 2, py, 2, ts);

  // Corner shadows
  if (bz.isLeftCol) {
    ctx.fillStyle = pal.wall[3];
    ctx.fillRect(px, py, 2, ts);
  }
  if (bz.isRightCol) {
    ctx.fillStyle = pal.wall[3];
    ctx.fillRect(px + ts - 2, py, 2, ts);
  }

  // Window: center column AND middle row
  if (bz.isCenterCol && bz.isCenterRow) {
    const wx = px + (ts - 12) / 2;
    const wy = py + (ts - 16) / 2;
    // Window frame
    ctx.fillStyle = pal.trim;
    ctx.fillRect(wx - 2, wy - 2, 16, 20);
    // Window pane
    ctx.fillStyle = pal.win;
    ctx.fillRect(wx, wy, 12, 16);
    // Window cross-bar
    ctx.fillStyle = pal.trim;
    ctx.fillRect(wx + 5, wy, 2, 16);
    ctx.fillRect(wx, wy + 7, 12, 2);
    // Reflection highlight
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(wx + 1, wy + 1, 4, 3);
    ctx.fillRect(wx + 1, wy + 1, 1, 6);
  }

  // 1px outline
  ctx.fillStyle = '#080808';
  if (bz.isLeftCol) ctx.fillRect(px, py, 1, ts);
  if (bz.isRightCol) ctx.fillRect(px + ts - 1, py, 1, ts);
}

function drawBuildingTile(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, row: number, col: number) {
  const bz = getBuildingZone(row, col);
  if (!bz) {
    // Fallback generic wall
    ctx.fillStyle = '#4a3f36';
    ctx.fillRect(px, py, ts, ts);
    return;
  }

  if (bz.isTopRow) {
    drawRoofTile(ctx, px, py, ts, bz);
  } else {
    drawWallTile(ctx, px, py, ts, bz, row, col);
  }
}

function drawTree(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
  // Trunk: 6px wide, 4 shades of brown
  const tx = px + ts * 0.38;
  const ty = py + ts * 0.5;
  const tw = ts * 0.24;
  const th = ts * 0.5;

  // Deep shadow side
  ctx.fillStyle = '#3a2010';
  ctx.fillRect(tx + tw - 2, ty, 2, th);
  // Base trunk
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(tx, ty, tw, th);
  // Highlight side
  ctx.fillStyle = '#8a5c30';
  ctx.fillRect(tx, ty, 2, th);
  // Mid shade
  ctx.fillStyle = '#7a5028';
  ctx.fillRect(tx + 2, ty, tw - 4, th);

  // Black outline on trunk
  ctx.fillStyle = '#080808';
  ctx.fillRect(tx - 1, ty, 1, th);
  ctx.fillRect(tx + tw, ty, 1, th);

  // Canopy: 5 layers from darkest outer to brightest center
  // Layer 1: shadow bottom (darkest)
  ctx.fillStyle = '#0e2808';
  ctx.fillRect(px + ts * 0.06, py + ts * 0.46, ts * 0.88, ts * 0.16);
  // Layer 2: outer canopy
  ctx.fillStyle = '#1e4010';
  ctx.fillRect(px + ts * 0.08, py + ts * 0.08, ts * 0.84, ts * 0.44);
  // Layer 3: mid outer
  ctx.fillStyle = '#2d5a1b';
  ctx.fillRect(px + ts * 0.12, py + ts * 0.10, ts * 0.76, ts * 0.38);
  // Layer 4: mid inner
  ctx.fillStyle = '#3d7a2b';
  ctx.fillRect(px + ts * 0.20, py + ts * 0.14, ts * 0.60, ts * 0.28);
  // Layer 5: bright center
  ctx.fillStyle = '#4d9a38';
  ctx.fillRect(px + ts * 0.28, py + ts * 0.16, ts * 0.36, ts * 0.18);
  // Highlight spot: upper-left quadrant
  ctx.fillStyle = '#5ab044';
  ctx.fillRect(px + ts * 0.18, py + ts * 0.12, ts * 0.20, ts * 0.10);

  // Black 1px outline around canopy perimeter
  ctx.fillStyle = '#080808';
  ctx.fillRect(px + ts * 0.06, py + ts * 0.07, ts * 0.88, 1);
  ctx.fillRect(px + ts * 0.06, py + ts * 0.07, 1, ts * 0.55);
  ctx.fillRect(px + ts * 0.06 + ts * 0.88 - 1, py + ts * 0.07, 1, ts * 0.55);
  ctx.fillRect(px + ts * 0.06, py + ts * 0.07 + ts * 0.55 - 1, ts * 0.88, 1);
}

function drawDoor(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, row: number, col: number) {
  // Determine building for wall context
  const bz = getBuildingZone(row, col);
  const pal = bz ? BUILDING_PALETTES[bz.building] : null;
  const wallBase = pal ? pal.wall[1] : '#c4a070';

  // Wall background
  ctx.fillStyle = wallBase;
  ctx.fillRect(px, py, ts, ts);

  // Stone frame (darker than wall)
  const frameColor = pal ? pal.wall[3] : '#6a4020';
  ctx.fillStyle = frameColor;
  ctx.fillRect(px + 3, py, ts - 6, ts);
  ctx.fillRect(px, py, 4, ts);
  ctx.fillRect(px + ts - 4, py, 4, ts);

  // Door body: warm brown
  ctx.fillStyle = '#7a4a28';
  ctx.fillRect(px + 5, py + 2, ts - 10, ts - 4);

  // Door panels (horizontal rails)
  ctx.fillStyle = '#6a3818';
  ctx.fillRect(px + 6, py + 4, ts - 12, 6);
  ctx.fillRect(px + 6, py + 13, ts - 12, 6);
  ctx.fillRect(px + 6, py + 22, ts - 12, 6);

  // Panel highlights
  ctx.fillStyle = '#9a6030';
  ctx.fillRect(px + 7, py + 5, ts - 14, 2);
  ctx.fillRect(px + 7, py + 14, ts - 14, 2);
  ctx.fillRect(px + 7, py + 23, ts - 14, 2);

  // Gold circular doorknob
  ctx.fillStyle = '#c08020';
  ctx.fillRect(px + Math.floor(ts * 0.65), py + Math.floor(ts * 0.45), 4, 4);
  ctx.fillStyle = '#f0d060';
  ctx.fillRect(px + Math.floor(ts * 0.65) + 1, py + Math.floor(ts * 0.45) + 1, 2, 2);

  // 2px step at bottom in dark gray
  ctx.fillStyle = '#303030';
  ctx.fillRect(px + 5, py + ts - 4, ts - 10, 4);
  ctx.fillStyle = '#484848';
  ctx.fillRect(px + 5, py + ts - 4, ts - 10, 1);

  // Outline
  ctx.fillStyle = '#080808';
  ctx.fillRect(px + 4, py, 1, ts);
  ctx.fillRect(px + ts - 5, py, 1, ts);
  ctx.fillRect(px + 4, py + 1, ts - 8, 1);
}

function drawFlower(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, col: number) {
  // Grass base
  ctx.fillStyle = '#5a9a3c';
  ctx.fillRect(px, py, ts, ts);

  const flowers = [
    { x: px + 7,  y: py + 8,  c: '#e8706a', h: '#ff9090' },
    { x: px + 19, y: py + 18, c: '#f0c040', h: '#fff070' },
    { x: px + 23, y: py + 7,  c: '#e87aaa', h: '#ffa0c0' },
  ];
  for (const f of flowers) {
    // Stem
    ctx.fillStyle = '#3a6a1a';
    ctx.fillRect(f.x + 1, f.y + 3, 1, 6);
    // Petals cross
    ctx.fillStyle = f.c;
    ctx.fillRect(f.x - 3, f.y, 7, 2);
    ctx.fillRect(f.x, f.y - 3, 2, 7);
    // Center highlight
    ctx.fillStyle = f.h;
    ctx.fillRect(f.x, f.y, 2, 2);
    // Outline dots
    ctx.fillStyle = '#080808';
    ctx.fillRect(f.x - 4, f.y, 1, 2);
    ctx.fillRect(f.x + 4, f.y, 1, 2);
    ctx.fillRect(f.x, f.y - 4, 2, 1);
    ctx.fillRect(f.x, f.y + 4, 2, 1);
  }
}

// ── Interior tile renderers ────────────────────────────────────────────────────

function drawFloor(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, mapId: string) {
  const isEven = (Math.floor(px / ts) + Math.floor(py / ts)) % 2 === 0;

  switch (mapId) {
    case 'house': {
      // Warm wood planks
      ctx.fillStyle = isEven ? '#5a3e28' : '#6a4e38';
      ctx.fillRect(px, py, ts, ts);
      // Plank horizontal lines every 4px
      ctx.fillStyle = isEven ? '#4a3020' : '#5a4028';
      for (let y = 4; y < ts; y += 4) {
        ctx.fillRect(px, py + y, ts, 1);
      }
      // Highlight on plank top
      ctx.fillStyle = '#7a5a40';
      ctx.fillRect(px, py, ts, 1);
      break;
    }
    case 'record_store': {
      // Dark purple checkerboard
      ctx.fillStyle = isEven ? '#2a1838' : '#3a2848';
      ctx.fillRect(px, py, ts, ts);
      // Subtle sheen
      ctx.fillStyle = isEven ? '#321c44' : '#442e58';
      ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
      // Grid lines
      ctx.fillStyle = '#1a0c28';
      ctx.fillRect(px, py, ts, 1);
      ctx.fillRect(px, py, 1, ts);
      break;
    }
    case 'cafe': {
      // Warm orange-tan checkerboard
      ctx.fillStyle = isEven ? '#5a3818' : '#6a4828';
      ctx.fillRect(px, py, ts, ts);
      // Tile surface highlight
      ctx.fillStyle = isEven ? '#6a4828' : '#7a5838';
      ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
      // Grout lines
      ctx.fillStyle = '#382010';
      ctx.fillRect(px, py, ts, 1);
      ctx.fillRect(px, py, 1, ts);
      break;
    }
    case 'dj_club': {
      // Near-black with neon grid
      ctx.fillStyle = isEven ? '#070714' : '#0a0a20';
      ctx.fillRect(px, py, ts, ts);
      // Neon cyan grid every 8px
      ctx.fillStyle = 'rgba(0,255,255,0.12)';
      for (let gx = 0; gx < ts; gx += 8) {
        ctx.fillRect(px + gx, py, 1, ts);
      }
      for (let gy = 0; gy < ts; gy += 8) {
        ctx.fillRect(px, py + gy, ts, 1);
      }
      break;
    }
    case 'bar': {
      // Dark wood
      ctx.fillStyle = isEven ? '#3a2010' : '#4a3020';
      ctx.fillRect(px, py, ts, ts);
      // Wood grain
      ctx.fillStyle = isEven ? '#301808' : '#402818';
      for (let y = 6; y < ts; y += 6) {
        ctx.fillRect(px, py + y, ts, 1);
      }
      ctx.fillStyle = '#5a3830';
      ctx.fillRect(px, py, ts, 1);
      break;
    }
    default: {
      ctx.fillStyle = '#2a1e14';
      ctx.fillRect(px, py, ts, ts);
    }
  }
}

function drawStage(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, time: number) {
  const pulse = 0.6 + 0.4 * Math.sin(time / 280);
  const pulse2 = 0.5 + 0.5 * Math.sin(time / 180 + 1.2);

  // Base stage floor
  ctx.fillStyle = '#4a3080';
  ctx.fillRect(px, py, ts, ts);

  // Pulsing highlight strips
  ctx.fillStyle = `rgba(128, 96, 208, ${pulse})`;
  ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
  ctx.fillStyle = `rgba(160, 128, 240, ${pulse2 * 0.6})`;
  ctx.fillRect(px + 6, py + 6, ts - 12, ts - 12);

  // LED dot grid
  const dotColors = ['#ff0040', '#00ff80', '#0080ff', '#ff8000'];
  for (let dy = 6; dy < ts - 4; dy += 8) {
    for (let dx = 6; dx < ts - 4; dx += 10) {
      const ci = Math.floor((time / 500 + dx + dy) / 8) % 4;
      const bright = 0.4 + 0.6 * Math.sin(time / 200 + dx * 0.3 + dy * 0.2);
      ctx.fillStyle = dotColors[ci] + Math.floor(bright * 255).toString(16).padStart(2, '0');
      ctx.fillRect(px + dx, py + dy, 2, 2);
    }
  }

  // Border highlight
  ctx.fillStyle = `rgba(200,180,255,${pulse * 0.5})`;
  ctx.fillRect(px, py, ts, 1);
  ctx.fillRect(px, py, 1, ts);
  ctx.fillStyle = '#6a4acd';
  ctx.fillRect(px + ts - 1, py, 1, ts);
  ctx.fillRect(px, py + ts - 1, ts, 1);
}

function drawFurniture(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, mapId: string) {
  switch (mapId) {
    case 'record_store': {
      // Dark shelves with colorful record slices
      ctx.fillStyle = '#3a1848';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#2a1038';
      ctx.fillRect(px, py, ts, 2);
      ctx.fillStyle = '#4a2858';
      ctx.fillRect(px, py + 2, 2, ts - 2);
      // Record slices (5px wide colored bands)
      const recColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
      for (let ri = 0; ri < 5; ri++) {
        ctx.fillStyle = recColors[ri % recColors.length];
        ctx.fillRect(px + 4 + ri * 5, py + 5, 4, ts - 10);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(px + 4 + ri * 5 + 3, py + 5, 1, ts - 10);
      }
      break;
    }
    case 'cafe': {
      // Wooden table with tiny cup icon
      ctx.fillStyle = '#7a5030';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#9a6840';
      ctx.fillRect(px + 1, py + 1, ts - 2, ts / 2);
      ctx.fillStyle = '#5a3820';
      ctx.fillRect(px, py + ts / 2, ts, ts / 2);
      // Table legs
      ctx.fillStyle = '#4a2810';
      ctx.fillRect(px + 3, py + ts - 6, 3, 6);
      ctx.fillRect(px + ts - 6, py + ts - 6, 3, 6);
      // Cup on top
      ctx.fillStyle = '#f0e0d0';
      ctx.fillRect(px + ts / 2 - 3, py + 4, 6, 8);
      ctx.fillStyle = '#c8a880';
      ctx.fillRect(px + ts / 2 - 2, py + 5, 4, 6);
      // Steam curls
      ctx.fillStyle = 'rgba(200,200,200,0.7)';
      ctx.fillRect(px + ts / 2 - 1, py + 2, 1, 3);
      ctx.fillRect(px + ts / 2 + 1, py + 1, 1, 3);
      break;
    }
    case 'dj_club': {
      // DJ equipment: dark with lit LEDs
      ctx.fillStyle = '#101020';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#1a1a30';
      ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
      // Equipment outline / bezel
      ctx.fillStyle = '#050510';
      ctx.fillRect(px + 2, py + 2, ts - 4, 3);
      // LED indicators
      const ledColors = ['#ff0000', '#00ff00', '#ff8800', '#0088ff'];
      for (let li = 0; li < 4; li++) {
        ctx.fillStyle = ledColors[li];
        ctx.fillRect(px + 5 + li * 6, py + 6, 3, 3);
      }
      // Mixer faders
      ctx.fillStyle = '#303050';
      for (let fi = 0; fi < 3; fi++) {
        ctx.fillRect(px + 5 + fi * 8, py + 14, 4, ts - 18);
        ctx.fillStyle = '#808090';
        ctx.fillRect(px + 4 + fi * 8, py + 18 + fi * 2, 6, 3);
        ctx.fillStyle = '#303050';
      }
      // VU meter dots
      ctx.fillStyle = '#00ff80';
      ctx.fillRect(px + ts - 8, py + 5, 4, 2);
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(px + ts - 8, py + 9, 4, 2);
      ctx.fillStyle = '#ff4000';
      ctx.fillRect(px + ts - 8, py + 13, 4, 2);
      break;
    }
    case 'house': {
      // Warm wooden furniture
      ctx.fillStyle = '#6a4020';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#7a5030';
      ctx.fillRect(px + 1, py + 1, ts - 2, ts / 3);
      ctx.fillStyle = '#8a6040';
      ctx.fillRect(px + 2, py + 2, ts - 4, ts / 3 - 2);
      // Drawer handles
      ctx.fillStyle = '#c09060';
      ctx.fillRect(px + ts / 2 - 3, py + ts / 2 - 2, 6, 3);
      ctx.fillStyle = '#a07040';
      ctx.fillRect(px + ts / 2 - 2, py + ts / 2 - 1, 4, 2);
      break;
    }
    case 'bar': {
      // Bar counter: dark wood
      ctx.fillStyle = '#3a2010';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
      // Bar top surface
      ctx.fillStyle = '#2a1808';
      ctx.fillRect(px + 1, py + 1, ts - 2, 4);
      // Bottles
      const bColors = ['#2070a0', '#a04020', '#20a040'];
      for (let bi = 0; bi < 3; bi++) {
        ctx.fillStyle = bColors[bi];
        ctx.fillRect(px + 5 + bi * 8, py + 6, 5, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(px + 6 + bi * 8, py + 7, 2, 8);
      }
      break;
    }
    default: {
      ctx.fillStyle = '#5a4030';
      ctx.fillRect(px, py, ts, ts);
    }
  }
}

// ── NPC Sprites ────────────────────────────────────────────────────────────────

function drawNPCMojo(ctx: CanvasRenderingContext2D, bx: number, by: number) {
  // Green hoodie: baggy look
  // Outline layer
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 8, by + 10, 16, 16);
  ctx.fillRect(bx - 6, by - 1, 12, 13);

  // Body: green hoodie
  ctx.fillStyle = '#1a8a4a';
  ctx.fillRect(bx - 7, by + 11, 14, 14);
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(bx - 6, by + 11, 5, 13);
  ctx.fillStyle = '#27ae60';
  ctx.fillRect(bx - 1, by + 11, 8, 13);
  // Hoodie pocket
  ctx.fillStyle = '#18a050';
  ctx.fillRect(bx - 3, by + 18, 6, 5);
  ctx.fillStyle = '#10803c';
  ctx.fillRect(bx - 3, by + 19, 6, 1);

  // Arms: baggy
  ctx.fillStyle = '#1a8a4a';
  ctx.fillRect(bx - 11, by + 11, 5, 9);
  ctx.fillRect(bx + 6,  by + 11, 5, 9);
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(bx - 11, by + 11, 2, 8);
  ctx.fillRect(bx + 9,  by + 11, 2, 8);

  // Hands: skin
  ctx.fillStyle = '#d4a870';
  ctx.fillRect(bx - 10, by + 19, 4, 3);
  ctx.fillRect(bx + 6,  by + 19, 4, 3);

  // Cargo pants
  ctx.fillStyle = '#4a4030';
  ctx.fillRect(bx - 5, by + 24, 4, 8);
  ctx.fillRect(bx + 1, by + 24, 4, 8);
  ctx.fillStyle = '#3a3020';
  ctx.fillRect(bx - 5, by + 28, 4, 2);
  ctx.fillRect(bx + 1, by + 28, 4, 2);
  // Cargo pocket
  ctx.fillStyle = '#585040';
  ctx.fillRect(bx + 2, by + 25, 3, 4);

  // Shoes
  ctx.fillStyle = '#282018';
  ctx.fillRect(bx - 6, by + 31, 5, 3);
  ctx.fillRect(bx + 1, by + 31, 5, 3);

  // Head
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 7, by - 1, 14, 13);
  ctx.fillStyle = '#d4a870';
  ctx.fillRect(bx - 6, by, 12, 11);
  ctx.fillStyle = '#e0b880';
  ctx.fillRect(bx - 5, by + 1, 4, 3);

  // Olive beanie hat
  ctx.fillStyle = '#3a5010';
  ctx.fillRect(bx - 6, by - 1, 12, 6);
  ctx.fillStyle = '#4a6820';
  ctx.fillRect(bx - 6, by + 1, 12, 2);
  // Beanie roll
  ctx.fillStyle = '#2a3c0a';
  ctx.fillRect(bx - 6, by + 3, 12, 2);

  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx - 4, by + 5, 3, 3);
  ctx.fillRect(bx + 1, by + 5, 3, 3);
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(bx - 3, by + 6, 2, 2);
  ctx.fillRect(bx + 2, by + 6, 2, 2);

  // Eyebrows
  ctx.fillStyle = '#402010';
  ctx.fillRect(bx - 4, by + 4, 3, 1);
  ctx.fillRect(bx + 1, by + 4, 3, 1);
}

function drawNPCLuna(ctx: CanvasRenderingContext2D, bx: number, by: number) {
  // Yellow-gold jacket, structured look, camera

  // Body outline
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 8, by + 10, 16, 16);

  // Jacket body
  ctx.fillStyle = '#b88018';
  ctx.fillRect(bx - 7, by + 11, 14, 14);
  ctx.fillStyle = '#d4a820';
  ctx.fillRect(bx - 6, by + 11, 5, 13);
  ctx.fillStyle = '#c09018';
  ctx.fillRect(bx - 1, by + 11, 8, 13);
  // Jacket lapels
  ctx.fillStyle = '#a07010';
  ctx.fillRect(bx - 2, by + 11, 2, 8);
  ctx.fillRect(bx, by + 11, 2, 8);
  // Buttons
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 1, by + 13, 2, 1);
  ctx.fillRect(bx - 1, by + 16, 2, 1);
  ctx.fillRect(bx - 1, by + 19, 2, 1);

  // Arms
  ctx.fillStyle = '#b88018';
  ctx.fillRect(bx - 10, by + 11, 4, 10);
  ctx.fillRect(bx + 6,  by + 11, 4, 10);
  ctx.fillStyle = '#d4a820';
  ctx.fillRect(bx - 10, by + 11, 2, 9);

  // Hands
  ctx.fillStyle = '#d4a870';
  ctx.fillRect(bx - 9, by + 20, 3, 3);
  ctx.fillRect(bx + 6, by + 20, 3, 3);

  // Dark pants
  ctx.fillStyle = '#1e2430';
  ctx.fillRect(bx - 5, by + 24, 4, 8);
  ctx.fillRect(bx + 1, by + 24, 4, 8);
  ctx.fillStyle = '#141820';
  ctx.fillRect(bx - 5, by + 24, 4, 1);
  ctx.fillRect(bx + 1, by + 24, 4, 1);

  // Shoes
  ctx.fillStyle = '#282828';
  ctx.fillRect(bx - 5, by + 31, 5, 3);
  ctx.fillRect(bx + 1, by + 31, 5, 3);

  // Camera around neck
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 4, by + 17, 8, 6);
  ctx.fillStyle = '#222222';
  ctx.fillRect(bx - 3, by + 18, 6, 4);
  // Lens circle
  ctx.fillStyle = '#808080';
  ctx.fillRect(bx - 1, by + 19, 3, 3);
  ctx.fillStyle = '#404060';
  ctx.fillRect(bx, by + 20, 1, 1);
  // Camera strap
  ctx.fillStyle = '#502010';
  ctx.fillRect(bx - 5, by + 14, 1, 5);
  ctx.fillRect(bx + 4, by + 14, 1, 5);

  // Head
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 7, by - 1, 14, 13);
  ctx.fillStyle = '#d4a870';
  ctx.fillRect(bx - 6, by, 12, 11);
  ctx.fillStyle = '#e0b880';
  ctx.fillRect(bx - 4, by + 1, 3, 3);

  // Hair: neat dark brown, pulled back
  ctx.fillStyle = '#3a2818';
  ctx.fillRect(bx - 6, by - 1, 12, 5);
  ctx.fillRect(bx + 3, by + 2, 3, 6);
  ctx.fillStyle = '#2a1808';
  ctx.fillRect(bx - 6, by - 1, 12, 2);

  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx - 4, by + 5, 3, 3);
  ctx.fillRect(bx + 1, by + 5, 3, 3);
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(bx - 3, by + 6, 2, 2);
  ctx.fillRect(bx + 2, by + 6, 2, 2);

  // Eyebrows
  ctx.fillStyle = '#402010';
  ctx.fillRect(bx - 4, by + 4, 3, 1);
  ctx.fillRect(bx + 1, by + 4, 3, 1);
}

function drawNPCVinyl(ctx: CanvasRenderingContext2D, bx: number, by: number) {
  // Purple vest over white shirt, round glasses

  // Body outline
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 8, by + 10, 16, 16);

  // White shirt under vest
  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(bx - 6, by + 11, 12, 13);

  // Purple vest
  ctx.fillStyle = '#6a2090';
  ctx.fillRect(bx - 7, by + 11, 4, 13);
  ctx.fillRect(bx + 3, by + 11, 4, 13);
  ctx.fillStyle = '#9030c0';
  ctx.fillRect(bx - 6, by + 11, 3, 12);
  ctx.fillRect(bx + 3, by + 11, 3, 12);
  // Vest buttons on shirt
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 1, by + 13, 2, 1);
  ctx.fillRect(bx - 1, by + 17, 2, 1);
  ctx.fillRect(bx - 1, by + 21, 2, 1);

  // Arms: shirtsleeves
  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(bx - 11, by + 11, 5, 10);
  ctx.fillRect(bx + 6,  by + 11, 5, 10);
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(bx - 11, by + 18, 5, 3);
  ctx.fillRect(bx + 6,  by + 18, 5, 3);

  // Hands
  ctx.fillStyle = '#d4a870';
  ctx.fillRect(bx - 10, by + 20, 3, 3);
  ctx.fillRect(bx + 7,  by + 20, 3, 3);

  // Dark dress pants
  ctx.fillStyle = '#181828';
  ctx.fillRect(bx - 5, by + 24, 4, 8);
  ctx.fillRect(bx + 1, by + 24, 4, 8);
  ctx.fillStyle = '#100c20';
  ctx.fillRect(bx - 5, by + 24, 4, 1);
  ctx.fillRect(bx + 1, by + 24, 4, 1);

  // Shoes
  ctx.fillStyle = '#101018';
  ctx.fillRect(bx - 5, by + 31, 5, 3);
  ctx.fillRect(bx + 1, by + 31, 5, 3);

  // Head
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 7, by - 1, 14, 13);
  ctx.fillStyle = '#d4a870';
  ctx.fillRect(bx - 6, by, 12, 11);
  ctx.fillStyle = '#c09868';
  ctx.fillRect(bx - 5, by + 8, 10, 3);

  // Well-groomed hair: dark
  ctx.fillStyle = '#202020';
  ctx.fillRect(bx - 6, by - 1, 12, 5);
  ctx.fillStyle = '#303030';
  ctx.fillRect(bx - 5, by, 10, 3);

  // Round glasses: thin frames
  ctx.fillStyle = '#102030';
  ctx.fillRect(bx - 6, by + 5, 5, 4);
  ctx.fillRect(bx + 1, by + 5, 5, 4);
  // Lens color
  ctx.fillStyle = '#a0d8f8';
  ctx.fillRect(bx - 5, by + 6, 3, 2);
  ctx.fillRect(bx + 2, by + 6, 3, 2);
  // Glasses bridge
  ctx.fillStyle = '#102030';
  ctx.fillRect(bx - 1, by + 6, 2, 1);

  // Eyes through glasses
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(bx - 4, by + 6, 1, 1);
  ctx.fillRect(bx + 3, by + 6, 1, 1);

  // Eyebrows
  ctx.fillStyle = '#181818';
  ctx.fillRect(bx - 5, by + 4, 4, 1);
  ctx.fillRect(bx + 1, by + 4, 4, 1);
}

function drawNPCCass(ctx: CanvasRenderingContext2D, bx: number, by: number) {
  // Orange apron over light top, friendly wide stance

  // Body outline
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 8, by + 10, 16, 16);

  // Light top underneath
  ctx.fillStyle = '#d8c0a0';
  ctx.fillRect(bx - 6, by + 11, 12, 13);

  // Orange apron
  ctx.fillStyle = '#e07030';
  ctx.fillRect(bx - 5, by + 11, 10, 12);
  ctx.fillStyle = '#d06020';
  ctx.fillRect(bx - 4, by + 11, 4, 11);
  ctx.fillStyle = '#f08040';
  ctx.fillRect(bx - 5, by + 11, 2, 11);
  // Apron bib pocket
  ctx.fillStyle = '#c05010';
  ctx.fillRect(bx - 2, by + 14, 4, 4);
  ctx.fillStyle = '#e06820';
  ctx.fillRect(bx - 2, by + 14, 4, 1);
  // Apron strings
  ctx.fillStyle = '#d06020';
  ctx.fillRect(bx - 5, by + 11, 1, 2);
  ctx.fillRect(bx + 4, by + 11, 1, 2);

  // Arms: wide stance
  ctx.fillStyle = '#d8c0a0';
  ctx.fillRect(bx - 12, by + 11, 6, 10);
  ctx.fillRect(bx + 6,  by + 11, 6, 10);
  ctx.fillStyle = '#c8b090';
  ctx.fillRect(bx - 12, by + 18, 6, 3);
  ctx.fillRect(bx + 6,  by + 18, 6, 3);

  // Hands
  ctx.fillStyle = '#d4a870';
  ctx.fillRect(bx - 11, by + 20, 4, 4);
  ctx.fillRect(bx + 7,  by + 20, 4, 4);

  // Comfortable shoes
  ctx.fillStyle = '#504030';
  ctx.fillRect(bx - 6, by + 31, 5, 3);
  ctx.fillRect(bx + 1, by + 31, 5, 3);
  ctx.fillStyle = '#3a3020';
  ctx.fillRect(bx - 6, by + 33, 5, 1);
  ctx.fillRect(bx + 1, by + 33, 5, 1);

  // Pants
  ctx.fillStyle = '#6a5040';
  ctx.fillRect(bx - 5, by + 24, 10, 8);
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(bx, by + 24, 1, 8);

  // Head
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 7, by - 1, 14, 13);
  ctx.fillStyle = '#d4a870';
  ctx.fillRect(bx - 6, by, 12, 11);
  ctx.fillStyle = '#e0b880';
  ctx.fillRect(bx - 4, by + 1, 3, 4);

  // Pulled-back hair
  ctx.fillStyle = '#604030';
  ctx.fillRect(bx - 6, by - 1, 12, 4);
  ctx.fillRect(bx + 4, by + 1, 2, 7);
  ctx.fillStyle = '#502818';
  ctx.fillRect(bx - 6, by - 1, 12, 2);
  // Hair bun
  ctx.fillStyle = '#604030';
  ctx.fillRect(bx + 4, by - 2, 4, 4);
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx + 4, by - 2, 4, 1);
  ctx.fillRect(bx + 4, by - 2, 1, 4);

  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx - 4, by + 5, 3, 3);
  ctx.fillRect(bx + 1, by + 5, 3, 3);
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(bx - 3, by + 6, 2, 2);
  ctx.fillRect(bx + 2, by + 6, 2, 2);
  // Smile lines
  ctx.fillStyle = '#c09068';
  ctx.fillRect(bx - 3, by + 9, 2, 1);
  ctx.fillRect(bx + 1, by + 9, 2, 1);

  // Eyebrows
  ctx.fillStyle = '#503020';
  ctx.fillRect(bx - 4, by + 4, 3, 1);
  ctx.fillRect(bx + 1, by + 4, 3, 1);
}

function drawNPCNova(ctx: CanvasRenderingContext2D, bx: number, by: number) {
  // Red leather jacket, spiky red hair, dark sunglasses, chain accessory

  // Body outline
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 9, by + 10, 18, 16);

  // Leather jacket
  ctx.fillStyle = '#700808';
  ctx.fillRect(bx - 8, by + 11, 16, 14);
  ctx.fillStyle = '#a01010';
  ctx.fillRect(bx - 7, by + 11, 5, 13);
  ctx.fillStyle = '#d01818';
  ctx.fillRect(bx - 6, by + 11, 3, 12);
  // Metallic highlight
  ctx.fillStyle = '#f04040';
  ctx.fillRect(bx - 7, by + 11, 1, 10);
  ctx.fillRect(bx - 6, by + 11, 5, 1);
  // Jacket lapels
  ctx.fillStyle = '#800808';
  ctx.fillRect(bx - 2, by + 11, 2, 9);
  ctx.fillRect(bx, by + 11, 2, 9);

  // Chain accessory: small yellow dots
  ctx.fillStyle = '#c8a020';
  for (let ci = 0; ci < 5; ci++) {
    ctx.fillRect(bx - 3 + ci * 2, by + 17, 1, 1);
  }

  // Arms
  ctx.fillStyle = '#a01010';
  ctx.fillRect(bx - 11, by + 11, 5, 10);
  ctx.fillRect(bx + 6,  by + 11, 5, 10);
  ctx.fillStyle = '#d01818';
  ctx.fillRect(bx - 11, by + 11, 2, 9);
  ctx.fillRect(bx + 9,  by + 11, 1, 9);

  // Hands
  ctx.fillStyle = '#c88060';
  ctx.fillRect(bx - 10, by + 20, 4, 3);
  ctx.fillRect(bx + 6,  by + 20, 4, 3);

  // Black skinny jeans
  ctx.fillStyle = '#0c0c0c';
  ctx.fillRect(bx - 5, by + 24, 4, 8);
  ctx.fillRect(bx + 1, by + 24, 4, 8);
  ctx.fillStyle = '#181818';
  ctx.fillRect(bx - 4, by + 24, 2, 8);

  // Shoes
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 6, by + 31, 5, 3);
  ctx.fillRect(bx + 1, by + 31, 5, 3);
  ctx.fillStyle = '#282828';
  ctx.fillRect(bx - 6, by + 31, 5, 1);

  // Head
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 7, by - 1, 14, 12);
  ctx.fillStyle = '#c08868';
  ctx.fillRect(bx - 6, by, 12, 10);
  ctx.fillStyle = '#d09878';
  ctx.fillRect(bx - 4, by + 1, 4, 3);

  // Spiky red hair: chaotic spikes
  ctx.fillStyle = '#e03030';
  // Center spikes
  ctx.fillRect(bx - 1, by - 7, 2, 8);
  ctx.fillRect(bx - 4, by - 5, 2, 6);
  ctx.fillRect(bx + 3,  by - 5, 2, 6);
  ctx.fillRect(bx - 6, by - 3, 2, 5);
  ctx.fillRect(bx + 5,  by - 3, 2, 5);
  // Tips: brighter
  ctx.fillStyle = '#ff5050';
  ctx.fillRect(bx - 1, by - 8, 2, 2);
  ctx.fillRect(bx - 4, by - 6, 2, 2);
  ctx.fillRect(bx + 3,  by - 6, 2, 2);
  ctx.fillRect(bx - 6, by - 4, 2, 2);
  ctx.fillRect(bx + 5,  by - 4, 2, 2);
  // Hair base
  ctx.fillStyle = '#c02020';
  ctx.fillRect(bx - 6, by - 1, 12, 4);

  // Dark sunglasses
  ctx.fillStyle = '#101010';
  ctx.fillRect(bx - 7, by + 4, 14, 5);
  // Tinted lenses
  ctx.fillStyle = '#2030a0';
  ctx.fillRect(bx - 6, by + 5, 5, 3);
  ctx.fillRect(bx + 1, by + 5, 5, 3);
  // Glasses bridge
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 1, by + 6, 2, 1);
  // Lens highlight
  ctx.fillStyle = 'rgba(100,120,220,0.5)';
  ctx.fillRect(bx - 5, by + 5, 2, 1);
  ctx.fillRect(bx + 2, by + 5, 2, 1);
}

function drawNPC(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, ts: number,
  npcId: string, color: string, name: string,
) {
  const bob = Math.sin(Date.now() / 400 + px) * 1;
  const bx = Math.floor(px + ts / 2);
  const by = Math.floor(py + ts * 0.08 + bob);

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(bx - 8, py + ts - 6, 16, 5);

  // Draw NPC-specific sprite
  switch (npcId) {
    case 'mojo':
    case 'mojo_bar':
      drawNPCMojo(ctx, bx, by);
      break;
    case 'luna':
      drawNPCLuna(ctx, bx, by);
      break;
    case 'vinyl':
      drawNPCVinyl(ctx, bx, by);
      break;
    case 'cass':
      drawNPCCass(ctx, bx, by);
      break;
    case 'nova':
      drawNPCNova(ctx, bx, by);
      break;
    default: {
      // Generic fallback NPC
      ctx.fillStyle = '#080808';
      ctx.fillRect(bx - 7, by, 14, 25);
      ctx.fillStyle = color;
      ctx.fillRect(bx - 6, by + 11, 12, 13);
      ctx.fillStyle = '#d4a870';
      ctx.fillRect(bx - 5, by, 10, 11);
    }
  }

  // Name tag box above sprite (rounded corner style)
  const tw = name.length * 6 + 12;
  const tx = bx - tw / 2;
  const tagY = py - 16;
  ctx.fillStyle = color + 'cc';
  ctx.fillRect(tx + 3, tagY, tw - 6, 13);
  ctx.fillRect(tx, tagY + 3, tw, 7);
  ctx.fillRect(tx + 3, tagY + 10, tw - 6, 3);
  ctx.fillStyle = '#080808';
  ctx.fillRect(tx + 3, tagY, tw - 6, 1);
  ctx.fillRect(tx + 3, tagY + 12, tw - 6, 1);
  ctx.fillRect(tx, tagY + 3, 1, 7);
  ctx.fillRect(tx + tw - 1, tagY + 3, 1, 7);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(name, bx, tagY + 10);
}

// ── Player Sprite ──────────────────────────────────────────────────────────────

function drawPlayer(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, facing: string, step: number) {
  const walkCycle = Math.floor(step / 2) % 4;
  const legLOff = walkCycle === 1 ? 4 : walkCycle === 3 ? -2 : 0;
  const legROff = walkCycle === 1 ? -2 : walkCycle === 3 ? 4 : 0;
  const bx = Math.floor(px + ts / 2);
  const by = Math.floor(py + ts * 0.06);

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(bx - 9, py + ts - 5, 18, 5);

  // ── Jeans ──
  ctx.fillStyle = '#1a2440';
  ctx.fillRect(bx - 5, by + 20, 4, 8 + legLOff);
  ctx.fillRect(bx + 1, by + 20, 4, 8 + legROff);
  ctx.fillStyle = '#2c3e6a';
  ctx.fillRect(bx - 4, by + 20, 2, 7 + legLOff);
  ctx.fillRect(bx + 2, by + 20, 2, 7 + legROff);
  ctx.fillStyle = '#3a5080';
  ctx.fillRect(bx - 4, by + 21, 1, 5 + legLOff);

  // ── Shoes ──
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(bx - 7, by + 27 + legLOff, 6, 3);
  ctx.fillRect(bx + 1, by + 27 + legROff, 6, 3);
  // Sole stripe
  ctx.fillStyle = '#333333';
  ctx.fillRect(bx - 7, by + 28 + legLOff, 6, 1);
  ctx.fillRect(bx + 1, by + 28 + legROff, 6, 1);
  // White toe cap
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(bx - 7, by + 27 + legLOff, 2, 2);
  ctx.fillRect(bx + 5, by + 27 + legROff, 2, 2);

  // ── Belt ──
  ctx.fillStyle = '#101010';
  ctx.fillRect(bx - 7, by + 20, 14, 2);

  // ── Hoodie body ──
  // Deep shadow at bottom
  ctx.fillStyle = '#102060';
  ctx.fillRect(bx - 7, by + 17, 14, 4);
  // Base
  ctx.fillStyle = '#3d5bbd';
  ctx.fillRect(bx - 7, by + 11, 14, 10);
  // Shadow right
  ctx.fillStyle = '#2040a0';
  ctx.fillRect(bx + 2, by + 11, 5, 10);
  // Highlight left chest/shoulder
  ctx.fillStyle = '#5070d0';
  ctx.fillRect(bx - 6, by + 11, 5, 9);
  ctx.fillStyle = '#6080e0';
  ctx.fillRect(bx - 6, by + 11, 2, 7);
  // Kangaroo pocket
  ctx.fillStyle = '#2a4aa0';
  ctx.fillRect(bx - 4, by + 16, 8, 4);
  ctx.fillStyle = '#4060c0';
  ctx.fillRect(bx - 4, by + 17, 8, 1);
  ctx.fillRect(bx - 4, by + 19, 8, 1);

  // ── Arms ──
  ctx.fillStyle = '#304aa0';
  ctx.fillRect(bx - 11, by + 12, 5, 9);
  ctx.fillRect(bx + 6,  by + 12, 5, 9);
  ctx.fillStyle = '#3d5bbd';
  ctx.fillRect(bx - 11, by + 12, 2, 8);

  // ── Hands ──
  ctx.fillStyle = '#f5c990';
  ctx.fillRect(bx - 11, by + 20, 4, 3);
  ctx.fillRect(bx + 7,  by + 20, 4, 3);
  ctx.fillStyle = '#ffd8a8';
  ctx.fillRect(bx - 11, by + 20, 2, 1);

  // ── Head ──
  // Outline
  ctx.fillStyle = '#080808';
  ctx.fillRect(bx - 7, by - 1, 14, 14);
  // Skin
  ctx.fillStyle = '#f5c990';
  ctx.fillRect(bx - 6, by, 12, 12);
  // Forehead highlight
  ctx.fillStyle = '#ffc8a0';
  ctx.fillRect(bx - 4, by + 1, 5, 3);
  // Chin shadow
  ctx.fillStyle = '#c09070';
  ctx.fillRect(bx - 4, by + 9, 8, 3);

  // ── Headphone band ──
  ctx.fillStyle = '#111111';
  ctx.fillRect(bx - 7, by + 2, 14, 2);
  ctx.fillStyle = '#333333';
  ctx.fillRect(bx - 6, by + 2, 12, 1);

  // ── Ear cups ──
  ctx.fillStyle = '#222222';
  ctx.fillRect(bx - 10, by + 3, 4, 5);
  ctx.fillRect(bx + 6,  by + 3, 4, 5);
  ctx.fillStyle = '#444444';
  ctx.fillRect(bx - 9, by + 4, 2, 3);
  ctx.fillRect(bx + 7, by + 4, 2, 3);

  // ── Hat ──
  // Crown
  ctx.fillStyle = '#1a0a30';
  ctx.fillRect(bx - 6, by - 5, 12, 6);
  ctx.fillStyle = '#2a1a40';
  ctx.fillRect(bx - 5, by - 4, 8, 3);
  ctx.fillRect(bx - 5, by - 4, 3, 4);
  // Wide brim
  ctx.fillStyle = '#1a0a30';
  ctx.fillRect(bx - 9, by - 1, 18, 3);
  ctx.fillStyle = '#0d0518';
  ctx.fillRect(bx - 9, by + 1, 18, 1);

  // ── Hair (visible under hat back) ──
  ctx.fillStyle = '#604040';
  ctx.fillRect(bx - 6, by + 0, 2, 4);
  ctx.fillRect(bx + 4, by + 0, 2, 4);

  // ── Eyebrows ──
  ctx.fillStyle = '#402010';
  if (facing !== 'up') {
    ctx.fillRect(bx - 4, by + 4, 3, 1);
    ctx.fillRect(bx + 1, by + 4, 3, 1);
  }

  // ── Eyes ──
  ctx.fillStyle = '#ffffff';
  if (facing === 'up') {
    // Eyes not visible from behind
  } else if (facing === 'down') {
    ctx.fillRect(bx - 4, by + 6, 3, 3);
    ctx.fillRect(bx + 1, by + 6, 3, 3);
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(bx - 3, by + 7, 2, 2);
    ctx.fillRect(bx + 2, by + 7, 2, 2);
  } else if (facing === 'right') {
    ctx.fillRect(bx + 1, by + 5, 3, 3);
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(bx + 3, by + 6, 1, 2);
  } else {
    ctx.fillRect(bx - 4, by + 5, 3, 3);
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(bx - 3, by + 6, 1, 2);
  }
}

// ── Main render ────────────────────────────────────────────────────────────────

export default function WorldCanvas({ state, onMove, onInteract }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const animRef = useRef(0);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const map = MAPS[state.mapId];
    if (!map) return;

    const ts = map.tileSize;
    const ox = map.offsetX;
    const oy = map.offsetY;
    const now = Date.now();

    // Background fill
    ctx.fillStyle = map.bgColor;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw tiles
    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        const tile = map.tiles[row][col];
        const px = ox + col * ts;
        const py = oy + row * ts;

        switch (tile) {
          case 0:
            if (state.mapId === 'town') {
              drawGrass(ctx, px, py, ts, row, col);
            } else {
              drawFloor(ctx, px, py, ts, state.mapId);
            }
            break;
          case 1: drawPath(ctx, px, py, ts, row, col); break;
          case 2:
            if (state.mapId === 'town') {
              drawBuildingTile(ctx, px, py, ts, row, col);
            } else {
              // Interior wall: solid dark
              const ipal = BUILDING_PALETTES[
                state.mapId === 'record_store' ? 'record_store'
                : state.mapId === 'cafe' ? 'cafe'
                : state.mapId === 'dj_club' ? 'dj_club'
                : state.mapId === 'bar' ? 'bar'
                : 'house'
              ];
              ctx.fillStyle = ipal.wall[2];
              ctx.fillRect(px, py, ts, ts);
              ctx.fillStyle = ipal.wall[3];
              ctx.fillRect(px, py, ts, 2);
              ctx.fillRect(px, py, 2, ts);
              ctx.fillStyle = ipal.wall[1];
              ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
              // Baseboard
              ctx.fillStyle = ipal.trim;
              ctx.fillRect(px, py + ts - 4, ts, 4);
            }
            break;
          case 3: drawTree(ctx, px, py, ts); break;
          case 4: drawFloor(ctx, px, py, ts, state.mapId); break;
          case 5: drawStage(ctx, px, py, ts, now); break;
          case 6: drawDoor(ctx, px, py, ts, row, col); break;
          case 7: drawFlower(ctx, px, py, ts, col); break;
          case 8: drawFurniture(ctx, px, py, ts, state.mapId); break;
          default:
            ctx.fillStyle = TILE_COLORS[tile] ?? '#000';
            ctx.fillRect(px, py, ts, ts);
        }
      }
    }

    // Door labels (town only)
    if (state.mapId === 'town') {
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      for (const door of map.doors) {
        const label = BUILDING_LABELS[door.toMap];
        if (!label) continue;
        const dpx = ox + door.x * ts + ts / 2;
        const dpy = oy + door.y * ts - 4;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(dpx - 34, dpy - 10, 68, 12);
        ctx.fillStyle = '#080808';
        ctx.fillRect(dpx - 34, dpy - 10, 68, 1);
        ctx.fillRect(dpx - 34, dpy + 1, 68, 1);
        ctx.fillStyle = '#f0d080';
        ctx.fillText(label, dpx, dpy);
      }
    }

    // Interior room label
    if (state.mapId !== 'town') {
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(8, 8, 210, 22);
      ctx.fillStyle = '#080808';
      ctx.fillRect(8, 8, 210, 1);
      ctx.fillRect(8, 29, 210, 1);
      ctx.fillStyle = '#f0d080';
      ctx.fillText(map.name, 14, 24);
    }

    // Draw NPCs
    for (const npcId of map.npcIds) {
      const npc = NPCS[npcId];
      if (!npc) continue;
      const npcPos = npc.positions[state.mapId];
      if (!npcPos) continue;
      const npx = ox + npcPos.x * ts;
      const npy = oy + npcPos.y * ts;
      drawNPC(ctx, npx, npy, ts, npcId, npc.color, npc.name);
    }

    // Draw player
    const px2 = ox + state.playerPos.x * ts;
    const py2 = oy + state.playerPos.y * ts;
    drawPlayer(ctx, px2, py2, ts, state.playerFacing, state.playerStep);

    // Interact hint
    const map2 = MAPS[state.mapId];
    const { x, y } = state.playerPos;
    let nearNpc = false;
    for (const npcId of map2.npcIds) {
      const npc = NPCS[npcId];
      if (!npc) continue;
      const np = npc.positions[state.mapId];
      if (!np) continue;
      if (Math.abs(np.x - x) <= 1 && Math.abs(np.y - y) <= 1 && (Math.abs(np.x - x) + Math.abs(np.y - y)) <= 1) {
        nearNpc = true;
        break;
      }
    }
    if (nearNpc) {
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(CANVAS_W / 2 - 62, CANVAS_H - 40, 124, 24);
      ctx.fillStyle = '#080808';
      ctx.fillRect(CANVAS_W / 2 - 62, CANVAS_H - 40, 124, 1);
      ctx.fillRect(CANVAS_W / 2 - 62, CANVAS_H - 16, 124, 1);
      ctx.fillStyle = '#f0d080';
      ctx.fillText('[E] Talk', CANVAS_W / 2, CANVAS_H - 22);
    }

    // Controls hint (bottom right)
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(CANVAS_W - 172, CANVAS_H - 22, 166, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('WASD/Arrows: Move  E: Talk  Q: Quests  H: Home', CANVAS_W - 6, CANVAS_H - 10);

  }, [state]);

  // Key input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!keysRef.current.has(key)) {
        keysRef.current.add(key);
        handleKey(key);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    const handleKey = (key: string) => {
      if (key === 'arrowup' || key === 'w') onMove('up');
      if (key === 'arrowdown' || key === 's') onMove('down');
      if (key === 'arrowleft' || key === 'a') onMove('left');
      if (key === 'arrowright' || key === 'd') onMove('right');
      if (key === 'e' || key === ' ') onInteract();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onMove, onInteract]);

  // Repeat movement when key held
  useEffect(() => {
    let lastMoveTime = 0;
    const REPEAT_DELAY = 160;

    const loop = (ts: number) => {
      animRef.current = requestAnimationFrame(loop);

      if (ts - lastMoveTime > REPEAT_DELAY) {
        const keys = keysRef.current;
        if (keys.has('arrowup') || keys.has('w')) { onMove('up'); lastMoveTime = ts; }
        else if (keys.has('arrowdown') || keys.has('s')) { onMove('down'); lastMoveTime = ts; }
        else if (keys.has('arrowleft') || keys.has('a')) { onMove('left'); lastMoveTime = ts; }
        else if (keys.has('arrowright') || keys.has('d')) { onMove('right'); lastMoveTime = ts; }
      }

      render();
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [onMove, render]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: 'block', imageRendering: 'pixelated' }}
    />
  );
}
