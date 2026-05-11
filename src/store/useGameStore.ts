import { create } from 'zustand';
import { GameState, Player, TurnPhase, TradeOffer } from '../types';
import { STATIC_BOARD, COLOR_GROUPS } from '../constants';
import { calculateRent, hasMonopoly } from '../utils/rentCalculator';
import { shuffleArray } from '../utils/mathHelpers';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, GameCard } from '../constants/cards';
import { NetworkManager } from '../network/NetworkManager';
import { saveGameState } from '../utils/sessionStorage';

// ─── Turn timeout system ───
let turnTimeoutTimer: any = null;
let turnTimeoutStart: number = 0;
const TURN_TIMEOUT_MS = 20000; // 20 seconds

// ─── Host grace timer (client-side, global so GameScreen can cancel it) ───
let hostGraceTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Connected client type (host-side, persisted across screen changes) ───
export interface ConnectedClient {
  socketId: string;
  playerId: string;
  name?: string;
  avatar?: string;
}

// ─── Event types for UI notifications ───
export interface GameEvent {
  type: 'info' | 'purchase' | 'tax' | 'jail' | 'go-bonus' | 'rent' | 'bankruptcy' | 'victory' | 'build' | 'sell' | 'error' | 'card';
  message: string;
  emoji: string;
  card?: GameCard;
}

interface GameActions {
  initGame: (playersSetup: Pick<Player, 'id' | 'name' | 'isBot' | 'avatar'>[]) => void;
  rollDice: (isManual?: boolean) => void;
  endAnimation: () => void;
  resolveSpace: () => void;
  buyProperty: () => void;
  skipPurchase: () => void;
  buildHouse: (propertyId: string) => void;
  sellHouse: (propertyId: string) => void;
  mortgageProperty: (propertyId: string) => void;
  unmortgageProperty: (propertyId: string) => void;
  endTurn: () => void;
  handleTimeout: () => void;
  clearEvent: () => void;
  handleBankruptcy: (bankruptPlayerId: string, creditorId: string | null) => void;
  
  // ── Jail Actions ──
  payBail: () => void;
  useJailCard: () => void;
  rollForJailBreak: () => void;
  
  // ── Gameplay ──
  forfeit: () => void;
  
  // ── Trade Actions ──
  proposeTrade: (offer: Omit<TradeOffer, 'id'>) => void;
  respondToTrade: (accept: boolean) => void;
  cancelTrade: () => void;
  
  // ── Network Integration ──
  setNetworkRole: (role: NetworkRole, clientId?: string | null) => void;
  setLocalPlayerId: (id: string) => void;
  setLocalPlayerInfo: (name: string, avatar: string) => void;
  setNetworkStatus: (status: 'connected' | 'disconnected' | 'host_disconnected') => void;
  convertHostToBot: () => void;
  syncState: (newState: Partial<GameStoreState>) => void;
  setAppScreen: (screen: 'lobby' | 'game') => void;
  resetToLobby: () => void;
  setConnectedClients: (clients: ConnectedClient[] | ((prev: ConnectedClient[]) => ConnectedClient[])) => void;
  startHostGraceTimer: () => void;
  cancelHostGraceTimer: () => void;
  
  // ── UI Modal States ──
  setSelectedPlayerIdForProps: (id: string | null) => void;
  setSelectedSpaceIdForDetail: (id: string | null) => void;
  setIsGameLogOpen: (isOpen: boolean) => void;

  // ── Win Conditions ──
  setWinCondition: (condition: WinCondition) => void;
  setChronoEndTime: (ts: number | null) => void;
  checkChronoExpired: () => void;
  
  // ── Turn Timeout Management ──
  startTurnTimeout: () => void;
  clearTurnTimeout: () => void;
  setTurnTimeRemaining: (remaining: number | null) => void;
}

export type WinCondition =
  | { type: 'last_standing' }
  | { type: 'fortune_limit'; amount: number }
  | { type: 'chrono'; durationMs: number };

export type NetworkRole = 'local' | 'host' | 'client' | 'spectator';

export type NetworkStatus = 'connected' | 'disconnected' | 'host_disconnected';

interface GameStoreState extends GameState {
  lastEvent: GameEvent | null;
  networkRole: NetworkRole;
  networkStatus: NetworkStatus;
  clientId: string | null;
  localPlayerId: string | null;
  localPlayerName: string;
  localPlayerAvatar: string;
  appScreen: 'lobby' | 'game';
  connectedClients: ConnectedClient[];
  winCondition: WinCondition;
  chronoEndTime: number | null;
  turnTimeRemaining: number | null;

  // UI Modal states (local only, not broadcasted)
  selectedPlayerIdForProps: string | null;
  selectedSpaceIdForDetail: string | null;
  isGameLogOpen: boolean;
}

// Helper to broadcast state if host
const broadcastIfHost = (getState: () => GameStoreState) => {
  const state = getState();
  if (state.networkRole === 'host') {
    const { players, board, currentPlayerIndex, turnPhase, consecutiveDoubles, lastDiceRoll, actionDeadline, lastEvent, gameLog, turnCount, chanceDeck, communityChestDeck, activeTradeOffer, winCondition, chronoEndTime, turnTimeRemaining } = state;
    const payload = { players, board, currentPlayerIndex, turnPhase, consecutiveDoubles, lastDiceRoll, actionDeadline, lastEvent, gameLog, turnCount, chanceDeck, communityChestDeck, activeTradeOffer, winCondition, chronoEndTime, turnTimeRemaining };
    NetworkManager.broadcast({ type: 'STATE_UPDATE', payload });
    saveGameState({ ...payload, _connectedClients: state.connectedClients });
  }
};

// Helper: compute net worth for a player (balance + property purchase prices)
const computeNetWorth = (player: any, board: any): number => {
  if (player.isBankrupt) return -1;
  let worth = player.balance;
  Object.values(board as Record<string, any>).forEach((space: any) => {
    if (space?.ownerId === player.id && space?.purchasePrice) {
      worth += space.purchasePrice + (space.houseCount || 0) * (space.buildCost || 0);
    }
  });
  return worth;
};

export const useGameStore = create<GameStoreState & GameActions>((setOriginal, get) => {
  // Wrap `set` to automatically append new events to the gameLog
  const set = (partial: any, replace?: boolean) => {
    if (typeof partial === 'object' && partial !== null && 'lastEvent' in partial) {
      const event = partial.lastEvent;
      // If an event is provided and is different from the last one
      if (event && event !== get().lastEvent) {
        const logMsg = `[Tour ${get().turnCount}] ${event.emoji} ${event.message}`;
        partial.gameLog = [logMsg, ...get().gameLog].slice(0, 50); // Keep last 50 logs
      }
    }
    setOriginal(partial, replace as any);
  };

  return {
    // --- ÉTAT INITIAL ---
    players: [], 
    board: {}, 
    currentPlayerIndex: 0, 
    turnPhase: 'WAITING_FOR_DICE',
    consecutiveDoubles: 0, 
    lastDiceRoll: null, 
    actionDeadline: null,
    gameLog: [],
    turnCount: 1,
    chanceDeck: [],
    communityChestDeck: [],
    activeTradeOffer: null,
    lastEvent: null,
    networkRole: 'local',
    networkStatus: 'connected',
    clientId: null,
    localPlayerId: null,
    localPlayerName: '',
    localPlayerAvatar: '',
    appScreen: 'lobby',
    connectedClients: [],
    winCondition: { type: 'last_standing' },
    chronoEndTime: null,
    turnTimeRemaining: null,
    
    // Initial UI states
    selectedPlayerIdForProps: null,
    selectedSpaceIdForDetail: null,
    isGameLogOpen: false,

  // --- ACTIONS ---
  setAppScreen: (screen) => set({ appScreen: screen }),
  setSelectedPlayerIdForProps: (id) => set({ selectedPlayerIdForProps: id }),
  setSelectedSpaceIdForDetail: (id) => set({ selectedSpaceIdForDetail: id }),
  setIsGameLogOpen: (isOpen) => set({ isGameLogOpen: isOpen }),
  setWinCondition: (condition) => set({ winCondition: condition }),
  setChronoEndTime: (ts) => set({ chronoEndTime: ts }),

  checkChronoExpired: () => {
    const { chronoEndTime, turnPhase, players, board, networkRole } = get();
    if (networkRole === 'client') return;
    if (turnPhase === 'GAME_OVER') return;
    if (!chronoEndTime || Date.now() < chronoEndTime) return;
    const activePlayers = players.filter(p => !p.isBankrupt);
    const sorted = [...activePlayers].sort((a, b) => computeNetWorth(b, board) - computeNetWorth(a, board));
    const winner = sorted[0];
    set({
      turnPhase: 'GAME_OVER',
      lastEvent: { type: 'victory', message: `⏱️ Temps écoulé ! ${winner?.name || '?'} gagne avec ${computeNetWorth(winner, board).toLocaleString()} AR !`, emoji: '🏆' },
    });
    broadcastIfHost(get);
  },

  setNetworkRole: (role, clientId = null) => {
    set({ networkRole: role, clientId });
  },

  setLocalPlayerId: (id) => {
    set({ localPlayerId: id });
  },

  setLocalPlayerInfo: (name, avatar) => {
    set({ localPlayerName: name, localPlayerAvatar: avatar });
  },

  setNetworkStatus: (status) => {
    set({ networkStatus: status });
  },

  setConnectedClients: (clients) => {
    if (typeof clients === 'function') {
      set({ connectedClients: clients(get().connectedClients) });
    } else {
      set({ connectedClients: clients });
    }
  },

  convertHostToBot: () => {
    const { players, localPlayerId, currentPlayerIndex } = get();
    // The "host" player is the non-bot player who is NOT us (the client)
    const hostPlayer = players.find(p => !p.isBot && p.id !== localPlayerId && !p.isBankrupt);
    if (!hostPlayer) {
      // No host player found — just resume as connected (already all bots)
      set({ networkStatus: 'connected', networkRole: 'local' });
      return;
    }
    const newPlayers = players.map(p =>
      p.id === hostPlayer.id ? { ...p, isBot: true } : p
    );
    // Check if only bots remain after conversion
    const activeHumans = newPlayers.filter(p => !p.isBot && !p.isBankrupt);
    if (activeHumans.length === 0) {
      // Trigger game over — no human players left
      set({
        players: newPlayers,
        turnPhase: 'GAME_OVER',
        networkStatus: 'connected',
        networkRole: 'local',
        lastEvent: { type: 'victory', message: "Plus aucun joueur humain — partie terminée !", emoji: '👑' },
      });
    } else {
      set({
        players: newPlayers,
        networkStatus: 'connected',
        networkRole: 'local',
      });
      // If it was the host's turn, skip it
      if (players[currentPlayerIndex]?.id === hostPlayer.id) {
        get().endTurn();
      }
    }
  },

  syncState: (newState) => {
    if (!newState) return;
    
    // Preserve local-only fields that must never be overwritten by network sync
    const { networkRole, networkStatus, clientId, localPlayerId, appScreen } = get();
    
    set({ 
      ...newState, 
      networkRole, 
      networkStatus, 
      clientId, 
      localPlayerId, 
      appScreen,
    });
  },

  resetToLobby: () => {
    const { networkRole, localPlayerId, appScreen } = get();
    // If we are a client quitting mid-game, notify the host before closing the socket
    if (networkRole === 'client' && appScreen === 'game' && localPlayerId) {
      NetworkManager.sendMessage({ type: 'REQUEST_FORFEIT', payload: { playerId: localPlayerId } });
      // Small delay to let the message flush before the socket is torn down
      setTimeout(() => NetworkManager.cleanup(), 120);
    } else {
      NetworkManager.cleanup();
    }
    set({
      // Reset game state
      players: [],
      board: {},
      currentPlayerIndex: 0,
      turnPhase: 'WAITING_FOR_DICE',
      consecutiveDoubles: 0,
      lastDiceRoll: null,
      actionDeadline: null,
      lastEvent: null,
      gameLog: [],
      turnCount: 1,
      chanceDeck: [],
      communityChestDeck: [],
      activeTradeOffer: null,
      winCondition: { type: 'last_standing' },
      chronoEndTime: null,
      // Reset UI state
      selectedPlayerIdForProps: null,
      selectedSpaceIdForDetail: null,
      isGameLogOpen: false,
      // Reset network state
      networkRole: 'local',
      networkStatus: 'connected',
      clientId: null,
      localPlayerId: null,
      localPlayerName: 'Joueur',
      localPlayerAvatar: 'lemur-madagascar',
      appScreen: 'lobby',
      connectedClients: [],
    });
    // Cancel any pending host grace timer
    if (hostGraceTimer) { clearTimeout(hostGraceTimer); hostGraceTimer = null; }
  },

  startHostGraceTimer: () => {
    if (hostGraceTimer) clearTimeout(hostGraceTimer);
    hostGraceTimer = setTimeout(() => {
      hostGraceTimer = null;
      useGameStore.getState().setNetworkStatus('host_disconnected');
    }, 60000);
  },

  cancelHostGraceTimer: () => {
    if (hostGraceTimer) {
      clearTimeout(hostGraceTimer);
      hostGraceTimer = null;
    }
  },

  initGame: (playersSetup) => {
    const { networkRole } = get();
    if (networkRole === 'client') return; // Client ne peut pas initier

    const players = playersSetup.map(p => ({
      ...p, 
      balance: 1500, 
      position: 0, 
      inJail: false, 
      jailTurns: 0, 
      hasGetOutOfJailCard: false,
      isBankrupt: false,
      consecutiveTimeouts: 0,
    }));
    const initialChance = shuffleArray(Array.from({ length: 16 }, (_, i) => i));
    const initialCommunity = shuffleArray(Array.from({ length: 16 }, (_, i) => i));

    const { winCondition } = get();
    const chronoEndTime = winCondition.type === 'chrono'
      ? Date.now() + winCondition.durationMs
      : null;

    set({ 
      players, 
      turnPhase: 'WAITING_FOR_DICE', 
      currentPlayerIndex: 0, 
      lastEvent: null, 
      board: {},
      gameLog: ['La partie commence !'],
      turnCount: 1,
      chanceDeck: initialChance,
      communityChestDeck: initialCommunity,
      chronoEndTime,
      selectedPlayerIdForProps: null,
      selectedSpaceIdForDetail: null,
      isGameLogOpen: false
    });
    broadcastIfHost(get);
  },

  rollDice: (isManual = true) => {
    const { turnPhase, consecutiveDoubles, players, currentPlayerIndex, networkRole } = get();
    if (turnPhase !== 'WAITING_FOR_DICE') return;

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_ROLL_DICE' });
      return;
    }

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const isDouble = die1 === die2;
    const nextDoublesCount = isDouble ? consecutiveDoubles + 1 : 0;
    
    const newPlayers = [...players];
    const player = { ...newPlayers[currentPlayerIndex] };
    
    // Reset consecutive timeouts only when player rolls dice manually
    if (isManual) {
      player.consecutiveTimeouts = 0;
    }
    newPlayers[currentPlayerIndex] = player;

    // Règle de la prison (3 doubles consécutifs)
    if (nextDoublesCount === 3) {
      player.position = 10; 
      player.inJail = true; 
      newPlayers[currentPlayerIndex] = player;
      set({ 
        lastDiceRoll: [die1, die2], 
        consecutiveDoubles: 0, 
        players: newPlayers, 
        turnPhase: 'END_OF_TURN',
        lastEvent: { type: 'jail', message: `${player.name} fait 3 doubles ! Direction la prison !`, emoji: '🚔' },
      });
      broadcastIfHost(get);
      return;
    }

    const newPosition = (player.position + die1 + die2) % 40;
    
    // Passage par la case Départ → +200 AR
    let event: GameEvent | null = null;
    if (newPosition < player.position) {
      player.balance += 200;
      event = { type: 'go-bonus', message: `${player.name} passe par Départ ! +200 AR`, emoji: '🏁' };
    }
    
    player.position = newPosition;
    newPlayers[currentPlayerIndex] = player;

    set({ 
      lastDiceRoll: [die1, die2], 
      consecutiveDoubles: nextDoublesCount, 
      players: newPlayers, 
      turnPhase: 'ANIMATING_MOVEMENT',
      lastEvent: event,
    });
    // Clear timeout when player acts
    get().clearTurnTimeout();
    // Only broadcast for manual rolls (auto rolls are already broadcasted by handleTimeout)
    if (isManual) broadcastIfHost(get);
  },

  endAnimation: () => {
    const { networkRole } = get();
    if (networkRole === 'client') return; // Seul l'hôte/local gère la fin d'animation pour avancer l'état
    
    set({ turnPhase: 'RESOLVING_SPACE' });
    broadcastIfHost(get);
    get().resolveSpace();
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Le Dispatcher (Aiguilleur) — avec détection de faillite
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  resolveSpace: () => {
    const { players, currentPlayerIndex, board, networkRole } = get();
    if (networkRole === 'client') return; // Sécurité

    const player = players[currentPlayerIndex];
    const space = STATIC_BOARD[player.position];

    if (!space) {
        set({ turnPhase: 'END_OF_TURN' });
        broadcastIfHost(get);
        return;
    }

    switch (space.type) {
      case 'property':
      case 'railroad':
      case 'utility': {
        const propertyRecord = board[space.id];
        if (!propertyRecord || !propertyRecord.ownerId) {
            const price = space.price || 0;
            if (player.balance >= price) {
                set({ turnPhase: 'WAITING_FOR_DECISION', actionDeadline: Date.now() + 15000 });
            } else {
                set({ 
                  turnPhase: 'END_OF_TURN',
                  lastEvent: { type: 'info', message: `${player.name} n'a pas assez d'Ariary pour ${space.name}`, emoji: '💸' },
                });
            }
            broadcastIfHost(get);
        } else if (propertyRecord.ownerId !== player.id) {
            // ── CALCUL AVANCÉ DU LOYER ──
            const owner = players.find(p => p.id === propertyRecord.ownerId);
            const { lastDiceRoll } = get();
            const rentAmount = calculateRent(
              space,
              propertyRecord.ownerId,
              propertyRecord.houseCount,
              board,
              lastDiceRoll
            );
            
            if (owner && rentAmount > 0) {
              const newPlayers = [...players];
              const renterIdx = currentPlayerIndex;
              const ownerIdx = players.findIndex(p => p.id === owner.id);
              
              newPlayers[renterIdx] = { ...newPlayers[renterIdx], balance: newPlayers[renterIdx].balance - rentAmount };
              newPlayers[ownerIdx] = { ...newPlayers[ownerIdx], balance: newPlayers[ownerIdx].balance + rentAmount };

              // Build a descriptive event message
              let rentDetail = `${rentAmount} AR`;
              if (space.type === 'utility') {
                const diceSum = lastDiceRoll ? lastDiceRoll[0] + lastDiceRoll[1] : 0;
                rentDetail = `${rentAmount} AR (${diceSum} × ${rentAmount / diceSum})`;
              }
              
              set({ 
                players: newPlayers, 
                turnPhase: 'END_OF_TURN',
                lastEvent: { 
                  type: 'rent', 
                  message: `${player.name} paie ${rentDetail} de loyer à ${owner.name}`, 
                  emoji: space.type === 'utility' ? '⚡' : space.type === 'railroad' ? '🚂' : '🏠' 
                },
              });

              // ── FAILLITE : Vérifier si le payeur est en faillite ──
              if (newPlayers[renterIdx].balance < 0) {
                get().handleBankruptcy(player.id, owner.id);
              } else {
                broadcastIfHost(get);
              }
            } else {
              set({ turnPhase: 'END_OF_TURN' });
              broadcastIfHost(get);
            }
        } else {
            set({ 
              turnPhase: 'END_OF_TURN',
              lastEvent: { type: 'info', message: `${player.name} est chez soi à ${space.name}`, emoji: '🏡' },
            });
            broadcastIfHost(get);
        }
        break;
      }
      case 'tax': {
        const taxAmount = space.price || 200;
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex] = { 
          ...newPlayers[currentPlayerIndex], 
          balance: newPlayers[currentPlayerIndex].balance - taxAmount 
        };
        set({ 
          players: newPlayers, 
          turnPhase: 'END_OF_TURN',
          lastEvent: { type: 'tax', message: `${player.name} paie ${taxAmount} AR de taxe !`, emoji: '💰' },
        });

        // ── FAILLITE : Vérifier si la taxe ruine le joueur ──
        if (newPlayers[currentPlayerIndex].balance < 0) {
          get().handleBankruptcy(player.id, null); // null = dette envers la banque
        } else {
          broadcastIfHost(get);
        }
        break;
      }
      case 'go-to-jail': {
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex] = {
          ...newPlayers[currentPlayerIndex],
          position: 10,
          inJail: true,
        };
        set({ 
          players: newPlayers, 
          turnPhase: 'END_OF_TURN',
          lastEvent: { type: 'jail', message: `${player.name} va en prison !`, emoji: '👮' },
        });
        broadcastIfHost(get);
        break;
      }
      case 'community-chest':
      case 'chance': {
        const isChance = space.type === 'chance';
        let deck = isChance ? [...get().chanceDeck] : [...get().communityChestDeck];
        
        // Reshuffle if empty
        if (deck.length === 0) {
          deck = shuffleArray(Array.from({ length: 16 }, (_, i) => i));
        }

        const cardIndex = deck.shift()!;
        deck.push(cardIndex); // Put at bottom of deck

        const card = isChance ? CHANCE_CARDS[cardIndex] : COMMUNITY_CHEST_CARDS[cardIndex];
        
        const newPlayers = [...players];
        const newBoard = { ...board };
        const p = newPlayers[currentPlayerIndex];

        // Apply card effect
        let newPos = p.position;
        switch (card.action.type) {
          case 'RECEIVE':
            p.balance += card.action.amount || 0;
            break;
          case 'PAY':
            p.balance -= card.action.amount || 0;
            break;
          case 'PAY_ALL':
            newPlayers.forEach(other => {
              if (other.id !== p.id && !other.isBankrupt) {
                other.balance += card.action.amount || 0;
                p.balance -= card.action.amount || 0;
              }
            });
            break;
          case 'RECEIVE_ALL':
            newPlayers.forEach(other => {
              if (other.id !== p.id && !other.isBankrupt) {
                other.balance -= card.action.amount || 0;
                p.balance += card.action.amount || 0;
                // Note: simplified bankruptcy check for others
              }
            });
            break;
          case 'GO_TO_JAIL':
            p.position = 10;
            p.inJail = true;
            break;
          case 'GET_OUT_OF_JAIL':
            p.hasGetOutOfJailCard = true;
            break;
          case 'MOVE_RELATIVE':
            newPos = (p.position + (card.action.steps || 0) + 40) % 40;
            p.position = newPos;
            break;
          case 'MOVE_TO': {
            const targetPos = parseInt(card.action.targetId || '0', 10);
            if (card.action.passGoBonus && targetPos < p.position) {
              p.balance += 200;
            }
            p.position = targetPos;
            newPos = targetPos;
            break;
          }
          case 'STREET_REPAIRS': {
            let houses = 0, hotels = 0;
            Object.values(board).forEach(s => {
              if (s.ownerId === p.id) {
                if (s.houseCount === 5) hotels++;
                else houses += s.houseCount;
              }
            });
            const cost = houses * (card.action.houseAmount || 0) + hotels * (card.action.hotelAmount || 0);
            p.balance -= cost;
            break;
          }
        }

        const stateUpdates: any = {
          players: newPlayers,
          board: newBoard,
          turnPhase: 'END_OF_TURN',
          lastEvent: { 
            type: 'card', 
            message: `${player.name} a tiré : "${card.text}"`, 
            emoji: isChance ? '🃏' : '📦',
            card
          },
        };

        if (isChance) stateUpdates.chanceDeck = deck;
        else stateUpdates.communityChestDeck = deck;

        set(stateUpdates);

        // Si faillite
        if (p.balance < 0) {
          get().handleBankruptcy(p.id, null);
        } else if (newPos !== player.position && !p.inJail) {
          // Si la carte l'a déplacé (et pas en prison), on résout la nouvelle case !
          // On le fait dans une frame suivante pour laisser l'UI souffler ? Non, on peut appeler resolveSpace.
          // Wait, if we just call get().resolveSpace(), the lastEvent will be overwritten.
          // Let's rely on the player acknowledging the card first ? No, just resolve space.
          // Wait, let's keep it simple: the card text explains it. The rent/purchase modal will pop up.
          // We must set turnPhase to ANIMATING_MOVEMENT so it triggers resolveSpace again in the GameScreen hook.
          set({ turnPhase: 'ANIMATING_MOVEMENT' });
        }

        broadcastIfHost(get);
        break;
      }
      default:
        set({ turnPhase: 'END_OF_TURN' });
        broadcastIfHost(get);
    }
  },

  buyProperty: () => {
    const { players, currentPlayerIndex, board, turnPhase, networkRole } = get();
    if (turnPhase !== 'WAITING_FOR_DECISION') return;

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_BUY_PROPERTY' });
      return;
    }

    const player = players[currentPlayerIndex];
    const space = STATIC_BOARD[player.position];
    if (!space || !space.price) return;

    const newPlayers = [...players];
    const updatedPlayer = { ...newPlayers[currentPlayerIndex] };
    updatedPlayer.balance -= space.price;
    updatedPlayer.consecutiveTimeouts = 0; // Reset timeouts when player acts manually
    newPlayers[currentPlayerIndex] = updatedPlayer;

    const newBoard = { ...board };
    newBoard[space.id] = {
      id: space.id,
      ownerId: player.id,
      houseCount: 0,
    };

    set({ 
      players: newPlayers, 
      board: newBoard, 
      turnPhase: 'END_OF_TURN', 
      actionDeadline: null,
      lastEvent: { type: 'purchase', message: `${player.name} achète ${space.name} pour ${space.price} AR !`, emoji: '🏠' },
    });
    // Clear timeout when player acts
    get().clearTurnTimeout();
    broadcastIfHost(get);
  },

  skipPurchase: () => {
    const { turnPhase, players, currentPlayerIndex, networkRole } = get();
    if (turnPhase !== 'WAITING_FOR_DECISION') return;

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_SKIP_PURCHASE' });
      return;
    }

    // Reset consecutive timeouts when player acts manually
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = {
      ...newPlayers[currentPlayerIndex],
      consecutiveTimeouts: 0
    };

    const player = newPlayers[currentPlayerIndex];
    const space = STATIC_BOARD[player.position];
    set({ 
      turnPhase: 'END_OF_TURN', 
      actionDeadline: null,
      players: newPlayers,
      lastEvent: { type: 'info', message: `${player.name} passe sur ${space?.name || 'la case'}`, emoji: '⏭️' },
    });
    // Clear timeout when player acts
    get().clearTurnTimeout();
    broadcastIfHost(get);
  },

  buildHouse: (propertyId: string) => {
    const { players, board, currentPlayerIndex, networkRole, localPlayerId } = get();

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_BUILD_HOUSE', payload: { propertyId } });
      return;
    }

    const player = players[currentPlayerIndex];
    const space = STATIC_BOARD.find(s => s.id === propertyId);
    const record = board[propertyId];

    if (!space || space.type !== 'property' || !space.color || !space.buildCost || !record || record.ownerId !== player.id) return;
    
    // Check Monopoly
    if (!hasMonopoly(player.id, space.color, board)) return;

    // Check Max limit
    if (record.houseCount >= 5) return;

    // Check Uniformity (cannot build if it would be > minHouseCount + 1)
    const groupSpaces = STATIC_BOARD.filter(s => s.color === space.color);
    const minHouseCount = Math.min(...groupSpaces.map(s => board[s.id]?.houseCount || 0));
    if (record.houseCount + 1 > minHouseCount + 1) return;

    // Check Bank supply
    let housesInUse = 0;
    let hotelsInUse = 0;
    Object.values(board).forEach(s => {
      if (s.houseCount === 5) hotelsInUse++;
      else housesInUse += s.houseCount;
    });

    const isBuildingHotel = record.houseCount === 4;
    if (isBuildingHotel && hotelsInUse >= 12) return; // No hotels left
    if (!isBuildingHotel && housesInUse >= 32) return; // No houses left

    // Check Funds
    if (player.balance < space.buildCost) return;

    // Execute build
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, balance: player.balance - space.buildCost };

    const newBoard = { ...board };
    newBoard[propertyId] = { ...record, houseCount: record.houseCount + 1 };

    const buildingName = isBuildingHotel ? 'un hôtel' : 'une maison';
    
    set({
      players: newPlayers,
      board: newBoard,
      lastEvent: { type: 'build', message: `${player.name} construit ${buildingName} sur ${space.name} !`, emoji: '🏗️' }
    });
    broadcastIfHost(get);
  },

  sellHouse: (propertyId: string) => {
    const { players, board, currentPlayerIndex, networkRole, localPlayerId } = get();

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_SELL_HOUSE', payload: { propertyId } });
      return;
    }

    const player = players[currentPlayerIndex];
    const space = STATIC_BOARD.find(s => s.id === propertyId);
    const record = board[propertyId];

    // Note: To sell, we just check owner, even if it's not their turn (for bankruptcy handling later, but here we'll assume current player)
    // Wait, let's allow selling during own turn only for now.
    if (!space || space.type !== 'property' || !space.color || !space.buildCost || !record || record.ownerId !== player.id) return;
    
    if (record.houseCount <= 0) return;

    // Check Uniformity (cannot sell if it would be < maxHouseCount - 1)
    const groupSpaces = STATIC_BOARD.filter(s => s.color === space.color);
    const maxHouseCount = Math.max(...groupSpaces.map(s => board[s.id]?.houseCount || 0));
    if (record.houseCount - 1 < maxHouseCount - 1) return;

    // Check Bank supply if selling hotel (need 4 houses)
    const isSellingHotel = record.houseCount === 5;
    if (isSellingHotel) {
      let housesInUse = 0;
      Object.values(board).forEach(s => {
        if (s.houseCount < 5) housesInUse += s.houseCount;
      });
      if (32 - housesInUse < 4) {
        // Not enough houses to replace the hotel! In real life, you must sell down to 0 if not enough houses.
        // For simplicity here, we just block it.
        set({ lastEvent: { type: 'error', message: `Pas assez de maisons en banque pour démolir l'hôtel !`, emoji: '⚠️' } });
        return;
      }
    }

    // Execute sell (half price)
    const sellPrice = Math.floor(space.buildCost / 2);
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, balance: player.balance + sellPrice };

    const newBoard = { ...board };
    newBoard[propertyId] = { ...record, houseCount: record.houseCount - 1 };

    const buildingName = isSellingHotel ? 'un hôtel' : 'une maison';
    
    set({
      players: newPlayers,
      board: newBoard,
      lastEvent: { type: 'sell', message: `${player.name} vend ${buildingName} sur ${space.name} (+${sellPrice} AR)`, emoji: '🔨' }
    });
    broadcastIfHost(get);
  },

  mortgageProperty: (propertyId: string) => {
    const { players, board, currentPlayerIndex, networkRole } = get();

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_MORTGAGE', payload: { propertyId } });
      return;
    }

    const player = players[currentPlayerIndex];
    const space = STATIC_BOARD.find(s => s.id === propertyId);
    const record = board[propertyId];

    if (!space || !space.price || !record || record.ownerId !== player.id || record.isMortgaged) return;

    // Check if any property in the color group has houses (must sell houses first)
    if (space.type === 'property' && space.color) {
      const groupSpaces = STATIC_BOARD.filter(s => s.color === space.color);
      const hasHouses = groupSpaces.some(s => (board[s.id]?.houseCount || 0) > 0);
      if (hasHouses) {
        set({ lastEvent: { type: 'error', message: `Vendez d'abord les maisons du groupe de couleur !`, emoji: '⚠️' } });
        return;
      }
    }

    const mortgageValue = Math.floor(space.price / 2);
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, balance: player.balance + mortgageValue };

    const newBoard = { ...board };
    newBoard[propertyId] = { ...record, isMortgaged: true };

    set({
      players: newPlayers,
      board: newBoard,
      lastEvent: { type: 'info', message: `${player.name} hypothèque ${space.name} (+${mortgageValue} AR)`, emoji: '🏦' }
    });
    broadcastIfHost(get);
  },

  unmortgageProperty: (propertyId: string) => {
    const { players, board, currentPlayerIndex, networkRole } = get();

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_UNMORTGAGE', payload: { propertyId } });
      return;
    }

    const player = players[currentPlayerIndex];
    const space = STATIC_BOARD.find(s => s.id === propertyId);
    const record = board[propertyId];

    if (!space || !space.price || !record || record.ownerId !== player.id || !record.isMortgaged) return;

    const unmortgageCost = Math.ceil((space.price / 2) * 1.1); // 10% interest

    if (player.balance < unmortgageCost) {
      set({ lastEvent: { type: 'error', message: `Fonds insuffisants pour lever l'hypothèque !`, emoji: '💸' } });
      return;
    }

    const newPlayers = [...players];
    newPlayers[currentPlayerIndex] = { ...player, balance: player.balance - unmortgageCost };

    const newBoard = { ...board };
    newBoard[propertyId] = { ...record, isMortgaged: false };

    set({
      players: newPlayers,
      board: newBoard,
      lastEvent: { type: 'info', message: `${player.name} lève l'hypothèque de ${space.name} (-${unmortgageCost} AR)`, emoji: '🏡' }
    });
    broadcastIfHost(get);
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // endTurn — Saute les joueurs en faillite, détecte la prison
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  endTurn: () => {
    const { players, currentPlayerIndex, turnPhase, networkRole, consecutiveDoubles, winCondition, chronoEndTime, board } = get();
    if (players.length === 0) return;
    if (turnPhase === 'GAME_OVER') return;

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_END_TURN' });
      return;
    }

    const currentPlayer = players[currentPlayerIndex];

    // Rejouer si double (et si le joueur n'est pas en prison suite à 3 doubles ou case "Allez en prison")
    if (consecutiveDoubles > 0 && !currentPlayer.inJail && !currentPlayer.isBankrupt) {
      set({ 
        turnPhase: 'WAITING_FOR_DICE', 
        actionDeadline: null,
        lastEvent: { type: 'info', message: `${currentPlayer.name} a fait un double et rejoue !`, emoji: '🎲' },
      });
      // Restart timer for the new turn (20 seconds again)
      get().startTurnTimeout();
      broadcastIfHost(get);
      return;
    }

    // Trouver le prochain joueur non-en-faillite
    let nextIndex = (currentPlayerIndex + 1) % players.length;
    let attempts = 0;

    while (players[nextIndex].isBankrupt && attempts < players.length) {
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }

    const nextPlayer = players[nextIndex];

    // ── Vérification Fortune Limite ──
    if (winCondition.type === 'fortune_limit') {
      const richest = players.filter(p => !p.isBankrupt).find(p => computeNetWorth(p, board) >= winCondition.amount);
      if (richest) {
        set({
          currentPlayerIndex: nextIndex,
          turnPhase: 'GAME_OVER',
          actionDeadline: null,
          lastEvent: { type: 'victory', message: `💰 ${richest.name} atteint ${winCondition.amount.toLocaleString()} AR et remporte la partie !`, emoji: '🏆' },
        });
        broadcastIfHost(get);
        return;
      }
    }

    // ── Vérification Chrono ──
    if (winCondition.type === 'chrono' && chronoEndTime && Date.now() >= chronoEndTime) {
      get().checkChronoExpired();
      return;
    }

    // Si le prochain joueur est en prison → phase IN_JAIL_DECISION
    if (nextPlayer.inJail) {
      set({
        currentPlayerIndex: nextIndex,
        turnPhase: 'IN_JAIL_DECISION',
        actionDeadline: null,
        lastEvent: { type: 'jail', message: `${nextPlayer.name} est en prison (Tour ${nextPlayer.jailTurns + 1}/3)`, emoji: '⛓️' },
      });
    } else {
      set({ 
        currentPlayerIndex: nextIndex, 
        turnPhase: 'WAITING_FOR_DICE', 
        actionDeadline: null,
        lastEvent: null,
      });
    }
    // Start timeout for next player's turn
    get().startTurnTimeout();
    broadcastIfHost(get);
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Jail Actions — Les 3 options pour sortir de prison
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * payBail — Payer 50 AR pour sortir immédiatement.
   * Le joueur sort de prison et lance les dés normalement.
   */
  payBail: () => {
    const { turnPhase, players, currentPlayerIndex, networkRole } = get();
    if (turnPhase !== 'IN_JAIL_DECISION') return;

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_PAY_BAIL' });
      return;
    }

    const newPlayers = [...players];
    const player = { ...newPlayers[currentPlayerIndex] };

    if (player.balance < 50) {
      // Pas assez d'argent — reste en prison
      set({
        lastEvent: { type: 'jail', message: `${player.name} n'a pas 50 AR pour la caution !`, emoji: '💸' },
      });
      broadcastIfHost(get);
      return;
    }

    player.balance -= 50;
    player.inJail = false;
    player.jailTurns = 0;
    newPlayers[currentPlayerIndex] = player;

    set({
      players: newPlayers,
      turnPhase: 'WAITING_FOR_DICE',
      lastEvent: { type: 'jail', message: `${player.name} paie 50 AR de caution et sort de prison !`, emoji: '🔓' },
    });
    broadcastIfHost(get);
  },

  /**
   * useJailCard — Utiliser la carte "Sortir de prison".
   */
  useJailCard: () => {
    const { turnPhase, players, currentPlayerIndex, networkRole } = get();
    if (turnPhase !== 'IN_JAIL_DECISION') return;

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_USE_JAIL_CARD' });
      return;
    }

    const newPlayers = [...players];
    const player = { ...newPlayers[currentPlayerIndex] };

    if (!player.hasGetOutOfJailCard) return;

    player.hasGetOutOfJailCard = false;
    player.inJail = false;
    player.jailTurns = 0;
    newPlayers[currentPlayerIndex] = player;

    set({
      players: newPlayers,
      turnPhase: 'WAITING_FOR_DICE',
      lastEvent: { type: 'jail', message: `${player.name} utilise sa carte et sort de prison !`, emoji: '🃏' },
    });
    broadcastIfHost(get);
  },

  /**
   * rollForJailBreak — Tenter un double pour s'évader.
   * Double = sortie libre + déplacement.
   * Pas de double = reste en prison, jailTurns++.
   * 3e tentative échouée = sortie forcée avec 50 AR.
   */
  rollForJailBreak: () => {
    const { turnPhase, players, currentPlayerIndex, networkRole } = get();
    if (turnPhase !== 'IN_JAIL_DECISION') return;

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_ROLL_JAIL' });
      return;
    }

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const isDouble = die1 === die2;

    const newPlayers = [...players];
    const player = { ...newPlayers[currentPlayerIndex] };

    if (isDouble) {
      // ── ÉVASION RÉUSSIE ──
      player.inJail = false;
      player.jailTurns = 0;
      const newPosition = (player.position + die1 + die2) % 40;

      // Passage par Départ
      let event: GameEvent = { type: 'jail', message: `${player.name} fait un double ${die1}+${die2} et s'évade !`, emoji: '🔓' };
      if (newPosition < player.position) {
        player.balance += 200;
        event = { type: 'go-bonus', message: `${player.name} s'évade et passe par Départ ! +200 AR`, emoji: '🏁' };
      }

      player.position = newPosition;
      newPlayers[currentPlayerIndex] = player;

      set({
        lastDiceRoll: [die1, die2],
        consecutiveDoubles: 0,
        players: newPlayers,
        turnPhase: 'ANIMATING_MOVEMENT',
        lastEvent: event,
      });
      broadcastIfHost(get);
    } else {
      // ── ÉVASION ÉCHOUÉE ──
      player.jailTurns += 1;

      if (player.jailTurns >= 3) {
        // 3e tentative — sortie forcée avec paiement
        player.balance -= 50;
        player.inJail = false;
        player.jailTurns = 0;
        const newPosition = (player.position + die1 + die2) % 40;

        let event: GameEvent = { type: 'jail', message: `${player.name} échoue 3 fois — sortie forcée ! -50 AR`, emoji: '💸' };
        if (newPosition < player.position) {
          player.balance += 200;
        }

        player.position = newPosition;
        newPlayers[currentPlayerIndex] = player;

        set({
          lastDiceRoll: [die1, die2],
          consecutiveDoubles: 0,
          players: newPlayers,
          turnPhase: 'ANIMATING_MOVEMENT',
          lastEvent: event,
        });

        // Vérifier la faillite après le paiement forcé
        if (player.balance < 0) {
          get().handleBankruptcy(player.id, null);
        } else {
          broadcastIfHost(get);
        }
      } else {
        // Reste en prison — tour consommé
        newPlayers[currentPlayerIndex] = player;
        set({
          lastDiceRoll: [die1, die2],
          players: newPlayers,
          turnPhase: 'END_OF_TURN',
          lastEvent: { type: 'jail', message: `${player.name} fait ${die1}+${die2}… pas de double. Reste en prison.`, emoji: '🔒' },
        });
        broadcastIfHost(get);
      }
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TRADE ACTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  proposeTrade: (offer) => {
    const { networkRole } = get();
    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_TRADE', payload: offer });
      return;
    }

    const tradeId = 'trade-' + Date.now();
    const fullOffer: TradeOffer = { ...offer, id: tradeId };
    
    set({ activeTradeOffer: fullOffer });
    broadcastIfHost(get);
  },

  respondToTrade: (accept) => {
    const { networkRole, activeTradeOffer, players, board } = get();

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'RESPOND_TRADE', payload: { accept } });
      return;
    }

    if (!activeTradeOffer) return;

    if (!accept) {
      set({ 
        activeTradeOffer: null,
        lastEvent: { type: 'info', message: `L'échange a été refusé.`, emoji: '❌' }
      });
      broadcastIfHost(get);
      return;
    }

    // Process the trade!
    const { fromPlayerId, toPlayerId, offerMoney, offerProperties, requestMoney, requestProperties } = activeTradeOffer;
    
    const newPlayers = [...players];
    const fromIdx = newPlayers.findIndex(p => p.id === fromPlayerId);
    const toIdx = newPlayers.findIndex(p => p.id === toPlayerId);

    if (fromIdx === -1 || toIdx === -1) {
      set({ activeTradeOffer: null });
      return;
    }

    // Money transfer
    newPlayers[fromIdx] = { ...newPlayers[fromIdx], balance: newPlayers[fromIdx].balance - offerMoney + requestMoney };
    newPlayers[toIdx] = { ...newPlayers[toIdx], balance: newPlayers[toIdx].balance + offerMoney - requestMoney };

    // Properties transfer
    const newBoard = { ...board };
    
    offerProperties.forEach(pid => {
      if (newBoard[pid]) newBoard[pid] = { ...newBoard[pid], ownerId: toPlayerId };
    });
    
    requestProperties.forEach(pid => {
      if (newBoard[pid]) newBoard[pid] = { ...newBoard[pid], ownerId: fromPlayerId };
    });

    set({
      players: newPlayers,
      board: newBoard,
      activeTradeOffer: null,
      lastEvent: { type: 'info', message: `${newPlayers[fromIdx].name} et ${newPlayers[toIdx].name} ont conclu un échange !`, emoji: '🤝' }
    });
    broadcastIfHost(get);
  },

  cancelTrade: () => {
    const { networkRole } = get();
    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'CANCEL_TRADE' });
      return;
    }
    set({ activeTradeOffer: null });
    broadcastIfHost(get);
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // forfeit — Abandon volontaire (forfait)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  forfeit: () => {
    const { networkRole, localPlayerId } = get();

    if (networkRole === 'client') {
      NetworkManager.sendMessage({ type: 'REQUEST_FORFEIT', payload: { playerId: localPlayerId } });
      return;
    }

    // Host or local: bankrupt the local player
    if (localPlayerId) {
      get().handleBankruptcy(localPlayerId, null);
    }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // handleBankruptcy — Gestion complète de la faillite
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  handleBankruptcy: (bankruptPlayerId: string, creditorId: string | null) => {
    const { players, board } = get();
    
    // 1. Marquer le joueur comme en faillite
    const newPlayers = players.map(p => 
      p.id === bankruptPlayerId 
        ? { ...p, isBankrupt: true, balance: 0 } 
        : p
    );

    const bankruptPlayer = players.find(p => p.id === bankruptPlayerId);
    const bankruptName = bankruptPlayer?.name || 'Joueur';

    // 2. Transférer ou libérer les propriétés
    const newBoard = { ...board };
    for (const spaceId in newBoard) {
      if (newBoard[spaceId].ownerId === bankruptPlayerId) {
        if (creditorId) {
          // Faillite par loyer → les propriétés vont au créancier
          newBoard[spaceId] = { ...newBoard[spaceId], ownerId: creditorId };
        } else {
          // Faillite par taxe/banque → les propriétés reviennent à la banque
          newBoard[spaceId] = { ...newBoard[spaceId], ownerId: null, houseCount: 0 };
        }
      }
    }

    // 3. Compter les joueurs encore actifs
    const activePlayers = newPlayers.filter(p => !p.isBankrupt);
    const activeHumans = activePlayers.filter(p => !p.isBot);
    
    if (activePlayers.length <= 1 || activeHumans.length === 0) {
      // ── VICTOIRE OU FIN DE PARTIE ──
      // Un seul joueur reste, ou plus aucun joueur humain
      const winner = activePlayers.length === 1 ? activePlayers[0] : null;
      set({
        players: newPlayers,
        board: newBoard,
        turnPhase: 'GAME_OVER',
        lastEvent: { 
          type: 'victory', 
          message: winner 
            ? `🏆 ${winner.name} remporte la partie !`
            : 'La partie est terminée (plus aucun humain) !', 
          emoji: '👑' 
        },
      });
      broadcastIfHost(get);
    } else {
      // Le jeu continue — afficher la notification de faillite
      const creditorName = creditorId 
        ? players.find(p => p.id === creditorId)?.name || 'un joueur'
        : 'la banque';

      set({
        players: newPlayers,
        board: newBoard,
        lastEvent: { 
          type: 'bankruptcy', 
          message: `${bankruptName} fait faillite ! Ses propriétés vont à ${creditorName}.`,
          emoji: '💀'
        },
      });
      
      // Si c'est le tour du joueur qui vient de faire faillite/d'abandonner, on passe le tour
      const { currentPlayerIndex } = get();
      if (players[currentPlayerIndex].id === bankruptPlayerId) {
        get().endTurn();
      } else {
        broadcastIfHost(get);
      }
    }
  },

  clearEvent: () => {
    const { networkRole } = get();
    // clearEvent is UI only, no need to broadcast, just clear local state
    set({ lastEvent: null });
  },

  handleTimeout: () => {
    const { turnPhase, networkRole, currentPlayerIndex, players } = get();
    if (networkRole === 'client') return; // Host handles timeouts
    
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isBot) return;
    
    // Increment consecutive timeouts counter
    const newPlayers = [...players];
    const playerIndex = currentPlayerIndex; // Use current index directly
    
    if (playerIndex >= 0 && playerIndex < newPlayers.length) {
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        consecutiveTimeouts: (newPlayers[playerIndex].consecutiveTimeouts || 0) + 1
      };
    }
    
    // Check if player has 3 consecutive timeouts
    if (newPlayers[playerIndex].consecutiveTimeouts >= 3) {
      // Player is bankrupt due to inactivity
      get().handleBankruptcy(currentPlayer.id, null);
      set({ 
        players: newPlayers,
        lastEvent: {
          type: 'bankruptcy',
          message: `${currentPlayer.name} éliminé pour inactivité (3 timeouts)`,
          emoji: '⏰'
        }
      });
      return;
    }
    
    // Update players with incremented counter BEFORE executing action
    set({ players: newPlayers });
    
    // Broadcast the updated state with new consecutiveTimeouts
    broadcastIfHost(get);
    
    // Execute the timeout action
    if (turnPhase === 'WAITING_FOR_DICE') get().rollDice(false); // Auto roll, don't reset timeouts
    else if (turnPhase === 'WAITING_FOR_DECISION') get().skipPurchase();
    else if (turnPhase === 'IN_JAIL_DECISION') get().rollForJailBreak();
  },

  startTurnTimeout: () => {
    const { networkRole, currentPlayerIndex, players } = get();
    
    // Only host manages the actual timeout, but all players can see the timer
    if (networkRole === 'host') {
      // Clear existing timeout
      if (turnTimeoutTimer) {
        clearTimeout(turnTimeoutTimer);
        turnTimeoutTimer = null;
      }
      
      // Don't set timeout for bots
      const currentPlayer = players[currentPlayerIndex];
      if (currentPlayer?.isBot) {
        set({ turnTimeRemaining: null });
        return;
      }
      // Record start time and set initial remaining time
      turnTimeoutStart = Date.now();
      set({ turnTimeRemaining: TURN_TIMEOUT_MS });
      
      // Update timer every 100ms and broadcast to clients
      const updateInterval = setInterval(() => {
        const elapsed = Date.now() - turnTimeoutStart;
        const remaining = Math.max(0, TURN_TIMEOUT_MS - elapsed);
        set({ turnTimeRemaining: remaining });
        
        // Broadcast timer update to clients
        NetworkManager.broadcast({
          type: 'TIMER_UPDATE',
          payload: { turnTimeRemaining: remaining }
        });
        
        if (remaining <= 0) {
          clearInterval(updateInterval);
        }
      }, 100);
      
      // Set new timeout for 20 seconds
      turnTimeoutTimer = setTimeout(() => {
        clearInterval(updateInterval);
        get().handleTimeout();
      }, TURN_TIMEOUT_MS);
    } else {
      // For clients, just show the timer without managing the timeout
      const currentPlayer = players[currentPlayerIndex];
      if (currentPlayer?.isBot) {
        set({ turnTimeRemaining: null });
      } else {
        set({ turnTimeRemaining: TURN_TIMEOUT_MS });
      }
    }
  },

  clearTurnTimeout: () => {
    if (turnTimeoutTimer) {
      clearTimeout(turnTimeoutTimer);
      turnTimeoutTimer = null;
    }
    set({ turnTimeRemaining: null });
  },

  setTurnTimeRemaining: (remaining: number | null) => {
    set({ turnTimeRemaining: remaining });
  },
};});
