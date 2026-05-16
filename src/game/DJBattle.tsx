import { useEffect, useRef, useCallback } from 'react';
import type { GameState } from './types';
import { BEATS } from './gameData';
import { CANVAS_W, CANVAS_H, HIT_ZONE_Y, LANE_W, LANE_START_X, NOTE_SPEED, TRAVEL_TIME } from './useGameState';

interface Props {
  state: GameState;
  onBattleTick: (dt: number, now: number) => void;
  onBattleKey: (lane: number, now: number) => void;
  onCountdownTick: (now: number) => void;
  onClose: () => void;
}

const LANE_KEYS = ['a', 's', 'd', 'f'];
const KEY_LABELS = ['A', 'S', 'D', 'F'];

// 4-shade system per lane (highlight, base, shadow, deep shadow)
const LANE_SHADES: [string, string, string, string][] = [
  ['#ff8888', '#ff4444', '#cc1111', '#660808'],
  ['#88bbff', '#4499ff', '#1166cc', '#083366'],
  ['#ffee88', '#ffdd00', '#ccaa00', '#665500'],
  ['#88ffbb', '#44ff88', '#11cc55', '#086633'],
];
const NEON_COLORS = ['#ff4444', '#4499ff', '#ffdd00', '#44ff88'];
const DARK_COLORS = ['#661111', '#114466', '#665500', '#116633'];

// ── Draw helpers ───────────────────────────────────────────────────────────────

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Draw Nova's portrait for countdown screen
function drawNovaPortrait(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Portrait frame
  ctx.fillStyle = '#1a0808';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#d01818';
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y + h - 2, w, 2);
  ctx.fillRect(x, y, 2, h);
  ctx.fillRect(x + w - 2, y, 2, h);

  // Face
  const cx = x + w / 2;
  const cy = y + h * 0.45;

  // Spiky red hair
  ctx.fillStyle = '#e03030';
  ctx.fillRect(cx - 14, cy - 28, 28, 18);
  // Spikes
  for (let si = 0; si < 7; si++) {
    const sx = cx - 15 + si * 5;
    const sH = 8 + (si % 3) * 5;
    ctx.fillStyle = '#e03030';
    ctx.fillRect(sx, cy - 28 - sH, 3, sH);
    ctx.fillStyle = '#ff5050';
    ctx.fillRect(sx, cy - 28 - sH, 3, 2);
  }
  ctx.fillStyle = '#c02020';
  ctx.fillRect(cx - 14, cy - 28, 28, 4);

  // Face skin
  ctx.fillStyle = '#c08868';
  ctx.fillRect(cx - 12, cy - 22, 24, 22);
  ctx.fillStyle = '#d09878';
  ctx.fillRect(cx - 10, cy - 20, 8, 8);

  // Sunglasses
  ctx.fillStyle = '#101010';
  ctx.fillRect(cx - 14, cy - 14, 28, 9);
  ctx.fillStyle = '#2030a0';
  ctx.fillRect(cx - 12, cy - 12, 10, 5);
  ctx.fillRect(cx + 2, cy - 12, 10, 5);
  ctx.fillStyle = '#080808';
  ctx.fillRect(cx - 1, cy - 11, 2, 3);
  ctx.fillStyle = 'rgba(80,100,200,0.5)';
  ctx.fillRect(cx - 11, cy - 12, 3, 2);
  ctx.fillRect(cx + 3, cy - 12, 3, 2);

  // Jaw / chin
  ctx.fillStyle = '#b07858';
  ctx.fillRect(cx - 10, cy - 2, 20, 6);
  ctx.fillStyle = '#c08868';
  ctx.fillRect(cx - 8, cy - 2, 16, 4);

  // Red jacket
  ctx.fillStyle = '#a01010';
  ctx.fillRect(cx - 16, cy + 4, 32, h - (cy - y) - 4);
  ctx.fillStyle = '#d01818';
  ctx.fillRect(cx - 14, cy + 4, 10, h - (cy - y) - 4);
  ctx.fillStyle = '#f04040';
  ctx.fillRect(cx - 14, cy + 4, 2, h - (cy - y) - 6);
  // Jacket lapels
  ctx.fillStyle = '#800808';
  ctx.fillRect(cx - 2, cy + 4, 2, 12);
  ctx.fillRect(cx, cy + 4, 2, 12);

  // Name at bottom
  ctx.fillStyle = '#d01818';
  ctx.fillRect(x + 2, y + h - 18, w - 4, 16);
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('NOVA', cx, y + h - 6);
}

// Draw sparkle effect for win screen
function drawSparkles(ctx: CanvasRenderingContext2D, now: number) {
  const sparkleData = [
    { x: 80,  baseY: 400, color: '#ffdd00', speed: 1.2, size: 4 },
    { x: 200, baseY: 380, color: '#00ff88', speed: 0.9, size: 3 },
    { x: 350, baseY: 420, color: '#ffffff', speed: 1.5, size: 3 },
    { x: 500, baseY: 390, color: '#ffdd00', speed: 1.1, size: 4 },
    { x: 650, baseY: 410, color: '#88ffff', speed: 0.8, size: 3 },
    { x: 720, baseY: 370, color: '#ff88ff', speed: 1.3, size: 4 },
    { x: 130, baseY: 360, color: '#88ffff', speed: 1.0, size: 3 },
    { x: 600, baseY: 440, color: '#ffffff', speed: 1.4, size: 3 },
  ];
  for (const sp of sparkleData) {
    const t = (now / 1000) * sp.speed;
    const y = sp.baseY - (t * 60) % 280;
    const alpha = Math.min(1, (sp.baseY - y) / 80);
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = sp.color;
    ctx.fillRect(sp.x, y, sp.size, sp.size);
    ctx.fillRect(sp.x - sp.size, y + sp.size, sp.size * 3, sp.size);
    ctx.fillRect(sp.x, y - sp.size, sp.size, sp.size * 3);
  }
  ctx.globalAlpha = 1;
}

// Draw static overlay for lose screen
function drawStaticOverlay(ctx: CanvasRenderingContext2D, now: number) {
  const lines = 30;
  for (let i = 0; i < lines; i++) {
    const y = ((now / 40 + i * 21) % CANVAS_H) | 0;
    const alpha = 0.04 + (i % 3) * 0.02;
    ctx.fillStyle = `rgba(180,0,0,${alpha})`;
    ctx.fillRect(0, y, CANVAS_W, 2);
  }
}

// Draw perspective grid background converging to top center
function drawPerspectiveGrid(ctx: CanvasRenderingContext2D, now: number, beatColor: string) {
  const vx = CANVAS_W / 2; // vanishing point x
  const vy = 30;            // vanishing point y (near top)

  // Horizontal lines (scrolling downward)
  const scroll = (now / 25) % 60;
  for (let i = 0; i < 16; i++) {
    const t = (i / 15);
    const y = vy + (CANVAS_H - vy) * t + scroll * t;
    if (y > CANVAS_H) continue;
    const alpha = t * 0.35;
    // Line color: fades from bright at bottom to dark at top
    const r = parseInt(beatColor.slice(1, 3), 16);
    const g = parseInt(beatColor.slice(3, 5), 16);
    const b = parseInt(beatColor.slice(5, 7), 16);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }

  // Vertical lines converging to vanishing point
  const numV = 12;
  for (let i = 0; i <= numV; i++) {
    const bx = (i / numV) * CANVAS_W;
    const t = Math.abs(i / numV - 0.5) * 2; // brighter toward edges
    const alpha = 0.08 + t * 0.12;
    ctx.strokeStyle = `rgba(48,24,96,${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(vx + (bx - vx) * 0.02, vy);
    ctx.lineTo(bx, CANVAS_H);
    ctx.stroke();
  }
}

// Vignette effect (darker at edges, lighter center)
function drawVignette(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.2, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

export default function DJBattle({ state, onBattleTick, onBattleKey, onCountdownTick, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const countdownTimerRef = useRef(0);
  const pressedRef = useRef<Set<number>>(new Set());

  const bs = state.battleState;
  const beat = bs ? BEATS[bs.beatId] : null;

  // Key input
  useEffect(() => {
    if (!bs || bs.phase === 'result') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const lane = LANE_KEYS.indexOf(key);
      if (lane === -1) return;
      if (pressedRef.current.has(lane)) return;
      pressedRef.current.add(lane);
      if (bs.phase === 'playing') {
        onBattleKey(lane, performance.now());
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const lane = LANE_KEYS.indexOf(e.key.toLowerCase());
      if (lane !== -1) pressedRef.current.delete(lane);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [bs?.phase, onBattleKey]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bs || !beat) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const now = Date.now();

    // ── Background ────────────────────────────────────────────────────────────
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Perspective grid
    drawPerspectiveGrid(ctx, now, beat.color);

    // Vignette
    drawVignette(ctx);

    // ── Beat pulse (if speaker upgrade) ───────────────────────────────────────
    const hasSpeaker = state.homeUpgrades.includes('speaker_upgrade');
    if (hasSpeaker && bs.phase === 'playing') {
      const pulseBeat = (bs.elapsed * beat.bpm) / 60;
      const pulseAmt = Math.max(0, 1 - (pulseBeat % 1) * 2);
      ctx.fillStyle = `rgba(100, 80, 200, ${pulseAmt * 0.18})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // ── Lanes ─────────────────────────────────────────────────────────────────
    const lx = LANE_START_X;
    for (let i = 0; i < 4; i++) {
      const x = lx + i * LANE_W;

      // Lane background gradient (lighter at center, dark at edges)
      const lGrad = ctx.createLinearGradient(x, 0, x + LANE_W, 0);
      lGrad.addColorStop(0, 'rgba(10,8,24,0.92)');
      lGrad.addColorStop(0.3, 'rgba(22,18,48,0.88)');
      lGrad.addColorStop(0.7, 'rgba(22,18,48,0.88)');
      lGrad.addColorStop(1, 'rgba(10,8,24,0.92)');
      ctx.fillStyle = lGrad;
      ctx.fillRect(x, 0, LANE_W, CANVAS_H);

      // Subtle colored glow matching note color
      const beatPulse = bs.phase === 'playing'
        ? 0.5 + 0.5 * Math.sin((now / 1000) * (beat.bpm / 30) * Math.PI)
        : 0.3;
      const glowAlpha = pressedRef.current.has(i) ? 0.20 : beatPulse * 0.08;
      ctx.fillStyle = NEON_COLORS[i] + Math.floor(glowAlpha * 255).toString(16).padStart(2, '0');
      ctx.fillRect(x, 0, LANE_W, CANVAS_H);

      // Chrome rail dividers between lanes
      if (i > 0) {
        // 2px chrome rail
        const railGrad = ctx.createLinearGradient(x, 0, x + 2, 0);
        railGrad.addColorStop(0, '#606060');
        railGrad.addColorStop(0.5, '#cccccc');
        railGrad.addColorStop(1, '#606060');
        ctx.fillStyle = railGrad;
        ctx.fillRect(x, 0, 2, CANVAS_H);
      }
    }
    // Outer lane borders
    ctx.fillStyle = '#303060';
    ctx.fillRect(lx, 0, 1, CANVAS_H);
    ctx.fillRect(lx + LANE_W * 4 - 1, 0, 1, CANVAS_H);

    // ── Hit zone buttons ───────────────────────────────────────────────────────
    for (let i = 0; i < 4; i++) {
      const x = lx + i * LANE_W + 4;
      const w = LANE_W - 8;
      const pressed = pressedRef.current.has(i);
      const shades = LANE_SHADES[i];

      const btnX = pressed ? x - 1 : x;
      const btnY = pressed ? HIT_ZONE_Y - 19 : HIT_ZONE_Y - 18;
      const btnW = pressed ? w + 2 : w;
      const btnH = pressed ? 38 : 36;

      if (pressed) {
        // Full glow when pressed
        ctx.shadowColor = NEON_COLORS[i];
        ctx.shadowBlur = 24;
      }

      // Metallic rim effect: outer ring darker
      ctx.fillStyle = shades[3];
      drawRoundRect(ctx, btnX - 1, btnY - 1, btnW + 2, btnH + 2, 9);
      ctx.fill();

      // Inner ring lighter
      ctx.fillStyle = pressed ? shades[0] : shades[2];
      drawRoundRect(ctx, btnX, btnY, btnW, btnH, 8);
      ctx.fill();

      // Button face
      ctx.fillStyle = pressed ? shades[0] : shades[3];
      drawRoundRect(ctx, btnX + 1, btnY + 1, btnW - 2, btnH - 2, 7);
      ctx.fill();

      // Button center
      ctx.fillStyle = pressed ? shades[1] : DARK_COLORS[i];
      drawRoundRect(ctx, btnX + 2, btnY + 2, btnW - 4, btnH - 4, 6);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Key letter (pixel-font style)
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = pressed ? '#ffffff' : 'rgba(200,200,220,0.65)';
      ctx.fillText(KEY_LABELS[i], btnX + btnW / 2, btnY + btnH / 2 + 6);

      // Ripple ring on recently pressed
      if (pressed) {
        ctx.strokeStyle = NEON_COLORS[i] + '88';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, btnX - 6, btnY - 6, btnW + 12, btnH + 12, 12);
        ctx.stroke();
      }
    }

    // Hit zone horizontal line
    ctx.fillStyle = 'rgba(200,180,255,0.25)';
    ctx.fillRect(lx, HIT_ZONE_Y, LANE_W * 4, 1);

    // ── Notes (3D bevel effect) ────────────────────────────────────────────────
    if (bs.phase === 'playing' || bs.phase === 'result') {
      for (const note of bs.notes) {
        if (note.state === 'missed' && note.y < HIT_ZONE_Y - 20) continue;
        const nx = lx + note.lane * LANE_W + 5;
        const nw = LANE_W - 10;
        const ny = note.y - 14;
        const nh = 28;
        const shades = LANE_SHADES[note.lane];

        if (note.state === 'hit') {
          // Expanding ring hit effect
          ctx.strokeStyle = NEON_COLORS[note.lane] + '88';
          ctx.lineWidth = 3;
          drawRoundRect(ctx, nx - 6, ny - 6, nw + 12, nh + 12, 10);
          ctx.stroke();
          ctx.strokeStyle = NEON_COLORS[note.lane] + '44';
          ctx.lineWidth = 2;
          drawRoundRect(ctx, nx - 10, ny - 10, nw + 20, nh + 20, 14);
          ctx.stroke();
          continue;
        }

        if (note.state === 'missed') {
          ctx.globalAlpha = 0.28;
        }

        // Glow for notes near hit zone
        const distToHit = Math.abs(note.y - HIT_ZONE_Y);
        if (distToHit < 60 && note.state === 'active') {
          ctx.shadowColor = NEON_COLORS[note.lane];
          ctx.shadowBlur = Math.max(0, (60 - distToHit) / 4);
        }

        // 3D bevel: deep shadow bottom
        ctx.fillStyle = shades[3];
        drawRoundRect(ctx, nx, ny + nh - 4, nw, 5, 3);
        ctx.fill();
        // Right edge: dark
        ctx.fillStyle = shades[2];
        ctx.fillRect(nx + nw - 3, ny + 2, 3, nh - 6);
        // Left edge: slightly lighter
        ctx.fillStyle = shades[1];
        ctx.fillRect(nx, ny + 2, 3, nh - 6);

        // Note body (front face: base color)
        ctx.fillStyle = shades[1];
        drawRoundRect(ctx, nx, ny, nw, nh - 3, 6);
        ctx.fill();

        // Top face: bright highlight
        ctx.fillStyle = shades[0];
        drawRoundRect(ctx, nx + 1, ny + 1, nw - 2, nh / 2 - 2, 5);
        ctx.fill();

        // Gloss reflection strip on top
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        drawRoundRect(ctx, nx + 4, ny + 3, nw - 8, 6, 3);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }

    // ── Hit label flash ────────────────────────────────────────────────────────
    if (bs.lastHitTimer > 0 && bs.lastHitLabel) {
      const alpha = Math.min(1, bs.lastHitTimer * 2.5);
      const yOff = (1 - bs.lastHitTimer / 0.6) * 20;
      ctx.globalAlpha = alpha;

      if (bs.lastHitLabel === 'PERFECT!') {
        // Starburst behind PERFECT
        ctx.fillStyle = '#ffd700';
        const cx = CANVAS_W / 2;
        const cy = HIT_ZONE_Y - 72 - yOff;
        for (let si = 0; si < 8; si++) {
          const ang = (si / 8) * Math.PI * 2;
          const len = 18;
          ctx.fillRect(
            cx + Math.cos(ang) * 8 - 1,
            cy + Math.sin(ang) * 8 - 1,
            Math.cos(ang) * len,
            Math.sin(ang) * len
          );
        }
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;
        ctx.font = 'bold 30px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('PERFECT!', CANVAS_W / 2, HIT_ZONE_Y - 60 - yOff);
        ctx.shadowBlur = 0;
      } else {
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ff99';
        ctx.fillText(bs.lastHitLabel, CANVAS_W / 2, HIT_ZONE_Y - 56 - yOff);
      }

      ctx.globalAlpha = 1;
    }

    // ── Combo display (left side) ──────────────────────────────────────────────
    if (bs.combo > 1 && bs.phase === 'playing') {
      const beatPulseScale = hasSpeaker
        ? 1 + 0.05 * Math.sin((now / 1000) * (beat.bpm / 30) * Math.PI)
        : 1;
      ctx.save();
      ctx.translate(lx - 50, CANVAS_H / 2);
      ctx.scale(beatPulseScale, beatPulseScale);

      // Combo glow
      ctx.shadowColor = '#ff88ff';
      ctx.shadowBlur = 14;

      // Large combo number
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff88ff';
      ctx.fillText(bs.combo.toString(), 0, 0);

      ctx.shadowBlur = 0;

      // "COMBO" label
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = 'rgba(255,180,255,0.7)';
      ctx.fillText('COMBO', 0, 18);

      ctx.restore();
    }

    // ── HUD: top bar ───────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, CANVAS_W, 58);
    // Top bar border
    ctx.fillStyle = 'rgba(100,80,180,0.45)';
    ctx.fillRect(0, 57, CANVAS_W, 1);

    // Beat name / style
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = beat.color;
    ctx.fillText(`♫ ${beat.name.toUpperCase()}`, 12, 20);
    ctx.fillStyle = 'rgba(200,180,255,0.6)';
    ctx.fillText(beat.style, 12, 36);
    ctx.fillStyle = 'rgba(200,180,255,0.4)';
    ctx.fillText(`${beat.bpm} BPM`, 12, 50);

    // Difficulty dots
    for (let d = 0; d < 5; d++) {
      ctx.fillStyle = d < beat.difficulty ? beat.color : 'rgba(100,80,140,0.4)';
      ctx.fillRect(90 + d * 8, 43, 5, 5);
    }

    // Player score
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#88aaff';
    ctx.fillText('YOU', CANVAS_W / 2 - 80, 20);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(bs.playerScore.toString(), CANVAS_W / 2 - 80, 48);

    // VS divider
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff88aa';
    ctx.fillText('VS', CANVAS_W / 2, 35);

    // Opponent score
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ff8888';
    ctx.fillText('NOVA', CANVAS_W / 2 + 80, 20);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(bs.opponentScore.toString(), CANVAS_W / 2 + 80, 48);

    // Score bar (who's winning)
    const totalPossible = bs.totalNotes * 300;
    const pPct = totalPossible > 0 ? Math.min(1, bs.playerScore / totalPossible) : 0;
    const oPct = totalPossible > 0 ? Math.min(1, bs.opponentScore / totalPossible) : 0;
    const barW = 160;
    const barX = CANVAS_W / 2 - barW / 2;
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(barX, 50, barW, 6);
    // Player bar (left, blue)
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(barX, 50, barW * pPct, 6);
    // Opponent bar (right, red)
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(barX + barW - barW * oPct, 50, barW * oPct, 6);
    // Center divider
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(barX + barW / 2, 48, 1, 10);

    // ── Progress bar (bottom) ──────────────────────────────────────────────────
    if (bs.phase === 'playing') {
      const beatDuration = (beat.totalBeats * 60) / beat.bpm;
      const prog = Math.min(1, bs.elapsed / beatDuration);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, CANVAS_H - 10, CANVAS_W, 10);
      ctx.fillStyle = beat.color;
      ctx.fillRect(0, CANVAS_H - 10, CANVAS_W * prog, 10);
      // Shimmer
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(0, CANVAS_H - 10, CANVAS_W * prog, 2);
    }

    // ── Note hints (better_desk upgrade) ──────────────────────────────────────
    if (bs.phase === 'playing' && state.homeUpgrades.includes('better_desk')) {
      const LOOK_AHEAD = 2.5;
      const upcomingNotes = bs.notes.filter(
        n => n.state === 'active' && n.time - bs.elapsed <= LOOK_AHEAD && n.time > bs.elapsed + 0.3
      );
      for (const n of upcomingNotes) {
        const nx = lx + n.lane * LANE_W + LANE_W / 2;
        ctx.fillStyle = NEON_COLORS[n.lane] + '28';
        ctx.fillRect(lx + n.lane * LANE_W, HIT_ZONE_Y - 24, LANE_W, 48);
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = NEON_COLORS[n.lane] + '99';
        ctx.fillText('▼', nx, HIT_ZONE_Y - 30);
      }
    }

    // ── Countdown phase ────────────────────────────────────────────────────────
    if (bs.phase === 'countdown') {
      // Dark overlay with vignette
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Vignette on top of overlay
      const vgGrad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 80, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W / 2);
      vgGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vgGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Opponent portrait (right side)
      drawNovaPortrait(ctx, CANVAS_W - 160, 80, 130, 180);

      // Large stylized countdown numbers with beat pulse
      const pScale = 1 + 0.12 * Math.sin(now / 180);
      ctx.save();
      ctx.translate(CANVAS_W / 2, CANVAS_H / 2 + 20);
      ctx.scale(pScale, pScale);
      ctx.textAlign = 'center';

      const countLabel = bs.countdown > 0 ? bs.countdown.toString() : 'GO!';
      // Outer glow
      ctx.shadowColor = beat.color;
      ctx.shadowBlur = 40;
      ctx.font = 'bold 100px monospace';
      ctx.fillStyle = beat.color + '88';
      ctx.fillText(countLabel, 2, 2);
      ctx.shadowBlur = 0;
      // Main text
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = beat.color;
      ctx.shadowBlur = 20;
      ctx.fillText(countLabel, 0, 0);
      ctx.shadowBlur = 0;

      ctx.restore();

      // Subtitle
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(200,180,255,0.9)';
      ctx.fillText(`vs NOVA  •  ${beat.name}  •  Use A S D F`, CANVAS_W / 2, CANVAS_H / 2 + 90);

      // Upgrade hint: better_desk
      if (state.homeUpgrades.includes('better_desk')) {
        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(120,220,120,0.8)';
        ctx.fillText('Better Desk active — note hints enabled', CANVAS_W / 2, CANVAS_H / 2 + 118);
      }
    }

    // ── Result phase ───────────────────────────────────────────────────────────
    if (bs.phase === 'result' && bs.result) {
      const won = bs.result === 'win';

      // Background overlay
      ctx.fillStyle = won ? 'rgba(0,20,0,0.88)' : 'rgba(20,0,0,0.88)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (won) {
        // Win: animated sparkles
        drawSparkles(ctx, now);
        // Green victory banner
        ctx.fillStyle = 'rgba(0,60,20,0.85)';
        ctx.fillRect(CANVAS_W / 2 - 220, CANVAS_H / 2 - 110, 440, 70);
        ctx.fillStyle = '#00cc66';
        ctx.fillRect(CANVAS_W / 2 - 220, CANVAS_H / 2 - 110, 440, 2);
        ctx.fillRect(CANVAS_W / 2 - 220, CANVAS_H / 2 - 40, 440, 2);

        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 36;
        ctx.font = 'bold 64px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ff88';
        ctx.fillText('YOU WIN!', CANVAS_W / 2, CANVAS_H / 2 - 55);
        ctx.shadowBlur = 0;
      } else {
        // Lose: static overlay + red text
        drawStaticOverlay(ctx, now);
        ctx.fillStyle = 'rgba(40,0,0,0.7)';
        ctx.fillRect(CANVAS_W / 2 - 220, CANVAS_H / 2 - 110, 440, 70);

        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 20;
        ctx.font = 'bold 64px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff4444';
        ctx.fillText('DEFEATED', CANVAS_W / 2, CANVAS_H / 2 - 55);
        ctx.shadowBlur = 0;
      }

      // Scores
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`Your Score: ${bs.playerScore}`, CANVAS_W / 2, CANVAS_H / 2 + 10);
      ctx.fillText(`Nova's Score: ${bs.opponentScore}`, CANVAS_W / 2, CANVAS_H / 2 + 40);

      // Stats
      const accuracy = bs.totalNotes > 0 ? Math.round((bs.hitNotes / bs.totalNotes) * 100) : 0;
      ctx.font = '14px monospace';
      ctx.fillStyle = 'rgba(200,200,200,0.85)';
      ctx.fillText(`Accuracy: ${accuracy}%  •  Best Combo: x${bs.maxCombo}`, CANVAS_W / 2, CANVAS_H / 2 + 78);

      // Cash reward
      if (won) {
        const cashReward = 150 + (beat.difficulty * 50);
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#ffdd00';
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 10;
        ctx.fillText(`+$${cashReward} earned`, CANVAS_W / 2, CANVAS_H / 2 + 110);
        ctx.shadowBlur = 0;
      }

      // Continue prompt (flashing)
      const flash = Math.sin(now / 280) > 0;
      if (flash) {
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = 'rgba(200,200,255,0.9)';
        ctx.fillText('[ENTER / SPACE] Continue', CANVAS_W / 2, CANVAS_H - 38);
      }
    }

  }, [bs, beat, state.homeUpgrades]);

  // Game loop
  useEffect(() => {
    if (!bs) return;

    const loop = (ts: number) => {
      animRef.current = requestAnimationFrame(loop);

      const dt = lastTimeRef.current !== null ? (ts - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = ts;

      if (bs.phase === 'countdown') {
        countdownTimerRef.current += dt;
        if (countdownTimerRef.current >= 1) {
          countdownTimerRef.current = 0;
          onCountdownTick(performance.now());
        }
      } else if (bs.phase === 'playing') {
        onBattleTick(dt, performance.now());
      }

      render();
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      lastTimeRef.current = null;
      countdownTimerRef.current = 0;
    };
  }, [bs?.phase, render, onBattleTick, onCountdownTick]);

  // Enter/Space to close on result
  useEffect(() => {
    if (bs?.phase !== 'result') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bs?.phase, onClose]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: 'block', imageRendering: 'pixelated' }}
    />
  );
}
