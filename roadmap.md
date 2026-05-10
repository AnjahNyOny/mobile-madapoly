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
| **Constructions** (maisons / hôtels) | 🔴 Haute | Moyenne |
| **Loyers progressifs** (avec maisons) | 🔴 Haute | Faible (calculés, pas affichés) |
| **Monopole de couleur** (bonus loyer ×2) | 🔴 Haute | Faible |
| **Deck de cartes** Magie-Magie / Ankamantatra | 🟠 Moyenne | Moyenne |
| **Mécanique de prison complète** | 🟠 Moyenne | Faible |
| **Hypothèques** | 🟡 Basse | Moyenne |
| **Échanges entre joueurs** | 🟡 Basse | Haute |
| **Noms des joueurs** (lobby) | 🟠 Moyenne | Très faible |
| **Assets visuels** (icônes propriétés réelles) | 🟠 Moyenne | Faible |
| **Sons / musique** | 🟡 Basse | Faible |
| **Reconnexion réseau** (rejoin après drop) | 🟡 Basse | Haute |
| **Spectateurs** (mode client sans joueur assigné) | 🟡 Basse | Moyenne |
| **Sauvegarde de partie** | 🟡 Basse | Haute |
| **Historique de partie** (game log) | 🟠 Moyenne | Faible |
| **Choix du nombre de bots** | 🟠 Moyenne | Très faible |
| **Condition de victoire : Fortune limite** | 🟠 Moyenne | Très faible |
| **Mode Chrono** (gagnant = plus riche à la fin du temps) | 🟠 Moyenne | Faible |
| **Panneau propriétés d'un joueur** (mes propriétés) | 🔴 Haute | Faible |
| **Voir les propriétés d'un adversaire** | 🟠 Moyenne | Faible |
| **Payer pour sortir de prison** (caution) | 🔴 Haute | Très faible |
| **Fiche détaillée d'une propriété** (tap sur case) | 🟠 Moyenne | Faible |
| **Option Abandonner** (forfait en cours de partie) | 🟠 Moyenne | Faible |

---

## 🚀 Phase 7 : Règles de Monopoly Complètes

> **Objectif :** Transformer le prototype jouable en un Monopoly aux règles correctes.

### 7.1 Constructions — Maisons & Hôtels 🏠
- [ ] Ajouter un bouton "Construire" dans le HUD (visible en fin de tour si le joueur possède un monopole).
- [ ] Règle : On ne peut construire que sur un **groupe de couleur complet** (monopole).
- [ ] Règle : Construction uniforme obligatoire (écart max 1 maison entre les cases d'un même groupe).
- [ ] Banque limitée : 32 maisons et 12 hôtels en réserve (shared resource).
- [ ] L'hôtel remplace 4 maisons (houseCount = 5 dans le store = hôtel).
- [ ] Mettre à jour `SpaceTile` pour afficher le nombre de maisons/hôtel visuellement.

### 7.2 Loyers Progressifs
- [ ] Compléter `rentCalculator.ts` : appliquer la grille de loyers par niveau de maison (0→1→2→3→4→hôtel).
- [ ] Bonus ×2 sur le loyer de base si le joueur possède le monopole complet **sans aucune maison**.
- [ ] Gares : loyer basé sur le nombre de gares possédées (1=25, 2=50, 3=100, 4=200 AR).
- [ ] Services publics : loyer = dés × multiplicateur (×4 si 1 service, ×10 si 2 services).

### 7.3 Mécanique de Prison Complète
- [ ] Ajouter la phase `IN_JAIL_DECISION` dans `TurnPhase`.
- [ ] Options à chaque tour en prison : payer 50 AR, utiliser carte "Sortir de prison", ou lancer les dés (double = sortie).
- [ ] Maximum 3 tours en prison — sortie forcée au 3e tour (avec paiement de 50 AR).
- [ ] Afficher une UI dédiée au HUD quand le joueur est en prison.

### 7.4 Deck de Cartes Magie-Magie & Ankamantatra
- [ ] Créer `src/constants/cards.ts` avec les 16 cartes Magie-Magie et 16 cartes Ankamantatra thématisées Madagascar.
- [ ] Implémenter le tirage aléatoire (mélange du deck, remise en fin de pile).
- [ ] Types d'effets : gain/perte d'argent, déplacement, aller en prison, sortir de prison, payer par joueur.
- [ ] Afficher une modale "carte révélée" avec animation flip.

---

## 🎨 Phase 8 : UX & Polish

### 8.1 Lobby amélioré
- [ ] Champ de saisie du **nom du joueur** avant de rejoindre/héberger.
- [ ] Afficher les noms réels dans la liste des joueurs connectés.
- [ ] Choix de la **couleur/avatar** du pion.
- [ ] Indicateur "Prêt ✓" par joueur (l'hôte ne peut lancer que si tous sont prêts).

### 8.2 Tableau de propriétés
- [ ] Panneau latéral (swipe) ou modal listant toutes les propriétés avec leur statut (libre, achetée, hypothéquée, nb maisons).
- [ ] Couleur de groupe visible sur chaque carte propriété.
- [ ] Vue détaillée par propriété (loyers par niveau, hypothèque).

### 8.3 Animations & Sons
- [ ] Animation de lancer de dés (rotation 3D des dés avant résultat).
- [ ] Son de roulement de dés, achat, loyer, prison.
- [ ] Confettis / particules sur VICTOIRE.
- [ ] Animation de flip de carte (Magie-Magie / Ankamantatra).

### 8.4 Assets visuels
- [ ] Remplacer les placeholders texte des cases par de vraies icônes SVG thématiques.
- [ ] Illustrations des propriétés (miniatures de Nosy Be, Tsingy, etc.).
- [ ] Pions customisés (zébu, baobab, pirogue, chapeau lamba...).

---

## 🌐 Phase 9 : Réseau Avancé

### 9.1 Saisie des noms en lobby (réseau)
- [ ] Le client envoie `{ type: 'SET_PLAYER_NAME', payload: { name } }` après `ASSIGN_PLAYER_ID`.
- [ ] L'hôte met à jour le `playersSetup` et rediffuse la liste.

### 9.2 Reconnexion après déconnexion
- [ ] Stocker l'état de partie côté hôte avec `localPlayerId`.
- [ ] Si un client se reconnecte avec le même `localPlayerId`, lui re-syncer l'état complet.
- [ ] Timeout de 60s avant de considérer le joueur abandonné (bot prend le relais).

### 9.3 Hypothèques
- [ ] Ajouter `isMortgaged: boolean` à `PropertyState`.
- [ ] Hypothéquer : reçoit 50% du prix d'achat, loyer suspendu.
- [ ] Lever l'hypothèque : payer 110% du prix d'hypothèque.
- [ ] Afficher le statut dans le tableau de propriétés.

### 9.4 Échanges entre joueurs
- [ ] Interface de proposition (propriétés + argent contre propriétés + argent).
- [ ] Envoi de l'offre via réseau : `{ type: 'TRADE_OFFER', payload: { ... } }`.
- [ ] Acceptation/Refus, validation par l'hôte.

---

## 🕹️ Phase 10 : Gameplay & Ergonomie Avancés

> **Objectif :** Rendre la partie plus agréable, plus lisible et plus personnalisable. Ces fonctionnalités sont indépendantes les unes des autres et peuvent être développées dans n'importe quel ordre.

### 10.1 Historique de Partie (Game Log) 📜
- [ ] Maintenir un tableau `gameLog: string[]` dans le store, alimenté à chaque événement significatif (achat, loyer, prison, faillite, construction).
- [ ] Composant `GameLogPanel` : panneau scrollable accessible via un bouton dans le HUD (icône 📜 ou ≡).
- [ ] Format des entrées : `[Tour N] 🎲 Zaka a lancé 4+3 → Nosy Be` — horodatage par numéro de tour.
- [ ] En réseau : le log est généré localement sur chaque appareil à partir des `STATE_UPDATE` reçus (pas besoin de le synchroniser).
- [ ] Persister le log jusqu'à la fin de partie (reset à `initGame`).

### 10.2 Choix du Nombre de Bots 🤖
- [ ] Dans le lobby (mode solo ET mode hôte), ajouter un sélecteur `[− 1 Bot +]` pour choisir entre 0 et 3 bots.
- [ ] La somme `joueurs humains + bots` doit rester entre 2 et 4.
- [ ] En mode réseau : si des clients sont connectés, les slots restants sont proposés comme bots.
- [ ] Passer le nombre de bots à `startGame()` / `startSolo()` pour adapter `playersSetup`.

### 10.3 Conditions de Victoire Personnalisées 🏆

#### 10.3.a Fortune Limite
- [ ] Option dans le lobby : "Fortune limite" avec un sélecteur de montant (ex : 5 000 AR, 10 000 AR, illimité).
- [ ] Stocker `winCondition: { type: 'fortune_limit', amount: number } | { type: 'last_standing' }` dans le store.
- [ ] À chaque fin de tour, vérifier si un joueur a atteint le seuil → déclencher `GAME_OVER` avec ce joueur comme vainqueur.
- [ ] En réseau : la condition est définie par l'hôte et envoyée dans `GAME_START`.

#### 10.3.b Mode Chrono ⏱️
- [ ] Option dans le lobby : "Durée de partie" avec des paliers (15 min, 30 min, 45 min, ∞).
- [ ] Stocker `chronoEndTime: number | null` dans le store (timestamp de fin).
- [ ] Afficher un compteur décroissant dans le HUD (visible uniquement si mode chrono activé).
- [ ] À expiration : figer le jeu, comparer les fortunes nettes de tous les joueurs actifs (solde + valeur des propriétés au prix d'achat) → vainqueur = fortune nette la plus haute.
- [ ] En réseau : l'hôte démarre le chrono et le broadcast dans `GAME_START`. Les clients se synchronisent sur `chronoEndTime`.

### 10.4 Panneau des Propriétés 🗃️

#### 10.4.a Mes Propriétés
- [ ] Bouton dédié dans le HUD (icône 🏘️ ou « Mes biens »), accessible à tout moment.
- [ ] Liste scrollable des propriétés du joueur local : nom, couleur de groupe, nb maisons, loyer actuel.
- [ ] Indicateur de monopole : ✅ si le groupe est complet, sinon afficher les cases manquantes.
- [ ] Bouton "Construire" inline sur chaque propriété éligible (si monopole + fonds suffisants + fin de tour).
- [ ] Bouton "Hypothéquer" inline sur chaque propriété (Phase 9.3).

#### 10.4.b Voir les Propriétés d'un Adversaire
- [ ] Tap sur la `PlayerCard` d'un adversaire → ouvre un panneau lecture seule de ses propriétés.
- [ ] Afficher : nom, groupe de couleur, nb maisons, loyer actuel — sans les boutons d'action.
- [ ] En réseau : les données sont déjà dans le `STATE_UPDATE`, aucune requête supplémentaire nécessaire.

### 10.5 Fiche Détaillée d'une Propriété 📋
- [ ] Tap long (ou tap simple en mode info) sur une case du plateau → ouvre une modale `PropertyInfoModal`.
- [ ] Contenu : nom, image/icône, groupe de couleur, prix d'achat, grille des loyers (0 à hôtel), propriétaire actuel, nb maisons.
- [ ] Accessible à tous (hôte, client, n'importe quel joueur) en lecture seule.
- [ ] Différencier visuellement les propriétés libres / achetées / hypothéquées.

### 10.6 Payer pour Sortir de Prison (Caution) ⛓️
- [ ] Quand `currentPlayer.inJail === true` et que c'est le tour du joueur local, afficher un panneau dédié dans le HUD.
- [ ] Trois boutons d'action :
  - **Payer 50 AR** : débite le solde, sort de prison immédiatement, lance les dés normalement.
  - **Utiliser une carte** : visible uniquement si `hasGetOutOfJailCard === true`.
  - **Tenter un double** : lance les dés — double = sortie libre, sinon reste en prison (tour consommé).
- [ ] Après le 3e tour en prison sans double : sortie forcée avec paiement automatique de 50 AR.
- [ ] En réseau : le choix est envoyé comme `REQUEST_JAIL_ACTION` au même titre que `REQUEST_ROLL_DICE`.

### 10.7 Option Abandonner (Forfait) 🏳️
- [ ] Bouton discret "Abandonner" accessible depuis un menu contextuel (icône ⚙️ ou ≡ dans le HUD).
- [ ] Confirmation requise : modale "Confirmer le forfait ? Vos propriétés retourneront à la banque."
- [ ] Comportement : déclenche `handleBankruptcy(playerId, null)` — propriétés libérées, solde à 0, marqué `isBankrupt`.
- [ ] En solo : si le joueur humain abandonne, la partie continue entre bots jusqu'à GAME_OVER (ou affiche directement le résultat).
- [ ] En réseau :
  - **Client abandonne** : envoie `{ type: 'REQUEST_FORFEIT' }` → l'hôte exécute `handleBankruptcy` et broadcast le `STATE_UPDATE`.
  - **Hôte abandonne** : un vote de transfert d'autorité peut être proposé à un client (évolution future), sinon la partie se termine.

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

- [ ] Créer le dossier `relay-server/` à la racine du projet (dépôt séparé ou monorepo).
- [ ] Stack : **Node.js + `ws`** (WebSocket natif, zéro dépendance lourde).
- [ ] **Gestion des rooms :**
  - `rooms: Map<string, Set<WebSocket>>` — dictionnaire `roomCode → ensemble de sockets`.
  - Générer un code de room unique à 8 caractères alphanumériques (ex: `TANA-4892`).
  - Limiter à **4 connexions** par room (règle Monopoly).
- [ ] **Protocoles gérés par le relay :**
  - `{ type: 'CREATE_ROOM' }` → génère un `roomCode`, ajoute l'hôte, répond `{ type: 'ROOM_CREATED', roomCode }`.
  - `{ type: 'JOIN_ROOM', roomCode }` → ajoute le client à la room, diffuse `{ type: 'PLAYER_JOINED' }` à tous.
  - `{ type: 'LEAVE_ROOM' }` → retire le socket, diffuse `{ type: 'PLAYER_LEFT' }` aux autres.
  - Tous les autres types → **forward brut** à tous les membres de la room sauf l'expéditeur.
- [ ] **Heartbeat côté serveur :** ping WebSocket natif toutes les 30s pour détecter les connexions fantômes.
- [ ] **Nettoyage automatique :** si la room est vide depuis 60s, la supprimer de la mémoire.
- [ ] Déploiement cible : **Railway** ou **Render** (plan gratuit suffisant pour le prototype).
- [ ] Variable d'environnement `PORT` pour la compatibilité avec les hébergeurs cloud.

---

### 11.3 Refactorisation de `NetworkManager.ts` 🔧

> L'interface publique (`sendMessage`, `broadcast`, `onMessage`, `onConnection`, `onDisconnect`) reste **identique**. Seule l'implémentation interne change selon le transport actif.

- [ ] Ajouter un type `TransportMode = 'tcp' | 'websocket'` et une variable `activeTransport: TransportMode`.
- [ ] Exposer une méthode `setTransport(mode: TransportMode, relayUrl?: string)` appelée depuis le lobby avant connexion.
- [ ] **Section WebSocket — Hôte :**
  - Connexion au relay : `ws://relay.madapoly.com`
  - Envoyer `CREATE_ROOM` → recevoir et stocker le `roomCode`.
  - Tous les `broadcast()` deviennent des envois au relay qui les redistribue.
  - `sendTo(clientId, packet)` → le relay utilise un `socketId` interne pour cibler un client.
- [ ] **Section WebSocket — Client :**
  - Connexion au relay avec le `roomCode`.
  - Envoyer `JOIN_ROOM` → le relay notifie l'hôte.
  - `sendMessage()` → envoi au relay → relay forward à l'hôte.
- [ ] **Heartbeat WebSocket :** adapter `_startClientHeartbeat()` et `_startHostHeartbeat()` pour utiliser les ping/pong WebSocket natifs au lieu des paquets `__PING__`/`__PONG__` TCP.
- [ ] `cleanup()` ferme la WebSocket proprement (`ws.close(1000)`) en plus du TCP.
- [ ] Les deux transports coexistent dans le même fichier — aucune régression sur le mode TCP.

---

### 11.4 Refactorisation du `LobbyScreen.tsx` 🎨

- [ ] Ajouter un troisième mode : `type LobbyMode = 'select' | 'host' | 'client' | 'online_host' | 'online_client'`.
- [ ] **Écran de sélection principal :**
  ```
  ┌──────────────────────────────┐
  │  🏠  Solo (vs Bots)          │
  ├──────────────────────────────┤
  │  📶  Partie Locale (Wi-Fi)   │
  ├──────────────────────────────┤
  │  🌐  Jouer en Ligne          │
  └──────────────────────────────┘
  ```
- [ ] **Vue "Jouer en Ligne" → Hôte :**
  - Bouton "Créer une partie en ligne".
  - Appelle `NetworkManager.setTransport('websocket', RELAY_URL)` puis `createRoom()`.
  - Afficher le code de room en grand et lisible (ex: **TANA-4892**) avec un bouton "Copier".
  - Liste des joueurs connectés (même logique que le mode LAN).
  - Bouton "Lancer la partie".
- [ ] **Vue "Jouer en Ligne" → Client :**
  - Champ de saisie du code de room (majuscules, format `XXXX-XXXX`).
  - Bouton "Rejoindre".
  - État d'attente identique au mode LAN.
- [ ] Extraire la constante `RELAY_URL` dans `src/constants/config.ts` pour faciliter le changement entre dev/prod.
- [ ] En mode en ligne, l'`ASSIGN_PLAYER_ID` reste géré par l'hôte (inchangé) — le relay le transmet simplement.

---

### 11.5 Gestion des Déconnexions en Mode En Ligne 🔌

> Le heartbeat et la `DisconnectModal` existent déjà (Phase 6). En mode WebSocket, les comportements sont légèrement différents.

- [ ] Si un client perd la connexion → le relay ferme son socket → notifie l'hôte avec `PLAYER_LEFT` → l'hôte déclenche `onDisconnectCallback` → `DisconnectModal` ou gestion bot.
- [ ] Si l'hôte perd la connexion → le relay ferme son socket → notifie tous les clients avec `HOST_LEFT` → `DisconnectModal` sur tous les clients.
- [ ] **Reconnexion en ligne (évolution) :** si un joueur se reconnecte avec le même `roomCode` + `localPlayerId` dans les 60s, le relay le réintègre dans la room et l'hôte lui re-sync le `STATE_UPDATE` complet.
- [ ] Timeout room : si l'hôte ne revient pas en 60s, le relay dissout la room et notifie les clients restants.

---

### 11.6 Sécurité & Limites du Prototype 🔒

> Le relay est un prototype, pas une infrastructure de production. Ces points sont à connaître mais pas bloquants pour un lancement entre amis.

- [ ] **Pas d'authentification :** n'importe qui connaissant le code de room peut rejoindre. Acceptable pour jouer entre amis, insuffisant pour un service public.
- [ ] **Validation côté relay :** vérifier que les paquets sont du JSON valide avant de les forward (évite les crashes sur erreurs réseau).
- [ ] **Rate limiting basique :** ignorer les clients qui envoient plus de 20 paquets/seconde (anti-spam).
- [ ] **HTTPS/WSS :** en production, utiliser `wss://` (WebSocket sécurisé) via le certificat TLS de Railway/Render (automatique sur ces plateformes).
- [ ] **Taille des paquets :** les `STATE_UPDATE` Monopoly sont typiquement < 5 Ko — pas de problème de taille.

---

### 11.7 Configuration & Déploiement 🚀

- [ ] Créer `src/constants/config.ts` :
  ```typescript
  export const RELAY_URL = __DEV__
    ? 'ws://localhost:8080'          // serveur local pour dev
    : 'wss://relay.madapoly.com';   // production
  ```
- [ ] Créer `relay-server/package.json` avec script `start` et dépendance `ws`.
- [ ] Créer `relay-server/server.js` (logique relay ~80 lignes).
- [ ] Tester en local : lancer le relay sur le Mac, deux téléphones sur le même Wi-Fi mais en mode "En ligne" → valider que le jeu fonctionne via le relay local avant de déployer.
- [ ] Déployer sur Railway :
  - `railway init` dans `relay-server/`
  - `railway up`
  - Récupérer l'URL publique → mettre à jour `RELAY_URL` dans `config.ts`.
- [ ] Tester avec deux téléphones sur des réseaux différents (4G vs Wi-Fi).
- [ ] Documenter le `RELAY_URL` de production dans `CONTEXT.md`.

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