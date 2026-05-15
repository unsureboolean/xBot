import { useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { useGameState, CANVAS_W, CANVAS_H } from './useGameState';
import { MAPS, NPCS, BEATS, HOME_UPGRADES, QUESTS, getDialogue } from './gameData';
import WorldCanvas from './WorldCanvas';
import DJBattle from './DJBattle';

// ── Dialogue Box ──────────────────────────────────────────────────────────────
function DialogueBox({ state, onNext, onOption }: {
  state: ReturnType<typeof useGameState>['state'];
  onNext: () => void;
  onOption: (i: number) => void;
}) {
  const d = state.activeDialogue;
  if (!d) return null;

  const npcKey = d.npcId === 'mojo_bar' ? 'mojo_bar' : d.npcId;
  const dialogues = getDialogue(npcKey, state);
  const node = dialogues[d.nodeKey];
  if (!node) return null;

  const line = node.lines[d.lineIndex];
  const isLast = d.lineIndex >= node.lines.length - 1;
  const npc = NPCS[d.npcId];

  const handleClick = () => {
    if (isLast && node.options) return;
    onNext();
  };

  const speakerColor: Record<string, string> = {
    'Mojo': '#2ecc71', 'Luna': '#f1c40f', 'Vinyl': '#9b59b6',
    'Cass': '#e67e22', 'Nova': '#e74c3c', 'You': '#4a90e2',
  };
  const color = speakerColor[line?.speaker ?? ''] ?? '#ffffff';

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(8,6,20,0.97)',
        borderTop: '2px solid rgba(120,100,200,0.6)',
        padding: '16px 20px 14px',
        cursor: isLast && node.options ? 'default' : 'pointer',
        minHeight: '110px',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* NPC avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: 4, flexShrink: 0,
          background: npc?.color ?? '#444',
          border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {line?.speaker === 'You' ? '🎧' : '👤'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color, fontFamily: 'monospace', fontWeight: 'bold', fontSize: 12, marginBottom: 6 }}>
            {line?.speaker ?? ''}
          </div>
          <div style={{ color: '#e8e8f0', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 }}>
            {line?.text ?? ''}
          </div>
        </div>
      </div>

      {/* Options */}
      {isLast && node.options && (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {node.options.map((opt, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); onOption(i); }}
              style={{
                padding: '6px 14px',
                background: 'rgba(80,60,140,0.4)',
                border: '1px solid rgba(120,100,200,0.6)',
                borderRadius: 4,
                color: '#c8c0f0',
                fontFamily: 'monospace',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(100,80,180,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(80,60,140,0.4)')}
            >
              ▸ {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Continue hint */}
      {(!isLast || !node.options) && (
        <div style={{ position: 'absolute', bottom: 10, right: 16, color: 'rgba(180,160,220,0.6)', fontFamily: 'monospace', fontSize: 10 }}>
          click or [E] to continue
        </div>
      )}
    </div>
  );
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function HUD({ state, onUpgrade, onQuestlog }: {
  state: ReturnType<typeof useGameState>['state'];
  onUpgrade: () => void;
  onQuestlog: () => void;
}) {
  if (state.screen !== 'world' || state.activeDialogue) return null;

  const beat = BEATS[state.equippedBeat];
  const questCount = state.activeQuests.length;
  const wins = state.totalWins;
  const mapName = MAPS[state.mapId]?.name ?? '';

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      background: 'linear-gradient(to bottom, rgba(5,3,15,0.95), rgba(5,3,15,0))',
      padding: '10px 14px',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      fontFamily: 'monospace',
      pointerEvents: 'none',
    }}>
      {/* Left: player stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ color: '#f0d080', fontWeight: 'bold', fontSize: 14 }}>
            💵 ${state.cash}
          </span>
          <span style={{ color: '#88aaff', fontSize: 12 }}>
            🏆 {wins} win{wins !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ color: 'rgba(200,180,255,0.6)', fontSize: 10 }}>
          {mapName}
        </div>
        {beat && (
          <div style={{ color: beat.color, fontSize: 10 }}>
            ♫ {beat.name}
          </div>
        )}
      </div>

      {/* Right: buttons */}
      <div style={{ display: 'flex', gap: 8, pointerEvents: 'all' }}>
        <button
          onClick={onQuestlog}
          style={{
            padding: '4px 10px',
            background: questCount > 0 ? 'rgba(255,200,60,0.15)' : 'rgba(60,50,90,0.5)',
            border: questCount > 0 ? '1px solid rgba(255,200,60,0.5)' : '1px solid rgba(100,80,160,0.4)',
            borderRadius: 4, color: questCount > 0 ? '#f0d080' : 'rgba(200,180,255,0.6)',
            fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
          }}
        >
          📋 Quests {questCount > 0 ? `(${questCount})` : ''}
        </button>
        {state.mapId === 'house' && (
          <button
            onClick={onUpgrade}
            style={{
              padding: '4px 10px',
              background: 'rgba(60,120,60,0.3)',
              border: '1px solid rgba(80,160,80,0.5)',
              borderRadius: 4, color: '#80e080',
              fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
            }}
          >
            🏠 Upgrade
          </button>
        )}
      </div>
    </div>
  );
}

// ── Notification ──────────────────────────────────────────────────────────────
function Notification({ text }: { text: string }) {
  return (
    <div style={{
      position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(20,10,40,0.95)',
      border: '1px solid rgba(120,100,200,0.7)',
      borderRadius: 6, padding: '8px 16px',
      color: '#c8c0f0', fontFamily: 'monospace', fontSize: 13,
      pointerEvents: 'none', whiteSpace: 'nowrap',
      boxShadow: '0 2px 20px rgba(100,80,200,0.4)',
    }}>
      {text}
    </div>
  );
}

// ── Quest Log ─────────────────────────────────────────────────────────────────
function QuestLogScreen({ state, onClose }: {
  state: ReturnType<typeof useGameState>['state'];
  onClose: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,3,15,0.97)',
      padding: 30, display: 'flex', flexDirection: 'column', gap: 16,
      fontFamily: 'monospace', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#c8c0f0', margin: 0, fontSize: 20 }}>📋 Quest Log</h2>
        <button onClick={onClose} style={closeBtn}>✕ Close [Q]</button>
      </div>

      {state.activeQuests.length === 0 && state.completedQuests.length === 0 && (
        <p style={{ color: 'rgba(200,180,255,0.5)', fontSize: 13 }}>No quests yet. Talk to people around town!</p>
      )}

      {state.activeQuests.map(qid => {
        const q = QUESTS[qid];
        if (!q) return null;
        const progress = state.questProgress[qid] ?? 0;
        return (
          <div key={qid} style={questCard('#1a1040', 'rgba(120,100,200,0.4)')}>
            <div style={{ color: '#f0d080', fontWeight: 'bold', fontSize: 14 }}>{q.title}</div>
            <div style={{ color: 'rgba(200,180,255,0.8)', fontSize: 12, marginTop: 4 }}>{q.description}</div>
            <div style={{ color: '#88aaff', fontSize: 11, marginTop: 6 }}>
              From: {q.giver} · Progress: {progress}/{q.targetCount}
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ background: 'rgba(100,80,160,0.3)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                <div style={{ background: '#8866ff', height: '100%', width: `${Math.min(100, (progress / q.targetCount) * 100)}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
            <div style={{ color: 'rgba(200,180,255,0.5)', fontSize: 11, marginTop: 6 }}>
              Reward: ${q.rewardCash}{q.rewardUpgrade ? ` + ${HOME_UPGRADES.find(u => u.id === q.rewardUpgrade)?.name}` : ''}
            </div>
          </div>
        );
      })}

      {state.completedQuests.map(qid => {
        const q = QUESTS[qid];
        if (!q) return null;
        return (
          <div key={qid} style={questCard('rgba(20,40,20,0.5)', 'rgba(60,120,60,0.3)')}>
            <div style={{ color: '#80e080', fontWeight: 'bold', fontSize: 14 }}>✓ {q.title}</div>
            <div style={{ color: 'rgba(180,220,180,0.6)', fontSize: 12, marginTop: 4 }}>{q.description}</div>
            <div style={{ color: 'rgba(180,220,180,0.4)', fontSize: 11, marginTop: 4 }}>Completed</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Home Upgrade Screen ───────────────────────────────────────────────────────
function HomeUpgradeScreen({ state, onBuy, onClose }: {
  state: ReturnType<typeof useGameState>['state'];
  onBuy: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,3,15,0.97)',
      padding: 30, display: 'flex', flexDirection: 'column', gap: 16,
      fontFamily: 'monospace', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#c8c0f0', margin: 0, fontSize: 20 }}>🏠 Home Upgrades</h2>
          <div style={{ color: '#f0d080', fontSize: 13, marginTop: 4 }}>Cash: ${state.cash}</div>
        </div>
        <button onClick={onClose} style={closeBtn}>✕ Close</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {HOME_UPGRADES.map(upg => {
          const owned = state.homeUpgrades.includes(upg.id);
          const requiresMet = !upg.requires || state.homeUpgrades.includes(upg.requires);
          const canAfford = state.cash >= upg.cost;
          const free = upg.cost === 0;

          let cardBg = 'rgba(20,15,40,0.8)';
          let borderColor = 'rgba(100,80,160,0.4)';
          if (owned) { cardBg = 'rgba(20,40,20,0.5)'; borderColor = 'rgba(60,140,60,0.5)'; }
          else if (!requiresMet) { cardBg = 'rgba(30,20,20,0.5)'; borderColor = 'rgba(80,60,60,0.3)'; }

          return (
            <div key={upg.id} style={{
              background: cardBg, border: `1px solid ${borderColor}`,
              borderRadius: 6, padding: 14,
            }}>
              <div style={{ color: owned ? '#80e080' : requiresMet ? '#c8c0f0' : 'rgba(200,180,180,0.4)', fontWeight: 'bold', fontSize: 14 }}>
                {owned ? '✓ ' : ''}{upg.name}
              </div>
              <div style={{ color: 'rgba(200,180,255,0.6)', fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>
                {upg.description}
              </div>
              {upg.requires && !requiresMet && (
                <div style={{ color: '#ff8888', fontSize: 10, marginTop: 4 }}>
                  Requires: {HOME_UPGRADES.find(u => u.id === upg.requires)?.name}
                </div>
              )}
              {!owned && (
                <button
                  onClick={() => onBuy(upg.id)}
                  disabled={!requiresMet || (!canAfford && !free)}
                  style={{
                    marginTop: 10, padding: '5px 12px',
                    background: owned || !requiresMet ? 'rgba(60,60,60,0.5)' : canAfford || free ? 'rgba(60,100,180,0.4)' : 'rgba(80,40,40,0.5)',
                    border: `1px solid ${!requiresMet ? 'rgba(80,60,60,0.3)' : canAfford || free ? 'rgba(80,130,220,0.6)' : 'rgba(120,60,60,0.4)'}`,
                    borderRadius: 4, color: !requiresMet ? 'rgba(200,180,180,0.4)' : canAfford || free ? '#88aaff' : '#ff8888',
                    fontFamily: 'monospace', fontSize: 12, cursor: requiresMet && (canAfford || free) ? 'pointer' : 'not-allowed',
                  }}
                >
                  {free ? 'Install (Free)' : `Buy — $${upg.cost}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shop Screen ───────────────────────────────────────────────────────────────
function ShopScreen({ state, onBuy, onClose }: {
  state: ReturnType<typeof useGameState>['state'];
  onBuy: (id: string) => void;
  onClose: () => void;
}) {
  const availableBeats = (state.shopBeatIds ?? []).map(id => BEATS[id]).filter(Boolean);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,3,15,0.97)',
      padding: 30, display: 'flex', flexDirection: 'column', gap: 16,
      fontFamily: 'monospace',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#c8c0f0', margin: 0, fontSize: 20 }}>🎵 Vinyl Vault</h2>
          <div style={{ color: '#f0d080', fontSize: 13, marginTop: 4 }}>Your cash: ${state.cash}</div>
        </div>
        <button onClick={onClose} style={closeBtn}>✕ Leave</button>
      </div>

      {availableBeats.length === 0 ? (
        <p style={{ color: 'rgba(200,180,255,0.5)', fontSize: 13 }}>
          Nothing new in stock right now. Win more battles and check back!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {availableBeats.map(beat => {
            const canAfford = state.cash >= (beat.price ?? 0);
            return (
              <div key={beat.id} style={{
                background: 'rgba(20,10,40,0.8)',
                border: `1px solid ${beat.color}44`,
                borderRadius: 6, padding: 16,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 24,
                  background: beat.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  ♫
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: beat.color, fontWeight: 'bold', fontSize: 15 }}>{beat.name}</div>
                  <div style={{ color: 'rgba(200,180,255,0.6)', fontSize: 11, marginTop: 3 }}>
                    {beat.style} · {beat.bpm} BPM · Difficulty: {'★'.repeat(beat.difficulty)}{'☆'.repeat(5 - beat.difficulty)}
                  </div>
                </div>
                <button
                  onClick={() => onBuy(beat.id)}
                  disabled={!canAfford}
                  style={{
                    padding: '8px 16px',
                    background: canAfford ? `${beat.color}33` : 'rgba(60,40,40,0.5)',
                    border: `1px solid ${canAfford ? beat.color : 'rgba(100,80,80,0.4)'}`,
                    borderRadius: 4, color: canAfford ? beat.color : '#ff8888',
                    fontFamily: 'monospace', fontSize: 13, cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                  }}
                >
                  ${beat.price}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ color: 'rgba(200,180,255,0.4)', fontSize: 11, marginTop: 'auto' }}>
        Tip: Win battles to earn cash and unlock more tracks!
      </div>
    </div>
  );
}

// ── Title Screen ──────────────────────────────────────────────────────────────
// (shown for 0 seconds — just start immediately, no title screen needed)

// ── Shared styles ─────────────────────────────────────────────────────────────
const closeBtn: CSSProperties = {
  padding: '6px 14px',
  background: 'rgba(60,50,90,0.5)',
  border: '1px solid rgba(100,80,160,0.5)',
  borderRadius: 4, color: 'rgba(200,180,255,0.8)',
  fontFamily: 'monospace', fontSize: 12, cursor: 'pointer',
};

const questCard = (bg: string, border: string): CSSProperties => ({
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: 6, padding: 14,
});

// ── Main Game Component ───────────────────────────────────────────────────────
export default function Game() {
  const {
    state, move, openDialogue, nextLine, chooseOption, closeDialogue,
    battleTick, battleKey, countdownTick, closeScreen,
    buyBeat, openUpgrade, buyUpgrade, openQuestlog, tick,
  } = useGameState();

  // Notification tick
  const tickRef = useRef<number | null>(null);
  useEffect(() => {
    let last = performance.now();
    const loop = (ts: number) => {
      tickRef.current = requestAnimationFrame(loop);
      tick((ts - last) / 1000);
      last = ts;
    };
    tickRef.current = requestAnimationFrame(loop);
    return () => { if (tickRef.current !== null) cancelAnimationFrame(tickRef.current); };
  }, [tick]);

  // Keyboard shortcuts for menus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.screen === 'questlog' || state.screen === 'upgrade' || state.screen === 'shop') {
        if (e.key === 'Escape' || e.key === 'q' || e.key === 'Q') closeScreen();
        return;
      }
      if (state.activeDialogue) {
        if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
          nextLine();
        }
        return;
      }
      if (state.screen === 'world') {
        if (e.key === 'q' || e.key === 'Q') openQuestlog();
        if (e.key === 'h' || e.key === 'H') {
          if (state.mapId === 'house') openUpgrade();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.screen, state.activeDialogue, state.mapId, nextLine, closeScreen, openQuestlog, openUpgrade]);

  // Interact: check NPC proximity
  const handleInteract = useCallback(() => {
    if (state.activeDialogue) { nextLine(); return; }
    const map = MAPS[state.mapId];
    if (!map) return;
    const { x, y } = state.playerPos;
    for (const npcId of map.npcIds) {
      const npcPositions: Record<string, Record<string, { x: number; y: number }>> = {
        mojo:     { town: { x: 19, y: 7 } },
        luna:     { town: { x: 17, y: 12 } },
        vinyl:    { record_store: { x: 9, y: 7 } },
        cass:     { cafe: { x: 9, y: 7 } },
        nova:     { dj_club: { x: 7, y: 6 } },
        mojo_bar: { bar: { x: 5, y: 6 } },
      };
      const np = npcPositions[npcId]?.[state.mapId];
      if (!np) continue;
      if (Math.abs(np.x - x) <= 1 && Math.abs(np.y - y) <= 1 && (Math.abs(np.x - x) + Math.abs(np.y - y)) <= 1) {
        openDialogue(npcId);
        return;
      }
    }
  }, [state.mapId, state.playerPos, state.activeDialogue, openDialogue, nextLine]);

  return (
    <div style={{
      position: 'relative',
      width: CANVAS_W, height: CANVAS_H,
      overflow: 'hidden',
      background: '#050310',
      fontFamily: 'monospace',
    }}>
      {/* World canvas (always rendered) */}
      {state.screen === 'world' && (
        <WorldCanvas
          state={state}
          onMove={move}
          onInteract={handleInteract}
        />
      )}

      {/* DJ Battle canvas */}
      {state.screen === 'battle' && state.battleState && (
        <DJBattle
          state={state}
          onBattleTick={battleTick}
          onBattleKey={battleKey}
          onCountdownTick={countdownTick}
          onClose={closeScreen}
        />
      )}

      {/* Overlay screens */}
      {state.screen === 'questlog' && (
        <QuestLogScreen state={state} onClose={closeScreen} />
      )}
      {state.screen === 'upgrade' && (
        <HomeUpgradeScreen state={state} onBuy={buyUpgrade} onClose={closeScreen} />
      )}
      {state.screen === 'shop' && (
        <ShopScreen state={state} onBuy={beatId => { buyBeat(beatId); closeScreen(); }} onClose={closeScreen} />
      )}

      {/* HUD (world only) */}
      {state.screen === 'world' && (
        <HUD state={state} onUpgrade={openUpgrade} onQuestlog={openQuestlog} />
      )}

      {/* Dialogue overlay */}
      {state.activeDialogue && state.screen === 'world' && (
        <DialogueBox state={state} onNext={nextLine} onOption={chooseOption} />
      )}

      {/* Notification toast */}
      {state.notification && state.notification.timer > 0 && (
        <Notification text={state.notification.text} />
      )}
    </div>
  );
}
