import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const W = 800, H = 640;
const LANE_W = 90;
const LANE_START_X = (W - LANE_W * 4) / 2;
const HIT_ZONE_Y = 500;

// 4-shade system per lane (highlight, base, shadow, deep shadow)
const LANE_SHADES = [
  ['#ff8888','#ff4444','#cc1111','#660808'],
  ['#88bbff','#4499ff','#1166cc','#083366'],
  ['#ffee88','#ffdd00','#ccaa00','#665500'],
  ['#88ffbb','#44ff88','#11cc55','#086633'],
];
const NEON = ['#ff4444','#4499ff','#ffdd00','#44ff88'];
const DARK = ['#661111','#114466','#665500','#116633'];
const KEYS = ['A','S','D','F'];

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

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

// ── Background ────────────────────────────────────────────────────────────────
ctx.fillStyle = '#050510';
ctx.fillRect(0, 0, W, H);

// Perspective grid converging to vanishing point at top center
const vx = W/2, vy = 30;
const beatColor = '#1abc9c';
// Horizontal lines fading bright at bottom to dark at top
for (let i = 0; i < 14; i++) {
  const t = i/13;
  const y = vy + (H-vy)*t;
  const alpha = t*0.38;
  const r=parseInt(beatColor.slice(1,3),16), g=parseInt(beatColor.slice(3,5),16), b=parseInt(beatColor.slice(5,7),16);
  ctx.strokeStyle=`rgba(${r},${g},${b},${alpha})`; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
}
// Vertical lines converging
for (let i=0; i<=12; i++) {
  const bx=i/12*W;
  const t=Math.abs(i/12-0.5)*2;
  ctx.strokeStyle=`rgba(48,24,96,${0.08+t*0.12})`; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(vx+(bx-vx)*0.02, vy); ctx.lineTo(bx, H); ctx.stroke();
}

// Vignette
const vgGrad = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, W*0.75);
vgGrad.addColorStop(0,'rgba(0,0,0,0)'); vgGrad.addColorStop(1,'rgba(0,0,0,0.45)');
ctx.fillStyle=vgGrad; ctx.fillRect(0,0,W,H);

// ── Lanes ─────────────────────────────────────────────────────────────────────
const lx = LANE_START_X;
for (let i=0; i<4; i++) {
  const x=lx+i*LANE_W;
  // Lane bg gradient
  const lGrad=ctx.createLinearGradient(x,0,x+LANE_W,0);
  lGrad.addColorStop(0,'rgba(10,8,24,0.92)');
  lGrad.addColorStop(0.3,'rgba(22,18,48,0.88)');
  lGrad.addColorStop(0.7,'rgba(22,18,48,0.88)');
  lGrad.addColorStop(1,'rgba(10,8,24,0.92)');
  ctx.fillStyle=lGrad; ctx.fillRect(x,0,LANE_W,H);
  // Subtle glow
  ctx.fillStyle=NEON[i]+14; ctx.fillRect(x,0,LANE_W,H);
  // Chrome rail dividers
  if (i>0) {
    const railGrad=ctx.createLinearGradient(x,0,x+2,0);
    railGrad.addColorStop(0,'#606060'); railGrad.addColorStop(0.5,'#cccccc'); railGrad.addColorStop(1,'#606060');
    ctx.fillStyle=railGrad; ctx.fillRect(x,0,2,H);
  }
}
// Outer borders
ctx.fillStyle='#303060'; ctx.fillRect(lx,0,1,H); ctx.fillRect(lx+LANE_W*4-1,0,1,H);

// ── Notes (3D bevel) ─────────────────────────────────────────────────────────
const notes = [
  { lane:0, y:80  },
  { lane:2, y:160 },
  { lane:1, y:240 },
  { lane:3, y:180 },
  { lane:0, y:310 },
  { lane:2, y:390 },
  { lane:3, y:350 },
  { lane:1, y:440 },
  { lane:2, y:478, near:true },
];

for (const n of notes) {
  const nx=lx+n.lane*LANE_W+5, nw=LANE_W-10, ny=n.y-14, nh=28;
  const shades=LANE_SHADES[n.lane];

  if (n.near) { ctx.shadowColor=NEON[n.lane]; ctx.shadowBlur=22; }

  // 3D bevel
  ctx.fillStyle=shades[3]; rr(ctx,nx,ny+nh-4,nw,5,3); ctx.fill();
  ctx.fillStyle=shades[2]; ctx.fillRect(nx+nw-3,ny+2,3,nh-6);
  ctx.fillStyle=shades[1]; ctx.fillRect(nx,ny+2,3,nh-6);
  // Body
  ctx.fillStyle=shades[1]; rr(ctx,nx,ny,nw,nh-3,6); ctx.fill();
  // Top face highlight
  ctx.fillStyle=shades[0]; rr(ctx,nx+1,ny+1,nw-2,nh/2-2,5); ctx.fill();
  // Gloss
  ctx.fillStyle='rgba(255,255,255,0.22)'; rr(ctx,nx+4,ny+3,nw-8,6,3); ctx.fill();

  ctx.shadowBlur=0;
}

// ── Hit zone buttons ───────────────────────────────────────────────────────────
for (let i=0; i<4; i++) {
  const x=lx+i*LANE_W+4, w=LANE_W-8;
  const pressed = i===2;
  const shades = LANE_SHADES[i];

  const btnX=pressed?x-1:x, btnY=pressed?HIT_ZONE_Y-19:HIT_ZONE_Y-18;
  const btnW=pressed?w+2:w, btnH=pressed?38:36;

  if (pressed) { ctx.shadowColor=NEON[i]; ctx.shadowBlur=24; }

  // Metallic outer ring
  ctx.fillStyle=shades[3]; rr(ctx,btnX-1,btnY-1,btnW+2,btnH+2,9); ctx.fill();
  // Inner ring
  ctx.fillStyle=pressed?shades[0]:shades[2]; rr(ctx,btnX,btnY,btnW,btnH,8); ctx.fill();
  // Button face
  ctx.fillStyle=pressed?shades[0]:shades[3]; rr(ctx,btnX+1,btnY+1,btnW-2,btnH-2,7); ctx.fill();
  // Center
  ctx.fillStyle=pressed?shades[1]:DARK[i]; rr(ctx,btnX+2,btnY+2,btnW-4,btnH-4,6); ctx.fill();

  ctx.shadowBlur=0;

  // Ripple when pressed
  if (pressed) {
    ctx.strokeStyle=NEON[i]+'88'; ctx.lineWidth=2;
    rr(ctx,btnX-6,btnY-6,btnW+12,btnH+12,12); ctx.stroke();
  }

  ctx.font='bold 16px monospace'; ctx.textAlign='center';
  ctx.fillStyle=pressed?'#ffffff':'rgba(200,200,220,0.65)';
  ctx.fillText(KEYS[i], btnX+btnW/2, btnY+btnH/2+6);
}

// Hit zone line
ctx.fillStyle='rgba(200,180,255,0.22)'; ctx.fillRect(lx,HIT_ZONE_Y,LANE_W*4,1);

// ── PERFECT! with starburst ───────────────────────────────────────────────────
const pfx=W/2, pfy=HIT_ZONE_Y-72;
ctx.fillStyle='#ffd700';
for (let si=0; si<8; si++) {
  const ang=(si/8)*Math.PI*2, len=18;
  ctx.fillRect(pfx+Math.cos(ang)*8-1, pfy+Math.sin(ang)*8-1, Math.cos(ang)*len, Math.sin(ang)*len);
}
ctx.shadowColor='#ffd700'; ctx.shadowBlur=20;
ctx.font='bold 30px monospace'; ctx.textAlign='center';
ctx.fillStyle='#ffd700'; ctx.fillText('PERFECT!', W/2, HIT_ZONE_Y-60);
ctx.shadowBlur=0;

// ── Combo display (left) ───────────────────────────────────────────────────────
ctx.shadowColor='#ff88ff'; ctx.shadowBlur=14;
ctx.font='bold 32px monospace'; ctx.textAlign='center';
ctx.fillStyle='#ff88ff'; ctx.fillText('8', lx-50, H/2);
ctx.shadowBlur=0;
ctx.font='bold 10px monospace'; ctx.fillStyle='rgba(255,180,255,0.7)';
ctx.fillText('COMBO', lx-50, H/2+18);

// ── HUD top bar ───────────────────────────────────────────────────────────────
ctx.fillStyle='rgba(0,0,0,0.88)'; ctx.fillRect(0,0,W,58);
ctx.fillStyle='rgba(100,80,180,0.4)'; ctx.fillRect(0,57,W,1);

// Beat info
ctx.font='bold 11px monospace'; ctx.textAlign='left';
ctx.fillStyle='#1abc9c'; ctx.fillText('\u{266B} CHILL VIBES', 12, 20);
ctx.fillStyle='rgba(200,180,255,0.6)'; ctx.fillText('Lo-fi', 12, 36);
ctx.fillStyle='rgba(200,180,255,0.4)'; ctx.fillText('85 BPM', 12, 50);
// Difficulty dots
for (let d=0; d<5; d++) {
  ctx.fillStyle=d<2?'#1abc9c':'rgba(100,80,140,0.4)';
  ctx.fillRect(90+d*8,43,5,5);
}

// Scores
ctx.font='bold 13px monospace'; ctx.textAlign='center';
ctx.fillStyle='#88aaff'; ctx.fillText('YOU', W/2-80, 20);
ctx.font='bold 22px monospace'; ctx.fillStyle='#ffffff'; ctx.fillText('2,400', W/2-80, 46);
ctx.font='bold 14px monospace'; ctx.fillStyle='#ff88aa'; ctx.fillText('VS', W/2, 35);
ctx.font='bold 13px monospace'; ctx.fillStyle='#ff8888'; ctx.fillText('NOVA', W/2+80, 20);
ctx.font='bold 22px monospace'; ctx.fillStyle='#ffffff'; ctx.fillText('1,800', W/2+80, 46);

// Score bar
const barW=160, barX=W/2-barW/2;
ctx.fillStyle='#1a1a2a'; ctx.fillRect(barX,50,barW,6);
ctx.fillStyle='#4488ff'; ctx.fillRect(barX,50,barW*0.57,6);
ctx.fillStyle='#ff4444'; ctx.fillRect(barX+barW-barW*0.43,50,barW*0.43,6);
ctx.fillStyle='#ffffff'; ctx.fillRect(barX+barW/2,48,1,10);

// Progress bar
ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,H-10,W,10);
ctx.fillStyle='#1abc9c'; ctx.fillRect(0,H-10,W*0.6,10);
ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.fillRect(0,H-10,W*0.6,2);

writeFileSync('/home/user/xBot/preview-battle.png', canvas.toBuffer('image/png'));
console.log('Saved preview-battle.png');
