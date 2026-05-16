# 🗺️ Roadmap : Monopoly Madagascar - Multijoueur Local (Wi-Fi / LAN)

## 🎯 Objectif Principal
Transformer le jeu local actuel géré par Zustand en une architecture Client-Serveur sur réseau local (LAN). L'un des téléphones (Hôte) héberge la logique autoritaire, les autres (Clients) s'y connectent pour jouer.

## ⚠️ Règles Strictes pour l'Assistant IA (À lire avant toute modification)
1. **Ne JAMAIS désinstaller ou altérer `react-native-reanimated` ou `react-native-gesture-handler`.** Les animations fluides (caméra, rebonds) et les interactions tactiles du plateau sont prioritaires et validées.
2. **Ne pas utiliser Expo Go pour tester cette phase.** L'implémentation requiert `react-native-tcp-socket` qui contient du code natif. Les tests doivent se faire via des builds EAS ou un Custom Dev Client.
3. **Séparation des préoccupations :** Le store Zustand ne doit plus agir seul. Le client ne modifie pas le store directement, il demande l'autorisation au serveur local.
4. **Mettre à jour cette roadmap :** Coche les cases `[x]` au fur et à mesure de l'avancement.

---

## 🛠️ Phase 1 : Infrastructure Réseau (Le Script)

- [x] **1.1 Installation des dépendances natives**
  - Installer `react-native-tcp-socket` (pour la communication).
  - Installer `react-native-network-info` (pour récupérer l'adresse IP locale de l'Hôte).
- [x] **1.2 Création du `NetworkManager.ts` (Service Autonome)**
  - Créer un fichier dédié dans `src/services/` ou `src/network/`.
  - Implémenter la logique **Hôte** :
    - Fonction `startServer(port)` : Crée le serveur TCP.
    - Écouteurs d'événements : `connection`, `data`, `error`, `close`.
    - Maintenir un dictionnaire des sockets connectés.
    - Fonction `broadcast(message)` : Envoie une donnée à tous les clients.
  - Implémenter la logique **Client** :
    - Fonction `connectToServer(ip, port)` : Se connecte au serveur TCP.
    - Fonction `sendMessage(intent)` : Envoie une intention d'action.
- [x] **1.3 Formatage des Paquets Réseau**
  - Définir un format standard (ex: JSON stringifié) pour les messages : `{ type: 'ACTION_NAME', payload: { ...data } }`.

## 🧠 Phase 2 : Refactorisation de l'État (Zustand)

- [x] **2.1 Séparation État Local / État Partagé**
  - Isoler l'état de la caméra et de l'UI (purement local) de l'état du jeu (positions, argent, propriétés).
- [x] **2.2 Implémentation du Serveur Autoritaire**
  - Modifier les actions Zustand actuelles (ex: `rollDice`, `buyProperty`).
  - **Sur le Client :** Ces actions n'exécutent plus la logique. Elles appellent `NetworkManager.sendMessage({ type: 'REQUEST_ROLL_DICE' })`.
  - **Sur l'Hôte :** Le NetworkManager reçoit `REQUEST_ROLL_DICE`, exécute la logique métier de Zustand, puis fait un `broadcast({ type: 'STATE_UPDATE', payload: newGameState })`.
- [x] **2.3 Synchronisation des Clients**
  - Créer un écouteur sur les clients qui reçoit `STATE_UPDATE` et écrase le store Zustand local avec les nouvelles données validées par l'Hôte.

## 🎨 Phase 3 : L'Interface (Le Lobby)

- [x] **3.1 Écran de Connexion (`LobbyScreen.tsx`)**
  - Créer l'UI avec deux choix principaux : "Héberger une partie" et "Rejoindre une partie".
- [x] **3.2 Vue de l'Hôte**
  - Au clic, récupérer et afficher l'adresse IP locale en grand (ex: `192.168.1.15`).
  - Afficher une liste dynamique des joueurs connectés (qui se met à jour quand le serveur TCP accepte un socket).
  - Bouton "Lancer la partie" (désactivé si < 2 joueurs).
- [x] **3.3 Vue du Client**
  - Afficher un champ de texte (Input) pour saisir l'adresse IP affichée par l'Hôte.
  - Bouton "Se connecter".
  - Afficher un état d'attente une fois connecté ("En attente de l'hôte pour commencer...").

## 🚀 Phase 4 : Boucle de Jeu et Animations

- [x] **4.1 Initialisation de la Partie**
  - Au clic sur "Lancer la partie" par l'Hôte, diffuser un message `GAME_START` avec l'état initial complet.
  - Rediriger tous les téléphones de `LobbyScreen` vers l'écran principal du plateau.
- [x] **4.2 Couplage Réseau-Animations**
  - S'assurer que les mises à jour d'état (ex: nouvelle position d'un pion adverse) déclenchent correctement les `withSpring` de Reanimated sur les écrans clients, exactement comme le faisaient les bots.

## 📱 Phase 5 : Tests et Déploiement Natif

- [ ] **5.1 Configuration EAS Dev Client**
  - Configurer `eas build` pour générer un Custom Development Client (permettant d'utiliser le Fast Refresh tout en exécutant le code TCP natif).
- [ ] **5.2 Tests Multi-Appareils**
  - Tester avec l'émulateur Mac et au moins un téléphone physique Android sur le même réseau Wi-Fi.
  - Valider les cas limites : latence, joueur qui quitte l'application brusquement (déconnexion de socket).
  - [x] **Fix TCP fragmentation** : Ajout de buffers d'accumulation (`clientBuffer`, `hostBuffers`) pour gérer les paquets coupés sur les gros `STATE_UPDATE`.

---

## ✅ Phase 6 : Stabilisation Réseau (Terminé)

- [x] **6.1 Identité des joueurs (playerId)**
  - Protocole `ASSIGN_PLAYER_ID` : l'hôte envoie via `sendTo()` un ID stable au moment de la connexion.
  - Chaque client stocke son `localPlayerId` dans le store Zustand.
  - `syncState()` préserve les champs locaux (`networkRole`, `localPlayerId`, `appScreen`) lors des mises à jour réseau.
  - Le bouton 🎲 et la `PropertyModal` ne s'affichent que sur l'appareil du joueur concerné.
  - `useBotLogic` ne s'exécute pas sur les clients (guard `networkRole === 'client'`).
  - `GameScreen` ne réinitialise plus le jeu au montage (il était actif avant le lobby).

- [x] **6.2 Détection passive de déconnexion**
  - Les événements `error` et `close` des sockets déclenchent `onDisconnectCallback`.
  - Guard `didDisconnect` (côté client et côté hôte) pour éviter le double-fire (`error` puis `close` arrivent séquentiellement).
  - `sendMessage()` est protégé par un `try/catch`.

- [x] **6.3 Détection active — Heartbeat PING/PONG**
  - Hôte envoie `__PING__` à tous les clients toutes les **4 secondes**.
  - Client répond immédiatement par `__PONG__` et enregistre `clientLastPongTimestamp`.
  - Timeout à **10 secondes** : si aucun PING reçu, `socket.destroy()` → disconnect fire.
  - Les paquets `__PING__`/`__PONG__` sont filtrés et jamais transmis à la logique jeu.

- [x] **6.4 UI de déconnexion — `DisconnectModal`**
  - Overlay plein-écran bloquant (z-index 500+) avec animation spring.
  - Thème rouge danger : strip, glow, dot de statut animé.
  - Bouton unique "RETOUR AU LOBBY" → appelle `resetToLobby()` qui :
    - Appelle `NetworkManager.cleanup()` (stopHeartbeats, destroy sockets).
    - Remet tout l'état Zustand (jeu + réseau) aux valeurs initiales.
    - Navigue vers `LobbyScreen`.
  - Invisible en mode solo (`networkRole === 'local'`).

---

## 🗂️ Audit Fonctionnel — État Actuel du Jeu

> Ce tableau recense ce qui est **implémenté** vs ce qui **manque** pour un Monopoly complet et correct.

### ✅ Ce qui est fonctionnel

| Fonctionnalité | Détails |
|---|---|
| Plateau 40 cases | Rendu géométrique correct, thème Madagascar |
| Lancer de dés | Dés 1d6+1d6, doubles, 3 doubles → prison |
| Déplacement | Animation Reanimated (withSpring), caméra dynamique |
| Passage par Départ | +200 AR automatique |
| Achat de propriétés | Modale avec timer 15s, boutons Acheter / Passer |
| Loyers basiques | Paiement automatique au propriétaire |
| Prison | Entrée par 3 doubles ou case "Miditra gagazo" |
| Taxes | Fokontany (200 AR) et Hetra (100 AR) |
| Cartes Magie-Magie / Ankamantatra | Case reconnue, message d'info (pas de deck réel) |
| Faillite | Détection solde < 0, transfert/libération des propriétés |
| Bots IA | Décision déterministe achat/skip, timing réaliste |
| Fin de partie | Détection du dernier joueur actif, bannière VICTOIRE |
| Réseau LAN | TCP, hôte autoritaire, sync STATE_UPDATE |
| Identité joueur | ASSIGN_PLAYER_ID, UI filtrée par localPlayerId |
| Résilience réseau | Heartbeat PING/PONG, DisconnectModal, resetToLobby |
| Mode solo | 1 humain + 3 bots sans réseau |

### ❌ Ce qui manque (pour un Monopoly complet)

| Fonctionnalité | Priorité | Complexité |
|---|---|---|
| ~~**Constructions** (maisons / hôtels)~~ | ~~🔴 Haute~~ | ~~Moyenne~~ | ✅ Fait |
| ~~**Loyers progressifs** (avec maisons)~~ | ~~🔴 Haute~~ | ~~Faible~~ | ✅ Fait (`rentCalculator.ts` complet) |
| ~~**Monopole de couleur** (bonus loyer ×2)~~ | ~~🔴 Haute~~ | ~~Faible~~ | ✅ Fait (`hasMonopoly()`) |
| ~~**Deck de cartes** Magie-Magie / Ankamantatra~~ | ~~🟠 Moyenne~~ | ~~Moyenne~~ | ✅ Fait (`cards.ts`) |
| ~~**Mécanique de prison complète**~~ | ~~🟠 Moyenne~~ | ~~Faible~~ | ✅ Fait |
| ~~**Échanges entre joueurs**~~ | ~~🟡 Basse~~ | ~~Haute~~ | ✅ Fait |
| ~~**Noms des joueurs** (lobby)~~ | ~~🟠 Moyenne~~ | ~~Très faible~~ | ✅ Fait |
| **Assets visuels** (icônes propriétés réelles) | 🟠 Moyenne | Faible |
| **Sons / musique** | 🟡 Basse | Faible |
| **Reconnexion réseau** (rejoin après drop) | 🟡 Basse | Haute |
| **Spectateurs** (mode client sans joueur assigné) | 🟡 Basse | Moyenne |
| **Sauvegarde de partie** | 🟡 Basse | Haute |
| ~~**Historique de partie** (game log)~~ | ~~🟠 Moyenne~~ | ~~Faible~~ | ✅ Fait |
| ~~**Choix du nombre de bots**~~ | ~~🟠 Moyenne~~ | ~~Très faible~~ | ✅ Fait |
| **Condition de victoire : Fortune limite** | 🟠 Moyenne | Très faible |
| **Mode Chrono** (gagnant = plus riche à la fin du temps) | 🟠 Moyenne | Faible |
| ~~**Panneau propriétés d'un joueur** (mes propriétés)~~ | ~~🔴 Haute~~ | ~~Faible~~ | ✅ Fait |
| **Voir les propriétés d'un adversaire** | 🟠 Moyenne | Faible |
| ~~**Payer pour sortir de prison**~~ (caution) | ~~🔴 Haute~~ | ~~Très faible~~ | ✅ Fait |
| ~~**Fiche détaillée d'une propriété** (tap sur case)~~ | ~~🟠 Moyenne~~ | ~~Faible~~ | ✅ Fait |
| ~~**Option Abandonner** (forfait en cours de partie)~~ | ~~🟠 Moyenne~~ | ~~Faible~~ | ✅ Fait |

---

## 🚀 Phase 7 : Règles de Monopoly Complètes

> **Objectif :** Transformer le prototype jouable en un Monopoly aux règles correctes.

### 7.1 Constructions — Maisons & Hôtels 🏠 ✅
- [x] Ajouter des boutons "Construire" et "Vendre" dans la modale de propriété (`PropertyDetailModal`).
- [x] Règle : On ne peut construire que sur un **groupe de couleur complet** (monopole).
- [x] Règle : Construction uniforme obligatoire (écart max 1 maison entre les cases d'un même groupe).
- [x] Banque limitée : 32 maisons et 12 hôtels en réserve (`useGameStore`).
- [x] L'hôtel remplace 4 maisons (houseCount = 5 dans le store = hôtel).
- [x] Mettre à jour `SpaceTile` pour afficher le nombre de maisons/hôtel visuellement sur la bande de couleur.

### 7.2 Loyers Progressifs ✅
- [x] `rentCalculator.ts` complet : grille de loyers par niveau de maison (0→1→2→3→4→hôtel).
- [x] Bonus ×2 sur le loyer de base si le joueur possède le monopole complet **sans aucune maison** (`hasMonopoly()`).
- [x] Gares : loyer basé sur le nombre de gares possédées (1=25, 2=50, 3=100, 4=200 AR) via `countOwned()`.
- [x] Services publics : loyer = dés × multiplicateur (×4 si 1 service, ×10 si 2 services).

### 7.3 Mécanique de Prison Complète ✅
- [x] Ajouter la phase `IN_JAIL_DECISION` dans `TurnPhase`.
- [x] Options à chaque tour en prison : payer 50 AR, utiliser carte "Sortir de prison", ou lancer les dés (double = sortie).
- [x] Maximum 3 tours en prison — sortie forcée au 3e tour (avec paiement de 50 AR).
- [x] Afficher une UI dédiée au HUD quand le joueur est en prison (`JailPanel.tsx`).
- [x] Logique IA des bots : paient si solde suffisant, sinon tentent un double.
- [x] Réseau : `REQUEST_PAY_BAIL`, `REQUEST_USE_JAIL_CARD`, `REQUEST_ROLL_JAIL` dans le handler de l'hôte.

### 7.4 Deck de Cartes Magie-Magie & Ankamantatra ✅
- [x] Créer `src/constants/cards.ts` avec les 16 cartes Magie-Magie et 16 cartes Ankamantatra thématisées Madagascar.
- [x] Implémenter le tirage aléatoire (mélange du deck, remise en fin de pile).
- [x] Types d'effets : gain/perte d'argent, déplacement, aller en prison, sortir de prison, payer par joueur.
- [x] Afficher une modale "carte révélée" avec animation flip (`CardModal.tsx`).

---

## 🎨 Phase 8 : UX & Polish

### 8.1 Lobby amélioré
- [ x] Champ de saisie du **nom du joueur** avant de rejoindre/héberger.
- [ ] Afficher les noms réels dans la liste des joueurs connectés.
- [x ] Choix de la **couleur/avatar** du pion.
- [x] Indicateur "Prêt ✓" par joueur (l'hôte ne peut lancer que si tous sont prêts).

### 8.2 Tableau de propriétés
- [ ] Panneau latéral (swipe) ou modal listant toutes les propriétés avec leur statut (libre, achetée, hypothéquée, nb maisons).
- [x ] Couleur de groupe visible sur chaque carte propriété.
- [ x] Vue détaillée par propriété (loyers par niveau, hypothèque).

### 8.3 Animations & Sons
- [ x] Animation de lancer de dés (rotation 3D des dés avant résultat).
- [ x] Son de roulement de dés, achat, loyer, prison.
- [ x] Confettis / particules sur VICTOIRE.
- [x ] Animation de flip de carte (Magie-Magie / Ankamantatra).

### 8.4 Assets visuels
- [ x] Remplacer les placeholders texte des cases par de vraies icônes SVG thématiques.
- [x ] Illustrations des propriétés (miniatures de Nosy Be, Tsingy, etc.).
- [ x] Pions customisés (zébu, baobab, pirogue, chapeau lamba...).

---

## 🌐 Phase 9 : Réseau Avancé

### 9.1 Saisie des noms et avatars en lobby (réseau) ✅
- [x] Le client envoie `{ type: 'SET_PLAYER_INFO', payload: { name, avatar } }` après `ASSIGN_PLAYER_ID`.
- [x] L'hôte met à jour le `connectedClients` et synchronise.
- [x] Saisie dans l'UI du lobby (pseudo + emojis/icônes).

### 9.2 Reconnexion après déconnexion
- [ x] Stocker l'état de partie côté hôte avec `localPlayerId`.
- [ x] Si un client se reconnecte avec le même `localPlayerId`, lui re-syncer l'état complet.
- [ x] Timeout de 60s avant de considérer le joueur abandonné (bot prend le relais).

### 9.3 Hypothèques ✅
- [x] Ajouter `isMortgaged: boolean` à `PropertyState`.
- [x] Hypothéquer : reçoit 50% du prix d'achat, loyer suspendu.
- [x] Lever l'hypothèque : payer 110% du prix d'hypothèque.
- [x] Afficher le statut dans le tableau de propriétés et sur le plateau.

### 9.4 Échanges entre joueurs ✅
- [x] Interface de proposition (propriétés + argent contre propriétés + argent).
- [x] Envoi de l'offre via réseau : `{ type: 'REQUEST_TRADE', payload: { ... } }`.
- [x] Acceptation/Refus, validation par l'hôte.

---

## 🕹️ Phase 10 : Gameplay & Ergonomie Avancés

> **Objectif :** Rendre la partie plus agréable, plus lisible et plus personnalisable. Ces fonctionnalités sont indépendantes les unes des autres et peuvent être développées dans n'importe quel ordre.

### 10.1 Historique de Partie (Game Log) 📜 ✅
- [x] Maintenir un tableau `gameLog: string[]` dans le store, alimenté à chaque événement significatif (via `lastEvent`).
- [x] Composant `GameLogPanel` : panneau scrollable accessible via un bouton dans le HUD (icône 📜).
- [x] Format des entrées : `[Tour N] 🎲 Zaka a lancé 4+3` — horodatage par numéro de tour.
- [x] En réseau : le log est synchronisé dans le payload `STATE_UPDATE`.
- [x] Persister le log jusqu'à la fin de partie (reset à `initGame`).

### 10.2 Choix du Nombre de Bots 🤖 ✅
- [x] Dans le lobby (mode solo ET mode hôte), ajouter un sélecteur `[− 1 Bot +]` pour choisir entre 0 et 3 bots.
- [x] La somme `joueurs humains + bots` doit rester entre 2 et 4.
- [x] En mode réseau : si des clients sont connectés, les slots restants sont proposés comme bots.
- [x] Passer le nombre de bots à `startGame()` / `startSolo()` pour adapter `playersSetup`.

### 10.3 Conditions de Victoire Personnalisées 🏆

#### 10.3.a Fortune Limite ✅
- [x] Option dans le lobby : "Fortune limite" avec un sélecteur de montant (5k, 10k, 20k, 50k AR).
- [x] Stocker `winCondition: { type: 'fortune_limit', amount: number } | { type: 'last_standing' }` dans le store.
- [x] À chaque fin de tour, vérifier si un joueur a atteint le seuil → déclencher `GAME_OVER` avec ce joueur comme vainqueur.
- [x] En réseau : la condition est définie par l'hôte et envoyée dans `GAME_START` (+ `winCondition` + `chronoEndTime`).

#### 10.3.b Mode Chrono ⏱️ ✅
- [x] Option dans le lobby : "Durée de partie" avec des paliers (15 min, 30 min, 45 min, 60 min).
- [x] Stocker `chronoEndTime: number | null` dans le store (timestamp de fin).
- [x] Afficher un compteur décroissant dans le HUD (visible uniquement si mode chrono activé).
- [x] À expiration : figer le jeu, comparer les fortunes nettes → vainqueur = fortune nette la plus haute.
- [x] En réseau : l'hôte démarre le chrono et le broadcast dans `GAME_START`. Les clients se synchronisent sur `chronoEndTime`.

### 10.4 Panneau des Propriétés 🗃️

### 10.4 Panneaux de Propriétés 🏠 ✅

#### 10.4.a "Mes Propriétés" / Propriétés d'un joueur
- [x] En appuyant sur sa `PlayerCard` (ou celle d'un adversaire), ouvrir un panneau (`PlayerPropertiesModal`).
- [x] Afficher la liste de toutes les propriétés acquises, triées par couleur.
- [x] Afficher l'état (nombre de maisons/hôtel, ou si elle est hypothéquée).
- [x] Accessible à tous (lecture seule pour les adversaires).
- [x] En réseau : les données sont déjà dans le `STATE_UPDATE`, aucune requête supplémentaire nécessaire.

### 10.5 Fiche Détaillée d'une Propriété (Tap sur case) 🔍 ✅
- [x] Rendre chaque `SpaceTile` interactive (tappable).
- [x] Au clic, ouvrir une modale (`PropertyDetailModal`) qui ressemble à la vraie carte du jeu de société.
- [x] Afficher : Prix d'achat, Loyer de base, Loyers avec 1/2/3/4 maisons, Loyer avec hôtel, Prix de construction.
- [x] Afficher le propriétaire actuel s'il y en a un.
- [x] Accessible à tous (hôte, client, n'importe quel joueur) en lecture seule.
- [x] Différencier visuellement les propriétés libres / achetées / hypothéquées.

### 10.6 Payer pour Sortir de Prison (Caution) ⛓️ ✅
- [x] Quand `currentPlayer.inJail === true` et que c'est le tour du joueur local, afficher un panneau dédié dans le HUD (`JailPanel.tsx`).
- [x] Trois boutons d'action :
  - **Payer 50 AR** : débite le solde, sort de prison immédiatement, lance les dés normalement.
  - **Utiliser une carte** : visible uniquement si `hasGetOutOfJailCard === true`.
  - **Tenter un double** : lance les dés — double = sortie libre, sinon reste en prison (tour consommé).
- [x] Après le 3e tour en prison sans double : sortie forcée avec paiement automatique de 50 AR.
- [x] En réseau : `REQUEST_PAY_BAIL`, `REQUEST_USE_JAIL_CARD`, `REQUEST_ROLL_JAIL`.

### 10.7 Option Abandonner (Forfait) 🏳️ ✅
- [x] Bouton discret "⚙️" dans le HUD (`ForfeitButton.tsx`) — coin supérieur droit.
- [x] Confirmation requise : modale "Confirmer le forfait ? Vos propriétés retourneront à la banque."
- [x] Comportement : déclenche `handleBankruptcy(playerId, null)` — propriétés libérées, solde à 0, marqué `isBankrupt`.
- [x] Passage de tour : Si le joueur abandonne **pendant son tour**, le tour passe automatiquement au joueur suivant.
- [x] En solo ou réseau : si **tous les joueurs humains** abandonnent (ou font faillite), la partie se termine immédiatement (GAME_OVER).
- [x] En réseau :
  - **Client abandonne** : envoie `{ type: 'REQUEST_FORFEIT', payload: { playerId } }` → l'hôte exécute `handleBankruptcy`.
  - **Hôte abandonne** : exécute localement `handleBankruptcy(localPlayerId, null)`.

---

## 🌐 Phase 11 : Multijoueur En Ligne (Internet)

> **Objectif :** Permettre aux joueurs de se retrouver en ligne via un code de room, tout en conservant le mode LAN Wi-Fi existant **sans y toucher**. L'architecture repose sur un serveur relay léger dans le cloud et un transport WebSocket qui coexiste avec le transport TCP actuel.

> **Principe fondamental :** Le store Zustand, la logique de jeu, les bots, les animations — **rien ne change**. Seule la couche de transport dans `NetworkManager.ts` est étendue. Le lobby propose un nouveau chemin "Jouer en ligne" sans modifier les chemins "Solo" et "Partie locale".

---

### 11.1 Architecture Duale — Vue d'ensemble

```
LobbyScreen
├── 🏠 Solo (vs Bots)         → networkRole: 'local'   | transport: aucun
├── 📶 Partie Locale (Wi-Fi)  → networkRole: 'host/client' | transport: TCP (actuel)
└── 🌐 Jouer en Ligne         → networkRole: 'host/client' | transport: WebSocket (nouveau)

useGameStore.ts  ──────────────────────────────────────────────────────►  inchangé
NetworkManager.ts  (transport: 'tcp' | 'websocket')
    ├── TCP Socket (react-native-tcp-socket)   ← mode LAN, inchangé
    └── WebSocket  (API native React Native)   ← mode En ligne, nouveau

relay-server/  (Node.js, déployé sur Railway/Render)
    └── Routes les paquets entre joueurs d'une même room
        (ne comprend pas le jeu, ne stocke pas l'état)
```

---

### 11.2 Serveur Relay (Backend) 🖥️

> Le serveur relay est **intentionnellement minimaliste**. Il ne contient aucune logique de jeu. Son seul rôle : recevoir un paquet d'un joueur et le renvoyer aux autres membres de la même room.

- [x] Créer le dossier `relay-server/` à la racine du projet (dépôt séparé ou monorepo).
- [x] Stack : **Node.js + `ws`** (WebSocket natif, zéro dépendance lourde).
- [x] **Gestion des rooms :**
  - `rooms: Map<string, Set<WebSocket>>` — dictionnaire `roomCode → ensemble de sockets`.
  - Générer un code de room unique à 8 caractères alphanumériques (ex: `TANA-4892`).
  - Limiter à **4 connexions** par room (règle Monopoly).
- [x] **Protocoles gérés par le relay :**
  - `{ type: 'CREATE_ROOM' }` → génère un `roomCode`, ajoute l'hôte, répond `{ type: 'ROOM_CREATED', roomCode }`.
  - `{ type: 'JOIN_ROOM', roomCode }` → ajoute le client à la room, diffuse `{ type: 'PLAYER_JOINED' }` à tous.
  - `{ type: 'LEAVE_ROOM' }` → retire le socket, diffuse `{ type: 'PLAYER_LEFT' }` aux autres.
  - Tous les autres types → **forward brut** à tous les membres de la room sauf l'expéditeur.
- [x] **Heartbeat côté serveur :** ping WebSocket natif toutes les 30s pour détecter les connexions fantômes.
- [x] **Nettoyage automatique :** si la room est vide depuis 5min, la supprimer de la mémoire.
- [ ] Déploiement cible : **Railway** ou **Render** (plan gratuit suffisant pour le prototype).
- [x] Variable d'environnement `PORT` pour la compatibilité avec les hébergeurs cloud.

---

### 11.3 Refactorisation de `NetworkManager.ts` 🔧

> L'interface publique (`sendMessage`, `broadcast`, `onMessage`, `onConnection`, `onDisconnect`) reste **identique**. Seule l'implémentation interne change selon le transport actif.

- [x] Ajouter un type `TransportMode = 'tcp' | 'websocket'` et une variable `activeTransport: TransportMode`.
- [x] Exposer une méthode `setTransport(mode: TransportMode, relayUrl?: string)` appelée depuis le lobby avant connexion.
- [x] **Section WebSocket — Hôte :**
  - Connexion au relay : `ws://relay.madapoly.com`
  - Envoyer `CREATE_ROOM` → recevoir et stocker le `roomCode`.
  - Tous les `broadcast()` deviennent des envois au relay qui les redistribue.
  - `sendTo(clientId, packet)` → ciblage via `__to` socketId embarqué dans le paquet.
- [x] **Section WebSocket — Client :**
  - Connexion au relay avec le `roomCode`.
  - Envoyer `JOIN_ROOM` → le relay notifie l'hôte.
  - `sendMessage()` → envoi au relay → relay forward à l'hôte.
- [x] **Heartbeat WebSocket :** `_startClientHeartbeat()` et `_startHostHeartbeat()` adaptés pour WS (`__PING__`/`__PONG__` via broadcast relay).
- [x] `cleanup()` ferme la WebSocket proprement (`ws.close(1000)`) en plus du TCP.
- [x] Les deux transports coexistent dans le même fichier — aucune régression sur le mode TCP.

---

### 11.4 Refactorisation du `LobbyScreen.tsx` 🎨

- [x] Ajouter un troisième mode : `type LobbyMode = 'select' | 'host' | 'client' | 'online_host' | 'online_client'`.
- [x] **Écran de sélection principal :**
  ```
  ┌──────────────────────────────┐
  │  🏠  Solo (vs Bots)          │
  ├──────────────────────────────┤
  │  📶  Partie Locale (Wi-Fi)   │
  ├──────────────────────────────┤
  │  🌐  Jouer en Ligne          │
  └──────────────────────────────┘
  ```
- [x] **Vue "Jouer en Ligne" → Hôte :**
  - Bouton "Créer une partie en ligne".
  - Appelle `NetworkManager.setTransport('websocket', RELAY_URL)` puis `createRoom()`.
  - Afficher le code de room en grand et lisible (ex: **TANA-4892**) avec un bouton "Copier".
  - Liste des joueurs connectés (même logique que le mode LAN).
  - Bouton "Lancer la partie".
- [x] **Vue "Jouer en Ligne" → Client :**
  - Champ de saisie du code de room (majuscules, format `XXXX-XXXX`).
  - Bouton "Rejoindre".
  - État d'attente identique au mode LAN.
- [x] Extraire la constante `RELAY_URL` dans `src/constants/config.ts` pour faciliter le changement entre dev/prod.
- [x] En mode en ligne, l'`ASSIGN_PLAYER_ID` reste géré par l'hôte (inchangé) — le relay le transmet simplement.

---

### 11.5 Gestion des Déconnexions en Mode En Ligne 🔌

> Le heartbeat et la `DisconnectModal` existent déjà (Phase 6). En mode WebSocket, les comportements sont légèrement différents.

- [x] Si un client perd la connexion → le relay ferme son socket → notifie l'hôte avec `PLAYER_LEFT` → l'hôte déclenche `onDisconnectCallback` → `handleBankruptcy` (remplacement bot).
- [x] Si l'hôte perd la connexion → le relay envoie `HOST_LEFT` → `_wsClientMessageHandler` déclenche `onDisconnectCallback('host')` → `DisconnectModal` sur tous les clients.
- [ ] **Reconnexion en ligne (évolution) :** si un joueur se reconnecte avec le même `roomCode` + `localPlayerId` dans les 60s, le relay le réintègre dans la room et l'hôte lui re-sync le `STATE_UPDATE` complet.
- [x] Timeout room : si l'hôte ne revient pas en 60s, le relay dissout la room avec `ROOM_DISSOLVED` et notifie les clients restants.

---

### 11.6 Sécurité & Limites du Prototype 🔒

> Le relay est un prototype, pas une infrastructure de production. Ces points sont à connaître mais pas bloquants pour un lancement entre amis.

- [x] **Pas d'authentification :** n'importe qui connaissant le code de room peut rejoindre. Acceptable pour jouer entre amis (code room = accès implicite).
- [x] **Validation côté relay :** JSON invalide → ignoré silencieusement (try/catch). Message > 64 KB → dropé. Max 100 connexions simultanées.
- [x] **Rate limiting basique :** ignorés au-delà de 20 paquets/seconde par socket.
- [x] **HTTPS/WSS :** automatique sur Railway/Render via leur certificat TLS — rien à coder.
- [x] **Taille des paquets :** limite 64 KB appliquée côté relay. `STATE_UPDATE` typiquement < 5 KB.

---

### 11.7 Configuration & Déploiement 🚀

- [x] Créer `src/constants/config.ts` :
  ```typescript
  export const RELAY_URL = __DEV__
    ? 'ws://localhost:8080'          // serveur local pour dev
    : 'wss://relay.madapoly.com';   // production
  ```
- [x] Créer `relay-server/package.json` avec script `start` et dépendance `ws`.
- [x] Créer `relay-server/server.js` (logique relay ~200 lignes).
- [x] Tester en local : validé sur Wi-Fi local via `ws://10.0.0.169:8080`.
- [x] Déployer sur Render :
  - Root directory : `relay-server/`, Start command : `node server.js`
  - URL publique : `wss://mobile-madapoly.onrender.com`
  - `RELAY_URL` mis à jour dans `config.ts`.
- [x] Tester avec deux téléphones sur des réseaux différents (4G vs Wi-Fi).
- [x] Documenter le `RELAY_URL` de production dans `CONTEXT.md`.

---

### 11.8 Récapitulatif — Ce qui change vs ce qui reste intact

| Fichier / Module | Mode LAN | Mode En ligne | Modifié ? |
|---|---|---|---|
| `useGameStore.ts` | ✅ | ✅ | ❌ Non |
| `useBotLogic.ts` | ✅ | ✅ | ❌ Non |
| `HUDLayer.tsx` | ✅ | ✅ | ❌ Non |
| `DisconnectModal.tsx` | ✅ | ✅ | ❌ Non |
| Tous les composants UI | ✅ | ✅ | ❌ Non |
| `NetworkManager.ts` | TCP | WebSocket | ✅ Étendu |
| `LobbyScreen.tsx` | IP input | Room Code | ✅ Étendu |
| `src/constants/config.ts` | — | RELAY_URL | ✅ Nouveau |
| `relay-server/server.js` | — | Relay Node.js | ✅ Nouveau |

---

## 🌐 Phase 12 : Version Web App (madapoly.com)

> **Objectif :** Rendre Madapoly jouable dans un navigateur via `madapoly.com`, en partageant la logique existante (store, bots, réseau) et en adaptant les composants React Native via **React Native Web**.
> **Branche :** `online-app`

### 12.1 Setup React Native Web
- [x] Installer `react-native-web`, `react-dom` (déjà présents dans `package.json`)
- [x] Expo 54 utilise Metro pour le web — `@expo/webpack-config` non nécessaire
- [x] `npx expo start --web` démarre et bundle sans erreur (883 modules)
- [x] `npx expo export --platform web` génère `dist/` proprement
- [x] Section `web` déjà présente dans `app.json`

### 12.2 Audit & Corrections des Composants
- [x] Lobby rendu correctement sur web
- [x] Partie solo jouable sur web — aucun composant cassé détecté
- [x] Fonts Inter chargées correctement (`@expo-google-fonts` supporte le web)
- [x] Styles `StyleSheet` compatibles web sans modification

### 12.3 Plateau de Jeu sur Web
- [x] `BoardView` + `SpaceTile` rendus correctement (layouts absolus OK sur web)
- [x] Animations `react-native-reanimated` fonctionnelles sur web
- [x] Pions animés et déplacements OK
- [x] Partie complète jouable — aucune adaptation nécessaire

### 12.4 Réseau & Relay sur Web
- [x] `NetworkManager` : `react-native-tcp-socket` chargé conditionnellement (`Platform.OS !== 'web'`)
- [x] `startServer()` et `connectToServer()` rejettent explicitement sur web
- [x] Mode WebSocket natif au navigateur — `createRoom()` / `joinRoom()` inchangés
- [x] `LobbyScreen` : section LAN masquée sur web (`Platform.OS !== 'web'`)
- [x] Tester une partie en ligne entre mobile et navigateur (même room code)

### 12.5 UI & Responsive Web
- [x] Créer `web/index.html` : viewport, meta OG, theme-color, favicon
- [x] CSS : app shell centré `max-width: 480px` sur desktop, fond dégradé latéral
- [x] `GameScreen` : `SCREEN_WIDTH` borné à 480px sur web pour centrer la caméra correctement
- [x] `LobbyScreen` : `content` à 85% de largeur — naturellement responsive
- [x] Tester sur Chrome, Safari, Firefox

### 12.6 Déploiement sur game.madapoly.com
- [x] `npx expo export --platform web` → dossier `dist/` généré proprement
- [x] Déployé sur **Netlify** depuis branche `online-app`
- [x] Sous-domaine `game.madapoly.com` configuré (CNAME → Netlify)
- [x] HTTPS actif
- [x] Testé : mobile + émulateur + navigateur dans la même room

---

## Phase 13 — Mode Spectateur & Liste des parties en cours

### 13.1 Relay — Endpoint HTTP `/rooms`
- [x] Ajouter `express` ou `http` server inline dans `relay-server/server.js`
- [x] `GET /rooms` → retourne `[{ roomCode, playerCount, createdAt }]` (rooms avec ≥1 joueur actif)
- [x] CORS activé pour `game.madapoly.com`

### 13.2 Relay — Support du protocole spectateur
- [x] Nouveau message `{ type: 'JOIN_SPECTATOR', roomCode }` → `{ type: 'SPECTATOR_OK', roomCode, state }`
- [x] Le relay forward tous les `STATE_UPDATE` aux spectateurs de la room
- [x] Les spectateurs n'envoient rien (guard côté relay)
- [x] `ROOM_DISSOLVED` / `GAME_OVER` → spectateurs déconnectés proprement

### 13.3 NetworkManager — Mode spectateur
- [x] Nouvelle méthode `watchRoom(roomCode): Promise<void>`
- [x] `wsLocalSocketId` marqué `spectator-*` pour distinguer des joueurs
- [x] `onMessage` reçoit les `STATE_UPDATE` normalement

### 13.4 LobbyScreen — Liste des parties en cours
- [x] Section "Parties en cours" : `GET <RELAY_URL_HTTP>/rooms` au montage et sur pull-to-refresh
- [x] Afficher chaque room : code + nb joueurs + bouton "Regarder"
- [x] Bouton "Regarder" → `watchRoom(roomCode)` → `appScreen === 'game'` en mode spectateur

### 13.5 GameScreen / Store — Mode spectateur
- [x] `networkRole: 'spectator'` dans le store
- [x] `useBotLogic` : guard `if (networkRole === 'spectator') return`
- [x] HUD : masquer les boutons d'action (lancer dés, acheter, etc.) si spectateur
- [x] Banner discret "Mode spectateur" affiché en overlay

