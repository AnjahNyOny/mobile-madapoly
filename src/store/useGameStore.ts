import { create } from 'zustand';
import { GameState, Player, TurnPhase } from '../types';
import { STATIC_BOARD } from '../constants';
import { calculateRent } from '../utils/rentCalculator';

// ─── Event types for UI notifications ───
export interface GameEvent {
  type: 'info' | 'purchase' | 'tax' | 'jail' | 'go-bonus' | 'rent' | 'bankruptcy' | 'victory';
  message: string;
  emoji: string;
}

interface GameActions {
  initGame: (playersSetup: Pick<Player, 'id' | 'name' | 'isBot'>[]) => void;
  rollDice: () => void;
  endAnimation: () => void;
  resolveSpace: () => void;
  buyProperty: () => void;
  skipPurchase: () => void;
  endTurn: () => void;
  handleTimeout: () => void;
  clearEvent: () => void;
  handleBankruptcy: (bankruptPlayerId: string, creditorId: string | null) => void;
  debugForceBankruptcy: () => void;
}

interface GameStoreState extends GameState {
  lastEvent: GameEvent | null;
}

export const useGameStore = create<GameStoreState & GameActions>((set, get) => ({
  // --- ÉTAT INITIAL ---
  players: [], 
  board: {}, 
  currentPlayerIndex: 0, 
  turnPhase: 'WAITING_FOR_DICE',
  consecutiveDoubles: 0, 
  lastDiceRoll: null, 
  actionDeadline: null,
  lastEvent: null,

  // --- ACTIONS ---
  initGame: (playersSetup) => {
    const players = playersSetup.map(p => ({
      ...p, 
      balance: 1500, 
      position: 0, 
      inJail: false, 
      jailTurns: 0, 
      hasGetOutOfJailCard: false,
      isBankrupt: false,
    }));
    set({ players, turnPhase: 'WAITING_FOR_DICE', currentPlayerIndex: 0, lastEvent: null, board: {} });
  },

  rollDice: () => {
    const { turnPhase, consecutiveDoubles, players, currentPlayerIndex } = get();
    if (turnPhase !== 'WAITING_FOR_DICE') return;

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const isDouble = die1 === die2;
    const nextDoublesCount = isDouble ? consecutiveDoubles + 1 : 0;
    
    const newPlayers = [...players];
    const player = { ...newPlayers[currentPlayerIndex] };

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
  },

  endAnimation: () => {
    set({ turnPhase: 'RESOLVING_SPACE' });
    get().resolveSpace();
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Le Dispatcher (Aiguilleur) — avec détection de faillite
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  resolveSpace: () => {
    const { players, currentPlayerIndex, board } = get();
    const player = players[currentPlayerIndex];
    const space = STATIC_BOARD[player.position];

    if (!space) {
        set({ turnPhase: 'END_OF_TURN' });
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
              }
            } else {
              set({ turnPhase: 'END_OF_TURN' });
            }
        } else {
            set({ 
              turnPhase: 'END_OF_TURN',
              lastEvent: { type: 'info', message: `${player.name} est chez soi à ${space.name}`, emoji: '🏡' },
            });
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
        break;
      }
      case 'community-chest':
        set({ 
          turnPhase: 'END_OF_TURN',
          lastEvent: { type: 'info', message: `${player.name} tire une carte Magie-Magie`, emoji: '🃏' },
        });
        break;
      case 'chance':
        set({ 
          turnPhase: 'END_OF_TURN',
          lastEvent: { type: 'info', message: `${player.name} tire une carte Ankamantatra`, emoji: '❓' },
        });
        break;
      default:
        set({ turnPhase: 'END_OF_TURN' });
    }
  },

  buyProperty: () => {
    const { players, currentPlayerIndex, board, turnPhase } = get();
    if (turnPhase !== 'WAITING_FOR_DECISION') return;

    const player = players[currentPlayerIndex];
    const space = STATIC_BOARD[player.position];
    if (!space || !space.price) return;

    const newPlayers = [...players];
    const updatedPlayer = { ...newPlayers[currentPlayerIndex] };
    updatedPlayer.balance -= space.price;
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
  },

  skipPurchase: () => {
    const { turnPhase, players, currentPlayerIndex } = get();
    if (turnPhase !== 'WAITING_FOR_DECISION') return;
    const player = players[currentPlayerIndex];
    const space = STATIC_BOARD[player.position];
    set({ 
      turnPhase: 'END_OF_TURN', 
      actionDeadline: null,
      lastEvent: { type: 'info', message: `${player.name} passe sur ${space?.name || 'la case'}`, emoji: '⏭️' },
    });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // endTurn — Saute les joueurs en faillite
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  endTurn: () => {
    const { players, currentPlayerIndex, turnPhase } = get();
    if (players.length === 0) return;
    if (turnPhase === 'GAME_OVER') return; // Ne rien faire si la partie est terminée

    // Trouver le prochain joueur non-en-faillite
    let nextIndex = (currentPlayerIndex + 1) % players.length;
    let attempts = 0;

    while (players[nextIndex].isBankrupt && attempts < players.length) {
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }

    // Si tous les joueurs sauf un sont en faillite, la boucle ne devrait pas arriver ici
    // car handleBankruptcy aurait déjà set GAME_OVER
    set({ 
      currentPlayerIndex: nextIndex, 
      turnPhase: 'WAITING_FOR_DICE', 
      actionDeadline: null,
      lastEvent: null,
    });
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
    
    if (activePlayers.length <= 1) {
      // ── VICTOIRE : Un seul joueur reste ──
      const winner = activePlayers[0];
      set({
        players: newPlayers,
        board: newBoard,
        turnPhase: 'GAME_OVER',
        lastEvent: { 
          type: 'victory', 
          message: winner 
            ? `🏆 ${winner.name} remporte la partie !`
            : 'La partie est terminée !', 
          emoji: '👑' 
        },
      });
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
    }
  },

  clearEvent: () => {
    set({ lastEvent: null });
  },

  handleTimeout: () => {
    const { turnPhase } = get();
    if (turnPhase === 'WAITING_FOR_DICE') get().rollDice();
    else if (turnPhase === 'WAITING_FOR_DECISION') get().skipPurchase();
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DEBUG : Force la faillite du premier bot (temporaire)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  debugForceBankruptcy: () => {
    const { players } = get();
    const bot = players.find(p => p.isBot && !p.isBankrupt);
    if (!bot) return;

    // Mettre le solde à -100
    const newPlayers = players.map(p =>
      p.id === bot.id ? { ...p, balance: -100 } : p
    );
    set({ players: newPlayers });

    // Déclencher la faillite (dette envers la banque)
    get().handleBankruptcy(bot.id, null);
  },
}));
