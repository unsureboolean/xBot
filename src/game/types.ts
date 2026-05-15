export interface Position {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface DoorDef {
  x: number;
  y: number;
  toMap: string;
  toX: number;
  toY: number;
}

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: number[][];
  tileSize: number;
  offsetX: number;
  offsetY: number;
  doors: DoorDef[];
  npcIds: string[];
  playerStart: Position;
  bgColor: string;
  music?: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export type DialogueActionType =
  | 'START_BATTLE'
  | 'GIVE_QUEST'
  | 'CLOSE_DIALOGUE'
  | 'OPEN_SHOP';

export interface DialogueAction {
  type: DialogueActionType;
  payload?: Record<string, string | number | boolean>;
}

export interface DialogueOption {
  label: string;
  nextKey?: string;
  action?: DialogueAction;
}

export interface DialogueNode {
  lines: DialogueLine[];
  options?: DialogueOption[];
}

export interface NPCDef {
  id: string;
  name: string;
  color: string;
  accentColor: string;
  positions: Record<string, Position>;
  dialogueKey: string;
}

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  giver: string;
  type: 'win_battles' | 'talk_to_npc' | 'buy_beat';
  targetCount: number;
  targetId?: string;
  rewardCash: number;
  rewardBeatId?: string;
  rewardUpgrade?: string;
}

export interface BeatNote {
  lane: number;
  time: number;
}

export interface BeatDef {
  id: string;
  name: string;
  bpm: number;
  totalBeats: number;
  notes: BeatNote[];
  color: string;
  laneColors: [string, string, string, string];
  difficulty: number;
  style: string;
  price?: number;
  unlockCondition?: string;
}

export interface HomeUpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  requires?: string;
  tileOverrides?: Array<{ x: number; y: number; tile: number }>;
}

export type GameScreen = 'world' | 'battle' | 'upgrade' | 'questlog' | 'shop';

export interface BattleNote extends BeatNote {
  noteId: number;
  y: number;
  state: 'active' | 'hit' | 'missed';
  hitScore?: number;
}

export interface BattleState {
  opponentId: string;
  beatId: string;
  phase: 'countdown' | 'playing' | 'result';
  countdown: number;
  startTime: number;
  elapsed: number;
  playerScore: number;
  opponentScore: number;
  combo: number;
  maxCombo: number;
  totalNotes: number;
  hitNotes: number;
  notes: BattleNote[];
  result?: 'win' | 'lose';
  lastHitLabel?: string;
  lastHitTimer: number;
}

export interface ActiveDialogue {
  npcId: string;
  nodeKey: string;
  lineIndex: number;
}

export interface GameState {
  screen: GameScreen;
  mapId: string;
  playerPos: Position;
  playerFacing: Direction;
  cash: number;
  totalWins: number;
  unlockedBeats: string[];
  equippedBeat: string;
  completedQuests: string[];
  activeQuests: string[];
  questProgress: Record<string, number>;
  homeUpgrades: string[];
  npcMet: Record<string, boolean>;
  activeDialogue?: ActiveDialogue;
  battleState?: BattleState;
  shopBeatIds?: string[];
  notification?: { text: string; timer: number };
  lastBeatUnlocked?: string;
  playerStep: number;
}
