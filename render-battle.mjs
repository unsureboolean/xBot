import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const W = 800, H = 640;
const LANE_W = 90;
const LANE_START_X = (W - LANE_W * 4) / 2;
const HIT_ZONE_Y = 500;
const NEON = ['#ff4444','#4499ff','#ffdd00','#44ff88'];
const DARK  = ['#661111','#114466','#665500','#116633'];

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ── Background ────────────────────────────────────────────────────────────────
ctx.fillStyle = '#050510';
ctx.fillRect(0, 0, W, H);

// Animated grid
ctx.strokeStyle = 'rgba(80,60,140,0.3)';
ctx.lineWidth = 1;
for (let y = 20; y < H; y += 40) {
  ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
}
for (let x = 0; x < W; x += 40) {
  ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
}

// Perspective vanishing point glow
const grad = ctx.createRadialGradient(W/2, 100, 10, W/2, 100, 400);
grad.addColorStop(0, 'rgba(120,80,220,0.18)');
grad.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, W, H);

// ── Lanes ─────────────────────────────────────────────────────────────────────
const lx = LANE_START_X;
for (let i = 0; i < 4; i++) {
  const x = lx + i * LANE_W;
  ctx.fillStyle = 'rgba(20,15,40,0.85)';
  ctx.fillRect(x, 0, LANE_W, H);
  ctx.strokeStyle = `${NEON[i]}33`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, 0, LANE_W, H);
  // Subtle lane gradient from top
  const lGrad = ctx.createLinearGradient(x, 0, x, H);
  lGrad.addColorStop(0, `${NEON[i]}08`);
  lGrad.addColorStop(0.7, `${NEON[i]}00`);
  ctx.fillStyle = lGrad;
  ctx.fillRect(x, 0, LANE_W, H);
}

// ── Notes ─────────────────────────────────────────────────────────────────────
const notes = [
  { lane:0, y: 80  },
  { lane:2, y: 160 },
  { lane:1, y: 240 },
  { lane:3, y: 180 },
  { lane:0, y: 310 },
  { lane:2, y: 390 },
  { lane:3, y: 350 },
  { lane:1, y: 440 },
  // Near hit zone
  { lane:2, y: 478, near: true },
];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

for (const n of notes) {
  const nx = lx + n.lane * LANE_W + 5;
  const nw = LANE_W - 10;
  const ny = n.y - 14;
  const c = NEON[n.lane];

  if (n.near) {
    // glow for near-hit note
    ctx.shadowColor = c;
    ctx.shadowBlur = 20;
  }

  ctx.fillStyle = c;
  rr(ctx, nx, ny, nw, 28, 6);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  rr(ctx, nx+4, ny+3, nw-8, 9, 3);
  ctx.fill();

  // Bottom edge
  ctx.fillStyle = `${c}88`;
  ctx.fillRect(nx+4, ny+22, nw-8, 3);
}

// ── Hit zone buttons ───────────────────────────────────────────────────────────
const KEYS = ['A','S','D','F'];
for (let i = 0; i < 4; i++) {
  const x = lx + i * LANE_W + 4;
  const w = LANE_W - 8;
  const pressed = i === 2; // 'D' is pressed

  if (pressed) {
    ctx.shadowColor = NEON[i];
    ctx.shadowBlur = 18;
  }
  ctx.fillStyle = pressed ? NEON[i] : DARK[i];
  rr(ctx, x, HIT_ZONE_Y-18, w, 36, 8);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Key label
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = pressed ? '#fff' : 'rgba(255,255,255,0.55)';
  ctx.fillText(KEYS[i], x+w/2, HIT_ZONE_Y+7);
}

// ── PERFECT! flash ────────────────────────────────────────────────────────────
ctx.font = 'bold 32px monospace';
ctx.textAlign = 'center';
ctx.fillStyle = '#ffdd00';
ctx.shadowColor = '#ffdd00';
ctx.shadowBlur = 20;
ctx.fillText('PERFECT!', W/2, HIT_ZONE_Y-70);
ctx.shadowBlur = 0;

// Combo
ctx.font = 'bold 14px monospace';
ctx.textAlign = 'right';
ctx.fillStyle = '#ff88ff';
ctx.fillText('8x COMBO', lx - 10, H/2);

// ── HUD top bar ───────────────────────────────────────────────────────────────
ctx.fillStyle = 'rgba(0,0,0,0.85)';
ctx.fillRect(0, 0, W, 58);
ctx.strokeStyle = 'rgba(100,80,180,0.5)';
ctx.lineWidth = 1;
ctx.strokeRect(0, 0, W, 58);

// Beat info
ctx.font = 'bold 11px monospace';
ctx.textAlign = 'left';
ctx.fillStyle = '#1abc9c';
ctx.fillText('♫ CHILL VIBES', 12, 20);
ctx.fillStyle = 'rgba(200,180,255,0.6)';
ctx.fillText('Lo-fi', 12, 36);
ctx.fillStyle = 'rgba(200,180,255,0.4)';
ctx.fillText('85 BPM', 12, 50);

// Player score
ctx.font = 'bold 13px monospace';
ctx.textAlign = 'center';
ctx.fillStyle = '#88aaff';
ctx.fillText('YOU', W/2-80, 20);
ctx.font = 'bold 22px monospace';
ctx.fillStyle = '#ffffff';
ctx.fillText('2,400', W/2-80, 46);

// VS
ctx.font = 'bold 14px monospace';
ctx.fillStyle = '#ff88aa';
ctx.fillText('VS', W/2, 35);

// Opponent score
ctx.font = 'bold 13px monospace';
ctx.fillStyle = '#ff8888';
ctx.fillText('NOVA', W/2+80, 20);
ctx.font = 'bold 22px monospace';
ctx.fillStyle = '#ffffff';
ctx.fillText('1,800', W/2+80, 46);

// Score bar
const barW = 160, barX = W/2 - barW/2;
ctx.fillStyle = '#1a1a2a';
ctx.fillRect(barX, 50, barW, 6);
ctx.fillStyle = '#4488ff';
ctx.fillRect(barX, 50, barW * 0.57, 6);
ctx.fillStyle = '#ff4444';
ctx.fillRect(barX + barW - barW*0.43, 50, barW*0.43, 6);

// Progress bar bottom
ctx.fillStyle = 'rgba(0,0,0,0.6)';
ctx.fillRect(0, H-8, W, 8);
ctx.fillStyle = '#1abc9c';
ctx.fillRect(0, H-8, W*0.6, 8);

// Difficulty stars
ctx.font = '11px monospace';
ctx.textAlign = 'left';
ctx.fillStyle = 'rgba(200,180,255,0.5)';
ctx.fillText('Difficulty: ★★☆☆☆', 12, H-14);

writeFileSync('/home/user/xBot/preview-battle.png', canvas.toBuffer('image/png'));
console.log('Saved preview-battle.png');
