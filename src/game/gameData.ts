import type { MapDef, NPCDef, QuestDef, BeatDef, HomeUpgradeDef, DialogueNode, GameState, BeatNote } from './types';

// Tile types: 0=grass, 1=path, 2=wall, 3=tree, 4=floor, 5=stage, 6=door, 7=flower, 8=furniture/solid
export const TILE_SOLID: Record<number, boolean> = {
  0: false, 1: false, 2: true, 3: true, 4: false,
  5: false, 6: false, 7: false, 8: true,
};

export const TILE_COLORS: Record<number, string> = {
  0: '#5a8a3c',  // grass
  1: '#c4a882',  // path
  2: '#4a3f36',  // wall
  3: '#2d5a1b',  // tree
  4: '#b8a98a',  // floor
  5: '#6a5acd',  // stage
  6: '#8b5e3c',  // door
  7: '#e8706a',  // flower
  8: '#6b5d4f',  // furniture
};

export const TILE_ACCENT: Record<number, string | null> = {
  0: '#4a7a30',
  1: '#b89870',
  2: '#3a3028',
  3: '#1e4010',
  4: null,
  5: null,
  6: null,
  7: '#f0d060',
  8: null,
};

function makeBeatNotes(bpm: number, pattern: [number, number][]): BeatNote[] {
  const bd = 60 / bpm;
  return pattern.map(([lane, beat]) => ({ lane, time: beat * bd }));
}

// ─── MAPS ───────────────────────────────────────────────────────────────────

const TOWN_TILES: number[][] = [
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

const HOUSE_TILES: number[][] = [
  [2,2,2,2,2,2,2,2,2,2,2,2],
  [2,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,8,8,4,4,4,4,8,4,8,2],
  [2,4,8,4,4,4,4,4,4,4,8,2],
  [2,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,8,8,8,4,4,4,4,4,4,2],
  [2,4,8,4,8,4,4,4,4,4,4,2],
  [2,4,4,4,4,4,4,4,4,4,4,2],
  [2,2,2,2,2,6,2,2,2,2,2,2],
];

const RECORD_STORE_TILES: number[][] = [
  [2,2,2,2,2,2,2,2,2,2,2,2],
  [2,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,8,8,8,8,4,8,8,8,4,2],
  [2,4,8,4,4,8,4,8,4,4,2,2],
  [2,4,8,8,8,8,4,8,8,8,4,2],
  [2,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,8,8,8,8,8,8,8,8,4,2],
  [2,4,4,4,4,4,4,4,4,4,4,2],
  [2,2,2,2,2,6,2,2,2,2,2,2],
];

const CAFE_TILES: number[][] = [
  [2,2,2,2,2,2,2,2,2,2,2,2],
  [2,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,8,8,4,4,4,4,8,8,4,2],
  [2,4,8,4,4,4,4,4,8,4,4,2],
  [2,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,8,8,4,4,4,4,8,8,4,2],
  [2,4,8,4,4,4,4,4,8,4,4,2],
  [2,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,8,8,8,8,8,8,8,8,4,2],
  [2,2,2,2,2,6,2,2,2,2,2,2],
];

const DJCLUB_TILES: number[][] = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,4,4,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,4,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,4,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,4,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,4,4,5,5,5,5,5,5,4,4,4,2],
  [2,4,4,4,4,8,8,8,8,4,4,4,4,2],
  [2,4,4,4,4,8,4,4,8,4,4,4,4,2],
  [2,4,4,4,4,4,4,4,4,4,4,4,4,2],
  [2,4,8,8,4,4,4,4,4,4,8,8,4,2],
  [2,4,4,4,4,4,4,4,4,4,4,4,4,2],
  [2,2,2,2,2,2,2,6,2,2,2,2,2,2],
];

export const MAPS: Record<string, MapDef> = {
  town: {
    id: 'town', name: 'Groove Town',
    width: 25, height: 20,
    tiles: TOWN_TILES, tileSize: 32, offsetX: 0, offsetY: 0,
    bgColor: '#3a6b24',
    playerStart: { x: 12, y: 7 },
    doors: [
      { x: 3,  y: 4,  toMap: 'house',        toX: 5, toY: 8 },
      { x: 14, y: 4,  toMap: 'record_store',  toX: 5, toY: 8 },
      { x: 10, y: 10, toMap: 'cafe',          toX: 5, toY: 8 },
      { x: 3,  y: 17, toMap: 'dj_club',       toX: 6, toY: 10 },
      { x: 14, y: 17, toMap: 'bar',           toX: 5, toY: 8  },
    ],
    npcIds: ['mojo', 'luna'],
  },
  house: {
    id: 'house', name: "Your Pad",
    width: 12, height: 10,
    tiles: HOUSE_TILES, tileSize: 32, offsetX: 208, offsetY: 160,
    bgColor: '#1a1a2e',
    playerStart: { x: 5, y: 8 },
    doors: [{ x: 5, y: 9, toMap: 'town', toX: 3, toY: 5 }],
    npcIds: [],
  },
  record_store: {
    id: 'record_store', name: 'Vinyl Vault',
    width: 12, height: 10,
    tiles: RECORD_STORE_TILES, tileSize: 32, offsetX: 208, offsetY: 160,
    bgColor: '#1a0a2e',
    playerStart: { x: 5, y: 8 },
    doors: [{ x: 5, y: 9, toMap: 'town', toX: 14, toY: 5 }],
    npcIds: ['vinyl'],
  },
  cafe: {
    id: 'cafe', name: "Cass's Cafe",
    width: 12, height: 10,
    tiles: CAFE_TILES, tileSize: 32, offsetX: 208, offsetY: 160,
    bgColor: '#1e1208',
    playerStart: { x: 5, y: 8 },
    doors: [{ x: 5, y: 9, toMap: 'town', toX: 10, toY: 11 }],
    npcIds: ['cass'],
  },
  dj_club: {
    id: 'dj_club', name: 'The Frequency',
    width: 14, height: 12,
    tiles: DJCLUB_TILES, tileSize: 32, offsetX: 144, offsetY: 128,
    bgColor: '#050520',
    playerStart: { x: 6, y: 10 },
    doors: [{ x: 7, y: 11, toMap: 'town', toX: 3, toY: 18 }],
    npcIds: ['nova'],
  },
  bar: {
    id: 'bar', name: 'The Bassline Bar',
    width: 12, height: 10,
    tiles: CAFE_TILES, tileSize: 32, offsetX: 208, offsetY: 160,
    bgColor: '#0a0a1a',
    playerStart: { x: 5, y: 8 },
    doors: [{ x: 5, y: 9, toMap: 'town', toX: 14, toY: 18 }],
    npcIds: ['mojo_bar'],
  },
};

// ─── NPCS ────────────────────────────────────────────────────────────────────

export const NPCS: Record<string, NPCDef> = {
  mojo: {
    id: 'mojo', name: 'Mojo',
    color: '#2ecc71', accentColor: '#27ae60',
    positions: { town: { x: 19, y: 7 } },
    dialogueKey: 'mojo',
  },
  luna: {
    id: 'luna', name: 'Luna',
    color: '#f1c40f', accentColor: '#f39c12',
    positions: { town: { x: 17, y: 12 } },
    dialogueKey: 'luna',
  },
  vinyl: {
    id: 'vinyl', name: 'Vinyl',
    color: '#9b59b6', accentColor: '#8e44ad',
    positions: { record_store: { x: 9, y: 7 } },
    dialogueKey: 'vinyl',
  },
  cass: {
    id: 'cass', name: 'Cass',
    color: '#e67e22', accentColor: '#d35400',
    positions: { cafe: { x: 9, y: 7 } },
    dialogueKey: 'cass',
  },
  nova: {
    id: 'nova', name: 'Nova',
    color: '#e74c3c', accentColor: '#c0392b',
    positions: { dj_club: { x: 7, y: 6 } },
    dialogueKey: 'nova',
  },
  mojo_bar: {
    id: 'mojo_bar', name: 'Mojo',
    color: '#2ecc71', accentColor: '#27ae60',
    positions: { bar: { x: 5, y: 6 } },
    dialogueKey: 'mojo_bar',
  },
};

// ─── DIALOGUES ───────────────────────────────────────────────────────────────

export function getDialogue(key: string, state: GameState): Record<string, DialogueNode> {
  const wins = state.totalWins;

  if (key === 'mojo') {
    return {
      default: {
        lines: [
          { speaker: 'Mojo', text: "Yo! You new in town? The music scene here is ALIVE, trust me." },
          { speaker: 'Mojo', text: "They say if you can beat Nova at The Frequency, you're legit. Three wins and this town is yours." },
        ],
        options: wins >= 1
          ? [{ label: "What do you know about beats?", nextKey: 'beats' }, { label: "Thanks, later.", nextKey: 'bye' }]
          : [{ label: "I'll check out The Frequency.", nextKey: 'bye' }],
      },
      beats: {
        lines: [
          { speaker: 'Mojo', text: "Each beat has a soul. Match the rhythm — don't fight it. Hit A, S, D, F when the notes drop." },
          { speaker: 'Mojo', text: "Go visit the Record Store too. Vinyl's got some fire tracks for sale." },
        ],
        options: [{ label: "Good advice.", nextKey: 'bye' }],
      },
      bye: {
        lines: [{ speaker: 'Mojo', text: "Peace. Go make some noise." }],
      },
    };
  }

  if (key === 'mojo_bar') {
    return {
      default: {
        lines: [
          { speaker: 'Mojo', text: wins >= 3 ? "Three wins! They're already talking about you at The Frequency!" : "Come back when you've got a few wins under your belt." },
        ],
      },
    };
  }

  if (key === 'luna') {
    return {
      default: {
        lines: wins === 0
          ? [
              { speaker: 'Luna', text: "Luna Chen, music journalist. You heading to The Frequency?" },
              { speaker: 'Luna', text: "Nova's been undefeated for months. I'm here to document the moment someone finally takes them down. Could be you?" },
            ]
          : wins >= 3
          ? [
              { speaker: 'Luna', text: `${wins} wins! You're the story I've been waiting for.` },
              { speaker: 'Luna', text: "I'm writing a feature on the new wave of DJs in Groove Town. Can I quote you?" },
            ]
          : [
              { speaker: 'Luna', text: `${wins} win${wins > 1 ? 's' : ''} so far. Keep going — the real test is yet to come.` },
            ],
        options: wins >= 1
          ? [{ label: "Sure, quote me.", nextKey: 'quote' }, { label: "Maybe later.", nextKey: 'bye' }]
          : [{ label: "I'll give it a shot.", nextKey: 'bye' }],
      },
      quote: {
        lines: [
          { speaker: 'You', text: "The beats don't lie. You either feel it or you don't." },
          { speaker: 'Luna', text: "Perfect. That's going in the headline." },
        ],
      },
      bye: {
        lines: [{ speaker: 'Luna', text: "Go get that story. I'll be watching." }],
      },
    };
  }

  if (key === 'vinyl') {
    const hasCityPulse = state.unlockedBeats.includes('city_pulse');
    const hasNeonDreams = state.unlockedBeats.includes('neon_dreams');
    return {
      default: {
        lines: [
          { speaker: 'Vinyl', text: "Welcome to the Vinyl Vault. We've got beats you can't find anywhere else." },
          { speaker: 'Vinyl', text: hasCityPulse ? "You've already got City Pulse. Check back after more wins for new stock." : "Got a fresh copy of City Pulse — 120 BPM street energy. Yours for $300." },
        ],
        options: !hasCityPulse
          ? [
              { label: `Buy City Pulse ($300)`, action: { type: 'OPEN_SHOP', payload: {} } },
              { label: "Just browsing.", nextKey: 'bye' },
            ]
          : !hasNeonDreams && wins >= 3
          ? [
              { label: `Buy Neon Dreams ($500)`, action: { type: 'OPEN_SHOP', payload: {} } },
              { label: "Just browsing.", nextKey: 'bye' },
            ]
          : [{ label: "See you around.", nextKey: 'bye' }],
      },
      bye: {
        lines: [{ speaker: 'Vinyl', text: "Come back when you've got the cash." }],
      },
    };
  }

  if (key === 'cass') {
    const quest = state.activeQuests.includes('cass_quest');
    const done = state.completedQuests.includes('cass_quest');
    return {
      default: {
        lines: done
          ? [{ speaker: 'Cass', text: "You're always welcome here. Best coffee in town, on the house." }]
          : quest
          ? [
              { speaker: 'Cass', text: "Win 3 battles and come back. I've got something special for you." },
            ]
          : [
              { speaker: 'Cass', text: "Hey hon! Pull up a chair. This cafe runs on good vibes and stronger coffee." },
              { speaker: 'Cass', text: "You're the new DJ everyone's talking about? Win 3 battles and I'll give you something for your home studio." },
            ],
        options: !quest && !done
          ? [{ label: "Deal!", action: { type: 'GIVE_QUEST', payload: { questId: 'cass_quest' } } }]
          : quest && wins >= 3
          ? [{ label: "I've got 3 wins!", action: { type: 'GIVE_QUEST', payload: { questId: 'cass_quest_complete' } } }]
          : [{ label: "Thanks, Cass.", nextKey: 'bye' }],
      },
      bye: {
        lines: [{ speaker: 'Cass', text: "Anytime, hon. Door's always open." }],
      },
    };
  }

  if (key === 'nova') {
    const battleNum = wins + 1;
    const beatId = wins === 0 ? 'first_drop' : wins === 1 ? 'chill_vibes' : wins < 4 ? 'city_pulse' : 'neon_dreams';
    return {
      default: {
        lines: wins === 0
          ? [
              { speaker: 'Nova', text: "Oh, a challenger. Brave — or just new here." },
              { speaker: 'Nova', text: "Let me show you how we do things at The Frequency. Don't worry, I'll go easy... this time." },
            ]
          : wins < 5
          ? [
              { speaker: 'Nova', text: `Battle ${battleNum}. You're actually getting better. Let's see if you can keep up.` },
            ]
          : [
              { speaker: 'Nova', text: "Five wins. Okay. You're for real. One more round — everything on the line." },
            ],
        options: [
          { label: `Battle! (${BEATS[beatId]?.name ?? 'Unknown'})`, action: { type: 'START_BATTLE', payload: { opponentId: 'nova', beatId } } },
          { label: "Not right now.", nextKey: 'bye' },
        ],
      },
      bye: {
        lines: [{ speaker: 'Nova', text: "Come back when you're ready. I'll be here." }],
      },
    };
  }

  return { default: { lines: [{ speaker: '???', text: '...' }] } };
}

// ─── QUESTS ──────────────────────────────────────────────────────────────────

export const QUESTS: Record<string, QuestDef> = {
  cass_quest: {
    id: 'cass_quest',
    title: "Cass's Challenge",
    description: "Win 3 DJ battles to impress Cass.",
    giver: 'cass',
    type: 'win_battles',
    targetCount: 3,
    rewardCash: 200,
    rewardUpgrade: 'speaker_upgrade',
  },
};

// ─── BEATS ───────────────────────────────────────────────────────────────────

export const BEATS: Record<string, BeatDef> = {
  first_drop: {
    id: 'first_drop',
    name: 'First Drop',
    bpm: 90,
    totalBeats: 16,
    color: '#4a90e2',
    laneColors: ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71'],
    difficulty: 1,
    style: 'Hip-Hop',
    notes: makeBeatNotes(90, [
      [0,0],[2,1],[1,2],[3,3],
      [0,4],[2,5],[1,6],[3,7],
      [0,8],[1,8.5],[2,9],[3,10],[0,11],[2,12],[1,13],[3,14],
    ]),
  },
  chill_vibes: {
    id: 'chill_vibes',
    name: 'Chill Vibes',
    bpm: 85,
    totalBeats: 16,
    color: '#1abc9c',
    laneColors: ['#16a085', '#1abc9c', '#2980b9', '#8e44ad'],
    difficulty: 2,
    style: 'Lo-fi',
    notes: makeBeatNotes(85, [
      [0,0],[3,0.5],[1,1],[2,2],[3,2.5],
      [0,3],[1,4],[2,4.5],[3,5],[0,5.5],
      [1,6],[2,7],[0,7.5],[3,8],
      [1,9],[2,9.5],[0,10],[3,11],[1,11.5],
      [2,12],[0,13],[3,13.5],[1,14],[2,15],
    ]),
  },
  city_pulse: {
    id: 'city_pulse',
    name: 'City Pulse',
    bpm: 120,
    totalBeats: 16,
    color: '#e67e22',
    laneColors: ['#e74c3c', '#e67e22', '#f1c40f', '#e91e63'],
    difficulty: 3,
    style: 'House',
    price: 300,
    notes: makeBeatNotes(120, [
      [0,0],[1,0.5],[2,1],[3,1.5],
      [0,2],[2,2.5],[1,3],[3,3.5],
      [0,4],[1,4.25],[2,4.5],[3,4.75],
      [0,5],[2,5.5],[1,6],[3,6.5],
      [0,7],[1,7.25],[2,7.5],[0,7.75],
      [3,8],[1,8.5],[2,9],[0,9.5],
      [3,10],[1,10.5],[2,11],[3,11.5],
      [0,12],[1,12.5],[2,13],[3,13.5],[0,14],[2,14.5],[1,15],
    ]),
  },
  neon_dreams: {
    id: 'neon_dreams',
    name: 'Neon Dreams',
    bpm: 128,
    totalBeats: 16,
    color: '#9b59b6',
    laneColors: ['#9b59b6', '#8e44ad', '#6c3483', '#e91e63'],
    difficulty: 4,
    style: 'Electro',
    price: 500,
    notes: makeBeatNotes(128, [
      [0,0],[1,0.25],[2,0.5],[3,0.75],
      [0,1],[3,1.25],[2,1.5],[1,1.75],
      [0,2],[2,2.25],[1,2.5],[3,2.75],
      [0,3],[1,3.5],[2,4],[3,4.5],
      [0,5],[1,5.25],[2,5.5],[0,5.75],
      [3,6],[2,6.25],[1,6.5],[3,6.75],
      [0,7],[1,7.5],[0,8],[2,8.25],[3,8.5],
      [1,9],[0,9.5],[2,10],[3,10.5],
      [0,11],[1,11.25],[2,11.5],[3,11.75],
      [0,12],[1,12.5],[2,13],[3,13.5],[0,14],[2,14.5],[1,14.75],[3,15],
    ]),
  },
  midnight_bass: {
    id: 'midnight_bass',
    name: 'Midnight Bass',
    bpm: 140,
    totalBeats: 16,
    color: '#c0392b',
    laneColors: ['#c0392b', '#e74c3c', '#e91e63', '#ff5722'],
    difficulty: 5,
    style: 'Drum & Bass',
    notes: makeBeatNotes(140, [
      [0,0],[1,0.25],[2,0.5],[3,0.75],[0,1],[1,1.25],[2,1.5],[3,1.75],
      [0,2],[2,2.25],[1,2.5],[0,2.75],[3,3],[1,3.25],[2,3.5],[0,3.75],
      [3,4],[2,4.25],[1,4.5],[0,4.75],[3,5],[2,5.25],[0,5.5],[1,5.75],
      [2,6],[3,6.25],[0,6.5],[1,6.75],[2,7],[3,7.25],[0,7.5],[1,7.75],
      [0,8],[2,8.25],[3,8.5],[1,8.75],[0,9],[3,9.25],[2,9.5],[1,9.75],
      [0,10],[1,10.5],[2,11],[3,11.5],[0,12],[1,12.25],[2,12.5],[3,12.75],
      [0,13],[1,13.25],[2,13.5],[3,13.75],[0,14],[1,14.5],[2,15],[3,15.5],
    ]),
  },
};

// ─── HOME UPGRADES ───────────────────────────────────────────────────────────

export const HOME_UPGRADES: HomeUpgradeDef[] = [
  {
    id: 'better_desk',
    name: 'Better Desk',
    description: 'Upgrade your workspace. Shows note hints during battles.',
    cost: 150,
  },
  {
    id: 'speaker_upgrade',
    name: 'Speaker System',
    description: 'Thumping speakers. Visual beat pulse in DJ battles.',
    cost: 0,
  },
  {
    id: 'record_collection',
    name: 'Record Collection',
    description: 'Wall of wax. Expands the hit window by 10ms.',
    cost: 400,
    requires: 'better_desk',
  },
  {
    id: 'studio_lights',
    name: 'Studio Lights',
    description: "Colorful LED rig. Pure flex — it looks amazing.",
    cost: 250,
  },
  {
    id: 'pro_mixer',
    name: 'Pro Mixer',
    description: 'The real deal. Doubles combo multiplier.',
    cost: 800,
    requires: 'record_collection',
  },
];

// Battle difficulty progression per opponent
export function getBattleBeatId(opponentId: string, wins: number): string {
  if (opponentId === 'nova') {
    if (wins === 0) return 'first_drop';
    if (wins === 1) return 'chill_vibes';
    if (wins === 2) return 'city_pulse';
    if (wins === 3) return 'neon_dreams';
    return 'midnight_bass';
  }
  return 'first_drop';
}
