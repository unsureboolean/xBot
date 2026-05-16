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

// Building palettes
const PALETTES = {
  house:        { roof:['#f07878','#c83838','#901818','#500808'], wall:['#e0cca8','#c4a070','#9a7048','#6a4020'], win:'#a0d8f0', trim:'#804020' },
  record_store: { roof:['#e090f8','#9030c8','#5818a0','#300070'], wall:['#9080c0','#604888','#3c2860','#1c1038'], win:'#ff90e8', trim:'#200058' },
  cafe:         { roof:['#f8c060','#d08028','#9a5810','#623810'], wall:['#d4a878','#a87848','#7a5028','#4a2810'], win:'#fff090', trim:'#603818' },
  dj_club:      { roof:['#5090f0','#2050c0','#0c2870','#060c30'], wall:['#2828a8','#181858','#0c0c38','#060618'], win:'#00ffff', trim:'#0030c0' },
  bar:          { roof:['#78c050','#407828','#204810','#0c2808'], wall:['#987050','#6a4828','#402810','#201408'], win:'#ffb040', trim:'#3a1808' },
};

// Building zones
const BUILDING_ZONES = [
  { building:'house',        rowMin:1,  rowMax:4,  colMin:2,  colMax:4  },
  { building:'record_store', rowMin:1,  rowMax:4,  colMin:13, colMax:15 },
  { building:'cafe',         rowMin:8,  rowMax:10, colMin:9,  colMax:11 },
  { building:'dj_club',      rowMin:14, rowMax:17, colMin:2,  colMax:4  },
  { building:'bar',          rowMin:14, rowMax:17, colMin:13, colMax:15 },
];

function getBuildingZone(row, col) {
  for (const z of BUILDING_ZONES) {
    if (row >= z.rowMin && row <= z.rowMax && col >= z.colMin && col <= z.colMax) {
      const midCol = Math.floor((z.colMin + z.colMax) / 2);
      const midRow = Math.floor((z.rowMin + z.rowMax) / 2);
      return {
        building: z.building,
        isTopRow:    row === z.rowMin,
        isBottomRow: row === z.rowMax,
        isLeftCol:   col === z.colMin,
        isRightCol:  col === z.colMax,
        isCenterCol: col === midCol,
        isCenterRow: row === midRow,
      };
    }
  }
  return null;
}

const DOORS = [
  { x:3,  y:4,  label:'YOUR PLACE' },
  { x:14, y:4,  label:'VINYL VAULT' },
  { x:10, y:10, label:"CASS'S CAFE" },
  { x:3,  y:17, label:'THE FREQUENCY' },
  { x:14, y:17, label:'BASSLINE BAR' },
];

// ── GBA draw helpers ──────────────────────────────────────────────────────────

function drawGrass(ctx, px, py, row, col) {
  ctx.fillStyle = '#5a9a3c';
  ctx.fillRect(px, py, TS, TS);
  const h1 = (row * 7 + col * 13) % TS;
  const h2 = (row * 11 + col * 5) % TS;
  const h3 = (row * 3 + col * 17) % TS;
  ctx.fillStyle = '#426e2a';
  if ((row * 7 + col * 13) % 5 === 0) ctx.fillRect(px + h1 % (TS - 4), py + h2 % (TS - 4), 2, 2);
  ctx.fillStyle = '#3a6a1a';
  const tuftX = (row * 7 + col * 13) % (TS - 4);
  if ((row + col) % 3 !== 0) ctx.fillRect(px + tuftX, py + TS - 8, 2, 4);
  ctx.fillStyle = '#6ab040';
  if ((row + col) % 4 === 1) { ctx.fillRect(px + 2, py + 2, 3, 1); ctx.fillRect(px + 2, py + 2, 1, 3); }
}

function drawPath(ctx, px, py, row, col) {
  ctx.fillStyle = '#c8a87c';
  ctx.fillRect(px, py, TS, TS);
  const stoneLayout = (col % 2 === 0)
    ? [{ x:1, y:1, w:TS/2-2, h:TS-2 }, { x:TS/2+1, y:1, w:TS/2-2, h:TS-2 }]
    : [{ x:1, y:1, w:TS-2, h:TS/2-2 }, { x:1, y:TS/2+1, w:TS-2, h:TS/2-2 }];
  for (const s of stoneLayout) {
    ctx.fillStyle = '#e0c89a'; ctx.fillRect(px+s.x, py+s.y, s.w, s.h);
    ctx.fillStyle = '#ead4aa'; ctx.fillRect(px+s.x, py+s.y, s.w, 1); ctx.fillRect(px+s.x, py+s.y, 1, s.h);
    ctx.fillStyle = '#9a7848'; ctx.fillRect(px+s.x+s.w-1, py+s.y, 1, s.h); ctx.fillRect(px+s.x, py+s.y+s.h-1, s.w, 1);
    const crackX = (row*5+col*11) % (s.w-4) + 2;
    ctx.fillStyle = '#7a6038'; ctx.fillRect(px+s.x+crackX, py+s.y+2, 1, s.h-4);
  }
  ctx.fillStyle = '#9a7848';
  if (col % 2 === 0) ctx.fillRect(px+TS/2, py, 1, TS);
  else ctx.fillRect(px, py+TS/2, TS, 1);
}

function drawRoofTile(ctx, px, py, bz) {
  const pal = PALETTES[bz.building];
  if (!pal) return;
  ctx.fillStyle = pal.roof[3]; ctx.fillRect(px, py, TS, 4);
  ctx.fillStyle = pal.roof[2]; ctx.fillRect(px, py+4, TS, 3);
  const body = TS - 7;
  for (let r = 0; r < body; r += 3) {
    ctx.fillStyle = (Math.floor(r/3)%2===0) ? pal.roof[2] : pal.roof[1];
    ctx.fillRect(px, py+7+r, TS, Math.min(3, body-r));
  }
  if (bz.isLeftCol) { ctx.fillStyle=pal.roof[3]; ctx.fillRect(px, py, 2, TS); }
  if (bz.isRightCol) { ctx.fillStyle=pal.roof[3]; ctx.fillRect(px+TS-2, py, 2, TS); }
  if (bz.isCenterCol) { ctx.fillStyle=pal.roof[2]; ctx.fillRect(px+TS/2-1, py+4, 2, TS-4); }
  ctx.fillStyle = '#080808'; ctx.fillRect(px, py, TS, 1);
  if (bz.isLeftCol) ctx.fillRect(px, py, 1, TS);
  if (bz.isRightCol) ctx.fillRect(px+TS-1, py, 1, TS);
}

function drawWallTile(ctx, px, py, bz, row, col) {
  const pal = PALETTES[bz.building];
  if (!pal) return;
  ctx.fillStyle = pal.wall[1]; ctx.fillRect(px, py, TS, TS);
  ctx.fillStyle = pal.wall[2];
  for (let my = 0; my < TS; my += 8) ctx.fillRect(px, py+my, TS, 1);
  const brickOff = (row%2===0) ? 8 : 0;
  for (let bx = brickOff; bx < TS; bx += 16) ctx.fillRect(px+bx, py, 1, TS);
  ctx.fillStyle = pal.wall[0]; ctx.fillRect(px, py, TS, 2); ctx.fillRect(px, py+2, 2, TS-2);
  ctx.fillStyle = pal.wall[3]; ctx.fillRect(px, py+TS-2, TS, 2); ctx.fillRect(px+TS-2, py, 2, TS);
  if (bz.isLeftCol) { ctx.fillStyle=pal.wall[3]; ctx.fillRect(px, py, 2, TS); }
  if (bz.isRightCol) { ctx.fillStyle=pal.wall[3]; ctx.fillRect(px+TS-2, py, 2, TS); }
  if (bz.isCenterCol && bz.isCenterRow) {
    const wx = px+(TS-12)/2, wy = py+(TS-16)/2;
    ctx.fillStyle=pal.trim; ctx.fillRect(wx-2, wy-2, 16, 20);
    ctx.fillStyle=pal.win; ctx.fillRect(wx, wy, 12, 16);
    ctx.fillStyle=pal.trim; ctx.fillRect(wx+5, wy, 2, 16); ctx.fillRect(wx, wy+7, 12, 2);
    ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillRect(wx+1, wy+1, 4, 3);
  }
  if (bz.isLeftCol) { ctx.fillStyle='#080808'; ctx.fillRect(px, py, 1, TS); }
  if (bz.isRightCol) { ctx.fillStyle='#080808'; ctx.fillRect(px+TS-1, py, 1, TS); }
}

function drawBuilding(ctx, px, py, row, col) {
  const bz = getBuildingZone(row, col);
  if (!bz) { ctx.fillStyle='#4a3f36'; ctx.fillRect(px, py, TS, TS); return; }
  if (bz.isTopRow) drawRoofTile(ctx, px, py, bz);
  else drawWallTile(ctx, px, py, bz, row, col);
}

function drawTree(ctx, px, py) {
  const tx=px+TS*0.38, ty=py+TS*0.5, tw=TS*0.24, th=TS*0.5;
  ctx.fillStyle='#3a2010'; ctx.fillRect(tx+tw-2, ty, 2, th);
  ctx.fillStyle='#6b4423'; ctx.fillRect(tx, ty, tw, th);
  ctx.fillStyle='#8a5c30'; ctx.fillRect(tx, ty, 2, th);
  ctx.fillStyle='#7a5028'; ctx.fillRect(tx+2, ty, tw-4, th);
  ctx.fillStyle='#080808'; ctx.fillRect(tx-1, ty, 1, th); ctx.fillRect(tx+tw, ty, 1, th);
  ctx.fillStyle='#0e2808'; ctx.fillRect(px+TS*0.06, py+TS*0.46, TS*0.88, TS*0.16);
  ctx.fillStyle='#1e4010'; ctx.fillRect(px+TS*0.08, py+TS*0.08, TS*0.84, TS*0.44);
  ctx.fillStyle='#2d5a1b'; ctx.fillRect(px+TS*0.12, py+TS*0.10, TS*0.76, TS*0.38);
  ctx.fillStyle='#3d7a2b'; ctx.fillRect(px+TS*0.20, py+TS*0.14, TS*0.60, TS*0.28);
  ctx.fillStyle='#4d9a38'; ctx.fillRect(px+TS*0.28, py+TS*0.16, TS*0.36, TS*0.18);
  ctx.fillStyle='#5ab044'; ctx.fillRect(px+TS*0.18, py+TS*0.12, TS*0.20, TS*0.10);
  ctx.fillStyle='#080808';
  ctx.fillRect(px+TS*0.06, py+TS*0.07, TS*0.88, 1);
  ctx.fillRect(px+TS*0.06, py+TS*0.07, 1, TS*0.55);
  ctx.fillRect(px+TS*0.06+TS*0.88-1, py+TS*0.07, 1, TS*0.55);
  ctx.fillRect(px+TS*0.06, py+TS*0.07+TS*0.55-1, TS*0.88, 1);
}

function drawDoor(ctx, px, py, row, col) {
  const bz = getBuildingZone(row, col);
  const pal = bz ? PALETTES[bz.building] : null;
  ctx.fillStyle = pal ? pal.wall[1] : '#c4a070'; ctx.fillRect(px, py, TS, TS);
  const frameC = pal ? pal.wall[3] : '#6a4020';
  ctx.fillStyle=frameC; ctx.fillRect(px+3,py,TS-6,TS); ctx.fillRect(px,py,4,TS); ctx.fillRect(px+TS-4,py,4,TS);
  ctx.fillStyle='#7a4a28'; ctx.fillRect(px+5,py+2,TS-10,TS-4);
  ctx.fillStyle='#6a3818'; ctx.fillRect(px+6,py+4,TS-12,6); ctx.fillRect(px+6,py+13,TS-12,6); ctx.fillRect(px+6,py+22,TS-12,6);
  ctx.fillStyle='#9a6030'; ctx.fillRect(px+7,py+5,TS-14,2); ctx.fillRect(px+7,py+14,TS-14,2); ctx.fillRect(px+7,py+23,TS-14,2);
  ctx.fillStyle='#c08020'; ctx.fillRect(px+Math.floor(TS*0.65),py+Math.floor(TS*0.45),4,4);
  ctx.fillStyle='#f0d060'; ctx.fillRect(px+Math.floor(TS*0.65)+1,py+Math.floor(TS*0.45)+1,2,2);
  ctx.fillStyle='#303030'; ctx.fillRect(px+5,py+TS-4,TS-10,4);
  ctx.fillStyle='#484848'; ctx.fillRect(px+5,py+TS-4,TS-10,1);
  ctx.fillStyle='#080808'; ctx.fillRect(px+4,py,1,TS); ctx.fillRect(px+TS-5,py,1,TS); ctx.fillRect(px+4,py+1,TS-8,1);
}

function drawFlower(ctx, px, py, col) {
  ctx.fillStyle='#5a9a3c'; ctx.fillRect(px, py, TS, TS);
  const flowers=[{x:px+7,y:py+8,c:'#e8706a',h:'#ff9090'},{x:px+19,y:py+18,c:'#f0c040',h:'#fff070'},{x:px+23,y:py+7,c:'#e87aaa',h:'#ffa0c0'}];
  for (const f of flowers) {
    ctx.fillStyle='#3a6a1a'; ctx.fillRect(f.x+1,f.y+3,1,6);
    ctx.fillStyle=f.c; ctx.fillRect(f.x-3,f.y,7,2); ctx.fillRect(f.x,f.y-3,2,7);
    ctx.fillStyle=f.h; ctx.fillRect(f.x,f.y,2,2);
    ctx.fillStyle='#080808'; ctx.fillRect(f.x-4,f.y,1,2); ctx.fillRect(f.x+4,f.y,1,2); ctx.fillRect(f.x,f.y-4,2,1); ctx.fillRect(f.x,f.y+4,2,1);
  }
}

function drawPlayer(ctx, px, py) {
  const bx = Math.floor(px + TS/2);
  const by = Math.floor(py + TS*0.06);
  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(bx-9,py+TS-5,18,5);
  // Jeans
  ctx.fillStyle='#1a2440'; ctx.fillRect(bx-5,by+20,4,8); ctx.fillRect(bx+1,by+20,4,8);
  ctx.fillStyle='#2c3e6a'; ctx.fillRect(bx-4,by+20,2,7); ctx.fillRect(bx+2,by+20,2,7);
  ctx.fillStyle='#3a5080'; ctx.fillRect(bx-4,by+21,1,5);
  // Shoes
  ctx.fillStyle='#1a1a1a'; ctx.fillRect(bx-7,by+27,6,3); ctx.fillRect(bx+1,by+27,6,3);
  ctx.fillStyle='#333333'; ctx.fillRect(bx-7,by+28,6,1); ctx.fillRect(bx+1,by+28,6,1);
  ctx.fillStyle='#f0f0f0'; ctx.fillRect(bx-7,by+27,2,2); ctx.fillRect(bx+5,by+27,2,2);
  // Belt
  ctx.fillStyle='#101010'; ctx.fillRect(bx-7,by+20,14,2);
  // Hoodie
  ctx.fillStyle='#102060'; ctx.fillRect(bx-7,by+17,14,4);
  ctx.fillStyle='#3d5bbd'; ctx.fillRect(bx-7,by+11,14,10);
  ctx.fillStyle='#2040a0'; ctx.fillRect(bx+2,by+11,5,10);
  ctx.fillStyle='#5070d0'; ctx.fillRect(bx-6,by+11,5,9);
  ctx.fillStyle='#6080e0'; ctx.fillRect(bx-6,by+11,2,7);
  ctx.fillStyle='#2a4aa0'; ctx.fillRect(bx-4,by+16,8,4);
  ctx.fillStyle='#4060c0'; ctx.fillRect(bx-4,by+17,8,1); ctx.fillRect(bx-4,by+19,8,1);
  // Arms
  ctx.fillStyle='#304aa0'; ctx.fillRect(bx-11,by+12,5,9); ctx.fillRect(bx+6,by+12,5,9);
  ctx.fillStyle='#3d5bbd'; ctx.fillRect(bx-11,by+12,2,8);
  // Hands
  ctx.fillStyle='#f5c990'; ctx.fillRect(bx-11,by+20,4,3); ctx.fillRect(bx+7,by+20,4,3);
  // Head outline
  ctx.fillStyle='#080808'; ctx.fillRect(bx-7,by-1,14,14);
  // Skin
  ctx.fillStyle='#f5c990'; ctx.fillRect(bx-6,by,12,12);
  ctx.fillStyle='#ffc8a0'; ctx.fillRect(bx-4,by+1,5,3);
  ctx.fillStyle='#c09070'; ctx.fillRect(bx-4,by+9,8,3);
  // Headphone band
  ctx.fillStyle='#111111'; ctx.fillRect(bx-7,by+2,14,2);
  ctx.fillStyle='#333333'; ctx.fillRect(bx-6,by+2,12,1);
  // Ear cups
  ctx.fillStyle='#222222'; ctx.fillRect(bx-10,by+3,4,5); ctx.fillRect(bx+6,by+3,4,5);
  ctx.fillStyle='#444444'; ctx.fillRect(bx-9,by+4,2,3); ctx.fillRect(bx+7,by+4,2,3);
  // Hat crown
  ctx.fillStyle='#1a0a30'; ctx.fillRect(bx-6,by-5,12,6);
  ctx.fillStyle='#2a1a40'; ctx.fillRect(bx-5,by-4,8,3); ctx.fillRect(bx-5,by-4,3,4);
  // Hat brim
  ctx.fillStyle='#1a0a30'; ctx.fillRect(bx-9,by-1,18,3);
  ctx.fillStyle='#0d0518'; ctx.fillRect(bx-9,by+1,18,1);
  // Hair
  ctx.fillStyle='#604040'; ctx.fillRect(bx-6,by,2,4); ctx.fillRect(bx+4,by,2,4);
  // Eyebrows
  ctx.fillStyle='#402010'; ctx.fillRect(bx-4,by+4,3,1); ctx.fillRect(bx+1,by+4,3,1);
  // Eyes
  ctx.fillStyle='#ffffff'; ctx.fillRect(bx-4,by+6,3,3); ctx.fillRect(bx+1,by+6,3,3);
  ctx.fillStyle='#2a1a0a'; ctx.fillRect(bx-3,by+7,2,2); ctx.fillRect(bx+2,by+7,2,2);
}

function drawNPCMojo(ctx, bx, by) {
  ctx.fillStyle='#080808'; ctx.fillRect(bx-8,by+10,16,16); ctx.fillRect(bx-6,by-1,12,13);
  ctx.fillStyle='#1a8a4a'; ctx.fillRect(bx-7,by+11,14,14);
  ctx.fillStyle='#2ecc71'; ctx.fillRect(bx-6,by+11,5,13);
  ctx.fillStyle='#27ae60'; ctx.fillRect(bx-1,by+11,8,13);
  ctx.fillStyle='#18a050'; ctx.fillRect(bx-3,by+18,6,5);
  ctx.fillStyle='#1a8a4a'; ctx.fillRect(bx-11,by+11,5,9); ctx.fillRect(bx+6,by+11,5,9);
  ctx.fillStyle='#4a4030'; ctx.fillRect(bx-5,by+24,4,8); ctx.fillRect(bx+1,by+24,4,8);
  ctx.fillStyle='#282018'; ctx.fillRect(bx-6,by+31,5,3); ctx.fillRect(bx+1,by+31,5,3);
  ctx.fillStyle='#d4a870'; ctx.fillRect(bx-10,by+19,4,3); ctx.fillRect(bx+6,by+19,4,3);
  // Head
  ctx.fillStyle='#080808'; ctx.fillRect(bx-7,by-1,14,13);
  ctx.fillStyle='#d4a870'; ctx.fillRect(bx-6,by,12,11);
  // Beanie
  ctx.fillStyle='#3a5010'; ctx.fillRect(bx-6,by-1,12,6);
  ctx.fillStyle='#4a6820'; ctx.fillRect(bx-6,by+1,12,2);
  ctx.fillStyle='#2a3c0a'; ctx.fillRect(bx-6,by+3,12,2);
  // Eyes
  ctx.fillStyle='#ffffff'; ctx.fillRect(bx-4,by+5,3,3); ctx.fillRect(bx+1,by+5,3,3);
  ctx.fillStyle='#2a1a0a'; ctx.fillRect(bx-3,by+6,2,2); ctx.fillRect(bx+2,by+6,2,2);
  ctx.fillStyle='#402010'; ctx.fillRect(bx-4,by+4,3,1); ctx.fillRect(bx+1,by+4,3,1);
}

function drawNPCLuna(ctx, bx, by) {
  ctx.fillStyle='#080808'; ctx.fillRect(bx-8,by+10,16,16);
  ctx.fillStyle='#b88018'; ctx.fillRect(bx-7,by+11,14,14);
  ctx.fillStyle='#d4a820'; ctx.fillRect(bx-6,by+11,5,13);
  ctx.fillStyle='#c09018'; ctx.fillRect(bx-1,by+11,8,13);
  ctx.fillStyle='#1e2430'; ctx.fillRect(bx-5,by+24,4,8); ctx.fillRect(bx+1,by+24,4,8);
  ctx.fillStyle='#282828'; ctx.fillRect(bx-5,by+31,5,3); ctx.fillRect(bx+1,by+31,5,3);
  ctx.fillStyle='#d4a870'; ctx.fillRect(bx-9,by+20,3,3); ctx.fillRect(bx+6,by+20,3,3);
  ctx.fillStyle='#b88018'; ctx.fillRect(bx-10,by+11,4,10); ctx.fillRect(bx+6,by+11,4,10);
  // Camera
  ctx.fillStyle='#080808'; ctx.fillRect(bx-4,by+17,8,6);
  ctx.fillStyle='#222222'; ctx.fillRect(bx-3,by+18,6,4);
  ctx.fillStyle='#808080'; ctx.fillRect(bx-1,by+19,3,3);
  // Head
  ctx.fillStyle='#080808'; ctx.fillRect(bx-7,by-1,14,13);
  ctx.fillStyle='#d4a870'; ctx.fillRect(bx-6,by,12,11);
  ctx.fillStyle='#3a2818'; ctx.fillRect(bx-6,by-1,12,5); ctx.fillRect(bx+3,by+2,3,6);
  ctx.fillStyle='#ffffff'; ctx.fillRect(bx-4,by+5,3,3); ctx.fillRect(bx+1,by+5,3,3);
  ctx.fillStyle='#2a1a0a'; ctx.fillRect(bx-3,by+6,2,2); ctx.fillRect(bx+2,by+6,2,2);
  ctx.fillStyle='#402010'; ctx.fillRect(bx-4,by+4,3,1); ctx.fillRect(bx+1,by+4,3,1);
}

function drawNPC(ctx, px, py, id, color, name) {
  const bx = Math.floor(px+TS/2), by = Math.floor(py+TS*0.08);
  ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(bx-8,py+TS-6,16,5);
  if (id==='mojo' || id==='mojo_bar') drawNPCMojo(ctx,bx,by);
  else if (id==='luna') drawNPCLuna(ctx,bx,by);
  else {
    ctx.fillStyle='#080808'; ctx.fillRect(bx-7,by,14,25);
    ctx.fillStyle=color; ctx.fillRect(bx-6,by+11,12,13);
    ctx.fillStyle='#d4a870'; ctx.fillRect(bx-5,by,10,11);
  }
  // Name tag
  const tw=name.length*6+12, tx=bx-tw/2, tagY=py-16;
  ctx.fillStyle=color+'cc'; ctx.fillRect(tx+3,tagY,tw-6,13); ctx.fillRect(tx,tagY+3,tw,7); ctx.fillRect(tx+3,tagY+10,tw-6,3);
  ctx.fillStyle='#080808'; ctx.fillRect(tx+3,tagY,tw-6,1); ctx.fillRect(tx+3,tagY+12,tw-6,1); ctx.fillRect(tx,tagY+3,1,7); ctx.fillRect(tx+tw-1,tagY+3,1,7);
  ctx.fillStyle='#ffffff'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
  ctx.fillText(name, bx, tagY+10);
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
    const px = col*TS, py = row*TS;
    switch (tile) {
      case 0: drawGrass(ctx, px, py, row, col); break;
      case 1: drawPath(ctx, px, py, row, col); break;
      case 2: drawBuilding(ctx, px, py, row, col); break;
      case 3: drawTree(ctx, px, py); break;
      case 6: drawDoor(ctx, px, py, row, col); break;
      case 7: drawFlower(ctx, px, py, col); break;
    }
  }
}

// Door labels
ctx.font = 'bold 8px monospace';
ctx.textAlign = 'center';
for (const d of DOORS) {
  const px = d.x*TS + TS/2;
  const py = d.y*TS - 5;
  const tw = d.label.length*5+10;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(px-tw/2, py-10, tw, 12);
  ctx.fillStyle = '#080808'; ctx.fillRect(px-tw/2, py-10, tw, 1); ctx.fillRect(px-tw/2, py+1, tw, 1);
  ctx.fillStyle = '#f0d080'; ctx.fillText(d.label, px, py);
}

// NPCs
const npcs = [
  { x:19, y:7,  id:'mojo', color:'#2ecc71', name:'Mojo' },
  { x:17, y:12, id:'luna', color:'#f1c40f', name:'Luna' },
];
for (const n of npcs) {
  drawNPC(ctx, n.x*TS, n.y*TS, n.id, n.color, n.name);
}

// Player
drawPlayer(ctx, 12*TS, 12*TS);

// ── HUD overlay ───────────────────────────────────────────────────────────────
ctx.fillStyle = 'rgba(5,3,15,0.88)';
ctx.fillRect(0, 0, W, 44);
ctx.fillStyle = 'rgba(100,80,180,0.4)';
ctx.fillRect(0, 43, W, 1);

ctx.font = 'bold 13px monospace';
ctx.textAlign = 'left';
ctx.fillStyle = '#f0d080';
ctx.fillText('\u{1F4B5} $250', 14, 20);
ctx.fillStyle = '#88aaff';
ctx.fillText('\u{1F3C6} 1 win', 100, 20);
ctx.fillStyle = 'rgba(200,180,255,0.5)';
ctx.fillText('Groove Town', 14, 38);
ctx.fillStyle = '#4a90e2';
ctx.fillText('\u{266B} Chill Vibes', 120, 38);

// Quest badge
ctx.fillStyle = 'rgba(255,200,60,0.15)';
ctx.fillRect(W-120, 8, 108, 26);
ctx.fillStyle = 'rgba(255,200,60,0.45)';
ctx.fillRect(W-120, 8, 108, 1);
ctx.fillRect(W-120, 33, 108, 1);
ctx.fillRect(W-120, 8, 1, 26);
ctx.fillRect(W-13, 8, 1, 26);
ctx.font = 'bold 11px monospace';
ctx.textAlign = 'center';
ctx.fillStyle = '#f0d080';
ctx.fillText('\u{1F4CB} Quests (1)', W-66, 26);

// Map name watermark
ctx.font = 'bold 11px monospace';
ctx.textAlign = 'left';
ctx.fillStyle = 'rgba(200,180,255,0.35)';
ctx.fillText('GROOVE TOWN  •  use WASD to explore', 14, H-10);

// Interact hint
ctx.fillStyle = 'rgba(0,0,0,0.75)';
ctx.fillRect(W/2-64, H-40, 128, 24);
ctx.fillStyle = '#080808';
ctx.fillRect(W/2-64, H-40, 128, 1);
ctx.fillRect(W/2-64, H-16, 128, 1);
ctx.font = 'bold 11px monospace';
ctx.textAlign = 'center';
ctx.fillStyle = '#f0d080';
ctx.fillText('[E] Talk to Luna', W/2, H-22);

// Save PNG
const buf = canvas.toBuffer('image/png');
writeFileSync('/home/user/xBot/preview-town.png', buf);
console.log('Saved preview-town.png');
