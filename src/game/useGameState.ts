import { useReducer, useCallback } from 'react';
import type { GameState, BattleState, BattleNote, Position, Direction } from './types';
import { MAPS, BEATS, HOME_UPGRADES, QUESTS, getDialogue } from './gameData';

export const CANVAS_W = 800;
export const CANVAS_H = 640;

function makeBattleState(opponentId: string, beatId: string): BattleState {
  const beat = BEATS[beatId];
  const beatDuration = (beat.totalBeats * 60) / beat.bpm;
  const notes: BattleNote[] = beat.notes.map((n, i) => ({
    ...n,
    noteId: i,
    y: -20,
    state: 'active',
  }));
  // Opponent score: random but fair (60-80% of max)
  const maxScore = beat.notes.length * 300;
  const opponentScore = Math.floor(maxScore * (0.55 + beat.difficulty * 0.03 + Math.random() * 0.1));
  return {
    opponentId,
    beatId,
    phase: 'countdown',
    countdown: 3,
    startTime: 0,
    elapsed: 0,
    playerScore: 0,
    opponentScore,
    combo: 0,
    maxCombo: 0,
    totalNotes: notes.length,
    hitNotes: 0,
    notes,
    lastHitTimer: 0,
    result: undefined,
  };
}

const initialState: GameState = {
  screen: 'world',
  mapId: 'town',
  playerPos: { x: 12, y: 7 },
  playerFacing: 'down',
  cash: 100,
  totalWins: 0,
  unlockedBeats: ['first_drop'],
  equippedBeat: 'first_drop',
  completedQuests: [],
  activeQuests: [],
  questProgress: {},
  homeUpgrades: [],
  npcMet: {},
  playerStep: 0,
};

type Action =
  | { type: 'MOVE'; dir: Direction }
  | { type: 'ENTER_DOOR'; mapId: string; pos: Position }
  | { type: 'OPEN_DIALOGUE'; npcId: string }
  | { type: 'NEXT_DIALOGUE_LINE' }
  | { type: 'CHOOSE_OPTION'; index: number }
  | { type: 'CLOSE_DIALOGUE' }
  | { type: 'START_BATTLE'; opponentId: string; beatId: string }
  | { type: 'BATTLE_TICK'; dt: number; now: number }
  | { type: 'BATTLE_KEY'; lane: number; now: number }
  | { type: 'BATTLE_COUNTDOWN_TICK'; now: number }
  | { type: 'OPEN_SHOP' }
  | { type: 'BUY_BEAT'; beatId: string }
  | { type: 'OPEN_UPGRADE' }
  | { type: 'BUY_UPGRADE'; upgradeId: string }
  | { type: 'OPEN_QUESTLOG' }
  | { type: 'CLOSE_SCREEN' }
  | { type: 'GIVE_QUEST'; questId: string }
  | { type: 'TICK'; dt: number };

function canMove(state: GameState, nx: number, ny: number): boolean {
  const map = MAPS[state.mapId];
  if (!map) return false;
  if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) return false;
  const tile = map.tiles[ny]?.[nx];
  if (tile === undefined) return false;
  // wall(2) and tree(3) and furniture(8) are solid
  if (tile === 2 || tile === 3 || tile === 8) return false;
  return true;
}

function checkDoor(state: GameState, nx: number, ny: number): { mapId: string; pos: Position } | null {
  const map = MAPS[state.mapId];
  const door = map?.doors.find(d => d.x === nx && d.y === ny);
  if (!door) return null;
  return { mapId: door.toMap, pos: { x: door.toX, y: door.toY } };
}

function checkNpcProximity(state: GameState): string | null {
  const map = MAPS[state.mapId];
  if (!map) return null;
  const { x, y } = state.playerPos;
  for (const npcId of map.npcIds) {
    // import NPCS inline to avoid circular – we'll pass it in
    const npcPositions = getNpcPosition(npcId, state.mapId);
    if (!npcPositions) continue;
    const dx = Math.abs(npcPositions.x - x);
    const dy = Math.abs(npcPositions.y - y);
    if (dx <= 1 && dy <= 1 && (dx + dy) <= 1) return npcId;
  }
  return null;
}

// Lazy import avoidance: inline NPC position lookup
function getNpcPosition(npcId: string, mapId: string): Position | null {
  const npcMap: Record<string, Record<string, Position>> = {
    mojo:     { town: { x: 19, y: 7 } },
    luna:     { town: { x: 17, y: 12 } },
    vinyl:    { record_store: { x: 9, y: 7 } },
    cass:     { cafe: { x: 9, y: 7 } },
    nova:     { dj_club: { x: 7, y: 6 } },
    mojo_bar: { bar: { x: 5, y: 6 } },
  };
  return npcMap[npcId]?.[mapId] ?? null;
}

const HIT_ZONE_Y = 500;
const NOTE_SPEED = 220; // pixels per second
const TRAVEL_TIME = HIT_ZONE_Y / NOTE_SPEED;
const PERFECT_WINDOW = 0.055;
const GOOD_WINDOW = 0.14;
const LANE_W = 90;
const LANE_START_X = (CANVAS_W - LANE_W * 4) / 2;

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {

    case 'TICK': {
      const notif = state.notification;
      if (notif && notif.timer > 0) {
        const remaining = notif.timer - action.dt;
        return { ...state, notification: remaining <= 0 ? undefined : { ...notif, timer: remaining } };
      }
      return state;
    }

    case 'MOVE': {
      if (state.screen !== 'world' || state.activeDialogue) return state;
      const { x, y } = state.playerPos;
      let nx = x, ny = y;
      if (action.dir === 'up') ny--;
      if (action.dir === 'down') ny++;
      if (action.dir === 'left') nx--;
      if (action.dir === 'right') nx++;

      const door = checkDoor(state, nx, ny);
      if (door) {
        return { ...state, mapId: door.mapId, playerPos: door.pos, playerFacing: action.dir, playerStep: state.playerStep + 1 };
      }
      if (!canMove(state, nx, ny)) {
        return { ...state, playerFacing: action.dir };
      }
      return { ...state, playerPos: { x: nx, y: ny }, playerFacing: action.dir, playerStep: state.playerStep + 1 };
    }

    case 'ENTER_DOOR':
      return { ...state, mapId: action.mapId, playerPos: action.pos };

    case 'OPEN_DIALOGUE': {
      const dialogues = getDialogue(action.npcId.replace('_bar', '') === 'mojo' && state.mapId === 'bar' ? 'mojo_bar' : action.npcId, state);
      const node = dialogues['default'];
      if (!node) return state;
      return {
        ...state,
        activeDialogue: { npcId: action.npcId, nodeKey: 'default', lineIndex: 0 },
        npcMet: { ...state.npcMet, [action.npcId]: true },
      };
    }

    case 'NEXT_DIALOGUE_LINE': {
      if (!state.activeDialogue) return state;
      const { npcId, nodeKey, lineIndex } = state.activeDialogue;
      const npcKey = npcId === 'mojo_bar' ? 'mojo_bar' : npcId;
      const dialogues = getDialogue(npcKey, state);
      const node = dialogues[nodeKey];
      if (!node) return { ...state, activeDialogue: undefined };

      const nextLine = lineIndex + 1;
      if (nextLine < node.lines.length) {
        return { ...state, activeDialogue: { ...state.activeDialogue, lineIndex: nextLine } };
      }
      // At end of lines — if no options, close
      if (!node.options || node.options.length === 0) {
        return { ...state, activeDialogue: undefined };
      }
      // Stay at last line, show options
      return state;
    }

    case 'CHOOSE_OPTION': {
      if (!state.activeDialogue) return state;
      const { npcId, nodeKey } = state.activeDialogue;
      const npcKey = npcId === 'mojo_bar' ? 'mojo_bar' : npcId;
      const dialogues = getDialogue(npcKey, state);
      const node = dialogues[nodeKey];
      if (!node?.options) return state;
      const opt = node.options[action.index];
      if (!opt) return state;

      // Handle action
      if (opt.action) {
        const act = opt.action;
        if (act.type === 'START_BATTLE') {
          const oppId = (act.payload?.opponentId as string) ?? 'nova';
          const beatId = (act.payload?.beatId as string) ?? 'first_drop';
          const bs = makeBattleState(oppId, beatId);
          return { ...state, activeDialogue: undefined, screen: 'battle', battleState: bs };
        }
        if (act.type === 'GIVE_QUEST') {
          const qid = act.payload?.questId as string;
          if (qid === 'cass_quest_complete') {
            // Complete the quest
            const reward = QUESTS['cass_quest'];
            return {
              ...state,
              activeDialogue: undefined,
              cash: state.cash + (reward?.rewardCash ?? 0),
              completedQuests: [...state.completedQuests, 'cass_quest'],
              activeQuests: state.activeQuests.filter(q => q !== 'cass_quest'),
              homeUpgrades: reward?.rewardUpgrade ? [...state.homeUpgrades, reward.rewardUpgrade] : state.homeUpgrades,
              notification: { text: `Quest complete! +$${reward?.rewardCash ?? 0}${reward?.rewardUpgrade ? ' + Speaker Upgrade' : ''}`, timer: 3 },
            };
          }
          if (qid && !state.activeQuests.includes(qid) && !state.completedQuests.includes(qid)) {
            return {
              ...state,
              activeDialogue: undefined,
              activeQuests: [...state.activeQuests, qid],
              notification: { text: `New quest: ${QUESTS[qid]?.title ?? qid}`, timer: 3 },
            };
          }
          return { ...state, activeDialogue: undefined };
        }
        if (act.type === 'OPEN_SHOP') {
          const shopBeats = ['city_pulse', 'neon_dreams'].filter(
            id => !state.unlockedBeats.includes(id) && (id !== 'neon_dreams' || state.totalWins >= 3)
          );
          return { ...state, activeDialogue: undefined, screen: 'shop', shopBeatIds: shopBeats };
        }
        if (act.type === 'CLOSE_DIALOGUE') {
          return { ...state, activeDialogue: undefined };
        }
      }

      // Navigate to next node
      const nextKey = opt.nextKey ?? 'default';
      if (nextKey === 'bye') {
        return { ...state, activeDialogue: undefined };
      }
      const nextNode = dialogues[nextKey];
      if (!nextNode) return { ...state, activeDialogue: undefined };
      return { ...state, activeDialogue: { npcId, nodeKey: nextKey, lineIndex: 0 } };
    }

    case 'CLOSE_DIALOGUE':
      return { ...state, activeDialogue: undefined };

    case 'START_BATTLE': {
      const bs = makeBattleState(action.opponentId, action.beatId);
      return { ...state, screen: 'battle', battleState: bs };
    }

    case 'BATTLE_COUNTDOWN_TICK': {
      if (!state.battleState || state.battleState.phase !== 'countdown') return state;
      const newCountdown = state.battleState.countdown - 1;
      if (newCountdown <= 0) {
        return {
          ...state,
          battleState: {
            ...state.battleState,
            phase: 'playing',
            startTime: action.now,
            countdown: 0,
          },
        };
      }
      return { ...state, battleState: { ...state.battleState, countdown: newCountdown } };
    }

    case 'BATTLE_TICK': {
      if (!state.battleState || state.battleState.phase !== 'playing') return state;
      const bs = state.battleState;
      const beat = BEATS[bs.beatId];
      if (!beat) return state;
      const elapsed = (action.now - bs.startTime) / 1000;
      const beatDuration = (beat.totalBeats * 60) / beat.bpm;

      // Update note Y positions
      const notes = bs.notes.map(n => {
        if (n.state !== 'active') return n;
        const timeToHit = n.time - elapsed;
        const y = HIT_ZONE_Y - timeToHit * NOTE_SPEED;
        // Auto-miss if note falls past hit zone + grace
        if (y > HIT_ZONE_Y + 40 && n.state === 'active') {
          return { ...n, y, state: 'missed' as const };
        }
        return { ...n, y };
      });

      const hitTimer = bs.lastHitTimer > 0 ? bs.lastHitTimer - action.dt : 0;

      // Check if battle is over
      const allDone = notes.every(n => n.state !== 'active') || elapsed > beatDuration + 1;
      if (allDone) {
        const result: 'win' | 'lose' = bs.playerScore >= bs.opponentScore ? 'win' : 'lose';
        return {
          ...state,
          battleState: { ...bs, notes, phase: 'result', result, elapsed, lastHitTimer: hitTimer },
        };
      }

      return { ...state, battleState: { ...bs, notes, elapsed, lastHitTimer: hitTimer } };
    }

    case 'BATTLE_KEY': {
      if (!state.battleState || state.battleState.phase !== 'playing') return state;
      const bs = state.battleState;
      const elapsed = (action.now - bs.startTime) / 1000;
      const hasUpgrade = state.homeUpgrades.includes('record_collection');
      const windowBonus = hasUpgrade ? 0.01 : 0;

      let hit = false;
      let score = 0;
      let hitLabel = '';
      const notes = bs.notes.map(n => {
        if (hit || n.state !== 'active' || n.lane !== action.lane) return n;
        const diff = Math.abs(n.time - elapsed);
        if (diff <= PERFECT_WINDOW + windowBonus) {
          hit = true; score = 300; hitLabel = 'PERFECT!';
          return { ...n, state: 'hit' as const, hitScore: 300 };
        }
        if (diff <= GOOD_WINDOW + windowBonus) {
          hit = true; score = 100; hitLabel = 'GOOD';
          return { ...n, state: 'hit' as const, hitScore: 100 };
        }
        return n;
      });

      if (!hit) return state;

      const hasMixer = state.homeUpgrades.includes('pro_mixer');
      const comboMult = hasMixer ? 2 : 1;
      const newCombo = bs.combo + 1;
      const comboBonus = Math.floor(newCombo / 4);
      const totalScore = score * (1 + comboBonus) * comboMult;

      return {
        ...state,
        battleState: {
          ...bs,
          notes,
          playerScore: bs.playerScore + totalScore,
          combo: newCombo,
          maxCombo: Math.max(bs.maxCombo, newCombo),
          hitNotes: bs.hitNotes + 1,
          lastHitLabel: hitLabel,
          lastHitTimer: 0.6,
        },
      };
    }

    case 'CLOSE_SCREEN': {
      // Handle battle result resolution
      if (state.screen === 'battle' && state.battleState?.phase === 'result') {
        const bs = state.battleState;
        const won = bs.result === 'win';
        const beat = BEATS[bs.beatId];
        const newWins = won ? state.totalWins + 1 : state.totalWins;

        // Unlock next beat on win
        let newBeats = [...state.unlockedBeats];
        let beatUnlocked = '';
        if (won && beat) {
          const nextBeats: Record<string, string> = {
            first_drop: 'chill_vibes',
            chill_vibes: 'city_pulse',
            city_pulse: 'neon_dreams',
            neon_dreams: 'midnight_bass',
          };
          const nb = nextBeats[beat.id];
          if (nb && !newBeats.includes(nb)) {
            newBeats.push(nb);
            beatUnlocked = nb;
          }
        }

        // Cash reward
        const cashReward = won ? 150 + beat.difficulty * 50 : 0;
        const notifText = won
          ? `Victory! +$${cashReward}${beatUnlocked ? ` • Unlocked: ${BEATS[beatUnlocked]?.name}` : ''}`
          : `Not this time. Practice more!`;

        // Quest progress
        let qProgress = { ...state.questProgress };
        if (won && state.activeQuests.includes('cass_quest')) {
          qProgress['cass_quest'] = (qProgress['cass_quest'] ?? 0) + 1;
        }

        return {
          ...state,
          screen: 'world',
          battleState: undefined,
          totalWins: newWins,
          cash: state.cash + cashReward,
          unlockedBeats: newBeats,
          equippedBeat: beatUnlocked || state.equippedBeat,
          questProgress: qProgress,
          lastBeatUnlocked: beatUnlocked || undefined,
          notification: { text: notifText, timer: 4 },
        };
      }
      return { ...state, screen: 'world', shopBeatIds: undefined };
    }

    case 'BUY_BEAT': {
      const beat = BEATS[action.beatId];
      if (!beat || !beat.price) return state;
      if (state.cash < beat.price) {
        return { ...state, notification: { text: "Not enough cash!", timer: 2 } };
      }
      if (state.unlockedBeats.includes(action.beatId)) {
        return { ...state, notification: { text: "You already own this beat!", timer: 2 } };
      }
      return {
        ...state,
        cash: state.cash - beat.price,
        unlockedBeats: [...state.unlockedBeats, action.beatId],
        equippedBeat: action.beatId,
        notification: { text: `Purchased ${beat.name}!`, timer: 3 },
      };
    }

    case 'OPEN_UPGRADE':
      return { ...state, screen: 'upgrade' };

    case 'BUY_UPGRADE': {
      const upg = HOME_UPGRADES.find(u => u.id === action.upgradeId);
      if (!upg) return state;
      if (state.homeUpgrades.includes(upg.id)) return state;
      if (upg.requires && !state.homeUpgrades.includes(upg.requires)) {
        return { ...state, notification: { text: `Requires: ${HOME_UPGRADES.find(u => u.id === upg.requires)?.name}`, timer: 2 } };
      }
      if (state.cash < upg.cost) {
        return { ...state, notification: { text: "Not enough cash!", timer: 2 } };
      }
      return {
        ...state,
        cash: state.cash - upg.cost,
        homeUpgrades: [...state.homeUpgrades, upg.id],
        notification: { text: `Installed: ${upg.name}!`, timer: 3 },
      };
    }

    case 'OPEN_QUESTLOG':
      return { ...state, screen: 'questlog' };

    case 'GIVE_QUEST': {
      if (state.activeQuests.includes(action.questId) || state.completedQuests.includes(action.questId)) return state;
      return {
        ...state,
        activeQuests: [...state.activeQuests, action.questId],
        notification: { text: `New quest: ${QUESTS[action.questId]?.title ?? action.questId}`, timer: 3 },
      };
    }

    case 'OPEN_SHOP': {
      const shopBeats = ['city_pulse', 'neon_dreams'].filter(
        id => !state.unlockedBeats.includes(id) && (id !== 'neon_dreams' || state.totalWins >= 3)
      );
      return { ...state, screen: 'shop', shopBeatIds: shopBeats };
    }

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const move = useCallback((dir: Direction) => dispatch({ type: 'MOVE', dir }), []);
  const openDialogue = useCallback((npcId: string) => dispatch({ type: 'OPEN_DIALOGUE', npcId }), []);
  const nextLine = useCallback(() => dispatch({ type: 'NEXT_DIALOGUE_LINE' }), []);
  const chooseOption = useCallback((index: number) => dispatch({ type: 'CHOOSE_OPTION', index }), []);
  const closeDialogue = useCallback(() => dispatch({ type: 'CLOSE_DIALOGUE' }), []);
  const battleTick = useCallback((dt: number, now: number) => dispatch({ type: 'BATTLE_TICK', dt, now }), []);
  const battleKey = useCallback((lane: number, now: number) => dispatch({ type: 'BATTLE_KEY', lane, now }), []);
  const countdownTick = useCallback((now: number) => dispatch({ type: 'BATTLE_COUNTDOWN_TICK', now }), []);
  const closeScreen = useCallback(() => dispatch({ type: 'CLOSE_SCREEN' }), []);
  const buyBeat = useCallback((beatId: string) => dispatch({ type: 'BUY_BEAT', beatId }), []);
  const openUpgrade = useCallback(() => dispatch({ type: 'OPEN_UPGRADE' }), []);
  const buyUpgrade = useCallback((upgradeId: string) => dispatch({ type: 'BUY_UPGRADE', upgradeId }), []);
  const openQuestlog = useCallback(() => dispatch({ type: 'OPEN_QUESTLOG' }), []);
  const tick = useCallback((dt: number) => dispatch({ type: 'TICK', dt }), []);

  return {
    state, dispatch,
    move, openDialogue, nextLine, chooseOption, closeDialogue,
    battleTick, battleKey, countdownTick, closeScreen,
    buyBeat, openUpgrade, buyUpgrade, openQuestlog, tick,
  };
}

export { HIT_ZONE_Y, LANE_W, LANE_START_X, NOTE_SPEED, TRAVEL_TIME };
