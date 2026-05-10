# CONTEXTE DU PROJET : MONOPOLY MADAGASCAR

## 1. Vue d'ensemble
L'objectif est de développer une adaptation du jeu Monopoly sur le thème de Madagascar. 
Le développement se fait de manière itérative. Ce document définit le périmètre du **Sprint 1 (Phase 1)**.

- **Plateforme cible :** Application mobile (iOS/Android) via React Native.
- **Mode de jeu actuel :** Solo hors ligne. Le joueur humain affronte des intelligences artificielles (Bots).
- **Philosophie d'architecture :** Séparation stricte entre la logique métier (Moteur de jeu géré par Zustand) et la couche de présentation visuelle (Composants React).

## 2. Stack Technique
- **Framework :** React Native avec Expo.
- **Langage :** TypeScript (Typage strict obligatoire).
- **Gestion d'état :** Zustand.
- **Animations :** React Native Reanimated (pour le déplacement fluide des pions et de la caméra).

## 3. Périmètre des Règles (Phase 1)
- **Inclus :** Lancer de dés, déplacement, passage par la case Départ (+200 AR), achat de propriétés libres, paiement des loyers, gestion de la prison (règle des 3 doubles ou cartes/cases d'envoi), faillite basique.
- **Bots (IA) :** Décisions déterministes. Achètent si (Solde > Prix + Marge). Construisent si monopole et réserves suffisantes. Paient pour sortir de prison si fonds disponibles.
- **Exclus de la Phase 1 (À ne pas coder pour le moment) :** Échanges entre joueurs (Case "Misy sera aty" neutre), hypothèques, multijoueur réseau.
- **Économie :** Échelle monétaire simplifiée (Base : Départ = 200 AR).

## 4. Architecture de l'État (Store Zustand)
L'état de la partie est géré par une machine à états finis. Les composants UI ne font que lire cet état et déclencher des actions.

### 4.1. Interfaces TypeScript (Modèles de données)
```typescript
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
  balance: number;       // Ex: 1500 au départ
  position: number;      // Index 0 à 39
  inJail: boolean;
  jailTurns: number;
  hasGetOutOfJailCard: boolean;
}

export interface PropertyState {
  id: string;            // Correspond à l'ID statique du board
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

ROADMAP : MONOPOLY MADAGASCAR
🟢 SPRINT 1 : Architecture & Logique (Core Engine)
[x] Initialisation du projet (Expo, TypeScript, Zustand, Reanimated).

[x] Modélisation des types (GameState, Player, TurnPhase).

[x] Implémentation du moteur Zustand (Déplacements, règles de dés, prison).

[x] Création des données statiques (Les 40 cases, prix, loyers).

🟢 SPRINT 2 : Rendu Visuel & UI/UX (Terminé)
[x] Étape 1 : Rendu Géométrique du Plateau (BoardLayer, mathématiques cartésiennes, design adaptatif).

[x] Étape 2 : L'Interface Fixe (HUDLayer) (Affichage des données joueurs, dés, bouton d'action).

[x] Étape 3 : Animation des Pions (TokenLayer) (Apparition sur le plateau, déplacement fluide via Reanimated).

[x] Étape 4 : Caméra Dynamique (Suivi automatique du joueur actif par translation du plateau).

[x] Étape 5 : Modales d'Action (Pop-ups de décision pour l'achat de propriétés, alertes de taxes).

🟡 SPRINT 3 : Boucle de Jeu & Intégration IA (En cours)
[x] Connexion du HUD au moteur Zustand (Déclenchement réel des phases de tour).

[x] Calcul et transfert des loyers (payRent).

[x] Implémentation du comportement déterministe des Bots.

[x] Gestion des fins de partie et faillite.

🟢 SPRINT 4 : Finalisation (Terminé)
[x] Intégration des assets visuels définitifs (Placeholders vectoriels temporaires implémentés via TileIconRenderer).

[x] Ajustements ergonomiques et tests de performance (Game feel : Haptics et animations Reanimated avec withSpring).

[x] Configuration finale pour mobile (Nettoyage, Métadonnées, app.json).


## 📱 Environnement de Test & Build Actuel (Important)

> **Note pour l'assistant :** Le développement et les tests de l'application s'effectuent via des "Custom Dev Clients" (et non Expo Go) en raison de l'utilisation de modules natifs (`react-native-tcp-socket`). 

Voici la configuration matérielle et réseau utilisée pour valider le code :

* **Matériel de développement :** Mac (Apple Silicon/Intel).
* **Appareil iOS (L'Hôte TCP) :** * Testé sur un **iPhone physique**.
    * Méthode de build : `npx expo prebuild` puis compilation via **Xcode** pour signer et installer l'application sur le téléphone.
    * **Rôle réseau :** L'iPhone physique agit toujours comme **Hôte** de la partie pour exposer une véritable adresse IP locale (LAN) accessible sur le routeur Wi-Fi.
* **Appareil Android (Le Client TCP) :** * Testé sur un **Émulateur Android** tournant sur le Mac.
    * Méthode de build : `npx expo run:android` pour générer l'APK et l'installer sur l'émulateur.
    * **Rôle réseau :** L'émulateur agit comme **Client**. Il se connecte à l'IP locale exposée par l'iPhone. (Note : L'inverse n'est pas possible à cause de l'isolation réseau de l'émulateur Android).
* **Déploiement à chaud :** Une fois les applications natives installées sur les deux appareils, le serveur Metro (`npx expo start --dev-client`) est utilisé pour injecter le bundle JavaScript via le Wi-Fi.
* 
* pour tester : lancer relay (`npm start`) et ensuite lancer app sur les deux appareils : (`npx expo start --dev-client`)
