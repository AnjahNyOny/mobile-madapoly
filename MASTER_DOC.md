# 📘 DOCUMENT MAÎTRE : MONOPOLY MADAGASCAR

## 1. Vision et Périmètre du Projet (Phase 1)

L'objectif est de créer une application mobile du jeu Monopoly entièrement thématisée sur Madagascar.

* **Plateforme :** Application Mobile (iOS & Android).
* **Stack Technique :** React Native, Expo, TypeScript, Zustand (State Management), React Native Reanimated (Animations).
* **Mode de jeu initial (Sprint 1) :** Solo hors ligne (Un joueur humain contre des Bots IA).
* **Architecture logicielle :** Séparation stricte et absolue entre le Moteur de Jeu (Logique pure/TypeScript) et l'Interface Graphique (Composants React).

---

## 2. Spécifications Fonctionnelles (Étape 1)

### 2.1. Structure du Plateau (40 Cases)

Le plateau respecte les dimensions classiques (11 cases par côté) mais avec des entités locales :

* **22 Propriétés :** Villes et sites touristiques (ex: *Tsingy de Bemaraha*, *Nosy Be*, *Antananarivo*).
* **4 Gares (Transports) :** *Air Madagascar*, *Kinga*, *Posy-posy*, *Cotisse* (Prix : 200 AR).
* **2 Services Publics :** *Jiro JIRAMA* et *Rano JIRAMA* (Prix : 150 AR).
* **Taxes :** *Fokontany* (200 AR) et *Hetra* (100 AR).
* **Cartes d'action :** *Magie-Magie* (Caisse de Communauté) et *Ankamantatra* (Chance).
* **Cases Spéciales :** *DÉPART* (+200 AR), *Tsiafahy* (Prison), *Miditra gagazo* (Allez en prison), *Misy sera aty* (Case neutre pour la V1).

### 2.2. Règles de la Phase 1

* **Économie :** Simplifiée sur une base de 200 AR (pour le Départ) afin d'optimiser l'affichage mobile.
* **Inclus :** Lancer de dés, déplacement, achats de propriétés, paiement des loyers, faillite, gestion de la prison (entrée par 3 doubles consécutifs ou case spéciale).
* **Exclus (remis à plus tard) :** Échanges entre joueurs, système d'hypothèque.

### 2.3. Comportement de l'IA (Bots)

* **Achat :** Achète systématiquement une propriété libre si : `Solde actuel > (Prix + Marge de sécurité)`.
* **Prison :** Paie la caution immédiatement si les fonds sont suffisants, sinon tente un lancer de double.
* **Construction :** Bâtit uniformément sur un groupe de couleur possédé si une réserve financière est atteinte.

---

## 3. Modélisation des Données & Types (Étape 2)

Fichier : `/src/types/index.ts`

```typescript
// Les phases strictement contrôlées du moteur de jeu
export type TurnPhase = 
  | 'WAITING_FOR_DICE'     // Attente de l'action de lancer les dés
  | 'ANIMATING_MOVEMENT'   // Pion en mouvement (UI prend le relais)
  | 'RESOLVING_SPACE'      // Calcul de la case d'arrivée
  | 'WAITING_FOR_DECISION' // Attente du choix d'achat (Modale UI)
  | 'END_OF_TURN';         // Transition vers le joueur suivant

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  balance: number;       
  position: number;      // Index 0 à 39 sur le plateau
  inJail: boolean;
  jailTurns: number;
  hasGetOutOfJailCard: boolean;
}

export interface PropertyState {
  id: string;            // Ex: '1' pour Tsingy
  ownerId: string | null;
  houseCount: number;    // 0 à 5 (5 = hôtel)
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
}
```

---

## 4. Le Moteur de Jeu - Logique Zustand (Étape 3)

Fichier : `/src/store/useGameStore.ts`

Le store gère l'état et intègre le motif "Dispatcher" pour résoudre les actions sur les cases.

```typescript
import { create } from 'zustand';
import { GameState, Player, TurnPhase } from '../types';
import { STATIC_BOARD } from '../constants'; // Ton tableau des 40 cases

interface GameActions {
  initGame: (playersSetup: Pick<Player, 'id' | 'name' | 'isBot'>[]) => void;
  rollDice: () => void;
  endAnimation: () => void;
  resolveSpace: () => void;
  endTurn: () => void;
  handleTimeout: () => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  // --- ÉTAT INITIAL ---
  players: [], board: {}, currentPlayerIndex: 0, turnPhase: 'WAITING_FOR_DICE',
  consecutiveDoubles: 0, lastDiceRoll: null, actionDeadline: null,

  // --- ACTIONS ---
  initGame: (playersSetup) => {
    const players = playersSetup.map(p => ({
      ...p, balance: 1500, position: 0, inJail: false, jailTurns: 0, hasGetOutOfJailCard: false
    }));
    set({ players, turnPhase: 'WAITING_FOR_DICE', currentPlayerIndex: 0 });
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

    // Règle de la prison
    if (nextDoublesCount === 3) {
      player.position = 10; player.inJail = true; newPlayers[currentPlayerIndex] = player;
      set({ lastDiceRoll: [die1, die2], consecutiveDoubles: 0, players: newPlayers, turnPhase: 'END_OF_TURN' });
      return;
    }

    const newPosition = (player.position + die1 + die2) % 40;
    if (newPosition < player.position) player.balance += 200; // Case Départ
    
    player.position = newPosition;
    newPlayers[currentPlayerIndex] = player;

    set({ lastDiceRoll: [die1, die2], consecutiveDoubles: nextDoublesCount, players: newPlayers, turnPhase: 'ANIMATING_MOVEMENT' });
  },

  endAnimation: () => {
    set({ turnPhase: 'RESOLVING_SPACE' });
    get().resolveSpace(); // Déclenche automatiquement l'analyse de la case
  },

  // Le Dispatcher (Aiguilleur)
  resolveSpace: () => {
    const { players, currentPlayerIndex, board } = get();
    const player = players[currentPlayerIndex];
    const space = STATIC_BOARD[player.position];

    switch (space.type) {
      case 'property':
      case 'railroad':
      case 'utility':
        const propertyRecord = board[space.id];
        if (!propertyRecord || !propertyRecord.ownerId) {
            if (player.balance >= space.price) {
                // Modale d'achat avec timer de 15s
                set({ turnPhase: 'WAITING_FOR_DECISION', actionDeadline: Date.now() + 15000 });
            } else {
                set({ turnPhase: 'END_OF_TURN' }); 
            }
        } else if (propertyRecord.ownerId !== player.id) {
            // Logique de loyer (payRent) à implémenter ici
            set({ turnPhase: 'END_OF_TURN' });
        } else {
            set({ turnPhase: 'END_OF_TURN' });
        }
        break;
      case 'tax':
        // Logique de taxe ici
        set({ turnPhase: 'END_OF_TURN' });
        break;
      case 'go-to-jail':
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex].position = 10;
        newPlayers[currentPlayerIndex].inJail = true;
        set({ players: newPlayers, turnPhase: 'END_OF_TURN' });
        break;
      default:
        set({ turnPhase: 'END_OF_TURN' });
    }
  },

  endTurn: () => {
    const { players, currentPlayerIndex } = get();
    set({ currentPlayerIndex: (currentPlayerIndex + 1) % players.length, turnPhase: 'WAITING_FOR_DICE', actionDeadline: null });
  },

  handleTimeout: () => {
      // Gère les actions par défaut si le temps du timer expire
      const { turnPhase } = get();
      if (turnPhase === 'WAITING_FOR_DICE') get().rollDice();
      else if (turnPhase === 'WAITING_FOR_DECISION') set({ turnPhase: 'END_OF_TURN', actionDeadline: null });
  }
}));
```

---

## 5. UI / UX et Architecture Visuelle (Étape 4)

### 5.1. Navigation et Rendu du Plateau

* **Concept choisi : "Caméra Dynamique".**
* **Fonctionnement :** Le plateau (grand carré) est rendu dans un conteneur absolu. Au lieu de déplacer une caméra, le moteur d'animation déplace le conteneur du plateau dans la direction opposée (Translations X/Y) pour que le pion actif reste toujours parfaitement centré sur l'écran du téléphone.

### 5.2. Architecture des Composants React Native

* `GameScreen` : Écran racine. Observe les changements de `turnPhase` dans le Store.
* `BoardLayer` : La grille de 40 cases rendue en absolu (via une fonction mathématique associant l'index 0-39 à des coordonnées x,y).
* `TokenLayer` : Surcouche gérant uniquement les pions. Animée avec `react-native-reanimated` pour des courbes fluides. Les pions bougent de case en case, indépendamment de la grille.
* `HUDLayer` : Head-Up Display (Fixe). Contient l'argent, les dés, les pop-ups d'achat et le timer de décision.

### 5.3. Structure des Dossiers du Projet

```text
/monopoly-mada
├── /assets            # SVG, Polices, Sons
├── /src
│   ├── /components    
│   │   ├── /board     # BoardView, Tile, TokenLayer
│   │   └── /ui        # Boutons, Modales (HUD)
│   ├── /constants     # staticBoard.ts (Les 40 cases)
│   ├── /store         # useGameStore.ts (Moteur Zustand)
│   ├── /types         # index.ts (Interfaces)
│   └── /utils         # getCoordinatesByIndex(), mathHelpers
└── App.tsx            # Entrée (Provider Zustand + GameScreen)
```
