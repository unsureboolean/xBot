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

const NEON_COLORS = ['#ff4444', '#4499ff', '#ffdd00', '#44ff88'];
const DARK_COLORS = ['#661111', '#114466', '#665500', '#116633'];

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

    // ── Background ───────────────────────────────────────────────
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Animated background grid
    ctx.strokeStyle = 'rgba(80, 60, 140, 0.3)';
    ctx.lineWidth = 1;
    const gridOff = (now / 20) % 40;
    for (let y = gridOff; y < CANVAS_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }
    for (let x = 0; x < CANVAS_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }

    // ── Beat pulse (if speaker upgrade) ──────────────────────────
    const hasSpeaker = state.homeUpgrades.includes('speaker_upgrade');
    if (hasSpeaker && bs.phase === 'playing') {
      const pulseBeat = (bs.elapsed * beat.bpm) / 60;
      const pulseAmt = Math.max(0, 1 - (pulseBeat % 1) * 2);
      ctx.fillStyle = `rgba(100, 80, 200, ${pulseAmt * 0.15})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // ── Lanes ─────────────────────────────────────────────────────
    const lx = LANE_START_X;
    for (let i = 0; i < 4; i++) {
      const x = lx + i * LANE_W;
      // Lane bg
      ctx.fillStyle = 'rgba(20, 15, 40, 0.8)';
      ctx.fillRect(x, 0, LANE_W, CANVAS_H);
      ctx.strokeStyle = 'rgba(100, 80, 160, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, 0, LANE_W, CANVAS_H);

      // Pressed lane glow
      if (pressedRef.current.has(i)) {
        ctx.fillStyle = `${NEON_COLORS[i]}22`;
        ctx.fillRect(x, 0, LANE_W, CANVAS_H);
      }
    }

    // ── Hit zone line ─────────────────────────────────────────────
    for (let i = 0; i < 4; i++) {
      const x = lx + i * LANE_W + 4;
      const w = LANE_W - 8;

      // Hit zone button
      const pressed = pressedRef.current.has(i);
      ctx.fillStyle = pressed ? NEON_COLORS[i] : DARK_COLORS[i];
      drawRoundRect(ctx, x, HIT_ZONE_Y - 18, w, 36, 8);
      ctx.fill();

      // Glow effect when pressed
      if (pressed) {
        ctx.shadowColor = NEON_COLORS[i];
        ctx.shadowBlur = 15;
        drawRoundRect(ctx, x, HIT_ZONE_Y - 18, w, 36, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Key label
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = pressed ? '#fff' : 'rgba(255,255,255,0.5)';
      ctx.fillText(KEY_LABELS[i], x + w / 2, HIT_ZONE_Y + 7);
    }

    // ── Notes ─────────────────────────────────────────────────────
    if (bs.phase === 'playing' || bs.phase === 'result') {
      for (const note of bs.notes) {
        if (note.state === 'missed' && note.y < HIT_ZONE_Y - 20) continue;
        const x = lx + note.lane * LANE_W + 4;
        const w = LANE_W - 8;
        const y = note.y - 14;

        if (note.state === 'hit') {
          // Hit effect: expanding ring
          const age = 0.3;
          ctx.strokeStyle = `${NEON_COLORS[note.lane]}88`;
          ctx.lineWidth = 3;
          drawRoundRect(ctx, x - 5, y - 5, w + 10, 38, 8);
          ctx.stroke();
          continue;
        }

        if (note.state === 'missed') {
          ctx.globalAlpha = 0.3;
        }

        // Note body
        const nc = beat.laneColors[note.lane] ?? NEON_COLORS[note.lane];
        ctx.fillStyle = nc;
        drawRoundRect(ctx, x, y, w, 28, 6);
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        drawRoundRect(ctx, x + 4, y + 3, w - 8, 8, 3);
        ctx.fill();

        ctx.globalAlpha = 1;
      }
    }

    // ── Hit label flash ───────────────────────────────────────────
    if (bs.lastHitTimer > 0 && bs.lastHitLabel) {
      const alpha = Math.min(1, bs.lastHitTimer * 2);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = bs.lastHitLabel === 'PERFECT!' ? '#ffdd00' : '#44ff88';
      ctx.fillText(bs.lastHitLabel, CANVAS_W / 2, HIT_ZONE_Y - 60);
      ctx.globalAlpha = 1;
    }

    // ── Combo display ─────────────────────────────────────────────
    if (bs.combo > 1 && bs.phase === 'playing') {
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ff88ff';
      ctx.fillText(`${bs.combo}x COMBO`, lx - 10, CANVAS_H / 2);
    }

    // ── HUD: top bar ──────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, CANVAS_W, 58);
    ctx.strokeStyle = 'rgba(100,80,180,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, CANVAS_W, 58);

    // Beat name / style
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = beat.color;
    ctx.fillText(`♫ ${beat.name.toUpperCase()}`, 12, 20);
    ctx.fillStyle = 'rgba(200,180,255,0.6)';
    ctx.fillText(beat.style, 12, 36);
    ctx.fillStyle = 'rgba(200,180,255,0.4)';
    ctx.fillText(`${beat.bpm} BPM`, 12, 50);

    // Player score
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#88aaff';
    ctx.fillText('YOU', CANVAS_W / 2 - 80, 22);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(bs.playerScore.toString(), CANVAS_W / 2 - 80, 48);

    // VS
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff88aa';
    ctx.fillText('VS', CANVAS_W / 2, 35);

    // Opponent score
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ff8888';
    ctx.fillText('NOVA', CANVAS_W / 2 + 80, 22);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(bs.opponentScore.toString(), CANVAS_W / 2 + 80, 48);

    // Score bar (who's winning)
    const totalPossible = bs.totalNotes * 300;
    const pPct = totalPossible > 0 ? Math.min(1, bs.playerScore / totalPossible) : 0;
    const oPct = totalPossible > 0 ? Math.min(1, bs.opponentScore / totalPossible) : 0;
    const barW = 160;
    const barX = CANVAS_W / 2 - barW / 2;
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, 58 - 8, barW, 6);
    // Player bar (left side, blue)
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(barX, 58 - 8, barW * pPct, 6);
    // Opponent bar (right side, red) — overlap shows who's ahead
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(barX + barW - barW * oPct, 58 - 8, barW * oPct, 6);

    // ── Progress bar (bottom) ─────────────────────────────────────
    if (bs.phase === 'playing') {
      const beatDuration = (beat.totalBeats * 60) / beat.bpm;
      const prog = Math.min(1, bs.elapsed / beatDuration);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, CANVAS_H - 8, CANVAS_W, 8);
      ctx.fillStyle = beat.color;
      ctx.fillRect(0, CANVAS_H - 8, CANVAS_W * prog, 8);
    }

    // ── Countdown phase ───────────────────────────────────────────
    if (bs.phase === 'countdown') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.font = 'bold 100px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = beat.color;
      ctx.shadowBlur = 30;
      ctx.fillText(bs.countdown > 0 ? bs.countdown.toString() : 'GO!', CANVAS_W / 2, CANVAS_H / 2 + 30);
      ctx.shadowBlur = 0;

      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = 'rgba(200,180,255,0.9)';
      ctx.fillText(`vs NOVA  •  ${beat.name}  •  Use A S D F`, CANVAS_W / 2, CANVAS_H / 2 + 80);

      // Hint: has desk upgrade?
      if (state.homeUpgrades.includes('better_desk')) {
        ctx.font = '12px monospace';
        ctx.fillStyle = 'rgba(150,230,150,0.8)';
        ctx.fillText('Hint: Better Desk active — note hints enabled', CANVAS_W / 2, CANVAS_H / 2 + 110);
      }
    }

    // ── Note hints (better_desk upgrade) ─────────────────────────
    if (bs.phase === 'playing' && state.homeUpgrades.includes('better_desk')) {
      const LOOK_AHEAD = 2.5;
      const upcomingNotes = bs.notes.filter(n => n.state === 'active' && n.time - bs.elapsed <= LOOK_AHEAD && n.time > bs.elapsed + 0.3);
      for (const n of upcomingNotes) {
        const x = lx + n.lane * LANE_W + LANE_W / 2;
        ctx.fillStyle = `${NEON_COLORS[n.lane]}22`;
        ctx.fillRect(lx + n.lane * LANE_W, HIT_ZONE_Y - 24, LANE_W, 48);
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = `${NEON_COLORS[n.lane]}88`;
        ctx.fillText('▼', x, HIT_ZONE_Y - 30);
      }
    }

    // ── Result phase ──────────────────────────────────────────────
    if (bs.phase === 'result' && bs.result) {
      const won = bs.result === 'win';

      ctx.fillStyle = won ? 'rgba(0,30,0,0.85)' : 'rgba(30,0,0,0.85)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Result banner
      ctx.fillStyle = won ? '#00ff88' : '#ff4444';
      ctx.shadowColor = won ? '#00ff88' : '#ff4444';
      ctx.shadowBlur = 40;
      ctx.font = 'bold 64px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(won ? 'YOU WIN!' : 'DEFEATED', CANVAS_W / 2, CANVAS_H / 2 - 80);
      ctx.shadowBlur = 0;

      // Scores
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Your Score: ${bs.playerScore}`, CANVAS_W / 2, CANVAS_H / 2);
      ctx.fillText(`Nova's Score: ${bs.opponentScore}`, CANVAS_W / 2, CANVAS_H / 2 + 30);

      // Stats
      const accuracy = bs.totalNotes > 0 ? Math.round((bs.hitNotes / bs.totalNotes) * 100) : 0;
      ctx.font = '14px monospace';
      ctx.fillStyle = 'rgba(200,200,200,0.8)';
      ctx.fillText(`Accuracy: ${accuracy}%  •  Best Combo: x${bs.maxCombo}`, CANVAS_W / 2, CANVAS_H / 2 + 68);

      // Reward preview
      if (won) {
        const cashReward = 150 + (beat.difficulty * 50);
        ctx.font = '16px monospace';
        ctx.fillStyle = '#ffdd00';
        ctx.fillText(`+$${cashReward} earned`, CANVAS_W / 2, CANVAS_H / 2 + 100);
      }

      // Continue prompt (flash)
      const flash = Math.sin(Date.now() / 300) > 0;
      if (flash) {
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = 'rgba(200,200,255,0.9)';
        ctx.fillText('[ENTER / SPACE] Continue', CANVAS_W / 2, CANVAS_H - 40);
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
