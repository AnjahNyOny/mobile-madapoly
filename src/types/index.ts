// Les phases strictement contrôlées du moteur de jeu
export type TurnPhase = 
  | 'WAITING_FOR_DICE'     // Attente de l'action de lancer les dés
  | 'IN_JAIL_DECISION'     // Le joueur est en prison — choix : payer, carte, ou tenter un double
  | 'ANIMATING_MOVEMENT'   // Pion en mouvement (UI prend le relais)
  | 'RESOLVING_SPACE'      // Calcul de la case d'arrivée
  | 'WAITING_FOR_DECISION' // Attente du choix d'achat (Modale UI)
  | 'END_OF_TURN'          // Transition vers le joueur suivant
  | 'GAME_OVER';           // Fin de partie — un seul joueur reste

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  balance: number;       
  position: number;      // Index 0 à 39 sur le plateau
  inJail: boolean;
  jailTurns: number;
  hasGetOutOfJailCard: boolean;
  isBankrupt: boolean;    // Le joueur a fait faillite
}

export interface PropertyState {
  id: string;            // Ex: '1' pour Tsingy
  ownerId: string | null;
  houseCount: number;    // 0 à 5 (5 = hôtel)
  isMortgaged?: boolean;
}

export type BoardDynamicState = Record<string, PropertyState>;

export interface GameState {
  players: Player[];
  board: BoardDynamicState;
  currentPlayerIndex: number;
  turnPhase: TurnPhase;
  consecutiveDoubles: number;
  lastDiceRoll: [number, number] | null;
  actionDeadline: number | null; // Pour le timer (timeout automatique)
  gameLog: string[];
  turnCount: number;
  chanceDeck: number[];
  communityChestDeck: number[];
  activeTradeOffer: TradeOffer | null;
}

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offerMoney: number;
  offerProperties: string[];
  requestMoney: number;
  requestProperties: string[];
}
