import { useEffect, useRef, useCallback } from 'react';
import type { GameState, Direction } from './types';
import { MAPS, NPCS, TILE_COLORS, TILE_ACCENT } from './gameData';
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

// Map door tile coords to label
function getDoorLabel(mapId: string, x: number, y: number): string | null {
  const map = MAPS[mapId];
  if (!map) return null;
  const door = map.doors.find(d => d.x === x && d.y === y);
  if (!door) return null;
  return BUILDING_LABELS[door.toMap] ?? null;
}

// Draw pixelated tree
function drawTree(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
  // Trunk
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(px + ts * 0.4, py + ts * 0.5, ts * 0.2, ts * 0.5);
  // Canopy (darker outer, lighter inner)
  ctx.fillStyle = '#1e4010';
  ctx.fillRect(px + ts * 0.1, py + ts * 0.1, ts * 0.8, ts * 0.7);
  ctx.fillStyle = '#2d5a1b';
  ctx.fillRect(px + ts * 0.2, py + ts * 0.15, ts * 0.6, ts * 0.55);
  ctx.fillStyle = '#3d7a2b';
  ctx.fillRect(px + ts * 0.3, py + ts * 0.2, ts * 0.4, ts * 0.35);
}

// Draw flower
function drawFlower(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
  ctx.fillStyle = '#5a8a3c';
  ctx.fillRect(px, py, ts, ts);
  const cx = px + ts / 2;
  const cy = py + ts / 2;
  const colors = ['#e8706a', '#f0c040', '#e87aaa', '#80e0a0'];
  const c = colors[Math.floor((px / ts + py / ts) % colors.length)];
  ctx.fillStyle = c;
  ctx.fillRect(cx - 3, cy - 5, 6, 10);
  ctx.fillRect(cx - 5, cy - 3, 10, 6);
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(cx - 2, cy - 2, 4, 4);
}

// Draw wall/building tile with slight gradient effect
function drawWall(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
  ctx.fillStyle = '#4a3f36';
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = '#3a3028';
  ctx.fillRect(px, py, ts, 2);
  ctx.fillStyle = '#5a4f44';
  ctx.fillRect(px, py + 2, 2, ts - 2);
}

// Draw door tile
function drawDoor(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
  ctx.fillStyle = '#c49060';
  ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
  // Door knob
  ctx.fillStyle = '#f0d080';
  ctx.fillRect(px + ts * 0.7, py + ts * 0.45, 3, 3);
}

// Draw NPC sprite
function drawNPC(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, color: string, accent: string, name: string, step: number) {
  const bob = Math.sin(Date.now() / 400 + px) * 1;
  const bx = px + ts / 2;
  const by = py + ts * 0.15 + bob;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(bx - 7, py + ts - 6, 14, 5);

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(bx - 6, by + 12, 12, 14);
  // Head
  ctx.fillStyle = '#f5d5a0';
  ctx.fillRect(bx - 5, by, 10, 11);
  // Hair
  ctx.fillStyle = accent;
  ctx.fillRect(bx - 5, by, 10, 4);
  // Eyes
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(bx - 3, by + 4, 2, 2);
  ctx.fillRect(bx + 1, by + 4, 2, 2);
  // Feet
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(bx - 5, by + 24, 4, 3);
  ctx.fillRect(bx + 1, by + 24, 4, 3);

  // Name tag
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bx - 18, py - 13, 36, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(name, bx, py - 4);
}

// Draw player sprite
function drawPlayer(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, facing: string, step: number) {
  const walkCycle = Math.floor(step / 2) % 4;
  const legL = walkCycle === 1 ? 4 : walkCycle === 3 ? -2 : 0;
  const legR = walkCycle === 1 ? -2 : walkCycle === 3 ? 4 : 0;
  const bx = px + ts / 2;
  const by = py + ts * 0.1;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(bx - 8, py + ts - 5, 16, 5);

  // Legs
  ctx.fillStyle = '#2c3e6a';
  ctx.fillRect(bx - 5, by + 20, 4, 7 + legL);
  ctx.fillRect(bx + 1, by + 20, 4, 7 + legR);

  // Body (hoodie)
  ctx.fillStyle = '#3d5bbd';
  ctx.fillRect(bx - 7, by + 11, 14, 10);
  // Highlight
  ctx.fillStyle = '#5070d0';
  ctx.fillRect(bx - 6, by + 11, 5, 9);

  // Arms
  ctx.fillStyle = '#3d5bbd';
  ctx.fillRect(bx - 10, by + 12, 4, 8);
  ctx.fillRect(bx + 6, by + 12, 4, 8);

  // Head
  ctx.fillStyle = '#f5d5a0';
  ctx.fillRect(bx - 6, by, 12, 12);
  // Hair / hat
  ctx.fillStyle = '#1a0a40';
  ctx.fillRect(bx - 7, by, 14, 5);
  ctx.fillRect(bx - 8, by + 2, 16, 3);

  // Eyes
  ctx.fillStyle = '#2a1a0a';
  if (facing === 'up') {
    ctx.fillRect(bx - 4, by + 5, 2, 2);
    ctx.fillRect(bx + 2, by + 5, 2, 2);
  } else if (facing === 'down') {
    ctx.fillRect(bx - 3, by + 6, 2, 2);
    ctx.fillRect(bx + 1, by + 6, 2, 2);
  } else {
    ctx.fillRect(facing === 'right' ? bx + 1 : bx - 3, by + 5, 2, 2);
  }

  // Shoes
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(bx - 6, by + 26, 5, 3);
  ctx.fillRect(bx + 1, by + 26, 5, 3);
}

// Draw path tile
function drawPath(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
  ctx.fillStyle = '#c4a882';
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = '#b89870';
  ctx.fillRect(px, py, ts, 1);
  ctx.fillRect(px, py, 1, ts);
  ctx.fillStyle = '#d4b892';
  ctx.fillRect(px + 2, py + 2, ts - 3, ts - 3);
}

// Draw furniture/counter
function drawFurniture(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, mapId: string) {
  const colors: Record<string, string> = {
    record_store: '#4a2060',
    cafe: '#6b3a1f',
    dj_club: '#1a1060',
    house: '#5a4030',
    bar: '#2a1a40',
  };
  const c = colors[mapId] ?? '#5a4030';
  ctx.fillStyle = c;
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
}

// Draw stage tile
function drawStage(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, time: number) {
  const pulse = 0.7 + 0.3 * Math.sin(time / 300);
  ctx.fillStyle = `rgba(106, 90, 205, ${pulse})`;
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = 'rgba(200,180,255,0.3)';
  ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
}

// Draw indoor floor
function drawFloor(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, mapId: string) {
  const baseColors: Record<string, string> = {
    record_store: '#2a1a40',
    cafe: '#3a2010',
    dj_club: '#080820',
    house: '#2a1e14',
    bar: '#151020',
  };
  const accentColors: Record<string, string> = {
    record_store: '#3a2a50',
    cafe: '#4a3020',
    dj_club: '#101030',
    house: '#3a2e24',
    bar: '#251830',
  };
  ctx.fillStyle = baseColors[mapId] ?? '#2a1e14';
  ctx.fillRect(px, py, ts, ts);
  if ((Math.floor(px / ts) + Math.floor(py / ts)) % 2 === 0) {
    ctx.fillStyle = accentColors[mapId] ?? '#3a2e24';
    ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
  }
}

export default function WorldCanvas({ state, onMove, onInteract }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const moveTimerRef = useRef(0);
  const animRef = useRef(0);
  const lastTimeRef = useRef(0);

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
          case 0: // grass
            ctx.fillStyle = '#5a8a3c';
            ctx.fillRect(px, py, ts, ts);
            ctx.fillStyle = '#4a7a30';
            ctx.fillRect(px, py, ts, 1);
            ctx.fillRect(px, py, 1, ts);
            break;
          case 1: drawPath(ctx, px, py, ts); break;
          case 2: drawWall(ctx, px, py, ts); break;
          case 3: drawTree(ctx, px, py, ts); break;
          case 4: drawFloor(ctx, px, py, ts, state.mapId); break;
          case 5: drawStage(ctx, px, py, ts, now); break;
          case 6: drawDoor(ctx, px, py, ts); break;
          case 7: drawFlower(ctx, px, py, ts); break;
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
        const px = ox + door.x * ts + ts / 2;
        const py = oy + door.y * ts - 4;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(px - 32, py - 9, 64, 11);
        ctx.fillStyle = '#f0d080';
        ctx.fillText(label, px, py);
      }
    }

    // Interior room label
    if (state.mapId !== 'town') {
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(8, 8, 200, 22);
      ctx.fillStyle = '#f0d080';
      ctx.fillText(map.name, 14, 24);
    }

    // Draw NPCs
    for (const npcId of map.npcIds) {
      const npc = NPCS[npcId];
      if (!npc) continue;
      const npcPos = npc.positions[state.mapId];
      if (!npcPos) continue;
      const px = ox + npcPos.x * ts;
      const py = oy + npcPos.y * ts;
      drawNPC(ctx, px, py, ts, npc.color, npc.accentColor, npc.name, state.playerStep);
    }

    // Draw player
    const px2 = ox + state.playerPos.x * ts;
    const py2 = oy + state.playerPos.y * ts;
    drawPlayer(ctx, px2, py2, ts, state.playerFacing, state.playerStep);

    // Interact hint
    if (state.mapId !== 'town' || true) {
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
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(CANVAS_W / 2 - 60, CANVAS_H - 38, 120, 22);
        ctx.fillStyle = '#f0d080';
        ctx.fillText('[E] Talk', CANVAS_W / 2, CANVAS_H - 22);
      }
    }

    // Controls hint (bottom right)
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(CANVAS_W - 170, CANVAS_H - 22, 164, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('WASD/Arrows: Move  E: Talk  Q: Quests  H: Home', CANVAS_W - 6, CANVAS_H - 10);

  }, [state]);

  // Key input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!keysRef.current.has(key)) {
        keysRef.current.add(key);
        // Immediate first move
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
