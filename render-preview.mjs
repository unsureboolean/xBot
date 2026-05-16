import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const W = 800, H = 640, TS = 32;

// ── Tile maps (same as game) ──────────────────────────────────────────────────
const TOWN_TILES = [
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [3,0,2,2,2,0,0,0,0,0,0,0,0,2,2,2,0,0,0,0,7,0,0,0,3],
  [3,0,2,0,2,0,0,0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,3],
  [3,0,2,0,2,0,0,0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,3],
  [3,0,2,6,2,0,0,0,0,0,0,0,0,2,6,2,0,0,0,0,0,0,0,0,3],
  [3,0,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,3],
  [3,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,3],
  [3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3],
  [3,0,0,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,7,0,0,7,0,0,3],
  [3,0,0,0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,2,6,2,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3],
  [3,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,3],
  [3,0,2,2,2,0,0,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,3],
  [3,0,2,0,2,0,0,0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,3],
  [3,0,2,0,2,0,0,0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,3],
  [3,0,2,6,2,0,0,0,0,0,0,0,0,2,6,2,0,0,0,0,0,0,0,0,3],
  [3,0,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,3],
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
];

const BUILDING_LABELS = {
  '2-4':  'YOUR PLACE',
  '13-4': 'VINYL VAULT',
  '9-10': "CASS'S CAFE",
  '2-17': 'THE FREQUENCY',
  '13-17':'BASSLINE BAR',
};

const DOORS = [
  { x:3,  y:4,  label:'YOUR PLACE' },
  { x:14, y:4,  label:'VINYL VAULT' },
  { x:10, y:10, label:"CASS'S CAFE" },
  { x:3,  y:17, label:'THE FREQUENCY' },
  { x:14, y:17, label:'BASSLINE BAR' },
];

// ── Draw helpers ──────────────────────────────────────────────────────────────
function drawGrass(ctx, px, py) {
  ctx.fillStyle = '#5a8a3c';
  ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = '#4a7a30';
  ctx.fillRect(px, py, TS, 1);
  ctx.fillRect(px, py, 1, TS);
  // grass tufts
  ctx.fillStyle = '#4a7a30';
  if ((px/TS + py/TS) % 3 === 0) ctx.fillRect(px+6,  py+10, 2, 5);
  if ((px/TS + py/TS) % 5 === 1) ctx.fillRect(px+20, py+6,  2, 6);
}

function drawPath(ctx, px, py) {
  ctx.fillStyle = '#c4a882';
  ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = '#b89870';
  ctx.fillRect(px, py, TS, 1);
  ctx.fillRect(px, py, 1, TS);
  ctx.fillStyle = '#d4b892';
  ctx.fillRect(px+2, py+2, TS-3, TS-3);
  // pebble details
  ctx.fillStyle = '#b89870';
  if ((px/TS) % 2 === 0) { ctx.fillRect(px+8,  py+14, 3, 2); ctx.fillRect(px+18, py+20, 4, 2); }
  else                   { ctx.fillRect(px+20, py+8,  3, 2); ctx.fillRect(px+10, py+22, 4, 2); }
}

function drawWall(ctx, px, py) {
  ctx.fillStyle = '#4a3f36';
  ctx.fillRect(px, py, TS, TS);
  // brick pattern
  ctx.fillStyle = '#3a3028';
  const row = Math.floor(py / TS);
  const offset = (row % 2) * 8;
  for (let bx = offset; bx < TS; bx += 16) {
    ctx.fillRect(px+bx, py, 1, TS);
  }
  ctx.fillRect(px, py+8,  TS, 1);
  ctx.fillRect(px, py+24, TS, 1);
  // Roof-like top highlight
  ctx.fillStyle = '#6a5f56';
  ctx.fillRect(px, py, TS, 3);
  // Left highlight
  ctx.fillStyle = '#5a4f44';
  ctx.fillRect(px, py+3, 2, TS-3);
}

function drawTree(ctx, px, py) {
  // Trunk
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(px+TS*0.38, py+TS*0.5, TS*0.24, TS*0.5);
  // Shadow under canopy
  ctx.fillStyle = '#1a3a0a';
  ctx.fillRect(px+TS*0.08, py+TS*0.08, TS*0.84, TS*0.74);
  // Outer canopy
  ctx.fillStyle = '#2d5a1b';
  ctx.fillRect(px+TS*0.12, py+TS*0.10, TS*0.76, TS*0.68);
  // Mid canopy
  ctx.fillStyle = '#3d7a2b';
  ctx.fillRect(px+TS*0.18, py+TS*0.16, TS*0.64, TS*0.52);
  // Highlight
  ctx.fillStyle = '#4d9a38';
  ctx.fillRect(px+TS*0.24, py+TS*0.18, TS*0.36, TS*0.28);
  // Star highlight
  ctx.fillStyle = '#5ab044';
  ctx.fillRect(px+TS*0.34, py+TS*0.20, TS*0.16, TS*0.12);
}

function drawDoor(ctx, px, py) {
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(px+2, py+2, TS-4, TS-4);
  ctx.fillStyle = '#a07840';
  ctx.fillRect(px+4, py+4, TS-8, TS-8);
  ctx.fillStyle = '#c49060';
  ctx.fillRect(px+6, py+6, TS-12, TS-12);
  // Door panel details
  ctx.fillStyle = '#8b6030';
  ctx.fillRect(px+6,  py+6,  TS-12, 6);
  ctx.fillRect(px+6,  py+16, TS-12, 6);
  // Knob
  ctx.fillStyle = '#f0d080';
  ctx.fillRect(px+TS*0.68, py+TS*0.45, 4, 4);
  ctx.fillStyle = '#ffee80';
  ctx.fillRect(px+TS*0.69, py+TS*0.46, 2, 2);
}

function drawFlower(ctx, px, py) {
  ctx.fillStyle = '#5a8a3c';
  ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = '#4a7a30';
  ctx.fillRect(px, py, TS, 1);
  // Multiple flowers
  const flowers = [
    { x: px+8,  y: py+8,  c: '#e8706a', h: '#ff9090' },
    { x: px+18, y: py+18, c: '#f0c040', h: '#fff070' },
    { x: px+22, y: py+8,  c: '#e87aaa', h: '#ffa0c0' },
  ];
  for (const f of flowers) {
    ctx.fillStyle = '#3a6a1a';
    ctx.fillRect(f.x+1, f.y+3, 2, 6);
    ctx.fillStyle = f.c;
    ctx.fillRect(f.x-3, f.y,   6, 2);
    ctx.fillRect(f.x-1, f.y-2, 2, 6);
    ctx.fillStyle = f.h;
    ctx.fillRect(f.x-1, f.y,   2, 2);
  }
}

function drawPlayer(ctx, px, py) {
  const bx = px + TS/2;
  const by = py + TS*0.1;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(bx-8, py+TS-5, 16, 5);
  // Legs
  ctx.fillStyle = '#2c3e6a';
  ctx.fillRect(bx-5, by+20, 4, 8);
  ctx.fillRect(bx+1, by+20, 4, 7);
  // Body (hoodie)
  ctx.fillStyle = '#3d5bbd';
  ctx.fillRect(bx-7, by+11, 14, 10);
  ctx.fillStyle = '#5070d0';
  ctx.fillRect(bx-6, by+11, 5,  9);
  // Arms
  ctx.fillStyle = '#3d5bbd';
  ctx.fillRect(bx-10, by+12, 4, 8);
  ctx.fillRect(bx+6,  by+12, 4, 8);
  // Hands
  ctx.fillStyle = '#f5d5a0';
  ctx.fillRect(bx-10, by+19, 4, 3);
  ctx.fillRect(bx+6,  by+19, 4, 3);
  // Head
  ctx.fillStyle = '#f5d5a0';
  ctx.fillRect(bx-6, by, 12, 12);
  // Hair/hat
  ctx.fillStyle = '#1a0a40';
  ctx.fillRect(bx-7, by, 14, 5);
  ctx.fillRect(bx-8, by+2, 16, 3);
  // Hat brim
  ctx.fillStyle = '#2a1050';
  ctx.fillRect(bx-9, by+4, 18, 2);
  // Eyes
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(bx-3, by+6, 2, 2);
  ctx.fillRect(bx+1, by+6, 2, 2);
  // Headphones
  ctx.fillStyle = '#222';
  ctx.fillRect(bx-8, by+4, 2, 8);
  ctx.fillRect(bx+6, by+4, 2, 8);
  ctx.fillRect(bx-8, by+3, 16, 2);
  ctx.fillStyle = '#555';
  ctx.fillRect(bx-9, by+8, 3, 5);
  ctx.fillRect(bx+6, by+8, 3, 5);
  // Shoes
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(bx-6, by+27, 5, 3);
  ctx.fillRect(bx+1, by+27, 5, 3);
}

function drawNPC(ctx, px, py, color, accent, name) {
  const bob = Math.sin(Date.now()/400 + px) * 0; // static
  const bx = px + TS/2;
  const by = py + TS*0.12;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(bx-7, py+TS-6, 14, 5);
  // Body
  ctx.fillStyle = color;
  ctx.fillRect(bx-6, by+12, 12, 14);
  ctx.fillStyle = accent;
  ctx.fillRect(bx-5, by+12, 4,  12);
  // Arms
  ctx.fillStyle = color;
  ctx.fillRect(bx-9,  by+13, 4, 7);
  ctx.fillRect(bx+5,  by+13, 4, 7);
  // Head
  ctx.fillStyle = '#f5d5a0';
  ctx.fillRect(bx-5, by, 10, 11);
  // Hair
  ctx.fillStyle = accent;
  ctx.fillRect(bx-5, by, 10, 4);
  // Eyes
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(bx-3, by+5, 2, 2);
  ctx.fillRect(bx+1, by+5, 2, 2);
  // Feet
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(bx-5, by+25, 4, 3);
  ctx.fillRect(bx+1, by+25, 4, 3);
  // Name tag
  const tw = name.length * 6 + 8;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(bx - tw/2, py-14, tw, 12);
  ctx.fillStyle = color;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(name, bx, py-5);
}

// ── Build the canvas ──────────────────────────────────────────────────────────
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Background
ctx.fillStyle = '#3a6b24';
ctx.fillRect(0, 0, W, H);

// Tiles
for (let row = 0; row < 20; row++) {
  for (let col = 0; col < 25; col++) {
    const tile = TOWN_TILES[row][col];
    const px = col * TS, py = row * TS;
    switch (tile) {
      case 0: drawGrass(ctx, px, py); break;
      case 1: drawPath(ctx, px, py);  break;
      case 2: drawWall(ctx, px, py);  break;
      case 3: drawTree(ctx, px, py);  break;
      case 6: drawDoor(ctx, px, py);  break;
      case 7: drawFlower(ctx, px, py); break;
    }
  }
}

// Door labels
ctx.font = 'bold 8px monospace';
ctx.textAlign = 'center';
for (const d of DOORS) {
  const px = d.x * TS + TS/2;
  const py = d.y * TS - 5;
  const tw = d.label.length * 5 + 10;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(px - tw/2, py-10, tw, 12);
  ctx.fillStyle = '#f0d080';
  ctx.fillText(d.label, px, py);
}

// NPCs
const npcs = [
  { x:19, y:7,  color:'#2ecc71', accent:'#27ae60', name:'Mojo' },
  { x:17, y:12, color:'#f1c40f', accent:'#f39c12', name:'Luna' },
];
for (const n of npcs) {
  drawNPC(ctx, n.x*TS, n.y*TS, n.color, n.accent, n.name);
}

// Player (walking toward The Frequency)
drawPlayer(ctx, 12*TS, 12*TS);

// ── HUD overlay ───────────────────────────────────────────────────────────────
// Top bar
ctx.fillStyle = 'rgba(5,3,15,0.88)';
ctx.fillRect(0, 0, W, 44);
ctx.strokeStyle = 'rgba(100,80,180,0.5)';
ctx.lineWidth = 1;
ctx.strokeRect(0, 0, W, 44);

ctx.font = 'bold 13px monospace';
ctx.textAlign = 'left';
ctx.fillStyle = '#f0d080';
ctx.fillText('💵 $250', 14, 20);
ctx.fillStyle = '#88aaff';
ctx.fillText('🏆 1 win', 100, 20);
ctx.fillStyle = 'rgba(200,180,255,0.5)';
ctx.fillText('Groove Town', 14, 38);
ctx.fillStyle = '#4a90e2';
ctx.fillText('♫ Chill Vibes', 120, 38);

// Quest badge
ctx.fillStyle = 'rgba(255,200,60,0.15)';
ctx.fillRect(W-120, 8, 108, 26);
ctx.strokeStyle = 'rgba(255,200,60,0.5)';
ctx.lineWidth = 1;
ctx.strokeRect(W-120, 8, 108, 26);
ctx.font = 'bold 11px monospace';
ctx.textAlign = 'center';
ctx.fillStyle = '#f0d080';
ctx.fillText('📋 Quests (1)', W-66, 26);

// Map name watermark
ctx.font = 'bold 11px monospace';
ctx.textAlign = 'left';
ctx.fillStyle = 'rgba(200,180,255,0.35)';
ctx.fillText('GROOVE TOWN  •  use WASD to explore', 14, H-10);

// Interact hint
ctx.fillStyle = 'rgba(0,0,0,0.7)';
ctx.fillRect(W/2-60, H-38, 120, 22);
ctx.font = 'bold 11px monospace';
ctx.textAlign = 'center';
ctx.fillStyle = '#f0d080';
ctx.fillText('[E] Talk to Luna', W/2, H-22);

// Save PNG
const buf = canvas.toBuffer('image/png');
writeFileSync('/home/user/xBot/preview-town.png', buf);
console.log('Saved preview-town.png');
